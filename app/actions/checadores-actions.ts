"use server"

import { CheckMethods, IChecador, IChecadorEmployee, IChecadoresQuery, IMyChecker } from "@/lib/checadores/interface";
import { storeAction } from "./storeActions";
import axios from "axios";

function getErrorMessage(error: unknown) {
    let message = "Error en la respuesta";

    if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || error.message || message;
    } else if (error instanceof Error) {
        message = error.message;
    }

    return message;
}

//Listar los equipos checador (usuarios con rol CHECADOR) con su tipo de validación
export async function getChecadores(query: IChecadoresQuery): Promise<{
    success: boolean;
    message: string;
    data: IChecador[];
    total: number;
    page: number;
    limit: number;
}> {
    const pageNum = Math.max(Number(query.page ?? 1) || 1, 1);
    const limitNum = Math.min(Math.max(Number(query.limit ?? 50) || 50, 1), 100);

    try {
        const { apiToken, API_URL } = await storeAction();

        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        params.set("limit", String(limitNum));
        if (query.search?.trim()) params.set("search", query.search.trim());
        if (query.branch) params.set("branch", query.branch);
        if (query.status) params.set("status", query.status);
        if (query.checkMethods) params.set("checkMethods", query.checkMethods);

        const response = await axios
            .get(`${API_URL}/checadores?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
                timeout: 15000,
            })
            .then((res) => res.data);

        return {
            success: true,
            message: response?.message ?? "OK",
            data: response?.data ?? [],
            total: Number(response?.total ?? 0),
            page: Number(response?.page ?? pageNum),
            limit: Number(response?.limit ?? limitNum),
        };
    } catch (error: unknown) {
        console.log(error);
        return { success: false, message: getErrorMessage(error), data: [], total: 0, page: pageNum, limit: limitNum };
    }
}

//Cambiar el tipo de validación de un checador (aplica desde su siguiente checada)
export async function updateCheckMethods(id: number, checkMethods: CheckMethods): Promise<{
    success: boolean;
    message: string;
    data?: { id: number; checkMethods: CheckMethods; checkMethodsUpdatedAt: string | null };
}> {
    try {
        const { apiToken, API_URL } = await storeAction();

        const response = await axios
            .put(`${API_URL}/checadores/${id}/check-methods`, { checkMethods }, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
                timeout: 15000,
            })
            .then((res) => res.data);

        return {
            success: true,
            message: response?.message ?? "Tipo de validación actualizado",
            data: response?.data,
        };
    } catch (error: unknown) {
        console.log(error);
        return { success: false, message: getErrorMessage(error) };
    }
}

//Asignar los empleados que pueden usar este checador desde su perfil (reemplaza la lista; [] = nadie)
export async function updateChecadorEmployees(id: number, idEmployees: number[]): Promise<{
    success: boolean;
    message: string;
    data?: { id: number; idEmployees: number[]; employees: IChecadorEmployee[] };
    invalid?: number[];
}> {
    try {
        const { apiToken, API_URL } = await storeAction();

        const cleanIds = Array.from(new Set(idEmployees.map(Number).filter((n) => Number.isInteger(n) && n > 0)));

        const response = await axios
            .put(`${API_URL}/checadores/${id}/employees`, { idEmployees: cleanIds }, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
                timeout: 15000,
            })
            .then((res) => res.data);

        return {
            success: true,
            message: response?.message ?? "Empleados actualizados",
            data: response?.data,
        };
    } catch (error: unknown) {
        console.log(error);
        const invalid = axios.isAxiosError(error) ? error.response?.data?.data?.invalid : undefined;
        return {
            success: false,
            message: getErrorMessage(error),
            invalid: Array.isArray(invalid) ? invalid.map(Number) : undefined,
        };
    }
}

//Checadores asignados al empleado con sesión (modo checador del perfil). Vacío = sin modo checador
export async function getMyCheckers(): Promise<{ success: boolean; message: string; data: IMyChecker[] }> {
    try {
        const { apiToken, API_URL } = await storeAction();

        const response = await axios
            .get(`${API_URL}/checadores/mine`, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
                timeout: 15000,
            })
            .then((res) => res.data);

        const data: IMyChecker[] = Array.isArray(response?.data) ? response.data : [];
        return { success: true, message: response?.message ?? "OK", data };
    } catch (error: unknown) {
        console.log(error);
        return { success: false, message: getErrorMessage(error), data: [] };
    }
}
