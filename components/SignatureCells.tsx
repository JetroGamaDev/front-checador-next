"use client";

import { findLeaderSignature, normalizeSignatureLabel } from "@/lib/leaderSignature";

// Celdas de la columna "Firmado" de los listados de incidencias

const BADGE = "badge rounded-pill px-3 py-2 fw-semibold border";

type SignatureLike = { label?: string; url?: string; signedByRole?: string | null };

function SignedBadge({ text }: { text: string }) {
  return (
    <span className={`${BADGE} bg-success-subtle text-success-emphasis border-success-subtle`} style={{ fontSize: "0.7rem" }}>
      <i className="bi bi-check-lg me-1" />
      {text}
    </span>
  );
}

/**
 * Casilla "Líder" (la ve el líder y el subgerente): mientras no tenga imagen, la misma ✗ de siempre;
 * ya firmada, palomita con quién firmó.
 * `signerLabel`: cómo se llama al titular de la casilla ("Gerente", o "Dirección" si quien firma es de Dirección).
 */
export function LeaderSlotSignatureCell({
  signatures,
  signerLabel = "Gerente",
  pendingTitle = "Pendiente de tu firma",
}: {
  signatures?: SignatureLike[] | null;
  signerLabel?: string;
  pendingTitle?: string;
}) {
  const leaderSig = findLeaderSignature(signatures);

  if (!leaderSig?.url) {
    return <i className="bi bi-x-lg text-danger ms-4" title={pendingTitle} />;
  }

  return <SignedBadge text={leaderSig.signedByRole === "SUBMANAGER" ? "Subgerente" : signerLabel} />;
}

/** Penalizaciones de líderes: hay una firma de Dirección por cada persona configurada y basta con una. */
export function directionGroupSigned(signatures?: SignatureLike[] | null) {
  return (signatures ?? []).some((s) => normalizeSignatureLabel(s.label) === "direccion" && !!s.url);
}

export function DirectionSignedBadge() {
  return <SignedBadge text="Dirección" />;
}

/** Dirección (isExtra) ve la incidencia, pero no le toca firmarla. */
export function NotApplicableBadge() {
  return (
    <span className={`${BADGE} bg-secondary-subtle text-secondary-emphasis border-secondary-subtle`} style={{ fontSize: "0.7rem" }}>
      No aplica
    </span>
  );
}
