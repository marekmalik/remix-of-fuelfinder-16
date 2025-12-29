// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-authorization',
};

// Base64URL encode
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Base64URL decode - returns ArrayBuffer for crypto operations
function base64UrlDecode(str: string): ArrayBuffer {
  const padding = (4 - (str.length % 4)) % 4;
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padding);
  const binary = atob(base64);
  const bytes = new Uint8Array([...binary].map(c => c.charCodeAt(0)));
  return bytes.buffer;
}

// Base64URL decode to Uint8Array (for non-crypto operations)
function base64UrlDecodeToBytes(str: string): Uint8Array {
  const padding = (4 - (str.length % 4)) % 4;
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padding);
  const binary = atob(base64);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

// Generate VAPID authorization header using ECDSA
async function generateVapidAuth(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ authorization: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 12 * 60 * 60;
  
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: expiry,
    sub: 'mailto:noreply@flowjournal.app',
  };
  
  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  const privateKeyBytes = base64UrlDecodeToBytes(vapidPrivateKey);
  const publicKeyBytes = base64UrlDecodeToBytes(vapidPublicKey);
  
  // Build PKCS8 format for P-256 private key
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20
  ]);
  const pkcs8Footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00
  ]);
  
  const pkcs8Key = new Uint8Array(pkcs8Header.length + 32 + pkcs8Footer.length + publicKeyBytes.length);
  pkcs8Key.set(pkcs8Header, 0);
  pkcs8Key.set(privateKeyBytes, pkcs8Header.length);
  pkcs8Key.set(pkcs8Footer, pkcs8Header.length + 32);
  pkcs8Key.set(publicKeyBytes, pkcs8Header.length + 32 + pkcs8Footer.length);
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Key.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(unsignedToken)
  );
  
  const sigArray = new Uint8Array(signature);
  let r, s;
  
  if (sigArray[0] === 0x30) {
    let offset = 2;
    const rLen = sigArray[offset + 1];
    r = sigArray.slice(offset + 2, offset + 2 + rLen);
    offset = offset + 2 + rLen;
    const sLen = sigArray[offset + 1];
    s = sigArray.slice(offset + 2, offset + 2 + sLen);
    
    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);
    
    if (r.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(r, 32 - r.length);
      r = padded;
    }
    if (s.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(s, 32 - s.length);
      s = padded;
    }
  } else {
    r = sigArray.slice(0, 32);
    s = sigArray.slice(32, 64);
  }
  
  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);
  
  const signatureB64 = base64UrlEncode(rawSig);
  const jwt = `${unsignedToken}.${signatureB64}`;
  
  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
  };
}

