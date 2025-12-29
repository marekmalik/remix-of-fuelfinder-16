import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserTags, TagCategory } from "@/hooks/useUserTags";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, LogOut, Plus, X, Tag, Loader2, Pencil, Bell, Palette, Sliders } from "lucide-react";
import { toast } from "sonner";
import { NotificationSettings } from "@/components/NotificationSettings";
import { ThemeToggle } from "@/components/ThemeToggle";

// Initial seed tags for each category - will be saved to DB on first load
const SEED_TAGS: Record<TagCategory, string[]> = {
  topics: [],
  activities: ['writing', 'reading', 'coding', 'designing', 'meeting', 'brainstorming', 'presenting', 'reviewing', 'planning', 'researching'],
  environments: ['home', 'office', 'coffee shop', 'outdoors', 'meeting room', 'co-working', 'library', 'commute', 'remote', 'quiet'],
  interactions: ['solo', '1:1', 'small group', 'large group', 'collaborative', 'mentoring', 'learning', 'teaching', 'virtual', 'in-person'],
  objects: ['laptop', 'phone', 'whiteboard', 'notebook', 'pen', 'tablet', 'camera', 'microphone', 'headphones', 'software'],
  users: ['colleagues', 'manager', 'clients', 'stakeholders', 'team', 'mentor', 'mentee', 'customers', 'partners', 'executives'],
};

const TAG_CATEGORIES: { key: TagCategory; label: string; description: string }[] = [
  { key: 'topics', label: 'Topics', description: 'Categories for your activities (e.g., work, personal, health)' },
  { key: 'activities', label: 'Activities', description: 'Types of activities you do' },
  { key: 'environments', label: 'Environments', description: 'Places where activities happen' },
  { key: 'interactions', label: 'Interactions', description: 'Types of interactions during activities' },
  { key: 'objects', label: 'Objects', description: 'Tools and objects you use' },
  { key: 'users', label: 'People', description: 'People involved in activities' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { tags, loading, addTag, deleteTag, renameTag, getTagsForCategory, seedTags } = useUserTags();
  const { preferences, loading: prefsLoading, updatePreference } = useUserPreferences();
  const [newTagInputs, setNewTagInputs] = useState<Record<TagCategory, string>>({
    topics: '',
    activities: '',
    environments: '',
    interactions: '',
    objects: '',
    users: '',
  });
  const [expandedCategory, setExpandedCategory] = useState<TagCategory | null>(null);
  const [seeding, setSeeding] = useState(false);
  const hasSeeded = useRef(false);
  
  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; tagId: string; tagName: string } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; tagId: string; tagName: string; newName: string } | null>(null);

  // Seed tags on first load if user has no tags
  useEffect(() => {
    const seedIfEmpty = async () => {
      if (loading || hasSeeded.current || seeding) return;
      
      // Check if user has any tags at all
      const hasAnyTags = tags.length > 0;
      if (!hasAnyTags && seedTags) {
        hasSeeded.current = true;
        setSeeding(true);
        await seedTags(SEED_TAGS);
        setSeeding(false);
      }
    };
    
    seedIfEmpty();
  }, [loading, tags, seedTags, seeding]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleAddTag = async (category: TagCategory) => {
    const value = newTagInputs[category].trim();
    if (!value) return;

    const success = await addTag(category, value);
    if (success) {
      setNewTagInputs(prev => ({ ...prev, [category]: '' }));
      toast.success('Tag added');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;
    
    const success = await deleteTag(deleteDialog.tagId);
    if (success) {
      toast.success('Tag deleted');
    }
    setDeleteDialog(null);
  };

  const handleRenameConfirm = async () => {
    if (!renameDialog || !renameDialog.newName.trim()) return;
    
    const success = await renameTag(renameDialog.tagId, renameDialog.newName);
    if (success) {
      toast.success('Tag renamed');
    }
    setRenameDialog(null);
  };

  // Filter out topics if hidden
  const visibleTagCategories = preferences.hideTopics 
    ? TAG_CATEGORIES.filter(cat => cat.key !== 'topics')
    : TAG_CATEGORIES;

  if (loading || seeding || prefsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-[env(safe-area-inset-top)] z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-semibold text-foreground">Account Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* User Info */}
        <section className="p-4 rounded-xl bg-secondary/30 border border-border">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Signed in as</h2>
          <p className="text-foreground font-medium">{user?.email}</p>
        </section>

        {/* Appearance Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose your preferred theme.
          </p>
          <ThemeToggle />
        </section>

        {/* Notifications Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Set up reminders to log your activities.
          </p>
          <NotificationSettings />
        </section>

        {/* Tracking Options Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Tracking options</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Customize what you track in your activities.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">Hide topics</p>
                <p className="text-xs text-muted-foreground">
                  Remove topic tagging from activity form
                </p>
              </div>
              <Switch
                checked={preferences.hideTopics}
                onCheckedChange={(checked) => updatePreference('hideTopics', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">Hide flow state toggle</p>
                <p className="text-xs text-muted-foreground">
                  Auto-mark as flow when engagement is 5
                </p>
              </div>
              <Switch
                checked={preferences.hideFlowToggle}
                onCheckedChange={(checked) => updatePreference('hideFlowToggle', checked)}
              />
            </div>
          </div>
        </section>

        {/* Tag Management */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Manage Tags</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Add, rename, or delete your tags.
          </p>

          <div className="space-y-3">
            {visibleTagCategories.map(({ key, label, description }) => {
              const categoryTags = getTagsForCategory(key);
              const tagCount = categoryTags.length;
              const isExpanded = expandedCategory === key;

              return (
                <div
                  key={key}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : key)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
                  >
                    <div className="text-left">
                      <h3 className="font-medium text-foreground">{label}</h3>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <span className="text-sm text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {tagCount}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                      {/* Add new tag */}
                      <div className="flex gap-2">
                        <Input
                          value={newTagInputs[key]}
                          onChange={(e) => setNewTagInputs(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={`Add new ${label.toLowerCase()} tag...`}
                          className="text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag(key);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddTag(key)}
                          disabled={!newTagInputs[key].trim()}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Existing tags */}
                      {categoryTags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {categoryTags.map((tagItem) => (
                            <span
                              key={tagItem.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border bg-secondary text-foreground border-border"
                            >
                              {tagItem.tag}
                              <div className="flex items-center gap-0.5 ml-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenameDialog({ open: true, tagId: tagItem.id, tagName: tagItem.tag, newName: tagItem.tag });
                                  }}
                                  className="p-0.5 rounded-full hover:bg-primary/20 hover:text-primary transition-colors"
                                  aria-label={`Rename tag ${tagItem.tag}`}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteDialog({ open: true, tagId: tagItem.id, tagName: tagItem.tag });
                                  }}
                                  className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors"
                                  aria-label={`Delete tag ${tagItem.tag}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No tags yet. Add your first one above.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sign Out */}
        <section className="pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </section>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag "{deleteDialog?.tagName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <AlertDialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for the tag "{renameDialog?.tagName}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={renameDialog?.newName || ''}
              onChange={(e) => setRenameDialog(prev => prev ? { ...prev, newName: e.target.value } : null)}
              placeholder="New tag name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRenameConfirm();
                }
              }}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRenameConfirm}
              disabled={!renameDialog?.newName?.trim() || renameDialog?.newName === renameDialog?.tagName}
            >
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Settings;
