export type EventCategory = "LODGING" | "FOOD" | "ACTIVITY" | "TRANSPORT" | "OTHER";

export type EventItem = {
  id: string;
  title: string;
  notes: string | null;
  startTime: string | null; // "HH:MM"
  endTime: string | null; // "HH:MM"
  category: EventCategory | null;
  locationId: string | null;
  locationName: string | null;
  city: string | null;
  cost: string | null; // decimal string, e.g. "42.50"
  reservationUrl: string | null;
};

export type DayColumnData = {
  date: string; // "YYYY-MM-DD"
  label: string;
  inRange: boolean;
};

export type LocationOption = {
  id: string;
  name: string;
};

export type MapLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** dates ("YYYY-MM-DD") of events in this calendar that reference this location */
  eventDates: string[];
};
