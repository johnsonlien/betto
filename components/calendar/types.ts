export type EventItem = {
  id: string;
  title: string;
  notes: string | null;
  startTime: string | null; // "HH:MM"
  endTime: string | null; // "HH:MM"
};

export type DayColumnData = {
  date: string; // "YYYY-MM-DD"
  label: string;
  inRange: boolean;
};
