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
