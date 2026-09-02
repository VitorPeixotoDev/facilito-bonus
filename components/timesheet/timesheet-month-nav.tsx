"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { persistAdminAnalysisMonth } from "@/lib/admin/arquivos/collaborator-actions";
import { timesheetMonthHref } from "@/lib/admin/arquivos/months";
import {
  formatMonthName,
  formatMonthYear,
} from "@/lib/dashboard/formatters";

type TimesheetMonthNavProps = {
  selectedMonth: string;
  currentMonth: string;
  availableMonths: string[];
  basePath: string;
  persistMonth?: boolean;
};

export function TimesheetMonthNav({
  selectedMonth,
  currentMonth,
  availableMonths,
  basePath,
  persistMonth = false,
}: TimesheetMonthNavProps) {
  const months = [...new Set([...availableMonths, currentMonth])].sort((left, right) =>
    left.localeCompare(right)
  );
  const index = months.indexOf(selectedMonth);
  const previous = index > 0 ? months[index - 1] : null;
  const next = index >= 0 && index < months.length - 1 ? months[index + 1] : null;
  const isCurrent = selectedMonth === currentMonth;

  useEffect(() => {
    if (!persistMonth) {
      return;
    }

    void persistAdminAnalysisMonth(selectedMonth);
  }, [persistMonth, selectedMonth]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {previous ? (
          <Link
            href={timesheetMonthHref(basePath, previous)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700/70 text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
            aria-label={`Ver ${formatMonthYear(previous)}`}
            onClick={
              persistMonth
                ? () => {
                    void persistAdminAnalysisMonth(previous);
                  }
                : undefined
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-white">
            {formatMonthYear(selectedMonth)}
          </p>
          {isCurrent ? (
            <p className="text-xs font-medium text-cyan-300">Mês atual</p>
          ) : (
            <p className="text-xs text-slate-500">Histórico</p>
          )}
        </div>
        {next ? (
          <Link
            href={timesheetMonthHref(basePath, next)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700/70 text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
            aria-label={`Ver ${formatMonthYear(next)}`}
            onClick={
              persistMonth
                ? () => {
                    void persistAdminAnalysisMonth(next);
                  }
                : undefined
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 text-slate-600">
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
      {months.length > 1 ? (
        <nav
          aria-label="Meses do ponto"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {months.map((month) => {
            const selected = month === selectedMonth;
            const current = month === currentMonth;

            return (
              <Link
                key={month}
                href={timesheetMonthHref(basePath, month)}
                className={`inline-flex shrink-0 items-center rounded-full border px-3 py-2 text-xs font-medium transition ${
                  selected
                    ? "border-cyan-400/70 bg-cyan-400/15 text-cyan-200"
                    : "border-slate-700/70 bg-slate-900/40 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300"
                }`}
                aria-current={selected ? "page" : undefined}
                onClick={
                  persistMonth
                    ? () => {
                        void persistAdminAnalysisMonth(month);
                      }
                    : undefined
                }
              >
                {formatMonthName(month)}
                {current ? " · atual" : ""}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
