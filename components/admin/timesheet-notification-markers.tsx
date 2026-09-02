import { AlertTriangle, BadgeCheck, Clock, Hourglass, UserX } from "lucide-react";
import type { ImportedCollaborator } from "@/lib/admin/arquivos/types";

type TimesheetNotificationMarkersProps = {
  collaborator: Pick<
    ImportedCollaborator,
    | "toleranceAlertCount"
    | "absenceCount"
    | "justifiedAbsenceCount"
    | "pendingJustificationCount"
    | "pendingAbsenceJustificationCount"
    | "pendingLatenessJustificationCount"
  >;
};

function markerClassName(
  tone: "warning" | "absence" | "pending" | "justified"
) {
  return [
    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
    tone === "warning"
      ? "bg-yellow-400/10 text-yellow-500"
      : tone === "pending"
        ? "bg-amber-400/10 text-amber-300"
        : tone === "justified"
          ? "bg-emerald-400/10 text-emerald-300"
          : "bg-rose-400/10 text-rose-400",
  ].join(" ");
}

export function TimesheetNotificationMarkers({
  collaborator,
}: TimesheetNotificationMarkersProps) {
  const pendingAbsence = collaborator.pendingAbsenceJustificationCount;
  const pendingLateness = collaborator.pendingLatenessJustificationCount;
  const pendingOther = Math.max(
    0,
    collaborator.pendingJustificationCount - pendingAbsence - pendingLateness
  );

  const markers = [
    pendingAbsence > 0
      ? {
          key: "pending-absence",
          tone: "pending" as const,
          icon: Hourglass,
          label: "Falta pendente",
          count: pendingAbsence,
          description:
            pendingAbsence === 1
              ? "1 justificativa de falta aguardando análise"
              : `${pendingAbsence} justificativas de falta aguardando análise`,
        }
      : null,
    pendingLateness > 0
      ? {
          key: "pending-lateness",
          tone: "pending" as const,
          icon: Clock,
          label: "Atraso pendente",
          count: pendingLateness,
          description:
            pendingLateness === 1
              ? "1 justificativa de atraso aguardando análise"
              : `${pendingLateness} justificativas de atraso aguardando análise`,
        }
      : null,
    pendingOther > 0
      ? {
          key: "pending",
          tone: "pending" as const,
          icon: Hourglass,
          label: "Justificativa pendente",
          count: pendingOther,
          description:
            pendingOther === 1
              ? "1 justificativa aguardando análise"
              : `${pendingOther} justificativas aguardando análise`,
        }
      : null,
    collaborator.toleranceAlertCount > 0
      ? {
          key: "tolerance",
          tone: "warning" as const,
          icon: AlertTriangle,
          label: "Alerta de tolerância",
          count: collaborator.toleranceAlertCount,
          description:
            collaborator.toleranceAlertCount === 1
              ? "1 alerta de tolerância no ponto do mês"
              : `${collaborator.toleranceAlertCount} alertas de tolerância no ponto do mês`,
        }
      : null,
    collaborator.absenceCount > 0
      ? {
          key: "absence",
          tone: "absence" as const,
          icon: UserX,
          label: "Falta registrada",
          count: collaborator.absenceCount,
          description:
            collaborator.absenceCount === 1
              ? "1 falta registrada no ponto do mês"
              : `${collaborator.absenceCount} faltas registradas no ponto do mês`,
        }
      : null,
    collaborator.justifiedAbsenceCount > 0
      ? {
          key: "justified",
          tone: "justified" as const,
          icon: BadgeCheck,
          label: "Falta justificada",
          count: collaborator.justifiedAbsenceCount,
          description:
            collaborator.justifiedAbsenceCount === 1
              ? "1 falta justificada no ponto do mês"
              : `${collaborator.justifiedAbsenceCount} faltas justificadas no ponto do mês`,
        }
      : null,
  ].flatMap((marker) => (marker ? [marker] : []));

  if (markers.length === 0) {
    return null;
  }

  return (
    <ul
      className="flex flex-wrap items-center gap-1.5"
      aria-label="Notificações do ponto do mês"
    >
      {markers.map((marker) => {
        const Icon = marker.icon;

        return (
          <li key={marker.key}>
            <span
              className={markerClassName(marker.tone)}
              title={marker.description}
              aria-label={marker.description}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
              <span aria-hidden="true">{marker.label}</span>
              <span aria-hidden="true" className="tabular-nums">
                {marker.count}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
