// app/actions/inability-actions.ts
"use server";

import axios, { AxiosError } from "axios";
import { storeAction } from "./storeActions";
import { ActionResponse } from "@/lib/definitions";
import { revalidatePath } from "next/cache";
import { fetchPagedWithoutCancelled, isOnlyEmployee } from "@/lib/employeeVisibility";
import { IDeleteInhability, IdocumentsInability, IInability, InabilityPayload, IsT2DischargeDocument, IsT7FillingDocumentv1, IsT7FillingDocumentv2 } from "@/lib/inhability/interface";


export interface IInabilityFormData {
  idEmployee: number;
  disabilityCategory: string;
  folio: string;
  typeOfDisability: string;
  dateInit: string;      // formato 'YYYY-MM-DD'
  dateEnd: string;       // formato 'YYYY-MM-DD'
  firstDoc: File | null;
  notes: string;
}

export interface IResponseInabilityCreate {
  message: string;
  status: number;
  data: {
    id: number;
    idDocument: number;
    acknowledged: boolean;
    insertedId: string;
  };
}

// ✅ REQUEST BODY (lo que realmente mandas al backend)
export type InabilityDocPayload = {
  dateInit: string;
  dateEnd: string;
  inProgress: boolean;
  urlDocument: string;
};

type FetchArgs = {
  page?: number;
  limit?: number;
  search?: string;
  dateInit?: string;
  dateEnd?: string;
};

export type InabilityPayloadBase = {
  idEmployee: number;
  accountingConfirmation: boolean;
  disabilityCategory: string;
  typeOfDisability: string;
  status: string;

  documentsInability: InabilityDocPayload[];

  sT2DischargeDocument?: { urlDocument: string };
  sT7FillingDocumentv1?: { urlDocument: string };
  sT7FillingDocumentv2?: { urlDocument: string };
};

// ✅ CREATE payload
export type InabilityCreatePayload = InabilityPayloadBase & {
  whoCreateId?: number; // si tu backend lo ocupa
};

// ✅ UPDATE payload (tu backend parece ocupar id e idDocument)
export type InabilityUpdatePayload = InabilityPayloadBase & {
  id: number;
  idDocument: number;
};

