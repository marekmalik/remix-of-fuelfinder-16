import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AIKeys {
  openaiKey: string;
  geminiKey: string;
}

const defaultKeys: AIKeys = {
  openaiKey: '',
  geminiKey: '',
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptKey(plaintext: string, password: string): Promise<string> {
  if (!plaintext) return '';
  
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(password, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    );

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error('Encryption error:', err);
    return '';
  }
}

async function decryptKey(ciphertext: string, password: string): Promise<string> {
  if (!ciphertext) return '';

  try {
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return decoder.decode(decrypted);
  } catch (err) {
    console.error('Decryption error:', err);
    return '';
  }
}

const PIN_STORAGE_KEY = 'fuelfinder_ai_pin';

export const useAIKeys = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<AIKeys>(defaultKeys);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPin, setNeedsPin] = useState(false);
  const [pin, setPin] = useState<string | null>(null);

  const getPinStorageKey = useCallback(() => {
    return user ? `${PIN_STORAGE_KEY}_${user.id}` : PIN_STORAGE_KEY;
  }, [user]);

  useEffect(() => {
    if (user) {
      const storedPin = sessionStorage.getItem(getPinStorageKey());
      if (storedPin) {
        setPin(storedPin);
      }
    }
  }, [user, getPinStorageKey]);

  const fetchKeys = useCallback(async () => {
    if (!user) {
      setKeys(defaultKeys);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('user_preferences')
        .select('openai_key, gemini_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        if (fetchError.message?.includes('column') || fetchError.code === '42703') {
          setError('AI keys columns not found in database. Please add openai_key and gemini_key columns to user_preferences table.');
          console.error('Missing columns in user_preferences:', fetchError);
        } else {
          console.error('Error fetching AI keys:', fetchError);
        }
        setKeys(defaultKeys);
        setLoading(false);
        return;
      }

      const encryptedOpenai = (data as any)?.openai_key || '';
      const encryptedGemini = (data as any)?.gemini_key || '';

      if ((encryptedOpenai || encryptedGemini) && !pin) {
        setNeedsPin(true);
        setLoading(false);
        return;
      }

      if (!encryptedOpenai && !encryptedGemini) {
        setKeys(defaultKeys);
        setNeedsPin(false);
        setError(null);
        setLoading(false);
        return;
      }

      const currentPin = pin || '';
      const [openaiKey, geminiKey] = await Promise.all([
        decryptKey(encryptedOpenai, currentPin),
        decryptKey(encryptedGemini, currentPin),
      ]);

      if ((encryptedOpenai && !openaiKey) || (encryptedGemini && !geminiKey)) {
        setError('Wrong PIN. Please try again.');
        setKeys(defaultKeys);
      } else {
        setKeys({ openaiKey, geminiKey });
        setNeedsPin(false);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching AI keys:', err);
      setKeys(defaultKeys);
    } finally {
      setLoading(false);
    }
  }, [user, pin]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const unlockWithPin = useCallback((enteredPin: string) => {
    if (user) {
      sessionStorage.setItem(getPinStorageKey(), enteredPin);
    }
    setPin(enteredPin);
    setLoading(true);
  }, [user, getPinStorageKey]);

  const saveKeys = useCallback(async (newKeys: Partial<AIKeys>, encryptionPin?: string): Promise<boolean> => {
    if (!user) return false;

    const pinToUse = encryptionPin || pin;
    if (!pinToUse) {
      setError('Please set a PIN first to encrypt your API keys.');
      return false;
    }

    const updates: Record<string, any> = {
      user_id: user.id,
    };

    try {
      if (newKeys.openaiKey !== undefined) {
        updates.openai_key = await encryptKey(newKeys.openaiKey, pinToUse);
      }
      if (newKeys.geminiKey !== undefined) {
        updates.gemini_key = await encryptKey(newKeys.geminiKey, pinToUse);
      }

      const { error: upsertError } = await supabase
        .from('user_preferences')
        .upsert(updates as any, { onConflict: 'user_id' });

      if (upsertError) {
        if (upsertError.message?.includes('column') || upsertError.code === '42703') {
          setError('AI keys columns not found. Please add openai_key and gemini_key text columns to user_preferences table in Supabase.');
        }
        console.error('Error saving AI keys:', upsertError);
        return false;
      }

      if (encryptionPin && user) {
        sessionStorage.setItem(getPinStorageKey(), encryptionPin);
        setPin(encryptionPin);
      }

      setKeys(prev => ({ ...prev, ...newKeys }));
      setNeedsPin(false);
      setError(null);
      return true;
    } catch (err) {
      console.error('Error saving AI keys:', err);
      return false;
    }
  }, [user, pin, getPinStorageKey]);

  const clearKeys = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: upsertError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          openai_key: '',
          gemini_key: '',
        } as any, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('Error clearing AI keys:', upsertError);
        return false;
      }

      setKeys(defaultKeys);
      setPin(null);
      sessionStorage.removeItem(getPinStorageKey());
      return true;
    } catch (err) {
      console.error('Error clearing AI keys:', err);
      return false;
    }
  }, [user, getPinStorageKey]);

  const hasAnyKey = keys.openaiKey.length > 0 || keys.geminiKey.length > 0;
  const isUnlocked = pin !== null || (!keys.openaiKey && !keys.geminiKey);

  return {
    keys,
    loading,
    error,
    needsPin,
    isUnlocked,
    saveKeys,
    clearKeys,
    unlockWithPin,
    hasAnyKey,
    refetch: fetchKeys,
  };
};
