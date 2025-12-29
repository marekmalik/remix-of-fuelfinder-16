import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface NotificationSchedule {
  id: string;
  user_id: string;
  enabled: boolean;
  time: string;
  days_of_week: number[];
  title: string;
  body: string;
  timezone: string;
  schedule_type: 'daily' | 'interval';
  interval_minutes: number | null;
  from_time: string | null;
  until_time: string | null;
  created_at: string;
  updated_at: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  
  // Check support synchronously on initial render
  const checkSupport = () => {
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;
    
    console.log('[Push] Support check:', { hasServiceWorker, hasPushManager, hasNotification });
    
    return hasServiceWorker && hasPushManager && hasNotification;
  };
  
  const [isSupported, setIsSupported] = useState(() => checkSupport());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(() => 
    'Notification' in window ? Notification.permission : 'default'
  );
  const [schedules, setSchedules] = useState<NotificationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const vapidFetched = useRef(false);

  // Re-check support after mount (in case of SSR or hydration issues)
  useEffect(() => {
    const supported = checkSupport();
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    } else {
      // If not supported, stop loading
      setLoading(false);
    }
  }, []);

  // Fetch VAPID public key (only when user is authenticated)
  useEffect(() => {
    if (vapidFetched.current || !user) return;
    
    const fetchVapidKey = async () => {
      try {
        console.log('[Push] Fetching VAPID key...');
        const { data, error } = await supabase.functions.invoke('get-vapid-key');
        console.log('[Push] VAPID response:', { data, error });
        
        if (error) {
          console.error('[Push] VAPID fetch error details:', {
            message: error.message,
            name: error.name,
            context: (error as any).context
          });
          throw error;
        }
        if (data?.publicKey) {
          console.log('[Push] VAPID key received successfully');
          setVapidPublicKey(data.publicKey);
        } else if (data?.error) {
          console.error('[Push] VAPID function returned error:', data.error);
        }
      } catch (error: any) {
        console.error('[Push] Error fetching VAPID key:', error);
      }
    };

    vapidFetched.current = true;
    fetchVapidKey();
  }, [user]);

  // Ensure a service worker is registered and check subscription status
  useEffect(() => {
    if (!isSupported || !user) {
      setLoading(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        // Use the app's primary service worker (registered by the PWA plugin)
        const registration = await navigator.serviceWorker.ready;
        console.log('[Push] SW ready:', registration);

        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);

        await fetchSchedules();
      } catch (error) {
        console.error('Error checking push subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  const fetchSchedules = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('time', { ascending: true });

      if (error) throw error;
      setSchedules((data as NotificationSchedule[]) || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in your browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notification permission granted!');
        return true;
      } else if (result === 'denied') {
        toast.error('Notification permission denied. Please enable in browser settings.');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) return false;

    try {
      // Request permission if not granted
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) return false;
      }

      const registration = await navigator.serviceWorker.ready;

      // Check if VAPID key is available
      if (!vapidPublicKey) {
        toast.error('Push notifications are not configured. Please try again later.');
        return false;
      }

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      const subscriptionJSON = subscription.toJSON();

      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJSON.endpoint!,
          p256dh: subscriptionJSON.keys!.p256dh,
          auth: subscriptionJSON.keys!.auth,
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable push notifications');
      return false;
    }
  }, [isSupported, user, permission, requestPermission, vapidPublicKey]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);

        if (error) throw error;
      }

      setIsSubscribed(false);
      toast.success('Push notifications disabled');
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Failed to disable push notifications');
      return false;
    }
  }, [isSupported, user]);

  const addSchedule = useCallback(async (
    time: string,
    daysOfWeek: number[],
    title?: string,
    body?: string,
    timezone?: string,
    scheduleType: 'daily' | 'interval' = 'daily',
    intervalMinutes?: number,
    fromTime?: string,
    untilTime?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const insertData: any = {
        user_id: user.id,
        time,
        days_of_week: daysOfWeek,
        title: title || 'Time to log your activity!',
        body: body || 'How are you feeling? Track your energy levels now.',
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        schedule_type: scheduleType,
      };

      if (scheduleType === 'interval') {
        if (intervalMinutes) insertData.interval_minutes = intervalMinutes;
        if (fromTime) insertData.from_time = fromTime;
        if (untilTime) insertData.until_time = untilTime;
      }

      const { data, error } = await supabase
        .from('notification_schedules')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      setSchedules(prev => [...prev, data as NotificationSchedule]);
      toast.success('Reminder added!');
      return true;
    } catch (error) {
      console.error('Error adding schedule:', error);
      toast.error('Failed to add reminder');
      return false;
    }
  }, [user]);

  const updateSchedule = useCallback(async (
    id: string,
    updates: Partial<Pick<NotificationSchedule, 'enabled' | 'time' | 'days_of_week' | 'title' | 'body' | 'timezone' | 'schedule_type' | 'interval_minutes' | 'from_time' | 'until_time'>>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('notification_schedules')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSchedules(prev =>
        prev.map(s => s.id === id ? { ...s, ...updates } as NotificationSchedule : s)
      );
      toast.success('Reminder updated!');
      return true;
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update reminder');
      return false;
    }
  }, [user]);

  const deleteSchedule = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('notification_schedules')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Reminder deleted');
      return true;
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete reminder');
      return false;
    }
  }, [user]);

  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!user || !isSubscribed) {
      toast.error('Please enable push notifications first');
      return false;
    }

    try {
      console.log('[Push] Sending test notification...', { userId: user.id });
      
      // Check if we have a valid session
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      console.log('[Push] Current session:', accessToken ? 'valid' : 'none');

      if (!accessToken) {
        toast.error('You are not signed in (no session token). Please sign in again.');
        return false;
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        headers: {
          // Use lowercase header name to avoid platform-specific normalization issues
          authorization: `Bearer ${accessToken}`,
        },
        body: {
          userId: user.id,
          title: 'Test Notification',
          body: 'Your push notifications are working! 🎉',
        },
      });

      console.log('[Push] send-push-notification response:', { data, error });

      if (error) {
        console.error('[Push] send-push-notification invoke error:', error);

        const ctx = (error as any)?.context;
        const status = ctx?.status;
        let bodyText: string | undefined;
        try {
          bodyText = await ctx?.text?.();
        } catch {
          bodyText = undefined;
        }

        const errorDetail =
          [status ? `HTTP ${status}` : null, bodyText || null, error.message || null]
            .filter(Boolean)
            .join(' — ') ||
          'Unknown error';

        toast.error(`Notification failed: ${errorDetail}`);
        return false;
      }

      if (data?.success === false) {
        toast.info(data.message || 'No push subscriptions found');
        return false;
      }

      toast.success('Test notification sent!');
      return true;
    } catch (error: any) {
      console.error('[Push] Error sending test notification:', error);
      const message =
        error?.message ||
        error?.error_description ||
        (typeof error === 'string' ? error : 'Unknown error');
      toast.error(`Failed: ${message}`);
      return false;
    }
  }, [user, isSubscribed]);

  return {
    isSupported,
    isSubscribed,
    permission,
    schedules,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    sendTestNotification,
    refreshSchedules: fetchSchedules,
  };
}
