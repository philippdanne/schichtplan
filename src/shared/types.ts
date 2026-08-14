export interface RoleTag {
  id: string;
  name: string;
  color: string;
}

export interface Helper {
  id: string;
  name: string;
  /** activity tags, e.g. "Zapfen", "Kellnern", "Wertmarkenverkauf" */
  tags: string[];
  roleTagId: string | null;
  /** Days the helper is available, as "eventId:date" keys. `null` = always available. */
  availability: string[] | null;
}

export interface EventTag {
  id: string;
  eventId: string;
  name: string;
  sortOrder: number;
}

export interface EventSummary {
  id: string;
  name: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  ablaufplan: string;
}

export interface Shift {
  id: string;
  eventId: string;
  tagId: string;
  name: string;
  description: string;
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  assignedHelperIds: string[];
}

export interface NewShiftInput {
  eventId: string;
  tagId: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
}

export interface NewEventInput {
  name: string;
  startDate: string;
  endDate: string;
}

export interface NewHelperInput {
  name: string;
  tags: string[];
  roleTagId: string | null;
  availability: string[] | null;
}
