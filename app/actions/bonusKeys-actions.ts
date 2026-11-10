"use server"

import { IBonusKeys, IGenerateDocBonusKey, IUpdateBonusKeys } from "@/lib/Bonus/interface";
import { storeAction } from "./storeActions";
import axios from "axios";
import { ActionResponse } from "@/lib/definitions";
import { revalidatePath } from "next/cache";
import { storeToken } from "@/lib/useToken";

type FetchVacationsArgs = {
    search?: string;
}


//Listar bonos de llaves 
export async function listAllBonusKeys(
    args: FetchVacationsArgs = {}
): Promise<{
    data: IBonusKeys[];
    total: number;
}> {

    try {

        const { apiToken, API_URL } = await storeAction();

        const params = new URLSearchParams();
        if (args.search) params.set("search", args.search);

        const response = await axios.get(`${API_URL}/bonuskeys/getAll?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${apiToken}`,
            },
        }).then((res) => res.data);

        const total = Number(response.total ?? 0);

        return {
            data: response.data ?? [],
            total,
        }

    } catch (error) {
        const message = axios.isAxiosError(error)
            ? error.response?.data?.message ?? "Error en la respuesta"
            : "Error inesperado";
        console.log(message, error);

        return { data: [], total: 0};
    }
}

//Crear bono
export async function createBonusKeys({
    data
}: {
    data: IBonusKeys;
}): Promise<ActionResponse<IBonusKeys | null>> {
    try {

        const { apiToken, API_URL } = await storeAction();
        await axios
            .post(
                `${API_URL}/bonuskeys`,
                {
                    idEmployee: data.idEmployee,
                    location: data.location,
                    amount: Number(data.amount)
                },
                {
                    headers: {
                        Authorization: `Bearer ${apiToken}`,
                    },
                }
            );

        revalidatePath("/app/bonuskeys");

        return {
            success: true,
            message: "Bono creado correctamente",
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.log(error);
        return {
            success: false,
            message: error.message,
        };
    }
}

//Buscar un solo registro
export async function getOneBonusKeys({
    idBonusKeys
}: {
    idBonusKeys: string;
}): Promise<IBonusKeys | null> {

    try {
        const { apiToken, API_URL } = await storeAction();

        const response = await axios
            .get(`${API_URL}/bonuskeys/findOne/${idBonusKeys}`, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
            });

        return response.data?.data ?? response.data ?? null;

    } catch (error) {

        console.log(error);
        return null;
    }
}

export async function updateBonusKeys({
    idBonusKeys,
    data
}: {
    idBonusKeys: string;
    data: IUpdateBonusKeys;
}): Promise<ActionResponse<IUpdateBonusKeys | null>> {

    try {
        const { apiToken, API_URL } = await storeAction();

        await axios.put(`${API_URL}/bonuskeys/${idBonusKeys}`,
            {
                location: data.location,
                amount: Number(data.amount)
            },
            {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
            });

        revalidatePath("/app/bonuskeys");

        return {
            success: true,
            message: "Bono actualizado correctamente",
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.log(error);
        return {
            success: false,
            message: error.message,
        };
    }
}

export async function deleteBonusKeys({
    idBonusKeys,
}: {
    idBonusKeys: string;
}): Promise<ActionResponse<boolean>> {

    try {
        const { apiToken, API_URL } = await storeAction();

        await axios.delete(`${API_URL}/bonuskeys/${idBonusKeys}`,
            {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
            });

        revalidatePath("/app/bonuskeys");

        return {
            success: true,
            message: "Bono eliminado correctamente",
        };
    } catch (error: unknown) {
        console.log(error);

        let message = "Error en la respuesta";

        if (axios.isAxiosError(error)) {
            message = error.response?.data?.message || error.message || message;
        } else if (error instanceof Error) {
            message = error.message;
        }

        return {
            success: false,
            message,
        };
    }
}

// Descarga el Excel solo con los bonos seleccionados (?ids=10,11).
// Sin ids el back regresaría todos, pero la pantalla siempre manda la selección; "ids=" vacío da 400.
export async function downloadDocBonusKeys(ids: Array<number | string>): Promise<ActionResponse<IGenerateDocBonusKey>> {
    const cleanIds = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    if (cleanIds.length === 0) {
        return { success: false, message: "Selecciona al menos un bono" };
    }

    try {
        const { apiToken, apiUrl } = await storeToken();

        const res = await axios.get(`${apiUrl}/bonuskeys/download/excel`, {
            params: { ids: cleanIds.join(",") },
            headers: { Authorization: `Bearer ${apiToken}` },
            responseType: "arraybuffer",
        });

        // Un JSON con estado 200 no es el archivo: no se descarga un Excel dañado
        if (String(res.headers["content-type"] ?? "").includes("application/json")) {
            return { success: false, message: "El servidor no regresó el documento. Intenta de nuevo más tarde." };
        }

        const base64 = Buffer.from(res.data).toString("base64");
        return {
            success: true,
            message: "Documento generado",
            data: { base64Url: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}` },
        };
    } catch (error: unknown) {
        console.log(error);
        if (!axios.isAxiosError(error)) {
            return { success: false, message: error instanceof Error ? error.message : "Error al obtener el documento" };
        }

        // El error llega como binario: se decodifica el JSON para leer `message`
        let message = error.response?.status === 404
            ? "Ninguno de los bonos seleccionados existe"
            : "Error al obtener el documento";
        try {
            const body = JSON.parse(Buffer.from(error.response?.data as ArrayBuffer).toString("utf8"));
            if (body?.message) message = body.message;
        } catch {
            // Sin cuerpo JSON: se queda el mensaje por estado
        }
        return { success: false, message };
    }
}
