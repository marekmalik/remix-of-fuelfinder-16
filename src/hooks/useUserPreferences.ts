import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserPreferences {
  hideTopics: boolean;
  hideFlowToggle: boolean;
}

const defaultPreferences: UserPreferences = {
  hideTopics: false,
  hideFlowToggle: false,
};

export const useUserPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(defaultPreferences);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('hide_topics, hide_flow_toggle')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching preferences:', error);
        setPreferences(defaultPreferences);
      } else if (data) {
        setPreferences({
          hideTopics: data.hide_topics,
          hideFlowToggle: data.hide_flow_toggle,
        });
      } else {
        // No preferences yet, use defaults
        setPreferences(defaultPreferences);
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
      setPreferences(defaultPreferences);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = useCallback(async (key: keyof UserPreferences, value: boolean): Promise<boolean> => {
    if (!user) return false;

    const dbKey = key === 'hideTopics' ? 'hide_topics' : 'hide_flow_toggle';

    try {
      // Try to upsert
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { 
            user_id: user.id, 
            [dbKey]: value 
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error updating preference:', error);
        return false;
      }

      setPreferences(prev => ({ ...prev, [key]: value }));
      return true;
    } catch (err) {
      console.error('Error updating preference:', err);
      return false;
    }
  }, [user]);

  return {
    preferences,
    loading,
    updatePreference,
    refetch: fetchPreferences,
  };
};
