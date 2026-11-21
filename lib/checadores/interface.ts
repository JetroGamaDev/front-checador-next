// Tipo de validación de un equipo checador: rostro, NIP o ambos (sin la propiedad = ambos)
export type CheckMethods = 'ambos' | 'rostro' | 'pin';

export const CHECK_METHOD_LABELS: Record<CheckMethods, string> = {
    ambos: "Rostro y NIP",
    rostro: "Solo rostro",
    pin: "Solo NIP",
};

export interface IChecador {
    id: number;
    name: string;
    lastName: string;
    email: string;
    status: 1 | 2 | 3;
    imgProfile?: string;
    createdAt?: string;
    branch: { id: number; name: string } | null;
    checkMethods: CheckMethods;
    checkMethodsUpdatedAt: string | null;
    // Empleados que pueden usar este checador desde su perfil (modo checador)
    employees?: IChecadorEmployee[];
}

export interface IChecadorEmployee {
    id: number;
    idCheck: number | null;
    name: string;
    lastName: string;
}

// Checador asignado al empleado con sesión (GET /checadores/mine)
export interface IMyChecker {
    id: number;
    name: string;
    lastName: string;
    branch: { id: number; name: string } | null;
    checkMethods: CheckMethods;
}

export interface IChecadoresQuery {
    search?: string;
    branch?: string;
    status?: string;
    checkMethods?: string;
    page?: number;
    limit?: number;
}
