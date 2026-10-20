export type ID = string;

export type CalendarKind = 'gregorian' | 'jalali';
export type AccentKind = 'green' | 'blue';

/** A kind of activity: "commute", "cooking", "study"...
 *  `checkpoints` is the optional template sequence. Empty = free stamps, end manually. */
export interface Category {
  id: ID;
  name: string;
  checkpoints: string[];
  createdAt: number;
}

/** One run of an activity (e.g. this morning's commute). Duration = last stamp − first stamp. */
export interface Session {
  id: ID;
  categoryId: ID | null; // null = uncategorized
  createdAt: number;
  closedAt: number | null; // null = still open
}

/** A single timestamp. `at` is epoch ms (UTC); calendars are display-only. */
export interface Stamp {
  id: ID;
  sessionId: ID;
  at: number;
  label: string;
  note: string;
  tags: string[];
}

export interface Settings {
  calendar: CalendarKind;
  accent: AccentKind;
  /** An open session with no stamp for this many hours is closed automatically. */
  autoCloseHours: number;
  /** One-tap tags offered in the stamp editor. */
  quickTags: string[];
}
