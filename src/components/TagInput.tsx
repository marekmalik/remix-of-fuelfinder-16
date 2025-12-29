import { useState, KeyboardEvent } from "react";
import { X, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  sortedSuggestions?: string[]; // Pre-sorted by frequency
}

const COLLAPSED_LIMIT = 10;
const EXPAND_THRESHOLD = 10;

const TagInput = ({ tags, onChange, placeholder, suggestions = [], sortedSuggestions }: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Use pre-sorted suggestions if provided, otherwise use original order
  const orderedSuggestions = sortedSuggestions || suggestions;

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const filteredSuggestions = orderedSuggestions.filter(
    s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s.toLowerCase())
  );

  // Available suggestions (not already selected)
  const availableSuggestions = orderedSuggestions.filter(
    s => !tags.includes(s.toLowerCase())
  );

  const shouldShowExpandButton = availableSuggestions.length > EXPAND_THRESHOLD;
  const visibleSuggestions = isExpanded 
    ? availableSuggestions 
    : availableSuggestions.slice(0, COLLAPSED_LIMIT);
  const hiddenCount = availableSuggestions.length - COLLAPSED_LIMIT;

  return (
    <div className="space-y-3">
      {/* Selected tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="p-0.5 rounded-full hover:bg-primary/80 transition-colors"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Suggested tags: visible at first glance */}
      {availableSuggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {visibleSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-foreground text-xs border border-border hover:bg-secondary/70 transition-colors"
              >
                <Plus className="w-3 h-3 text-muted-foreground" />
                {suggestion}
              </button>
            ))}
          </div>
          
          {/* Show all / Show less button */}
          {shouldShowExpandButton && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show all ({hiddenCount} more)
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Add new tag (only if necessary) */}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={placeholder || "Add a new tag and press Enter"}
          className="text-sm"
        />

        {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 py-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filteredSuggestions.slice(0, 8).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(suggestion)}
                className="w-full px-3 py-2 text-sm text-left hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <Plus className="w-3 h-3 text-muted-foreground" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TagInput;

