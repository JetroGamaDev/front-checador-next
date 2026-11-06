"use server";

import { ActionResponse, IDeleteIncidenece } from "@/lib/definitions";
import axios from "axios";
import { storeAction } from "./storeActions";
import { storeToken } from "@/lib/useToken";
import { revalidatePath } from "next/cache";
import { base64ToBlob } from "@/lib/helpers";
import { fetchPagedWithoutCancelled, isOnlyEmployee } from "@/lib/employeeVisibility";
import { IUpdateVacation, PeriodVacation, Vacations } from "@/lib/vactions/interface";

// export async function fetchVacations(): Promise<Vacations[]> {
//   try {
//     const { apiToken, API_URL: apiUrl, session } = await storeAction();

//     let query = "";

//     if (session?.role === "EMPLOYEE" && session.isDoh === false)
//       query += `?employee=${session.idEmployee}`;

//     if (session?.role !== "EMPLOYEE" && session?.isDoh === false)
//       query += `?leader=${session?.idEmployee}`;

//     if (session?.isDoh === true) query += "";

//     const response = await axios
//       .get(`${apiUrl}/vacations/listAll${query}`, {
//         headers: {
//           Authorization: `Bearer ${apiToken}`,
//         },
//       })
//       .then((res) => {
//         return res.data;
//       })
//       .catch((err) => {
//         throw new Error(
//           err.response.data.message
//             ? err.response.data.message
//             : "Error en la respuesta"
//         );
//       });

