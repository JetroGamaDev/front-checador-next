"use server"

import { FetchUsersArgs } from "@/lib/constancy/interface";
import { OverTime, OverTimeAxios, TInputsOvertime } from "@/lib/overTime/interface";
import { storeAction } from "./storeActions";
import axios from "axios";
import { ActionResponse, IDeleteIncidenece } from "@/lib/definitions";
import { revalidatePath } from "next/cache";
import { storeToken } from "@/lib/useToken";
import { base64ToBlob } from "@/lib/helpers";
import { auth } from "@/lib/auth";
import { fetchPagedWithoutCancelled, isOnlyEmployee } from "@/lib/employeeVisibility";

//Funcion para paginar tiempo extra  
export async function fetchOverTimeQueries(args: FetchUsersArgs & { search?: string } = {}): Promise<{
  data: OverTime[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  try {
    const { apiToken, API_URL, session } = await storeAction();

    const pageNum = Math.max(Number(args.page ?? 1) || 1, 1);
    const limitNum = Math.min(Math.max(Number(args.limit ?? 20) || 20, 1), 100);

    const requestPage = async (page: number, limit: number): Promise<{ data: OverTime[]; total: number }> => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (args.search?.trim()) {
        params.set("search", args.search.trim());
      }
      if (args.dateInit) params.set("dateInit", String(args.dateInit));
      if (args.dateEnd) params.set("dateEnd", String(args.dateEnd));

      const response = await axios
        .get(`${API_URL}/overtime?${params.toString()}`, {
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

      return { data: response.data ?? [], total: Number(response.total ?? 0) };
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

//Funcion para listar todas las horas extra
export async function fetchOverTime(): Promise<OverTime[]> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const response = await axios.get(`${API_URL}/overtime`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    })
      .then((res) => {
        return res.data;
      })
      .catch((err) => {

        throw new Error(
          err.response.message
            ? err.response?.data?.message
            : "Error en la respuesta"
        );
      });
    return response.data || [];

  } catch (error) {
    console.log(error);
    return [];
  }
}

//Funcion para buscar una horas extra por id de registro
export async function findOvertimeById({
  id,
}: {
  id?: number | null;
}): Promise<OverTime | null> {

  try {
    if (!id || id <= 0) return null;

    const { apiToken, API_URL } = await storeAction();

    const response = await axios
      .get(`${API_URL}/overtime/${id}`, {
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

    return response.data?.data ?? response.data ?? null;

  } catch (error) {

    console.log(error);
    return null;
  }
}

//Funcion para crear horas extra
export async function createOverTime({
  data,
}: {
  data: TInputsOvertime;
}): Promise<ActionResponse<OverTimeAxios>> {

  try {
    const { API_URL } = await storeAction();
    const session = await auth();
    const apiToken = session?.user?.apiToken;

    const dataSave = {
      idEmployee: data.idEmployee,
      idLeader: data.idLeader,
      idPersonDoh: data.idPersonDoh,
      motive: data.motive,
      date: data.date,
      hourInit: data.hourInit,
      hourEnd: data.hourEnd,
      status: data.status,
      notes: data.notes
    }

    const headers = {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }


    try {
      const res = await axios.post<{ data: OverTimeAxios }>(
        `${API_URL}/overtime`,
        dataSave,
        headers
      );

      const dataResponse: OverTimeAxios = {
        _id: res.data.data._id,
        id: res.data.data.id,
      };

      return {
        success: true,
        message: "Registro creado correctamente",
        data: dataResponse,
      };
    } catch (err) {
      const error = err as Error;
      return {
        success: false,
        message: error.message ? error.message : "Error en endpoint",
      };
    }
  } catch (error: unknown) {

    const err = error as Error;

    return {
      success: false,
      message: err.message

    };
  }
}

//Funcion para borrar horas extra 
export async function deleteOverTime({
  id,
  data
}: {
  id: number | null;
  data: IDeleteIncidenece;
}): Promise<ActionResponse<boolean>> {
  try {
    if (!id) throw new Error("ID NO ESPECIFICADO");

    const { apiToken, API_URL } = await storeAction();

    await axios.delete(`${API_URL}/overtime/${String(id)}`, {
      data: {
        deletePermission: true,
        reaseonDelete: data.reaseonDelete,
      },
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    revalidatePath("/app/overtime");

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

//Post de firmas
export async function sendSignatureOverTime({
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

    await axios.post(`${apiUrl}/overtime/signature/${id}`, formData, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

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

export async function approvedLeaderOvertime({
  id,
  signature,
  status,
}: {
  id: number | null;
  signature: string;
  status: string;
}): Promise<ActionResponse<boolean>> {
  try {
    if (!id) throw new Error("ID NOT DEFINED");
    if (!signature) throw new Error("No se recibió la firma");

    const { apiToken, apiUrl } = await storeToken();

    const formData = new FormData();
    const blob = base64ToBlob(signature, "image/png");

    formData.append("img", blob, "signature.png");

    const firma = await axios.post(
      `${apiUrl}/overtime/signature/${id}`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    const signatureUrl = firma.data?.data ?? firma.data?.url;

    if (!signatureUrl) {
      throw new Error("No se recibió la URL de la firma");
    }

    await axios.put(
      `${apiUrl}/overtime/${id}`,
      {
        status,
        signature: signatureUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    return {
      success: true,
      message: "Firma enviada correctamente",
      data: true,
    };
  } catch (error: unknown) {
    const err = error as Error;

    return {
      success: false,
      message: err.message || "Error al obtener información",
      data: false,
    };
  }
}

//Obtener firma del empleado
export async function fetchSignatureOverTime({
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
        `${apiUrl}/overtime/signature/${id}/${idEmployee}`,
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
          err.response.data.message
            ? err.response.data.message
            : "Error en la respuesta"
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