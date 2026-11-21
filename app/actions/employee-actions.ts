"use server";

import { ActionResponse, Employee } from "@/lib/definitions";
import { CountryCode, PhoneNumberFormat, sanitizePhoneNumber } from "@/lib/sinitizePhone";
import axios from "axios";
import { revalidatePath } from "next/cache";
import { TInputsEmployee } from "../(auth)/app/employee/definition";
import { storeAction } from "./storeActions";

type FetchVacationsArgs = {
  page?: number;
  limit?: number;
  status?: string;
  leader?: number;
  personDoh?: number;
  employee?: number;
};

function getPhoneString(
  value: PhoneNumberFormat | string | null | undefined
): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return value.internationalNumber || value.number || "";
}

function getEmptyPhone(): PhoneNumberFormat {
  return {
    countryCode: CountryCode.MX,
    dialCode: "",
    e164Number: "",
    internationalNumber: "",
    nationalNumber: "",
    number: "",
  };
}
export interface EmployeeBiometricPhoto {
  key: string;
  type?: "front" | "left" | "right" | "smile" | "custom";
  createdAt?: string | Date;
  active?: boolean;
}

export async function fetchEmployees(
  args: FetchVacationsArgs & {
    search?: string
    idEmployee?: number;
    idDepartment?: string;
    idPosition?: string;
    branch?: string;
    status?: string;
  } = {}): Promise<{
    data: Employee[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const pageNum = Math.max(Number(args.page ?? 1) || 1, 1);
    const limitNum = Math.min(Math.max(Number(args.limit ?? 20) || 20, 1), 500);

    const params = new URLSearchParams();
    params.set("page", String(pageNum));
    params.set("limit", String(limitNum));

    if (args.status && args.status.trim() !== "") {
      params.set("status", args.status)
    }

    if (args.search?.trim()) {
      params.set("search", args.search.trim());
    }
    if (args.idEmployee !== undefined && !Number.isNaN(Number(args.idEmployee))) {
      params.set("idEmployee", String(args.idEmployee));
    }
    if (args.idDepartment !== undefined && !Number.isNaN(Number(args.idDepartment))) {
      params.set("idDepartment", String(args.idDepartment));
    }
    if (args.idPosition !== undefined && !Number.isNaN(Number(args.idPosition))) {
      params.set("idPosition", String(args.idPosition));
    }
    if (args.branch !== undefined && !Number.isNaN(Number(args.branch))) {
      params.set("branch", String(args.branch));
    }

    const response = await axios.get(
      `${API_URL}/employee/listall?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.log(error);

    return {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      pages: 1,
    };
  }
}

export async function enrollEmployeeFace({
  idEmployee,
  files,
}: {
  idEmployee: number;
  files: File[];
}): Promise<
  ActionResponse<{
    idEmployee: number;
    biometricPhotos: EmployeeBiometricPhoto[];
    biometricEnrolledAt: string | Date;
  } | null>
> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("img", file);
    });

    const response = await axios
      .post(`${API_URL}/employee/enrollFace/${idEmployee}`, formData, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        throw new Error(
          err?.response?.data?.message
            ? err.response.data.message
            : "Error al registrar biométricos"
        );
      });

    return {
      success: true,
      message: response.message || "Biométricos enrolados correctamente",
      data: response.data || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);

    return {
      success: false,
      message: error.message || "Error al registrar biométricos",
      data: null,
    };
  }
}

export async function validateEmployeeFaceCheck({
  idEmployee,
  file,
}: {
  idEmployee: number;
  file: File;
}): Promise<
  ActionResponse<{
    matched: boolean;
    similarity: number;
    bestMatchKey?: string | null;
    results?: {
      key: string;
      similarity: number;
      matched: boolean;
      data?: unknown;
    }[];
  } | null>
> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const formData = new FormData();
    formData.append("img", file);

    const response = await axios
      .post(`${API_URL}/employee/validateFaceCheck/${idEmployee}`, formData, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        throw new Error(
          err?.response?.data?.message
            ? err.response.data.message
            : "Error al validar biométricos"
        );
      });

    return {
      success: true,
      message: response.message || "Rostro validado correctamente",
      data: response.data || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);

    return {
      success: false,
      message: error.message || "Error al validar biométricos",
      data: null,
    };
  }
}

// checkerId: modo checador del perfil del empleado (header x-checker-id con el token del empleado)
export async function identifyEmployeeByFace({
  file,
  lat,
  lng,
  checkerId,
}: {
  file: File;
  lat: number;
  lng: number;
  checkerId?: number | null;
}): Promise<
  ActionResponse<{
    matched: boolean;
    similarity: number;
    employee?: {
      id: number;
      name: string;
      lastName: string;
    };
    checkMessage?: string;
  } | null> & { status?: number }
> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const formData = new FormData();
    formData.append("img", file);
    formData.append("lat", String(lat));
    formData.append("lng", String(lng));

    const response = await axios
      .post(`${API_URL}/check/identifyByFace`, formData, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "multipart/form-data",
          ...(checkerId ? { "x-checker-id": String(checkerId) } : {}),
        },
        timeout: 30000,
      })
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        if (err?.code === "ECONNABORTED") {
          throw new Error("La validación tardó demasiado, intenta de nuevo");
        }

        const failure = new Error(
          err?.response?.data?.message
            ? err.response.data.message
            : "Error al identificar por rostro"
        ) as Error & { status?: number };
        failure.status = err?.response?.status;
        throw failure;
      });

    return {
      success: true,
      message:
        response?.data?.checkMessage ||
        response.message ||
        "Identificación facial correcta",
      data: response.data || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);

    return {
      success: false,
      message: error.message || "Error al identificar por rostro",
      data: null,
      status: error.status,
    };
  }
}

export async function findEmployeeById({
  id,
  _id,
}: {
  id?: number | null;
  _id?: string;
}): Promise<Employee | null> {
  try {
    const { apiToken, API_URL } = await storeAction();

    let params = {};

    if (_id) params = { idMongo: String(_id) };
    if (id) params = { id: Number(id) };

    const response = await axios
      .get(`${API_URL}/employee/listone`, {
        params,
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

    return response.data || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return null;
  }
}

export async function createEmployee({
  data,
}: {
  data: TInputsEmployee;
}): Promise<ActionResponse<Employee | null>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const sanitizedPhonePersonal = sanitizePhoneNumber(
      getPhoneString(data.phonePersonal)
    );

    const phoneCompanyString = getPhoneString(data.phoneCompany);
    const homePhoneString = getPhoneString(data.homePhone);

    const sanitizedPhoneCompany = phoneCompanyString
      ? sanitizePhoneNumber(phoneCompanyString)
      : getEmptyPhone();

    const sanitizedEmergencyContacts = data.emergencyContacts.map((contact) => {
      const phoneString = getPhoneString(contact.phone);

      return {
        ...contact,
        phone: phoneString ? sanitizePhoneNumber(phoneString) : getEmptyPhone(),
      };
    });

    const sanitizedHomePhone = homePhoneString
      ? sanitizePhoneNumber(homePhoneString)
      : null;

    const headers = {
      headers: { Authorization: `Bearer ${apiToken}` },
    };

    const res = await axios.post(
      `${API_URL}/employee`,
      {
        name: data.name,
        lastName: data.lastName,
        phonePersonal: sanitizedPhonePersonal,
        emailPersonal: data.emailPersonal,
        idCheck: data.idCheck,
        passwordCheck: data.passwordCheck,
        entryOffice: data.entryOffice,
        exitOffice: data.exitOffice,
        entryLunch: data.entryLunch,
        exitLunch: data.exitLunch,
        entrySaturdayOffice: data.entrySaturdayOffice,
        exitSaturdayOffice: data.exitSaturdayOffice,
        idDepartment: data.idDepartment?.id || 0,
        idPosition: data.idPosition,
        branch: data.branch,
        gender: data.gender,
        emergencyContacts: sanitizedEmergencyContacts,
        phoneCompany: sanitizedPhoneCompany,
        homePhone: sanitizedHomePhone,
        phoneExtCompany: !isNaN(data.phoneExtCompany) ? data.phoneExtCompany : 0,
        address: data.address,
        emailCompany: data.emailCompany || "",
        scheduleDescription: data.scheduleDescription,
        policies: data.policies,
        group: data.group,
        sons: data.sons,
        daughters: data.daughters,
        birthDate: data.birthDate,
        socialSecurityNumber: data.socialSecurityNumber,
        rfc: data.rfc,
        curp: data.curp,
        // weight: Number(data.weight) || 0, // Aviso de privacidad: ya no se captura
        // height: Number(data.height) || 0, // Aviso de privacidad: ya no se captura
        bloodType: data.bloodType.toUpperCase(),
        // constitution: data.constitution, // Aviso de privacidad: ya no se captura
        healthStatus: data.healthStatus,
        education: data.education,
        skills: data.skills,
        comments: data.comments,
        keyAspelNOI: data.keyAspelNOI,
        keyCONTPAQi: data.keyCONTPAQi,
        admissionDate: data.admissionDate,
        dischargeDate: data.dischargeDate,
        anniversaryLetter: data.anniversaryLetter,
        nationality: data.nationality,
        dailyWage: Number(data.dailyWage),
        foodBaucher: data.foodBaucher,
      },
      headers
    );

    revalidatePath("/app/employee");

    return {
      success: true,
      message: "Empleado creado",
      data: res.data,
    };
  } catch (error: unknown) {
    const message = axios.isAxiosError<{ message?: string | string[] }>(error)
      ? formatBackendMessage(error.response?.data?.message) || error.message
      : error instanceof Error
        ? error.message
        : "Error en la respuesta";

    console.error(message);

    return {
      success: false,
      message,
      data: null,
    };
  }
}

function formatBackendMessage(message?: string | string[]): string | undefined {
  if (!message) return undefined;
  return Array.isArray(message) ? message.join(" · ") : message;
}

export async function updateEmploye({
  data,
  id,
}: {
  data: TInputsEmployee;
  id: number | null;
}): Promise<ActionResponse<boolean>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    if (!id) {
      throw new Error("No se ha definido ID");
    }

    const sanitizedPhonePersonal = sanitizePhoneNumber(
      getPhoneString(data.phonePersonal)
    );

    const phoneCompanyString = getPhoneString(data.phoneCompany);
    const homePhoneString = getPhoneString(data.homePhone);

    const sanitizedPhoneCompany = phoneCompanyString
      ? sanitizePhoneNumber(phoneCompanyString)
      : getEmptyPhone();

    const sanitizedEmergencyContacts = data.emergencyContacts.map((contact) => {
      const phoneString = getPhoneString(contact.phone);

      return {
        ...contact,
        phone: phoneString ? sanitizePhoneNumber(phoneString) : getEmptyPhone(),
      };
    });

    const sanitizedHomePhone = homePhoneString
      ? sanitizePhoneNumber(homePhoneString)
      : null;

    await axios
      .put(
        `${API_URL}/employee/${String(id)}`,
        {
          name: data.name,
          lastName: data.lastName,
          phonePersonal: sanitizedPhonePersonal,
          emailPersonal: data.emailPersonal,
          idCheck: data.idCheck,
          passwordCheck: data.passwordCheck,
          entryOffice: data.entryOffice,
          exitOffice: data.exitOffice,
          entryLunch: data.entryLunch,
          exitLunch: data.exitLunch,
          entrySaturdayOffice: data.entrySaturdayOffice,
          exitSaturdayOffice: data.exitSaturdayOffice,
          idDepartment: data.idDepartment?.id || 0,
          idPosition: data.idPosition,
          branch: data.branch,
          gender: data.gender,
          status: data.status,
          emergencyContacts: sanitizedEmergencyContacts,
          phoneCompany: sanitizedPhoneCompany,
          homePhone: sanitizedHomePhone,
          phoneExtCompany: !isNaN(data.phoneExtCompany)
            ? data.phoneExtCompany
            : 0,
          address: data.address,
          emailCompany: data.emailCompany || "",
          scheduleDescription: data.scheduleDescription,
          policies: data.policies,
          group: data.group,
          sons: data.sons,
          daughters: data.daughters,
          birthDate: data.birthDate,
          nationality: data.nationality,
          socialSecurityNumber: data.socialSecurityNumber,
          rfc: data.rfc,
          curp: data.curp,
          // weight: Number(data.weight) || 0, // Aviso de privacidad: ya no se captura
          // height: Number(data.height) || 0, // Aviso de privacidad: ya no se captura
          bloodType: data.bloodType,
          // constitution: data.constitution, // Aviso de privacidad: ya no se captura
          healthStatus: data.healthStatus,
          education: data.education,
          skills: data.skills,
          comments: data.comments,
          keyAspelNOI: data.keyAspelNOI,
          keyCONTPAQi: data.keyCONTPAQi,
          admissionDate: data.admissionDate,
          dischargeDate: data.dischargeDate,
          anniversaryLetter: data.anniversaryLetter,
          dischargeReason: data.dischargeReason,
          typeOfDischarge: data.typeOfDischarge,
          role: data.role,
          visibleRecords: true,
          dailyWage: Number(data.dailyWage),
          foodBaucher: data.foodBaucher,
        },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        }
      )
      .then((res) => res.data)
      .catch((err) => {
        throw new Error(
          err?.response?.data?.message
            ? err.response.data.message
            : "Error en la respuesta"
        );
      });

    revalidatePath("/app/employee");

    return {
      success: true,
      message: "Empleado actualizado",
      data: true,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.log(err);

    return {
      success: false,
      message: err.message,
      data: false,
    };
  }
}

export async function deleteEmployee({
  id,
}: {
  id: number | null;
}): Promise<ActionResponse<boolean>> {
  try {
    if (!id) throw Error("ID NO ESPECIFICADO");

    const { apiToken, API_URL } = await storeAction();

    await axios
      .delete(`${API_URL}/employee/${String(id)}`, {
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

    revalidatePath("/app/employee");

    return {
      success: true,
      message: "Empleado eliminado",
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

export async function reEntry({
  id,
  reEntryDate
}: {
  id: number | null;
  reEntryDate: string;
}): Promise<ActionResponse<boolean>> {
  try {
    if (!id) throw new Error("ID NO ESPECIFICADO");

    const { apiToken, API_URL } = await storeAction();

    await axios.put(
      `${API_URL}/employee/reEntry/${String(id)}`,
      { date: reEntryDate },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    revalidatePath("/app/employee");

    return {
      success: true,
      message: "Empleado reingresado",
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

export async function createNewDocumentEmployee({
  nameDocument,
}: {
  nameDocument: string;
}): Promise<
  ActionResponse<{
    newDocumentId: number;
    documentName: string;
    employeesUpdated: number;
  } | null>
> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const response = await axios
      .post(
        `${API_URL}/employee/newDocument`,
        {
          nameDocument,
        },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        }
      )
      .then((res) => res.data)
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
      message: response.message || "Nueva plantilla creada correctamente",
      data: response.data || null,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.log(err);

    return {
      success: false,
      message: err.message,
      data: null,
    };
  }
}