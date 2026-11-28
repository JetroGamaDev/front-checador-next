import axios from "axios";

// Casilla "Líder" de las incidencias: la puede aprobar/firmar el líder o el subgerente del departamento (una sola vez)

export type LeaderSlotRole = "LEADER" | "SUBMANAGER" | "EXTRA";

export interface ISubManagerRef {
  id: number;
  name: string;
  lastName: string;
}

// Campos que manda el back en el detalle de permisos, vacaciones y horas extra.
// Opcionales: los registros viejos no los traen y se comportan como antes (solo el líder).
export interface ILeaderSlotFields {
  idSubManager?: number | null;
  subManager?: ISubManagerRef | null;
  leaderApprovedBy?: number | null;
  leaderApprovedByRole?: LeaderSlotRole | null;
}

export function normalizeSignatureLabel(label?: string | null) {
  return (label ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function isLeaderLabel(label?: string | null) {
  return normalizeSignatureLabel(label) === "lider";
}

export function findLeaderSignature<T extends { label?: string }>(signatures?: T[] | null): T | null {
  return signatures?.find((s) => isLeaderLabel(s.label)) ?? null;
}

/**
 * Listados: la sesión es de subgerente y la fila es de otra persona con casilla "Líder".
 * El back solo le lista al subgerente las incidencias de su departamento (o las que él resolvió),
 * así que no hace falta `idSubManager` por fila.
 */
export function isSubManagerListRow({
  isSubManager,
  meId,
  ownerId,
  signatures,
}: {
  isSubManager?: boolean;
  meId: number;
  ownerId?: number | null;
  signatures?: { label?: string }[] | null;
}) {
  return !!isSubManager
    && ownerId != null
    && Number(ownerId) !== meId
    && !!findLeaderSignature(signatures);
}

export function subManagerName(sub?: ISubManagerRef | null) {
  if (!sub) return "";
  return `${sub.name ?? ""} ${sub.lastName ?? ""}`.trim();
}

/**
 * Quién puede subir la imagen de la casilla "Líder" una vez aprobada o rechazada:
 * quien la aprobó (líder o subgerente). Si la aprobó un extra (Dirección), la casilla "Líder" no es suya.
 * Registros viejos sin `leaderApprovedBy`: el líder, como antes.
 */
export function canUploadLeaderSignature({
  meId,
  isOwn,
  isLeaderOfRecord,
  leaderPending,
  leaderSigned,
  hasLeaderSignature,
  leaderApprovedBy,
  leaderApprovedByRole,
}: {
  meId: number;
  isOwn: boolean;
  isLeaderOfRecord: boolean;
  leaderPending: boolean;
  leaderSigned: boolean;
  hasLeaderSignature: boolean;
  leaderApprovedBy?: number | null;
  leaderApprovedByRole?: LeaderSlotRole | null;
}) {
  if (!hasLeaderSignature || leaderSigned || leaderPending || isOwn) return false;
  if (leaderApprovedByRole === "EXTRA") return false;
  if (leaderApprovedBy != null) return Number(leaderApprovedBy) === meId;
  return isLeaderOfRecord;
}

/** Mensaje y código HTTP de un error de axios (para detectar el 409 de la casilla "Líder"). */
export function axiosErrorInfo(error: unknown, fallback = "Error en la respuesta") {
  if (axios.isAxiosError(error)) {
    return {
      message: (error.response?.data?.message as string | undefined) || fallback,
      status: error.response?.status,
    };
  }
  return {
    message: error instanceof Error && error.message ? error.message : fallback,
    status: undefined,
  };
}

export class ApiActionError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/** Para los `.catch` de axios: conserva el mensaje del back y el código HTTP. */
export function toApiActionError(error: unknown) {
  const { message, status } = axiosErrorInfo(error);
  return new ApiActionError(message, status);
}