// Encrypt the payload using ECDH + AES-128-GCM (RFC 8291)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);
  
  const subscriberKeyBuffer = base64UrlDecode(p256dhKey);
  const subscriberKeyBytes = new Uint8Array(subscriberKeyBuffer);
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriberKeyBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );
  
  const authSecretBuffer = base64UrlDecode(authSecret);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const prkKey = await crypto.subtle.importKey(
    'raw',
    authSecretBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const prk = await crypto.subtle.sign('HMAC', prkKey, sharedSecret);
  
  const ikmInfo = new Uint8Array([
    ...encoder.encode('WebPush: info\0'),
    ...subscriberKeyBytes,
    ...localPublicKey,
  ]);
  
  const prkImport = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const ikmInfoSigned = await crypto.subtle.sign(
    'HMAC',
    prkImport,
    new Uint8Array([...ikmInfo, 1])
  );
  const ikm = new Uint8Array(ikmInfoSigned).slice(0, 32);
  
  const saltKey = await crypto.subtle.importKey(
    'raw',
    salt.buffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const prkFinal = await crypto.subtle.sign('HMAC', saltKey, ikm);
  
  const prkFinalImport = await crypto.subtle.importKey(
    'raw',
    prkFinal,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\0');
  const cekSigned = await crypto.subtle.sign(
    'HMAC',
    prkFinalImport,
    new Uint8Array([...cekInfo, 1])
  );
  const cek = new Uint8Array(cekSigned).slice(0, 16);
  
  const nonceInfo = encoder.encode('Content-Encoding: nonce\0');
  const nonceSigned = await crypto.subtle.sign(
    'HMAC',
    prkFinalImport,
    new Uint8Array([...nonceInfo, 1])
  );
  const nonce = new Uint8Array(nonceSigned).slice(0, 12);
  
  const payloadBytes = encoder.encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2;
  
  const aesKey = await crypto.subtle.importKey(
    'raw',
    cek.buffer,
    'AES-GCM',
    false,
    ['encrypt']
  );
  
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    paddedPayload
  );
  
  const recordSize = 4096;
  const header = new Uint8Array(86);
  header.set(salt, 0);
  header[16] = (recordSize >> 24) & 0xff;
  header[17] = (recordSize >> 16) & 0xff;
  header[18] = (recordSize >> 8) & 0xff;
  header[19] = recordSize & 0xff;
  header[20] = 65;
  header.set(localPublicKey, 21);
  
  const encrypted = new Uint8Array(header.length + encryptedData.byteLength);
  encrypted.set(header);
  encrypted.set(new Uint8Array(encryptedData), header.length);
  
  return encrypted.buffer;
}

// Send push notification
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<void> {
  const encrypted = await encryptPayload(
    payload,
    subscription.p256dh,
    subscription.auth
  );
  
  const { authorization } = await generateVapidAuth(
    subscription.endpoint,
    vapidPublicKey,
    vapidPrivateKey
  );
  
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Urgency': 'normal',
    },
    body: encrypted,
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Push service error:', response.status, errorBody);
    const error = new Error(`Push service returned ${response.status}: ${errorBody}`);
    error.statusCode = response.status;
    throw error;
  }
  
  console.log('Push notification sent successfully');
}

serve(async (req) => {
  console.log('send-push-notification function invoked');
  console.log('Request method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing push notification request...');
    console.log('Available headers:', [...req.headers.keys()]);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    // Check for auth header - Supabase may use x-supabase-authorization after gateway validation
    const authHeader = 
      req.headers.get('x-supabase-authorization') ||
      req.headers.get('authorization') || 
      req.headers.get('Authorization');
    
    console.log('Auth header found:', authHeader ? 'yes' : 'no');
    
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate JWT via the auth API
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      console.error('Invalid JWT:', userErr?.message);
      return new Response(JSON.stringify({ error: 'Invalid JWT' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authedUserId = userData.user.id;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(JSON.stringify({ error: 'Push notifications not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, title, body, data } = await req.json();

    // Prevent sending pushes to other users
    if (userId && userId !== authedUserId) {
      console.error('Forbidden: userId mismatch', { authedUserId, requestedUserId: userId });
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUserId = authedUserId;
    console.log('Sending push notification to user:', targetUserId);

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', targetUserId);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(JSON.stringify({ error: 'Failed to process notification request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for user:', targetUserId);
      return new Response(JSON.stringify({ success: false, message: 'No subscriptions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${subscriptions.length} subscription(s) for user`);

    const notificationPayload = JSON.stringify({
      title: title || 'Time to log your activity!',
      body: body || 'How are you feeling? Track your energy levels now.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: data || { url: '/' },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          console.log('Sending to endpoint:', sub.endpoint.substring(0, 60) + '...');
          
          await sendWebPush(
            {
              endpoint: sub.endpoint,
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
            notificationPayload,
            vapidPublicKey,
            vapidPrivateKey
          );

          console.log('Push notification sent successfully to subscription:', sub.id);
          return { success: true, subscriptionId: sub.id };
        } catch (err) {
          console.error('Error sending push to subscription:', sub.id, err);
          
          // If subscription is no longer valid, remove it
          if (err.statusCode === 404 || err.statusCode === 410) {
            console.log('Removing invalid subscription:', sub.id);
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }
          
          return { success: false, subscriptionId: sub.id, error: err.message || 'Unknown error' };
        }
      })
    );

    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;

    console.log(`Successfully sent ${successCount} of ${subscriptions.length} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} of ${subscriptions.length} notifications`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
