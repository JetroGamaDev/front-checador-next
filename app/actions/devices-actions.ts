"use server"

import { FetchUsersArgs } from "@/lib/constancy/interface";
import { IAssignDevice, IDevices, IUpdateCurrentUser, IWaiverContent } from "@/lib/devices/interface";
import { storeAction } from "./storeActions";
import axios from "axios";
import { ActionResponse } from "@/lib/definitions";
import { revalidatePath } from "next/cache";
import { PhoneNumberFormat, sanitizePhoneNumber } from "@/lib/sinitizePhone";
import { storeToken } from "@/lib/useToken";
import { base64ToBlob } from "@/lib/helpers";

function getPhoneString(
  value: PhoneNumberFormat | string | null | undefined
): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return value.internationalNumber || value.number || "";
}

// IMEI vacío va como null; el valor del equipo va como número o null (el input number llega como texto o NaN)
function normalizeSpecs(specs: IDevices["specs"]): IDevices["specs"] {
  if (!specs) return specs;
  const imei = typeof specs.imei === "string" ? specs.imei.trim() : "";
  const rawValue = specs.value as unknown;
  const value =
    rawValue === null || rawValue === undefined || rawValue === "" || Number.isNaN(Number(rawValue))
      ? null
      : Number(rawValue);
  return { ...specs, imei: imei || null, value };
}

