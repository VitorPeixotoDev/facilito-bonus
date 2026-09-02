import { BonusReceipts } from "@/components/dashboard/bonus-receipts";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSync } from "@/components/dashboard/dashboard-sync";
import { DaysOffCalendar } from "@/components/dashboard/days-off-calendar";
import { RecentStatement } from "@/components/dashboard/recent-statement";
import { TodayJustificationCard } from "@/components/dashboard/today-justification-card";
import { WeekStrip } from "@/components/dashboard/week-strip";
import { TimesheetMonthNav } from "@/components/timesheet/timesheet-month-nav";
import { startOfMonth } from "@/lib/admin/arquivos/aej-timesheet";
import { todayIsoDate } from "@/lib/admin/regras/bonus-weeks";
import type { EmployeeDashboardData } from "@/lib/dashboard/types";

type EmployeeDashboardProps = {
  data: EmployeeDashboardData;
  showSignOut?: boolean;
  showAdminLink?: boolean;
};

export function EmployeeDashboard({
  data,
  showSignOut = false,
  showAdminLink = false,
}: EmployeeDashboardProps) {
  return (
    <div className="min-h-dvh bg-slate-900 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-slate-200">
      <DashboardSync employeeId={data.employeeId} />
      <div className="mx-auto w-full max-w-lg space-y-4 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <DashboardHeader
          employeeName={data.employeeName}
          referenceMonth={data.referenceMonth}
          isCurrentMonth={data.isCurrentMonth}
          earnedAmount={data.earnedAmount}
          bonusCeiling={data.bonusCeiling}
          completeWeeks={data.completeWeeks}
          lastTimesheetAt={data.lastTimesheetAt}
          showSignOut={showSignOut}
          showAdminLink={showAdminLink}
        />
        <TodayJustificationCard today={data.today} />
        <BonusReceipts receipts={data.receipts} />
        <DaysOffCalendar
          month={data.referenceMonth}
          summary={data.daysOffSummary}
          daysOff={data.daysOff}
        />
        <WeekStrip goals={data.goals} />
        <TimesheetMonthNav
          selectedMonth={data.referenceMonth}
          currentMonth={startOfMonth(todayIsoDate())}
          availableMonths={data.availableMonths}
          basePath="/"
        />
        <RecentStatement entries={data.recentEntries} />
      </div>
    </div>
  );
}
