import { HOUR_HEIGHT, TOP_ZONE_HEIGHT } from "@/lib/calendar/time-grid";

const HOURS = Array.from({ length: 24 }, (_, h) => h);

function formatHourLabel(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${period}`;
}

/** Time-of-day labels aligned to each row's hourly grid. */
export function HoursAxis() {
  return (
    <div className="flex w-11 shrink-0 flex-col" style={{ paddingTop: TOP_ZONE_HEIGHT }}>
      {HOURS.map((hour) => (
        <div
          key={hour}
          style={{ height: HOUR_HEIGHT }}
          className="flex items-start justify-end text-[10px] leading-none text-neutral-400"
        >
          <span className="pr-1">{formatHourLabel(hour)}</span>
        </div>
      ))}
    </div>
  );
}
