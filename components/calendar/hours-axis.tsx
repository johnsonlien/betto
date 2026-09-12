const HOURS = Array.from({ length: 24 }, (_, h) => h);

function formatHourLabel(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${period}`;
}

/**
 * A time-of-day reference strip next to a row of day columns. Events aren't
 * positioned by time (they're a simple stacked list per day), so this is a
 * visual reference only — not aligned to where any specific event sits.
 */
export function HoursAxis() {
  return (
    <div className="flex w-11 shrink-0 flex-col pt-10">
      {HOURS.map((hour) => (
        <div key={hour} className="h-6 text-right text-[10px] leading-6 text-neutral-400">
          {formatHourLabel(hour)}
        </div>
      ))}
    </div>
  );
}