//LISTAR TODOS LOS DISPOSITIVOS
export async function ListDevices(args: FetchUsersArgs & {
  search?: string;
  type?: string;
  status?: string;
  idEmployee?: string;
  idDepartment?: string;
  idBranch?: string;
} = {}): Promise<{
  data: IDevices[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const pageNum = Math.max(Number(args.page ?? 1) || 1, 1);
    const limitNum = Math.min(Math.max(Number(args.limit ?? 20) || 20, 1), 100);


    const params = new URLSearchParams();
    params.set("page", String(pageNum));
    params.set("limit", String(limitNum));

    if (args.search?.trim()) {
      params.set("search", args.search.trim());
    }
    if (args.type?.trim()) {
      params.set("type", args.type.trim());
    }
    if (args.status?.trim()) {
      params.set("status", args.status.trim());
    }
    if (args.idEmployee !== undefined && !Number.isNaN(Number(args.idEmployee))) {
      params.set("idEmployee", String(args.idEmployee));
    }
    if (args.idDepartment !== undefined && !Number.isNaN(Number(args.idDepartment))) {
      params.set("idDepartment", String(args.idDepartment));
    }
    if (args.idBranch !== undefined && !Number.isNaN(Number(args.idBranch))) {
      params.set("idBranch", String(args.idBranch));
    }


    const response = await axios
      .get(`${API_URL}/devices?${params.toString()}`, {
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

    const total = Number(response.total ?? 0);
    const pages = Math.max(Math.ceil(total / limitNum), 1);

    return {
      data: response.data ?? [],
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

//LISTAR UN DISPOSITIVO
export async function ListOneDevice({
  id,
}: {
  id?: number | null;
}): Promise<IDevices | null> {

  try {
    if (!id || id <= 0) return null;

    const { apiToken, API_URL } = await storeAction();

    const response = await axios
      .get(`${API_URL}/devices/${id}`, {
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

//CONTENIDO DE LA CARTA RESPONSIVA (lo arma el back, igual que el PDF)
export async function getWaiverContent({
  idDevice,
}: {
  idDevice: number;
}): Promise<ActionResponse<IWaiverContent | null>> {
  const fallback = "No se pudo cargar el contenido de la responsiva";
  try {
    if (!idDevice || idDevice <= 0) {
      return { success: false, message: "No se encontró el dispositivo", data: null };
    }

    const { apiToken, API_URL } = await storeAction();

    const res = await axios.get(`${API_URL}/devices-waiverContent/${idDevice}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    const data: IWaiverContent | null = res.data?.data ?? null;
    if (!data) return { success: false, message: fallback, data: null };

    return { success: true, message: res.data?.message || "Contenido de la responsiva", data };
  } catch (error: unknown) {
    console.log(error);
    const message = axios.isAxiosError<{ message?: string }>(error)
      ? error.response?.data?.message || fallback
      : fallback;
    return { success: false, message, data: null };
  }
}

//CREAR DISPOSITIVO
export async function createDevice({
  data,
}: {
  data: IDevices;
}): Promise<ActionResponse<IDevices | null>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const sanitizedPhonePersonal = sanitizePhoneNumber(
      getPhoneString(String(data.currentAssignment?.phoneNumber))
    );

    const device: IDevices = await axios
      .post(
        `${API_URL}/devices`,
        {
          name: data.name,
          type: data.type,
          status: data.status,
          networkInfo: data.networkInfo,
          specs: normalizeSpecs(data.specs),
          currentAssignment: {
            idEmployee: data.currentAssignment?.idEmployee,
            idBranch: data.currentAssignment?.idBranch,
            idDepartment: data.currentAssignment?.idDepartment,
            phoneNumber: sanitizedPhonePersonal,
            extentionNumber: data.currentAssignment?.extentionNumber,
            emailCompany: data.currentAssignment?.emailCompany,
            emailGmail: data.currentAssignment?.emailGmail,
            passwordEmail: data.currentAssignment?.passwordEmail,
            pinPhone: data.currentAssignment?.pinPhone,
            location: data.currentAssignment?.location,
            assignedAt: data.currentAssignment?.assignedAt
          },
          idIt: data.idIt,
          notes: data.notes,
        },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        }
      )
      .then((res) => res.data)
      .catch((err) => {
        console.log(err);
        const msg = err.response?.data?.message;
        throw new Error(
          Array.isArray(msg) ? msg.join(", ") : msg || "Error en la respuesta"
        );
      });

    revalidatePath("/app/devices");

    return {
      success: true,
      message: "Dispositivo creado correctamente",
      data: device,
    };
  } catch (error: unknown) {
    console.log(error);

    let message = "Error en la respuesta";

    if (axios.isAxiosError(error)) {
      const msg = error.response?.data?.message;
      message = Array.isArray(msg) ? msg.join(", ") : msg || error.message || message;
    } else if (error instanceof Error) {
      message = error.message;
    }

    return {
      success: false,
      message,
      data: null,
    };
  }
}

//ASIGNAR UN DISPOSITIVO A UN EMPLEADO
export async function AssignDevice({
  idDevice,
  data
}: {
  idDevice: number;
  data: IAssignDevice;
}): Promise<ActionResponse<boolean | null>> {
  try {

    const { apiToken, API_URL } = await storeAction();

    const sanitizedPhonePersonal = sanitizePhoneNumber(
      getPhoneString(String(data.phoneNumber))
    );

    await axios.put(
      `${API_URL}/devices-assignment/${idDevice}`,
      {
        idEmployee: data.idEmployee,
        idIt: data.idIt,
        idBranch: data.idBranch,
        idDepartment: data.idDepartment,
        location: data.location,
        assignedAt: data.assignedAt,
        phoneNumber: sanitizedPhonePersonal,
        extentionNumber: data.extentionNumber,
        emailCompany: data.emailCompany,
        emailGmail: data.emailGmail,
      },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    revalidatePath("/app/devices");

    return {
      success: true,
      message: "Empleado asignado correctamente",
      data: true,
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
      data: null,
    };
  }
}

//ACTUALIZAR DISPOSITIVO
export async function updateDevice({
  data,
  idDevice,
}: {
  data: IDevices;
  idDevice: number;
}): Promise<ActionResponse<IDevices | null>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    if (!idDevice) {
      throw new Error("No se ha definido ID");
    }
    await axios
      .put(
        `${API_URL}/devices/${idDevice}`,
        {
          name: data.name,
          type: data.type,
          status: data.status,
          ...(data.networkInfo?.length > 0 && { networkInfo: data.networkInfo }),
          specs: normalizeSpecs(data.specs),
          notes: data.notes ?? "",
          ...(data.currentAssignment?.idEmployee != null && {
            currentAssignment: data.currentAssignment,
          }),
        },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        }
      )
      .then((res) => {
        return res.data;

      })
      .catch((err) => {
        throw new Error(
          err.response?.data?.message
            ? Array.isArray(err.response.data.message)
              ? err.response.data.message.join(", ")
              : err.response.data.message
            : "Error en la respuesta"
        );
      });
    revalidatePath("/app/devices");


    return {
      success: true,
      message: "Dispositivo actualizado",
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

//PUT DE FIRMAS
export async function sendSignatureDevice({
  idDevice,
  idSignature,
  idEmployee,
  signature,
}: {

  idDevice: number | null;
  idSignature: number;
  idEmployee: number;
  signature: string;

}): Promise<ActionResponse<boolean>> {
  try {
    // if (!idDevice) throw new Error("Id no definido");
    if (!signature) throw new Error("No se recibió la firma");

    const { apiToken, apiUrl } = await storeToken();

    const formData = new FormData();

    const blob = base64ToBlob(signature, "image/png");

    formData.append("signature", blob, "signature.png");

    const url = `${apiUrl}/devices-signature/${idDevice}/${idSignature}/${idEmployee}`

    await axios.put(url, formData, {
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

//TRAER FIRMAS
export async function fetchSignatureDevice({
  idDevice,
  idSignature,
  idEmployee,
}: {
  idDevice: number;
  idSignature: number;
  idEmployee: number;
}): Promise<ActionResponse<string>> {
  try {
    const { apiToken, apiUrl } = await storeToken();

    // Obtener imagen en binario
    const resImg = await axios
      .get(
        `${apiUrl}/devices-signature/${idDevice}/${idSignature}/${idEmployee}`,
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

//TRAER EL PRIMER DOCUMENTO DE RESPONSIVA
export async function getFirstDoc({
  idDoc
}: {
  idDoc: number;

}): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    let base64Url = "";

    await axios
      .get(`${API_URL}/devices-currentDocWaiver/${idDoc}`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        responseType: "arraybuffer",
      })
      .then((res) => {
        const base64 = Buffer.from(res.data).toString("base64");
        base64Url = `data:application/pdf;base64,${base64}`;
      })
      .catch((err) => {
        throw new Error(
          err.response?.data?.message
            ? err.response.data.message
            : "Error al generar el reporte"
        );
      });

    return {
      success: true,
      message: "Reporte generado",
      data: {
        base64Url,
        fileName: `carta_responsiva.pdf`,
      },
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

//TRAER SEGUNDO DOCUMENTO DE RESPONSIVA
export async function getSecondDoc({
  idDoc
}: {
  idDoc: number;

}): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    let base64Url = "";

    await axios
      .get(`${API_URL}/devices-currentDocWaiverFinish/${idDoc}`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        responseType: "arraybuffer",
      })
      .then((res) => {
        const base64 = Buffer.from(res.data).toString("base64");
        base64Url = `data:application/pdf;base64,${base64}`;
      })
      .catch((err) => {
        throw new Error(
          err.response?.data?.message
            ? err.response.data.message
            : "Error al generar el reporte"
        );
      });

    return {
      success: true,
      message: "Reporte generado",
      data: {
        base64Url,
        fileName: `carta_responsiva_dispositivo_liberado.pdf`,
      },
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

//DESCARGAR DOC DE HISTORIAL
export async function getHistorialDoc({
  idDoc,
  idHistory
}: {
  idDoc: number;
  idHistory: number;

}): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    let base64Url = "";

    await axios
      .get(`${API_URL}/devices-history/${idDoc}/${idHistory}`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        responseType: "arraybuffer",
      })
      .then((res) => {
        const base64 = Buffer.from(res.data).toString("base64");
        base64Url = `data:application/pdf;base64,${base64}`;
      })
      .catch((err) => {
        throw new Error(
          err.response?.data?.message
            ? err.response.data.message
            : "Error al generar el reporte"
        );
      });

    return {
      success: true,
      message: "Descarga completada",
      data: {
        base64Url,
        fileName: `carta_responsiva_dispositivo_liberado.pdf`,
      },
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

//ACTUALIZAR EMPLEADO ASIGNADO
export async function updateCurrentUser({
  idDevice,
  data
}: {
  data: IUpdateCurrentUser;
  idDevice: number;
}): Promise<ActionResponse<IDevices | null>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const sanitizedPhonePersonal = sanitizePhoneNumber(
      getPhoneString(String(data.phoneNumber ?? ""))
    );

    if (!idDevice) {
      throw new Error("No se ha definido ID");
    }
    const update = {
      phoneNumber: sanitizedPhonePersonal,
      extentionNumber: data.extentionNumber,
      emailCompany: data.emailCompany,
      emailGmail: data.emailGmail,
      passwordEmail: data.passwordEmail,
      pinPhone: data.pinPhone,
      location: data.location
    }

    await axios
      .put(
        `${API_URL}/devices/currentAssignment/${idDevice}`, update,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        }
      )
      .then((res) => {
        return res.data;

      })
      .catch((err) => {
        throw new Error(
          err.response?.data?.message
            ? Array.isArray(err.response.data.message)
              ? err.response.data.message.join(", ")
              : err.response.data.message
            : "Error en la respuesta"
        );
      });
    revalidatePath("/app/devices");


    return {
      success: true,
      message: "Actualizado correctamente",
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

//GENERAR DIRECTORIO
export async function getDirectory(): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
    try {
        const { apiToken, API_URL } = await storeAction();


        let base64Url = "";

        await axios
            .get(`${API_URL}/devices-directory`, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
                responseType: "arraybuffer",
            })
            .then((res) => {
                const base64 = Buffer.from(res.data, "binary").toString("base64");
                base64Url = `data:application/pdf;base64,${base64}`;
            })
            .catch((err) => {
                throw new Error(
                    err.response?.data?.message
                        ? err.response.data.message
                        : "Error al generar el reporte"
                );
            });

        return {
            success: true,
            message: "Directorio generado",
            data: {
                base64Url,
                fileName: `Directorio.pdf`,
            },
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

//GENERAR DIRECTORIOS EN PDF (ext. y correos, celulares, correos)
async function downloadDevicesDirectoryPdf(
    endpoint: string,
    fileName: string
): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
    try {
        const { apiToken, API_URL } = await storeAction();


        let base64Url = "";

        await axios
            .get(`${API_URL}/${endpoint}`, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
                responseType: "arraybuffer",
            })
            .then((res) => {
                const base64 = Buffer.from(res.data, "binary").toString("base64");
                base64Url = `data:application/pdf;base64,${base64}`;
            })
            .catch((err) => {
                // Con responseType "arraybuffer" el error llega como binario; se decodifica para leer el message
                let message = "Error al generar el reporte";
                try {
                    const raw = Buffer.from(err.response?.data ?? "").toString("utf8");
                    message = JSON.parse(raw)?.message || message;
                } catch { }

                throw new Error(message);
            });

        return {
            success: true,
            message: "Directorio generado",
            data: {
                base64Url,
                fileName,
            },
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

export async function downloadDirectoryExtEmail(): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
    return downloadDevicesDirectoryPdf("devices-directory-ext-email", "directorio-ext-correo.pdf");
}

export async function downloadDirectoryPhones(): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
    return downloadDevicesDirectoryPdf("devices-directory-phones", "directorio-celulares.pdf");
}

export async function downloadDirectoryEmails(): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
    return downloadDevicesDirectoryPdf("devices-directory-emails", "directorio-correos.pdf");
}
