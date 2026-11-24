"use server";

import { ActionResponse, IEmployeeDocument } from "@/lib/definitions";
import { storeAction } from "./storeActions";
import axios from "axios";
import { storeToken } from "@/lib/useToken";
import { revalidatePath } from "next/cache";

// Mensaje del back: en validación viene errors[0].message
function apiMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data;
    const first = Array.isArray(body?.errors) ? body.errors[0]?.message : undefined;
    return first || body?.message || fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

//DOCUMENTOS DEL EMPLEADO (plantillas por empleado, sin agrupar por periodo)
export async function fetchEmployeeDocuments({
  idEmployee,
}: {
  idEmployee: number;
}): Promise<ActionResponse<IEmployeeDocument[]>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const response = await axios.get(`${API_URL}/employee/documents/${Number(idEmployee)}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    const data = response.data?.data;
    return {
      success: true,
      message: response.data?.message ?? "OK",
      data: Array.isArray(data) ? data : [],
    };
  } catch (error: unknown) {
    console.log(error);
    return { success: false, message: apiMessage(error, "Error al listar documentos"), data: [] };
  }
}

export async function createDocument({
  idEmployee,
  idDocument,
  idPeriod,
  formData,
}: {
  idEmployee: number;
  idDocument: number;
  idPeriod: number;
  formData: FormData;
}): Promise<ActionResponse<boolean>> {
  try {
    const { apiToken, apiUrl } = await storeToken();

    const image = formData.get("files") as File;

    // Subir imagen al backend
    const data = new FormData();
    data.append("file", image);

    const response = await axios
      .post(
        `${apiUrl}/employee/documents/${Number(
          idEmployee
        )}/${idDocument}/${idPeriod}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "multipart/form-data",
          },
        }
      )
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        throw new Error(
          err.response?.data?.message
            ? err.response.data.message
            : "Error en la respuesta"
        );
      });

    revalidatePath("/app/employee");

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

export async function getViewDocument({
  idEmployee,
  idDocument,
  idPeriod,
}: {
  idEmployee: number;
  idDocument: number;
  idPeriod: number;
}): Promise<ActionResponse<string>> {
  try {
    const { apiToken, apiUrl } = await storeToken();

    // Obtener imagen en binario
    const resImg = await axios
      .get(
        `${apiUrl}/employee/documents/${idEmployee}/${idDocument}/${idPeriod}`,
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
    const pdfBase64Url = `data:application/pdf;base64,${base64}`;

    return {
      success: true,
      message: "Imagen subida correctamente",
      data: pdfBase64Url,
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

// Fecha de vencimiento: solo el día "YYYY-MM-DD" (sin hora ni zona); null la quita
export async function updateExpirationDocument({
  idEmpleado,
  idDocument,
  idPeriod,
  date,
}: {
  idEmpleado: number;
  idDocument: number;
  idPeriod: number;
  date: string | null;
}): Promise<ActionResponse<boolean>> {
  try {
    const { apiToken, apiUrl } = await storeToken();

    const response = await axios.put(
      `${apiUrl}/employee/documents/dateExpiration/${idEmpleado}/${idDocument}/${idPeriod}`,
      { date: date || null },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    revalidatePath("/app/employee");

    return {
      success: true,
      message: response.data?.message || (date ? "Fecha de vencimiento guardada" : "Fecha de vencimiento eliminada"),
      data: true,
    };
  } catch (error: unknown) {
    console.log(error);
    return { success: false, message: apiMessage(error, "No se pudo guardar la fecha de vencimiento") };
  }
}

// Elimina solo el archivo: la plantilla queda para volver a cargarlo
export async function deleteDocumentFile({
  idEmployee,
  idDocument,
  idPeriod,
}: {
  idEmployee: number;
  idDocument: number;
  idPeriod: number;
}): Promise<ActionResponse<boolean>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const response = await axios.delete(
      `${API_URL}/employee/documents/file/${idEmployee}/${idDocument}/${idPeriod}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    revalidatePath("/app/employee");

    return { success: true, message: response.data?.message || "Documento eliminado", data: true };
  } catch (error: unknown) {
    console.log(error);
    return { success: false, message: apiMessage(error, "No se pudo eliminar el documento") };
  }
}

// Elimina la plantilla y su archivo (también sus copias de periodos anteriores: sin idPeriod)
export async function deleteDocumentTemplate({
  idEmployee,
  idDocument,
}: {
  idEmployee: number;
  idDocument: number;
}): Promise<ActionResponse<boolean>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const response = await axios.delete(
      `${API_URL}/employee/documents/template/${idEmployee}/${idDocument}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    revalidatePath("/app/employee");

    return { success: true, message: response.data?.message || "Plantilla eliminada", data: true };
  } catch (error: unknown) {
    console.log(error);
    return { success: false, message: apiMessage(error, "No se pudo eliminar la plantilla") };
  }
}
