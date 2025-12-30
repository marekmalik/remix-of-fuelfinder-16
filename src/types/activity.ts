export interface AEIOUDetails {
  activities?: string[];
  environments?: string[];
  interactions?: string[];
  objects?: string[];
  users?: string[];
}

export type LikertLevel = 1 | 2 | 3 | 4 | 5;

export type EntryType = 'activity' | 'event';

export interface Activity {
  id: string;
  name: string;
  entryType: EntryType;
  engagement: LikertLevel; // 1-5 Likert scale
  energy: LikertLevel; // 1-5 Likert scale
  inFlow: boolean;
  aeiou?: AEIOUDetails;
  topics?: string[];
  feelings?: string[];
  createdAt: Date;
  notes?: string;
}

export type ViewMode = 'journal' | 'add' | 'analytics';
