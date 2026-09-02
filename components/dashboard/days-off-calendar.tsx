import { CalendarOff } from "lucide-react";
import { listMonthDates, WEEKDAYS } from "@/lib/admin/regras/days-off";
import { todayIsoDate } from "@/lib/admin/regras/bonus-weeks";
import type { DayOffEntry } from "@/lib/dashboard/types";

type DaysOffCalendarProps = {
  month: string;
  summary: string;
  daysOff: DayOffEntry[];
};

export function DaysOffCalendar({
  month,
  summary,
  daysOff,
}: DaysOffCalendarProps) {
  const today = todayIsoDate();
  const dates = listMonthDates(month);
  const firstWeekday = dates[0]
    ? new Date(`${dates[0]}T00:00:00.000Z`).getUTCDay()
    : 0;
  const offDates = new Set(daysOff.map((entry) => entry.date));
  const blanks = Array.from({ length: firstWeekday }, (_, index) => index);

  return (
    <section className="rounded-3xl border border-slate-700/50 bg-slate-800/70 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-violet-400/10 p-2.5">
          <CalendarOff className="h-5 w-5 text-violet-300" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Folgas</h2>
          <p className="text-xs text-slate-400">{summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <p
            key={weekday.value}
            className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
          >
            {weekday.short}
          </p>
        ))}
        {blanks.map((index) => (
          <span key={`blank-${index}`} />
        ))}
        {dates.map((date) => {
          const dayOff = offDates.has(date);
          const isToday = date === today;

          return (
            <span
              key={date}
              className={`flex h-9 items-center justify-center rounded-xl text-sm ${
                dayOff
                  ? "bg-violet-400/20 font-semibold text-violet-200"
                  : "text-slate-400"
              } ${isToday ? "ring-2 ring-cyan-400/80" : ""}`}
            >
              {Number(date.slice(8, 10))}
            </span>
          );
        })}
      </div>
    </section>
  );
}
