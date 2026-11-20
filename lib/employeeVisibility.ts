import { Session } from "next-auth";

// Sesión de empleado (número de empleado + NIP/contraseña). Las sesiones iniciadas antes de guardar
// sessionType no lo traen: un empleado nunca tiene correo, un usuario del sistema siempre
export function isEmployeeSession(user?: Session["user"] | null) {
  if (!user) return false;
  if (user.sessionType) return user.sessionType === "employee";
  return !user.email && user.role !== "CHECADOR";
}

// Mismo criterio que `readInput` en los componentes de incidencias: el usuario no tiene ningún rol
// de líder/extra/RH/aprobador. En la sesión de empleado se ignoran isDoh e isApproverDoh
// (igual que en useSessionSnapshot)
export function isOnlyEmployee(user?: Session["user"] | null) {
  const roles = user?.roles;
  const employeeSession = isEmployeeSession(user);

  return !roles?.isLeader
    && !roles?.isExtra
    && (employeeSession || !roles?.isDoh)
    && !roles?.isApproverLeaders
    && (employeeSession || !roles?.isApproverDoh);
}

type MaybeCancelled = { delete?: { delete?: boolean } | null };

export function isCancelled(row: MaybeCancelled) {
  return row.delete?.delete === true;
}

type OwnIncidence = MaybeCancelled & {
  idEmployee?: number | null;
  employee?: { id?: number | null } | null;
  leaderApproval?: string | null;
};

// Empleado (sesión de empleado, sin DOH) sobre SUS PROPIAS vacaciones, permisos u horas extra:
// solo puede eliminar las pendientes; las aprobadas o rechazadas se quedan (las cancela DOH).
// Recibe el usuario real de useSession(), no el de useSessionSnapshot (ese apaga isDoh/isApproverDoh).
// Líderes viendo a su equipo, DOH y usuarios del sistema no se bloquean. El back valida siempre.
export function isOwnIncidenceDeleteLocked(user: Session["user"] | null | undefined, row: OwnIncidence | null | undefined) {
  if (!user || !row || isCancelled(row)) return false;
  if (!isEmployeeSession(user)) return false;

  const roles = user.roles as { isDoh?: boolean; isApproverDoh?: boolean } | undefined;
  if (roles?.isDoh || roles?.isApproverDoh) return false;

  const ownerId = Number(row.idEmployee ?? row.employee?.id);
  if (!user.idEmployee || !ownerId || ownerId !== Number(user.idEmployee)) return false;

  // Sin el dato no se oculta: el back responde 403 si no procede
  return row.leaderApproval === "APPROVED" || row.leaderApproval === "REFUSED";
}

// La API pagina y cuenta incluyendo los registros cancelados. Para quitarlos sin romper el total ni
// las páginas, se piden todas las páginas, se filtran los cancelados y se pagina aquí.
// Solo se usa para el usuario que es únicamente empleado (ve solo sus propios registros).
export async function fetchPagedWithoutCancelled<T extends MaybeCancelled>(
  fetchPage: (page: number, limit: number) => Promise<{ data: T[]; total: number }>,
  page: number,
  limit: number,
  batchSize = 100
): Promise<{ data: T[]; total: number }> {
  const all: T[] = [];
  let current = 1;
  let apiTotal = Infinity;

  while (all.length < apiTotal) {
    const res = await fetchPage(current, batchSize);
    apiTotal = Number(res.total ?? 0);
    all.push(...res.data);
    if (res.data.length < batchSize) break;
    current++;
  }

  const visible = all.filter((row) => !isCancelled(row));
  const start = (page - 1) * limit;

  return {
    data: visible.slice(start, start + limit),
    total: visible.length,
  };
}
