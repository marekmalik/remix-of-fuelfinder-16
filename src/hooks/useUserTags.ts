import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type TagCategory = 'topics' | 'activities' | 'environments' | 'interactions' | 'objects' | 'users';

interface UserTag {
  id: string;
  category: TagCategory;
  tag: string;
}

export const useUserTags = (category?: TagCategory) => {
  const [tags, setTags] = useState<UserTag[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTags = useCallback(async () => {
    if (!user) {
      setTags([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('user_tags')
        .select('*')
        .eq('user_id', user.id)
        .order('tag', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTags((data || []).map(row => ({
        id: row.id,
        category: row.category as TagCategory,
        tag: row.tag,
      })));
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  }, [user, category]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const addTag = async (tagCategory: TagCategory, tagName: string): Promise<boolean> => {
    if (!user) return false;

    const trimmedTag = tagName.trim().toLowerCase();
    if (!trimmedTag) return false;

    // Check if tag already exists
    if (tags.some(t => t.category === tagCategory && t.tag === trimmedTag)) {
      return true; // Already exists
    }

    try {
      const { data, error } = await supabase
        .from('user_tags')
        .insert({
          user_id: user.id,
          category: tagCategory,
          tag: trimmedTag,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Duplicate - already exists
          return true;
        }
        throw error;
      }

      setTags(prev => [...prev, {
        id: data.id,
        category: data.category as TagCategory,
        tag: data.tag,
      }].sort((a, b) => a.tag.localeCompare(b.tag)));

      return true;
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Failed to add tag');
      return false;
    }
  };

  const deleteTag = async (tagId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_tags')
        .delete()
        .eq('id', tagId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTags(prev => prev.filter(t => t.id !== tagId));
      return true;
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Failed to delete tag');
      return false;
    }
  };

  const renameTag = async (tagId: string, newName: string): Promise<boolean> => {
    if (!user) return false;

    const trimmedName = newName.trim().toLowerCase();
    if (!trimmedName) return false;

    // Check if new name already exists in same category
    const tagToRename = tags.find(t => t.id === tagId);
    if (!tagToRename) return false;
    
    if (tags.some(t => t.category === tagToRename.category && t.tag === trimmedName && t.id !== tagId)) {
      toast.error('A tag with this name already exists');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_tags')
        .update({ tag: trimmedName })
        .eq('id', tagId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTags(prev => prev.map(t => 
        t.id === tagId ? { ...t, tag: trimmedName } : t
      ).sort((a, b) => a.tag.localeCompare(b.tag)));
      
      return true;
    } catch (error) {
      console.error('Error renaming tag:', error);
      toast.error('Failed to rename tag');
      return false;
    }
  };

  const getTagsForCategory = (cat: TagCategory): UserTag[] => {
    return tags.filter(t => t.category === cat);
  };

  const getTagsByCategory = (cat: TagCategory): string[] => {
    return tags.filter(t => t.category === cat).map(t => t.tag);
  };

  // Seed multiple tags at once (for initial setup)
  const seedTags = async (seedData: Record<TagCategory, string[]>): Promise<void> => {
    if (!user) return;

    const categories = Object.keys(seedData) as TagCategory[];
    
    for (const category of categories) {
      const tagsToAdd = seedData[category];
      for (const tagName of tagsToAdd) {
        await addTag(category, tagName);
      }
    }
    
    await fetchTags();
  };

  return {
    tags,
    loading,
    addTag,
    deleteTag,
    renameTag,
    getTagsByCategory,
    getTagsForCategory,
    seedTags,
    refetch: fetchTags,
  };
};
