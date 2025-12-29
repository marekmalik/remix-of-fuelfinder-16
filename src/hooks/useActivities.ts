import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, LikertLevel } from '@/types/activity';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchActivities = async () => {
    if (!user) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Activity[] = (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        engagement: row.engagement as LikertLevel,
        energy: row.energy as LikertLevel,
        inFlow: row.in_flow,
        notes: row.notes ?? undefined,
        topics: row.topics ?? undefined,
        feelings: row.feelings ?? undefined,
        aeiou: {
          activities: row.activities ?? undefined,
          environments: row.environments ?? undefined,
          interactions: row.interactions ?? undefined,
          objects: row.objects ?? undefined,
          users: row.users ?? undefined,
        },
        createdAt: new Date(row.created_at),
      }));

      setActivities(mapped);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [user]);

  const addActivity = async (activityData: Omit<Activity, 'id'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          name: activityData.name,
          engagement: activityData.engagement,
          energy: activityData.energy,
          in_flow: activityData.inFlow,
          notes: activityData.notes ?? null,
          topics: activityData.topics ?? null,
          feelings: activityData.feelings ?? null,
          activities: activityData.aeiou?.activities ?? null,
          environments: activityData.aeiou?.environments ?? null,
          interactions: activityData.aeiou?.interactions ?? null,
          objects: activityData.aeiou?.objects ?? null,
          users: activityData.aeiou?.users ?? null,
          created_at: activityData.createdAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const newActivity: Activity = {
        id: data.id,
        name: data.name,
        engagement: data.engagement as LikertLevel,
        energy: data.energy as LikertLevel,
        inFlow: data.in_flow,
        notes: data.notes ?? undefined,
        topics: data.topics ?? undefined,
        feelings: data.feelings ?? undefined,
        aeiou: {
          activities: data.activities ?? undefined,
          environments: data.environments ?? undefined,
          interactions: data.interactions ?? undefined,
          objects: data.objects ?? undefined,
          users: data.users ?? undefined,
        },
        createdAt: new Date(data.created_at),
      };

      setActivities((prev) => [newActivity, ...prev]);
      return newActivity;
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to save activity');
      return null;
    }
  };

  const updateActivity = async (id: string, activityData: Omit<Activity, 'id'>) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('activities')
        .update({
          name: activityData.name,
          engagement: activityData.engagement,
          energy: activityData.energy,
          in_flow: activityData.inFlow,
          notes: activityData.notes ?? null,
          topics: activityData.topics ?? null,
          feelings: activityData.feelings ?? null,
          activities: activityData.aeiou?.activities ?? null,
          environments: activityData.aeiou?.environments ?? null,
          interactions: activityData.aeiou?.interactions ?? null,
          objects: activityData.aeiou?.objects ?? null,
          users: activityData.aeiou?.users ?? null,
          created_at: activityData.createdAt.toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      const updatedActivity: Activity = {
        id: data.id,
        name: data.name,
        engagement: data.engagement as LikertLevel,
        energy: data.energy as LikertLevel,
        inFlow: data.in_flow,
        notes: data.notes ?? undefined,
        topics: data.topics ?? undefined,
        feelings: data.feelings ?? undefined,
        aeiou: {
          activities: data.activities ?? undefined,
          environments: data.environments ?? undefined,
          interactions: data.interactions ?? undefined,
          objects: data.objects ?? undefined,
          users: data.users ?? undefined,
        },
        createdAt: new Date(data.created_at),
      };

      setActivities((prev) => prev.map((a) => a.id === id ? updatedActivity : a));
      toast.success('Activity updated');
      return true;
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Failed to update activity');
      return false;
    }
  };

  const deleteActivity = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setActivities((prev) => prev.filter((a) => a.id !== id));
      toast.success('Activity deleted');
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
      return false;
    }
  };

  return {
    activities,
    loading,
    addActivity,
    updateActivity,
    deleteActivity,
    refetch: fetchActivities,
  };
};
