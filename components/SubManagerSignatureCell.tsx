"use client";

import { findLeaderSignature, LeaderSlotRole } from "@/lib/leaderSignature";
import OverLay from "./templates/OverLay";

const BADGE = "badge rounded-pill px-3 py-2 fw-semibold border";

/**
 * Columna "Firmado" de los listados cuando la sesión es de subgerente y la fila no tiene una firma suya:
 * - Él resolvió la casilla "Líder": palomita o tache, igual que cualquier firma propia.
 * - Ya la resolvió el líder (u otra persona): "Firmado por el líder".
 * - Sigue pendiente: "Firma opcional" (puede firmar, pero no está obligado).
 */
export default function SubManagerSignatureCell({
  meId,
  signatures,
  leaderApproval,
  leaderApprovedBy,
  leaderApprovedByRole,
}: {
  meId: number;
  signatures?: { label?: string; url?: string; signedBy?: number | null; signedByRole?: string | null }[] | null;
  // Penalizaciones no tienen paso de aprobación: solo cuenta la imagen de la firma
  leaderApproval?: string | null;
  leaderApprovedBy?: number | null;
  leaderApprovedByRole?: LeaderSlotRole | null;
}) {
  const leaderSig = findLeaderSignature(signatures);
  const signed = !!leaderSig?.url;
  const resolvedByMe = Number(leaderSig?.signedBy) === meId || Number(leaderApprovedBy) === meId;

  if (resolvedByMe) {
    return signed ? (
      <i className="bi bi-check-lg text-success ms-4" title="Firmado" />
    ) : (
      <i className="bi bi-x-lg text-danger ms-4" title="Pendiente de tu firma" />
    );
  }

  const resolved = signed || (!!leaderApproval && leaderApproval !== "PENDING");

  if (resolved) {
    const text = leaderApprovedByRole === "EXTRA"
      ? "Firmado por Dirección"
      : leaderSig?.signedByRole === "SUBMANAGER" || leaderApprovedByRole === "SUBMANAGER"
        ? "Firmado por el subgerente"
        : "Firmado por el líder";

    return (
      <span className={`${BADGE} bg-success-subtle text-success-emphasis border-success-subtle`} style={{ fontSize: "0.7rem" }}>
        <i className="bi bi-check2-circle me-1" />
        {text}
      </span>
    );
  }

  return (
    <OverLay string="Como subgerente puedes firmar en lugar del líder, pero no es obligatorio" placement="top">
      <span
        className={`${BADGE} bg-info-subtle text-info-emphasis border-info-subtle`}
        style={{ fontSize: "0.7rem", cursor: "help" }}
      >
        <i className="bi bi-pen me-1" />
        Firma opcional
      </span>
    </OverLay>
  );
}
