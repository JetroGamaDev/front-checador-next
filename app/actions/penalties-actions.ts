"use server"

import { ActionResponse, IDeleteIncidenece } from "@/lib/definitions";
import { IPenalty, IPenaltyAxios, IPenaltyForOffeses } from "@/lib/penalties/interface";
import { storeAction } from "./storeActions";
import { auth } from "@/lib/auth";
import { fetchPagedWithoutCancelled, isOnlyEmployee } from "@/lib/employeeVisibility";
import axios from "axios";
import { FetchUsersArgs } from "@/lib/constancy/interface";
import { storeToken } from "@/lib/useToken";
import { base64ToBlob } from "@/lib/helpers";
import { revalidatePath } from "next/cache";

//Funcion para crear penalizacion
export async function createPenalty({
    data,
}: {
    data: IPenalty;
}): Promise<ActionResponse<IPenaltyAxios>> {

    try {
        const { API_URL } = await storeAction();
        const session = await auth();
        const apiToken = session?.user?.apiToken;


        const headers = {
            headers: {
                Authorization: `Bearer ${apiToken}`,
            },
        }

        try {
            const res = await axios.post<{ data: IPenaltyAxios }>(
                `${API_URL}/penaltyForOffeses`,
                data,
                headers
            );

            const dataResponse: IPenaltyAxios = {
                _id: res.data.data._id,
                id: res.data.data.id,
            };

            return {
                success: true,
                message: "Registro creado correctamente",
                data: dataResponse,
            };
        } catch (err: unknown) {
            const message =
                axios.isAxiosError<{ message?: string }>(err)
                    ? err.response?.data?.message || err.message
                    : err instanceof Error
                        ? err.message
                        : "Error en endpoint";

            return {
                success: false,
                message,
            };
        }
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Error desconocido";

        return {
            success: false,
            message,
        };
    }
}

//Funcio para paginar y listar penalizaciones
export async function fetchPenaltiesQueries(args: FetchUsersArgs & {
    search?: string;
    idEmployee?: number;
    dateInit?: string;
    dateEnd?: string;
    type?: string;

} = {}): Promise<{
    data: IPenaltyForOffeses[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}> {
    try {
        const { apiToken, API_URL, session } = await storeAction();

        const pageNum = Math.max(Number(args.page ?? 1) || 1, 1);
        const limitNum = Math.min(Math.max(Number(args.limit ?? 20) || 20, 1), 100);

        const requestPage = async (page: number, limit: number): Promise<{ data: IPenaltyForOffeses[]; total: number }> => {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("limit", String(limit));

            if (args.search?.trim()) {
                params.set("search", args.search.trim());
            }
            if (args.dateInit?.trim()) {
                params.set("dateInit", args.dateInit.trim());
            }
            if (args.dateEnd?.trim()) {
                params.set("dateEnd", args.dateEnd.trim());
            }

            const response = await axios
                .get(`${API_URL}/penaltyForOffeses?${params.toString()}`, {
                    headers: {
                        Authorization: `Bearer ${apiToken}`,
                    },
                })
                .then((res) => {
                    return res.data;
                })
                .catch((err) => {
                    console.log(err);
                    throw new Error(
                        err.response.data.message
                            ? err.response.data.message
                            : "Error en la respuesta"
                    );
                });

            return { data: response.data?.data ?? [], total: Number(response.total ?? 0) };
        };

        // El usuario que solo es empleado no ve los registros cancelados (ni cuentan en el total)
        const { data, total } = isOnlyEmployee(session)
            ? await fetchPagedWithoutCancelled(requestPage, pageNum, limitNum)
            : await requestPage(pageNum, limitNum);

        const pages = Math.max(Math.ceil(total / limitNum), 1);

        return {
            data,
            total,
            page: pageNum,
            limit: limitNum,
            pages,
        };

    } catch (error) {
        console.log(error);
        return { data: [], total: 0, page: 1, limit: 20, pages: 1 };
    }
}

//Funcion para listar una penalizacion
export async function findPenalty({
    id,
}: {
    id?: number | null;
}): Promise<IPenaltyForOffeses | null> {

    try {
        if (!id || id <= 0) return null;

        const { apiToken, API_URL } = await storeAction();

        const response = await axios
            .get(`${API_URL}/penaltyForOffesesInfoOne/${id}`, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
            })

            .then((res) => {

                return res.data;
            })

            .catch((err) => {


                throw new Error(
                    err.response.data.message
                        ? err.response.data.message
                        : "Error en la respuesta"
                );
            });

        return response.data ?? response.data ?? null;

    } catch (error) {

        console.log(error);
        return null;
    }
}

//Post de firmas
export async function sendSignaturePenalty({
    id,
    signature,
}: {

    id: number | null;
    signature: string;

}): Promise<ActionResponse<boolean>> {
    try {
        if (!id) throw new Error("ID NOT DEFINED");
        if (!signature) throw new Error("No se recibió la firma");

        const { apiToken, apiUrl } = await storeToken();

        const formData = new FormData();

        const blob = base64ToBlob(signature, "image/png");

        formData.append("img", blob, "signature.png");

        const firma = await axios.post(`${apiUrl}/penaltyForOffeses/signature/${id}`, formData, {
            headers: {
                Authorization: `Bearer ${apiToken}`,
            },
        });
        console.log("firma: ", firma);

        return {
            success: true,
            message: "Firma enviada correctamente",
            data: true,
        };
    } catch (error: unknown) {
        const err = error as Error;

        return {
            success: false,
            message: err.message ? err.message : "Error al obtener información",
            data: false,
        };
    }
}

//Obtener firmas
export async function fetchSignaturePenalties({
    id,
    idEmployee,
}: {
    id: number | null;
    idEmployee: string | null;
}): Promise<ActionResponse<string>> {
    try {
        const { apiToken, apiUrl } = await storeToken();

        // Obtener imagen en binario
        const resImg = await axios
            .get(
                `${apiUrl}/penaltyForOffeses/signature/${id}/${idEmployee}`,
                {
                    headers: {
                        Authorization: `Bearer ${apiToken}`,
                    },
                    responseType: "arraybuffer",
                }
            )
            .then((res) => {
                return res.data;
            })
            .catch((err) => {
                throw new Error(
                    err?.response?.data?.message
                        ? err.response.data.message
                        : err?.message || "Error en la respuesta"
                );
            });

        // Convertir a base64
        const base64 = Buffer.from(resImg, "binary").toString("base64");
        const imageBase64Url = `data:image/jpeg;base64,${base64}`;

        return {
            success: true,
            message: "Imagen subida correctamente",
            data: imageBase64Url,
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

//Elimicar-cancelar penalizacion
export async function deletePenalty({
  id,
  data
}: {
  id: number | null;
  data: IDeleteIncidenece;
}): Promise<ActionResponse<boolean>> {
  try {
    if (!id) throw new Error("ID NO ESPECIFICADO");

    const { apiToken, API_URL } = await storeAction();

    await axios.delete(`${API_URL}/penaltyForOffeses/${String(id)}`, {
      data: {
        deletePermission: true,
        reaseonDelete: data.reaseonDelete,
      },
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    revalidatePath("/app/penalties");

    return {
      success: true,
      message: "Eliminado exitosamente",
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



