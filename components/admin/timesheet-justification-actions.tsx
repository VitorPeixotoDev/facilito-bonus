"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SavedSuggestionField } from "@/components/admin/saved-suggestion-field";
import { reviewTimesheetJustification } from "@/lib/admin/arquivos/justification-actions";
import {
  bonusScheduleFrom,
  dayBonusStatus,
} from "@/lib/admin/regras/calculate-bonus";
import { todayIsoDate } from "@/lib/admin/regras/bonus-weeks";
import {
  mergeSavedSuggestions,
  parseSavedSuggestion,
  SAVED_SUGGESTION_MAX_LENGTH,
} from "@/lib/admin/saved-suggestions";
import type { CollaboratorTimesheetEvent } from "@/lib/admin/arquivos/types";
import type { WorkSchedule } from "@/lib/admin/regras/types";

type TimesheetJustificationActionsProps = {
  event: CollaboratorTimesheetEvent;
  schedule: WorkSchedule;
  justificationReasons: string[];
};

function defaultReviewNote(event: CollaboratorTimesheetEvent) {
  return (
    event.justificationReviewNote ??
    event.justificationClaimNote?.trim().slice(0, SAVED_SUGGESTION_MAX_LENGTH) ??
    ""
  );
}

export function TimesheetJustificationActions({
  event,
  schedule,
  justificationReasons,
}: TimesheetJustificationActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [note, setNote] = useState(() => defaultReviewNote(event));
  const [savedReasons, setSavedReasons] = useState(justificationReasons);
  const status = dayBonusStatus(
    {
      eventDate: event.eventDate,
      isDayOff: event.isDayOff,
      isAbsence: event.isAbsence,
      latenessMinutes: event.latenessMinutes,
      justificationStatus: event.justificationStatus,
      justificationKind: event.justificationKind,
    },
    bonusScheduleFrom(schedule),
    todayIsoDate()
  );

  useEffect(() => {
    setSavedReasons((current) =>
      mergeSavedSuggestions(current, justificationReasons)
    );
  }, [justificationReasons]);

  useEffect(() => {
    setNote(defaultReviewNote(event));
    setComposing(false);
  }, [event.id, event.justificationReviewNote, event.justificationClaimNote]);

  if (event.isDayOff) {
    return null;
  }

  const canReview =
    status.isOccurrence ||
    event.justificationStatus === "pending" ||
    event.justificationStatus === "justified" ||
    event.justificationStatus === "rejected" ||
    status.isLateInfraction;

  if (!canReview && event.justificationStatus === "unjustified") {
    return null;
  }

  function review(
    nextStatus: "justified" | "rejected" | "unjustified",
    reviewNote = ""
  ) {
    startTransition(async () => {
      const result = await reviewTimesheetJustification(
        event.id,
        nextStatus,
        reviewNote
      );
      setMessage(result.message);
      if (result.ok) {
        if (nextStatus === "justified" && reviewNote) {
          setSavedReasons((current) =>
            mergeSavedSuggestions(current, [reviewNote])
          );
        }
        setComposing(false);
        router.refresh();
      }
    });
  }

  function openComposer() {
    setNote(defaultReviewNote(event));
    setComposing(true);
    setMessage(null);
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {event.justificationClaimNote ? (
        <p className="text-xs text-slate-400">
          Pedido do colaborador
          {event.justificationKind
            ? ` (${event.justificationKind === "absence" ? "falta" : "atraso"})`
            : ""}
          : {event.justificationClaimNote}
        </p>
      ) : null}
      {event.justificationStatus === "justified" &&
      event.justificationReviewNote ? (
        <p className="text-xs text-emerald-300">
          Justificativa: {event.justificationReviewNote}
        </p>
      ) : null}
      {composing ? (
        <div className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-900/60 p-3">
          <SavedSuggestionField
            label="Justificativa"
            value={note}
            onChange={setNote}
            suggestions={savedReasons}
            placeholder="Digite para buscar ou cadastrar uma justificativa"
            emptyNone="Nenhuma justificativa salva ainda. O texto digitado será salvo como sugestão."
            emptyNoMatch="Nenhuma justificativa salva corresponde. O texto digitado será salvo como sugestão."
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !parseSavedSuggestion(note)}
              onClick={() => review("justified", note)}
              className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending
                ? "Salvando..."
                : event.justificationStatus === "pending"
                  ? "Aceitar justificativa"
                  : "Confirmar justificativa"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setComposing(false)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {event.justificationStatus !== "justified" ? (
            <button
              type="button"
              disabled={pending}
              onClick={openComposer}
              className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-60"
            >
              {event.justificationStatus === "pending"
                ? "Aceitar justificativa"
                : "Marcar justificado"}
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={openComposer}
              className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-60"
            >
              Alterar justificativa
            </button>
          )}
          {event.justificationStatus === "pending" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => review("rejected")}
              className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-60"
            >
              Recusar
            </button>
          ) : null}
          {event.justificationStatus !== "unjustified" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => review("unjustified")}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
            >
              Marcar injustificado
            </button>
          ) : null}
        </div>
      )}
      {message ? <p className="text-xs text-slate-400">{message}</p> : null}
    </div>
  );
}
