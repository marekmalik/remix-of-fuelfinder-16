import { AEIOUDetails } from "@/types/activity";

interface PrefillResult {
  tags: AEIOUDetails;
  summary: string;
  error?: string;
}

interface TagLibrary {
  activities: string[];
  environments: string[];
  interactions: string[];
  objects: string[];
  users: string[];
}

const buildPrompt = (entryName: string, tagLibrary: TagLibrary): string => {
  return `Given this activity/event name: "${entryName}"

Please suggest relevant tags from ONLY these existing tags. Do not suggest any tags that are not in these lists.

Available tags by category:
- Activities: ${tagLibrary.activities.join(', ') || 'none'}
- Environments: ${tagLibrary.environments.join(', ') || 'none'}
- Interactions: ${tagLibrary.interactions.join(', ') || 'none'}
- Objects: ${tagLibrary.objects.join(', ') || 'none'}
- Users/People: ${tagLibrary.users.join(', ') || 'none'}

Return a JSON object with exactly this structure (include only tags from the lists above):
{
  "activities": ["tag1", "tag2"],
  "environments": ["tag1"],
  "interactions": ["tag1"],
  "objects": ["tag1", "tag2"],
  "users": ["tag1"]
}

If no tags match a category, return an empty array for that category.
Return ONLY the JSON object, no other text.`;
};

const parseAIResponse = (responseText: string, tagLibrary: TagLibrary): AEIOUDetails => {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response');
      return {};
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const result: AEIOUDetails = {};

    const categories = ['activities', 'environments', 'interactions', 'objects', 'users'] as const;
    
    for (const category of categories) {
      if (Array.isArray(parsed[category])) {
        const validTags = parsed[category].filter((tag: string) => 
          typeof tag === 'string' && 
          tagLibrary[category].some(t => t.toLowerCase() === tag.toLowerCase())
        );
        if (validTags.length > 0) {
          const normalizedTags = validTags.map((tag: string) => 
            tagLibrary[category].find(t => t.toLowerCase() === tag.toLowerCase()) || tag
          );
          result[category] = normalizedTags;
        }
      }
    }

    return result;
  } catch (err) {
    console.error('Error parsing AI response:', err);
    return {};
  }
};

const buildSummary = (tags: AEIOUDetails): string => {
  const parts: string[] = [];
  
  if (tags.activities?.length) {
    parts.push(`Activities: ${tags.activities.join(', ')}`);
  }
  if (tags.environments?.length) {
    parts.push(`Environments: ${tags.environments.join(', ')}`);
  }
  if (tags.interactions?.length) {
    parts.push(`Interactions: ${tags.interactions.join(', ')}`);
  }
  if (tags.objects?.length) {
    parts.push(`Objects: ${tags.objects.join(', ')}`);
  }
  if (tags.users?.length) {
    parts.push(`People: ${tags.users.join(', ')}`);
  }

  if (parts.length === 0) {
    return 'No matching tags found';
  }

  return parts.join(' | ');
};

export const prefillWithOpenAI = async (
  entryName: string,
  apiKey: string,
  tagLibrary: TagLibrary
): Promise<PrefillResult> => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that suggests tags for activities. Always return valid JSON only.',
          },
          {
            role: 'user',
            content: buildPrompt(entryName, tagLibrary),
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tags = parseAIResponse(content, tagLibrary);
    
    return {
      tags,
      summary: buildSummary(tags),
    };
  } catch (err) {
    console.error('OpenAI prefill error:', err);
    return {
      tags: {},
      summary: '',
      error: err instanceof Error ? err.message : 'Failed to prefill with OpenAI',
    };
  }
};

export const prefillWithGemini = async (
  entryName: string,
  apiKey: string,
  tagLibrary: TagLibrary
): Promise<PrefillResult> => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildPrompt(entryName, tagLibrary),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tags = parseAIResponse(content, tagLibrary);
    
    return {
      tags,
      summary: buildSummary(tags),
    };
  } catch (err) {
    console.error('Gemini prefill error:', err);
    return {
      tags: {},
      summary: '',
      error: err instanceof Error ? err.message : 'Failed to prefill with Gemini',
    };
  }
};

export const prefillAEIOUTags = async (
  entryName: string,
  openaiKey: string | undefined,
  geminiKey: string | undefined,
  tagLibrary: TagLibrary
): Promise<PrefillResult> => {
  if (!entryName.trim()) {
    return {
      tags: {},
      summary: '',
      error: 'Please enter an entry name first',
    };
  }

  if (openaiKey) {
    return prefillWithOpenAI(entryName, openaiKey, tagLibrary);
  }

  if (geminiKey) {
    return prefillWithGemini(entryName, geminiKey, tagLibrary);
  }

  return {
    tags: {},
    summary: '',
    error: 'Please add an OpenAI or Gemini API key in Settings',
  };
};