//     return response.data;

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (error: any) {
//     console.log(error);
//     return [];
//   }
// }


export type FetchVacationsParams = {
  page?: number;
  limit?: number;
};

export type VacationsPagedResult = {
  data: Vacations[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};
type FetchVacationsArgs = {
  page?: number;
  limit?: number;
  status?: string;
  leader?: number;
  personDoh?: number;
  employee?: number;
  search?: string;
  dateInit?: string;
  dateEnd?: string;
};

export async function fetchVacations(args: FetchVacationsArgs = {}): Promise<{
  data: Vacations[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  try {
    const { apiToken, API_URL: apiUrl, session } = await storeAction();

    const pageNum = Math.max(Number(args.page ?? 1) || 1, 1);
    const limitNum = Math.min(Math.max(Number(args.limit ?? 20) || 20, 1), 100);

    const requestPage = async (page: number, limit: number): Promise<{ data: Vacations[]; total: number }> => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      // ✅ filtros opcionales (si quisieras usarlos manualmente)
      if (args.status) params.set("status", args.status);
      if (args.leader) params.set("leader", String(args.leader));
      if (args.personDoh) params.set("personDoh", String(args.personDoh));
      if (args.employee) params.set("employee", String(args.employee));
      if (args.search) params.set("search", String(args.search));
      if (args.dateInit) params.set("dateInit", String(args.dateInit));
      if (args.dateEnd) params.set("dateEnd", String(args.dateEnd));


      if (session?.role === "EMPLOYEE" && session.isDoh === false) {
        params.set("employee", String(session.idEmployee));
        params.delete("leader");
        params.delete("personDoh");
      }

      if (session?.role !== "EMPLOYEE" && session?.isDoh === false) {
        params.set("leader", String(session.idEmployee));
        params.delete("employee");
        params.delete("personDoh");
      }

      const url = `${apiUrl}/vacations/listAll?${params.toString()}`;

      const response = await axios
        .get(url, {
          headers: { Authorization: `Bearer ${apiToken}` },
        })
        .then((res) => res.data);

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return { data: [], total: 0, page: 1, limit: 20, pages: 1 };
  }
}

export async function fetchVacationByEmployee({
  idEmployee,
}: {
  idEmployee: number | null;
}): Promise<Vacations[]> {
  try {
    if (!idEmployee) throw new Error("ID NOT DEFINED");

    const { apiToken, API_URL: apiUrl } = await storeAction();

    const response = await axios
      .get(`${apiUrl}/vacations/listOne/${idEmployee}`, {
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

    return response.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return [];
  }
}

export async function fetchPeriods({
  idEmployee,
}: {
  idEmployee: number | null;
}): Promise<PeriodVacation[]> {
  try {
    const { apiToken, apiUrl } = await storeToken();

    const response = await axios
      .get(`${apiUrl}/vacations/listPeriods/${idEmployee}`, {
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

    return response.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return [];
  }
}

export async function findVacationById({
  id,
}: {
  id: string | null;
}): Promise<Vacations | null> {
  try {
    const { apiToken, apiUrl } = await storeToken();

    const response = await axios
      .get(`${apiUrl}/vacations/listOneRequest/${id}`, {
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

    return response.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return null;
  }
}

export async function createVacation({
  data,
}: {
  data: {
    idEmployee: number | null;
    idLeader: number | null;
    idPersonDoh: number | null;
    idPeriod: number | null;
    incidence: string;
    periodDescription: string;
    dateInit: string;
    dateEnd: string;
    signature: string;
    notes: string;
  };
}): Promise<ActionResponse<string>> {
  try {
    const { apiToken, apiUrl } = await storeToken();

    const response = await axios
      .post(
        `${apiUrl}/vacations`,
        {
          idEmployee: data.idEmployee,
          idLeader: data.idLeader,
          idPersonDoh: data.idPersonDoh,
          idPeriod: data.idPeriod,
          incidence: "VACACIONES",
          periodDescription: data.periodDescription,
          twoHundredthPeriod: 1,
          biWeeklyPeriodVacationBonus: 1,
          dateInit: data.dateInit,
          dateEnd: data.dateEnd,
          notes: data.notes ?? null,
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
          err.response.data.message
            ? err.response.data.message
            : "Error en la respuesta"
        );
      });


    if (response.data.id) {
      const datax = new FormData();

      // 🔸 Convertir base64 a Blob
      const blob = base64ToBlob(data.signature, "image/png");

      // 🔸 Agregarlo a FormData como archivo
      datax.append("img", blob, "signature.png");
      await axios
        .post(
          `${apiUrl}/vacations/signature/${response.data.id}/${data.idPeriod}`,
          datax,
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
            err.response.data.message
              ? err.response.data.message
              : "Error en la respuesta"
          );
        });
    }

    revalidatePath("/app/vacations");

    return {
      success: true,
      message: "Registro creado",
      data: response.data.id,
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

//Mandar firma del empleado
export async function sendSignatureVacations({
  id,
  idPeriod,
  signature,
}: {

  id: number | null;
  idPeriod: number | null;
  signature: string;

}): Promise<ActionResponse<boolean>> {
  try {
    if (!id) throw new Error("ID NOT DEFINED");
    if (!signature) throw new Error("No se recibió la firma");

    const { apiToken, apiUrl } = await storeToken();

    const formData = new FormData();

    const blob = base64ToBlob(signature, "image/png");

    formData.append("img", blob, "signature.png");

    await axios.post(`${apiUrl}/vacations/signature/${id}/${idPeriod}`, formData, {
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

//Obtener firmas
export async function fetchVacationSignature({
  data,
}: {
  data: {
    idSolicitud: number | null;
    idEmployee: number | null;
    idPeriod: number | null;
  };
}): Promise<ActionResponse<string>> {
  try {

    const { apiToken, apiUrl } = await storeToken();

    const resImg = await axios
      .get(
        `${apiUrl}/vacations/signature/${data.idSolicitud}/${data.idPeriod}/${data.idEmployee}`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
          responseType: "arraybuffer",
        }
      )
      .then((res) => res.data)
      .catch((err) => {
        console.log(err);
        return null; // null en vez de '' para distinguir claramente "no hay imagen"
      });

    if (!resImg) {
      return {
        success: false,
        message: "Firma no encontrada",
        data: "",
      };
    }

    const base64 = Buffer.from(resImg, "binary").toString("base64");
    const imageBase64Url = `data:image/jpeg;base64,${base64}`;

    return {
      success: true,
      message: "Imagen obtenida correctamente",
      data: imageBase64Url,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return {
      success: false,
      message: error.message,
      data: "",
    };
  }
}

export async function approvedVacation({
  data,
}: {
  data: {
    id: string | null;
    signature: string;
    idPeriod: number;
    status: string;
  };
}): Promise<ActionResponse<boolean>> {
  try {
    if (!data.id) throw new Error("ID NOT DEFINED");

    const { apiToken, apiUrl } = await storeToken();

    await axios
      .put(
        `${apiUrl}/vacations/approve/${data.id}/${data.idPeriod}`,
        {
          status: data.status,
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
          err.response.data.message
            ? err.response.data.message
            : "Error en la respuesta"
        );
      });

    const datax = new FormData();

    // 🔸 Convertir base64 a Blob
    const blob = base64ToBlob(data.signature, "image/png");

    // 🔸 Agregarlo a FormData como archivo
    datax.append("img", blob, "signature.png");
    await axios
      .post(
        `${apiUrl}/vacations/signature/${data.id}/${data.idPeriod}`,
        datax,
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
          err.response.data.message
            ? err.response.data.message
            : "Error en la respuesta"
        );
      });

    revalidatePath("/app/vacations");

    return {
      success: true,
      message: "Proceso completado",
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


// export async function deleteVacation(idRequest: number, idPeriod: number): Promise<ActionResponse<boolean>> {

//   try {
//     if (!idRequest) throw new Error("ID NOT DEFINED");

//     const { apiToken, apiUrl } = await storeToken();

//     await axios.delete(`${apiUrl}/vacations/${idRequest}/${idPeriod}`, {
//       headers: {
//         Authorization: `Bearer ${apiToken}`,
//       },
//     }
//     )
//       .then((res) => {
//         return res.data;

//       })
//       .catch((err) => {
//         console.log("Error en axios delete vacations: ", err);

//         throw new Error(
//           err.response.data.message
//             ? err.response.data.message
//             : "Error en la respuesta"
//         );
//       });


//     // revalidatePath("/app/vacationList");

//     return {
//       success: true,
//       message: "Proceso completado",
//       data: true,
//     };
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (error: any) {
//     return {
//       success: false,
//       message: error.message,
//     };
//   }
// }

export async function approvedVacationDoh({
  data,
}: {
  data: {
    id: string | null;
    signature: string;
    idPeriod: number;
    status: string;
  };
}): Promise<ActionResponse<boolean>> {
  try {
    if (!data.id) throw new Error("ID NOT DEFINED");

    const { apiToken, apiUrl } = await storeToken();

    await axios
      .put(
        `${apiUrl}/vacations/approveDoh/${data.id}/${data.idPeriod}`,
        {
          status: data.status,
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
          err.response.data.message
            ? err.response.data.message
            : "Error en la respuesta"
        );
      });

    const datax = new FormData();

    // 🔸 Convertir base64 a Blob
    const blob = base64ToBlob(data.signature, "image/png");

    // 🔸 Agregarlo a FormData como archivo
    datax.append("img", blob, "signature.png");
    await axios
      .post(
        `${apiUrl}/vacations/signature/${data.id}/${data.idPeriod}`,
        datax,
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
          err.response.data.message
            ? err.response.data.message
            : "Error en la respuesta"
        );
      });

    revalidatePath("/app/vacations");

    return {
      success: true,
      message: "Proceso completado",
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

export async function fetchVacatiionPDF({
  id,
}: {
  id: string | null;
}): Promise<ActionResponse<string>> {
  try {
    if (!id) throw new Error("ID NOT DEFINED");

    const { apiToken, API_URL: apiUrl } = await storeAction();

    const resImg = await axios
      .post(
        `${apiUrl}/vacations/generar-pdf/${Number(id)}`,
        {},
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
        console.log(err.response);
        throw new Error(
          err.response.data.message
            ? err.response.data.message
            : "Error al descargar el PDF"
        );
      });

    // Convertir a base64
    const base64 = Buffer.from(resImg, "binary").toString("base64");
    const pdfBase64Url = `data:application/pdf;base64,${base64}`;

    return {
      success: true,
      message: "Archivo descargado",
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

//BORRAR-CANCELAR VACACIONES
export async function deleteVacations({
  id,
  idPeriod,
  data
}: {
  id: number | null;
  idPeriod: number | null;
  data: IDeleteIncidenece;
}): Promise<ActionResponse<boolean>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    if (!id) {
      throw new Error("No se ha definido ID");
    }

    await axios.delete(`${API_URL}/vacations/${String(id)}/${String(idPeriod)}`, {
      data: {
        deletePermission: true,
        reaseonDelete: data.reaseonDelete,
      },
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    revalidatePath("/app/vacationList");

    return {
      success: true,
      message: "Vacación eliminada correctamente",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return {
      success: false,
      message: error.response?.data?.message ?? "Error en la respuesta",
    };
  }
}

export async function updateVacationRequest({
  idRequest,
  idPeriod,
  data
}: {
  idRequest: string;
  idPeriod: string;
  data: IUpdateVacation;
}): Promise<ActionResponse<string>> {
  try {
    const { apiToken, API_URL } = await storeAction();
    const url = `${API_URL}/vacations/${idRequest}/${idPeriod}`

    const response = await axios.put(url, {

      dateInit: data.dateInit,
      dateEnd: data.dateEnd
    }, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    revalidatePath("/app/employee");

    return {
      success: true,
      message: response.data?.message ?? "Actualizado correctamente",
      data: response.data,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return {
      success: false,
      message: error?.response?.data?.message || error.message || "Error en la respuesta",
      data: "",
    };
  }
}

