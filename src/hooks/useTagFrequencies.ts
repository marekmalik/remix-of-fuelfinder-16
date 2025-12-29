import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TagCategory } from './useUserTags';

type FrequencyMap = Record<string, number>;
type CategoryFrequencies = Record<TagCategory, FrequencyMap>;

export const useTagFrequencies = () => {
  const [frequencies, setFrequencies] = useState<CategoryFrequencies>({
    topics: {},
    activities: {},
    environments: {},
    interactions: {},
    objects: {},
    users: {},
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchFrequencies = useCallback(async () => {
    if (!user) {
      setFrequencies({
        topics: {},
        activities: {},
        environments: {},
        interactions: {},
        objects: {},
        users: {},
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('topics, activities, environments, interactions, objects, users')
        .eq('user_id', user.id);

      if (error) throw error;

      const newFrequencies: CategoryFrequencies = {
        topics: {},
        activities: {},
        environments: {},
        interactions: {},
        objects: {},
        users: {},
      };

      // Count occurrences of each tag
      (data || []).forEach(row => {
        const categories: { key: TagCategory; values: string[] | null }[] = [
          { key: 'topics', values: row.topics },
          { key: 'activities', values: row.activities },
          { key: 'environments', values: row.environments },
          { key: 'interactions', values: row.interactions },
          { key: 'objects', values: row.objects },
          { key: 'users', values: row.users },
        ];

        categories.forEach(({ key, values }) => {
          if (values && Array.isArray(values)) {
            values.forEach(tag => {
              const normalizedTag = tag.toLowerCase();
              newFrequencies[key][normalizedTag] = (newFrequencies[key][normalizedTag] || 0) + 1;
            });
          }
        });
      });

      setFrequencies(newFrequencies);
    } catch (error) {
      console.error('Error fetching tag frequencies:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFrequencies();
  }, [fetchFrequencies]);

  const getFrequency = (category: TagCategory, tag: string): number => {
    return frequencies[category][tag.toLowerCase()] || 0;
  };

  const sortByFrequency = (category: TagCategory, tags: string[]): string[] => {
    return [...tags].sort((a, b) => {
      const freqA = getFrequency(category, a);
      const freqB = getFrequency(category, b);
      if (freqB !== freqA) return freqB - freqA;
      return a.localeCompare(b); // Alphabetical as tiebreaker
    });
  };

  return {
    frequencies,
    loading,
    getFrequency,
    sortByFrequency,
    refetch: fetchFrequencies,
  };
};
