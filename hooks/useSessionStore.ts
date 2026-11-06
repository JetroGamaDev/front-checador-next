"use client"
import { useRef } from "react";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import { isEmployeeSession } from "@/lib/employeeVisibility";

export { isEmployeeSession };

export function useSessionSnapshot() {
  const { data: session } = useSession();
  const snapshot = useRef<{
    uid: Session["user"] | undefined;
  } | null>(null);

  if (!snapshot.current && session) {
    const user = session.user;

    // Un empleado de RH entra como empleado: el back le marca isDoh por su departamento, pero en su sesión de
    // empleado los formularios deben comportarse como con cualquier empleado (sus propios datos y campos bloqueados)
    snapshot.current = {
      uid: user && isEmployeeSession(user)
        ? {
          ...user,
          isDoh: false,
          roles: user.roles ? { ...user.roles, isDoh: false, isApproverDoh: false } : user.roles,
        }
        : user || undefined,
    };
  }

  return snapshot.current;
}
