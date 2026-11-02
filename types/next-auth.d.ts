import { IRolesMe, Permission, UserRole } from "@/lib/definitions";
import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    apiToken: string;
    role: UserRole;
    permissions: Permission[];
    status: 1 | 2 | 3;
    idEmployee: number | null;
    isDoh: boolean;
    isLeader?: boolean;
    roles:IRolesMe
    twoFactorEnabled?: boolean;
    twoFactorPending?: boolean;
    // Preferencia del perfil "Mostrar tutoriales" (viene de /me; las sesiones viejas no la traen = true)
    enableTutorials?: boolean;
    // "employee": entró con número de empleado y NIP/contraseña; "user": usuario del sistema
    sessionType?: "user" | "employee";
  }
}