export async function getAllInability(args: FetchArgs = {}): Promise<{
  data: IInability[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  try {

    const { apiToken, API_URL, session } = await storeAction();

    const pageNum = Math.max(Number(args.page ?? 1) || 1, 1);
    const limitNum = Math.min(Math.max(Number(args.limit ?? 20) || 20, 1), 500);

    const requestPage = async (page: number, limit: number): Promise<{ data: IInability[]; total: number }> => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (args.search) params.set("search", String(args.search));
      if (args.dateInit) params.set("dateInit", String(args.dateInit));
      if (args.dateEnd) params.set("dateEnd", String(args.dateEnd));

      const response = await axios.get(`${API_URL}/inability/all?${params.toString()}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      }).then((res) => {
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
  } catch (err: unknown) {
    const axiosErr = err as AxiosError<{ message?: string }>;
    console.log(
      axiosErr.response?.data?.message ?? axiosErr.message ?? "Error"
    );
    return { data: [], total: 0, page: 1, limit: 20, pages: 1 };
  }
}

export async function getOneInability(id: number): Promise<IInability | null> {
  try {
    const { apiToken, API_URL } = await storeAction();
    const res = await axios.get(`${API_URL}/inability/one/${id}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    return res.data.data;
  } catch (err: unknown) {
    const axiosErr = err as AxiosError<{ message?: string }>;
    console.log(
      axiosErr.response?.data?.message ?? axiosErr.message ?? "Error"
    );
    return null;
  }
}

// app/actions/inability-actions.ts
export interface ICreateInabilityResult {
  id: string;
  idDocument: string;
}

export async function createInability(
  data: Omit<InabilityPayload, "firstDoc"> & { firstDoc?: null }
): Promise<ActionResponse<ICreateInabilityResult>> {
  const { apiToken, API_URL } = await storeAction();
  const headers = { Authorization: `Bearer ${apiToken}` };

  try {
    // 1. Crear el registro (el archivo se sube aparte, por el Route Handler)
    const { data: res } = await axios.post(`${API_URL}/inability`, data, { headers });

    revalidatePath("/app/inability");

    return {
      success: true,
      message: "Incapacidad creada",
      data: { id: res.data.id, idDocument: res.data.idDocument },
    };
  } catch (error: unknown) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message ?? "Error al crear la incapacidad"
      : (error as Error).message;

    console.log(error);
    return { success: false, message };
  }
}

export async function uploadFirstInhabilityDocument({
  id,
  idDoc,
  formData,
  folio
}: {
  id: string;
  idDoc: string;
  formData: FormData;
  folio: string;
}): Promise<ActionResponse<boolean>> {
  try {
    const { apiToken, API_URL: apiUrl } = await storeAction();

    const image = formData.get("document") as File;

    // Subir imagen al backend
    const data = new FormData();
    data.append("document", image);
    data.append("folio", folio);

    const response = await axios
      .put(`${apiUrl}/inability/documentsInability/${id}/${idDoc}`, data, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "multipart/form-data",
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 120_000,
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

    revalidatePath("/app/inability");


    return {
      success: true,
      message: response.message,
      data: true,
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

export async function createNewDocument({
  idDoc,
  dateInit,
  folio,
  dateEnd,
  formData,
}: {
  idDoc: string;
  folio: string;
  dateInit: string;
  dateEnd: string;
  formData: FileList | null;
}): Promise<ActionResponse<boolean>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    await axios
      .post(
        `${API_URL}/inability/newDocumentsInability`,
        {
          id: idDoc,
          folio: folio,
          dateInit,
          dateEnd,
        },
        {
          headers: { Authorization: `Bearer ${apiToken}` },
        }
      )
      .then(async (res) => {
        const selfId = res.data.data.idDocument;
        const newFormData = new FormData();
        if (formData) newFormData.append("files", formData?.[0]);
        await updateInabilityModal({ formData: newFormData, idDoc, selfId, folio });
        return res.data;
      })
      .catch((err) => {
        console.log(err.response);
        throw new Error(
          err.response.data.message
            ? err.response.data.message
            : "Error al descargar el PDF"
        );
      });

    revalidatePath("/app/inability");

    return {
      success: true,
      message: "El nuevo documento ha sido creado...",
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

// PUT /inability/documentsInability/:id/:idDocument
// Sube (o reemplaza) el PDF de un documento de la incapacidad y puede recibir el folio.
export async function updateInabilityModal({
  idDoc,
  selfId,
  formData,
  folio,
}: {
  idDoc: string;
  folio: string;
  selfId: string | null;
  formData: FormData;
}): Promise<ActionResponse<null>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const image = formData.get("files") as File | null;

    if (!image) throw new Error("No se envió ningún archivo");

    const data = new FormData();
    data.append("document", image);
    data.append("folio", folio);

    await axios.put(`${API_URL}/inability/documentsInability/${idDoc}/${selfId}`, data, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "multipart/form-data",
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120_000,
    });

    revalidatePath("/app/inability");

    return { success: true, message: "Incapacidad actualizada" };
  } catch (error: unknown) {
    console.log(error);

    const message = axios.isAxiosError(error)
      ? error.response?.data?.message ?? error.message
      : (error as Error).message;

    return { success: false, message };
  }
}

export async function uploadDocuments({
  idDoc,
  dateInit,
  dateEnd,
  formData,
}: {
  idDoc: string;
  dateInit: string;
  dateEnd: string;
  formData: FormData;
}): Promise<ActionResponse<boolean>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const image = formData.get("files") as File;

    // Subir imagen al backend
    const data = new FormData();
    data.append("document", image);

    const response = await axios
      .post(
        `${API_URL}/inability/newDocumentsInability`,
        {
          id: idDoc,
          dateInit,
          dateEnd,
        },
        {
          headers: { Authorization: `Bearer ${apiToken}` },
        }
      )
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        console.log(err.response);
        throw new Error(
          err.response.data.message
            ? err.response.data.message
            : "Error desconocido"
        );
      });

    if (response && response.data.status === 200) {
      await axios.put(
        `${API_URL}/inability/documentsInability/${idDoc}/1`,
        data,
        {
          headers: { Authorization: `Bearer ${apiToken}` },
        }
      );
    }
    revalidatePath("/app/inability");

    return {
      success: true,
      message: "Documento cargado",
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

export async function getInhabilityDocument({
  idDoc,
  selfId,
}: {
  idDoc: string | null;
  selfId: string | null;
}): Promise<ActionResponse<string>> {
  try {
    const { apiToken, API_URL: apiUrl } = await storeAction();

    if (!idDoc || !selfId) throw new Error("No se encontró el documento");

    const res = await axios.get(
      `${apiUrl}/inability/documentsInability/${idDoc}/${selfId}`,
      {
        headers: { Authorization: `Bearer ${apiToken}` },
        responseType: "arraybuffer",
      }
    );

    const buffer = Buffer.from(res.data);

    if (buffer.length === 0) {
      throw new Error("El documento está vacío o no existe");
    }

    const contentType = res.headers["content-type"] || "application/pdf";
    const url = `data:${contentType};base64,${buffer.toString("base64")}`;

    return {
      success: true,
      message: "Documento cargado",
      data: url,
    };
  } catch (error: unknown) {
    let message = (error as Error).message || "Error al obtener el documento";

    // Con arraybuffer, el error del backend llega como bytes: hay que decodificarlo
    if (axios.isAxiosError(error) && error.response?.data) {
      try {
        const text = Buffer.from(error.response.data).toString("utf-8");
        message = JSON.parse(text).message || message;
      } catch {
        // no era JSON, se queda el mensaje genérico
      }
    }

    console.log(error);
    return { success: false, message };
  }
}

//ELIMINAR-CANCELAR INCAPACIDAD
export async function deleteInability({
  id,
  data
}: {
  id: number | null;
  data: IDeleteInhability;
}): Promise<ActionResponse<boolean>> {
  try {
    if (!id) throw new Error("ID NO ESPECIFICADO");

    const { apiToken, API_URL } = await storeAction();

    await axios.delete(`${API_URL}/inability/${String(id)}`, {
      data: {
        deletePermission: true,
        reaseonDelete: data.reaseonDelete,
      },
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    revalidatePath("/app/inability");

    return {
      success: true,
      message: "Incapacidad eliminada exitosamente",
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

export async function updateExpirationDateST7V1({
  id,
  data
}: {
  id: number;
  data: Pick<IsT7FillingDocumentv1, "expirationDateDocument">;
}): Promise<ActionResponse<string>> {
  try {
    if (!id) throw new Error("ID NO ESPECIFICADO");

    const { apiToken, API_URL } = await storeAction();

    await axios.put(`${API_URL}/inability/sT7FillingDocumentv1-data/${String(id)}`,
      {
        expirationDate: data.expirationDateDocument
      },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      })
      .then(async (res) => {
        return res.data;
      })
      .catch((err) => {
        console.log(err.response);
        throw new Error(
          err.response.data.message
            ? err.response.data.message
            : "Error al actualizar"
        );
      });

    revalidatePath("/app/inability");


    return { success: true, message: "Fecha actualizada" };
  } catch (error: unknown) {

    const err = error as Error;

    return {
      success: false,
      message: err.message

    };
  }
}

export async function updateExpirationDateST7V2({
  id,
  data
}: {
  id: number;
  data: Pick<IsT7FillingDocumentv2, "expirationDateDocument">;
}): Promise<ActionResponse<string>> {
  try {
    if (!id) throw new Error("ID NO ESPECIFICADO");

    const { apiToken, API_URL } = await storeAction();

    await axios.put(`${API_URL}/inability/sT7FillingDocumentv2-data/${String(id)}`,
      {
        expirationDate: data.expirationDateDocument
      },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      })
      .then(async (res) => {
        return res.data;
      })
      .catch((err) => {
        console.log(err.response);
        throw new Error(
          err.response.data.message
            ? err.response.data.message
            : "Error al actualizar"
        );
      });

    revalidatePath("/app/inability");

    return { success: true, message: "Fecha actualizada" };
  } catch (error: unknown) {

    const err = error as Error;

    return {
      success: false,
      message: err.message

    };
  }
}

export async function updateExpirationDateST2({
  id,
  data
}: {
  id: number;
  data: Pick<IsT2DischargeDocument, "expirationDateDocument">;
}): Promise<ActionResponse<string>> {
  try {
    if (!id) throw new Error("ID NO ESPECIFICADO");

    const { apiToken, API_URL } = await storeAction();

    await axios.put(`${API_URL}/inability/sT2DischargeDocument-data/${String(id)}`,
      {
        expirationDate: data.expirationDateDocument
      },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      })
      .then(async (res) => {
        return res.data;
      })
      .catch((err) => {
        console.log(err.response);
        throw new Error(
          err.response.data.message
            ? err.response.data.message
            : "Error al actualizar"
        );
      });
    revalidatePath("/app/inability");


    return { success: true, message: "Fecha actualizada" };
  } catch (error: unknown) {

    const err = error as Error;

    return {
      success: false,
      message: err.message

    };
  }
}

export async function updateDocumentsInhability({
  id,
  selfId,
  data,
}: {
  id: number;
  selfId: number;
  data: IdocumentsInability;
}): Promise<ActionResponse<boolean>> {
  try {
    if (!id) throw new Error("ID NO ESPECIFICADO");

    const { apiToken, API_URL } = await storeAction();

    await axios.put(`${API_URL}/inability/documentsInability-updatedata/${String(id)}/${String(selfId)}`,
      {
        folio: data.folio,
        dateInit: data.dateInit,
        dateEnd: data.dateEnd,
        expirationDate: data.expirationDateDocument
      },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      });

    revalidatePath("/app/inability");

    return {
      success: true,
      message: "Actualizado exitosamente",
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


