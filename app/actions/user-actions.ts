"use server";

import { signIn } from "@/lib/auth";
import {
  ActionResponse,
  ApiResponse,
  Permission,
  User,
  UserRole,
} from "@/lib/definitions";
import { PhoneNumberFormat, sanitizePhoneNumber } from "@/lib/sinitizePhone";
import axios, { AxiosError } from "axios";
import { revalidatePath } from "next/cache";
import { storeAction } from "./storeActions";
import { isNonEmptyImagePayload } from "@/lib/isNonEmptyImagePayload";
import { createUserImage } from "./image-field-actions";
import { ApiError } from "next/dist/server/api-utils";

export type UsersPagedResult = {
  data: User[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

type FetchUsersArgs = {
  page?: number;
  limit?: number;
  status?: string;
  leader?: number;
  personDoh?: number;
  employee?: number;
  search?: string;
};

type UserAxios = {
  id?: number;
  _id?: string;
};

export async function userLogin({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<ActionResponse<boolean>> {
  try {
    await signIn("credentials", { 
      email,
      password,
      redirect: false,
    });

    return {
      success: true,
      message: "Success",
      data: true,
    };
  } catch (error: unknown) {
    // Auth.js / NextAuth suele lanzar CredentialsSignin cuando authorize retorna null
    const err = error as {
      name?: string;
      message?: string;
      cause?: unknown;
      type?: string;
      code?: string;
    };

    const causeMsg =
      typeof err.cause === "object" && err.cause !== null && "message" in err.cause
        ? String((err.cause as { message?: unknown }).message ?? "")
        : "";

    if (err.name === "CredentialsSignin" || err.type === "CredentialsSignin" || err.code === "credentials") {
      return {
        success: false,
        message: "Credenciales inválidas",
        data: false,
      };
    }

    return {
      success: false,
      message: causeMsg || err.message || "Error inesperado",
      data: false,
    };
  }
}

export async function userLoginCredentials({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<ActionResponse<ApiResponse<string>>> {
  try {
    const { API_URL } = await storeAction();

    const { data } = await axios.post<ApiResponse<string>>(
      `${API_URL}/users/login`,
      { email, password }
    );

    return {
      success: true,
      message: data?.message ?? "OK",
      data,
    };
  } catch (error: unknown) {
    const err = error as AxiosError<ApiError>;

    const apiMsg =
      err.response?.data?.message ??
      err.message ??
      "Error en la respuesta";

    return {
      success: false,
      message: apiMsg,
    };
  }
}

export async function getUserData({
  apiToken,
}: {
  apiToken: string;
}): Promise<ActionResponse<ApiResponse<User>>> {
  try {
    const { API_URL } = await storeAction();

    const response = await axios
      .get(`${API_URL}/me`, {
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

    return {
      success: true,
      message: response.data.mesaage,
      data: response.data,
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

// "Mostrar tutoriales" del perfil. Sirve igual para sesiones de usuario y de empleado (usa el token de la sesión)
export async function updateTutorialsPreference(
  enableTutorials: boolean
): Promise<ActionResponse<{ enableTutorials: boolean }>> {
  try {
    const { API_URL, apiToken } = await storeAction();

    const { data } = await axios.put(
      `${API_URL}/me/tutorials`,
      { enableTutorials: enableTutorials === true },
      { headers: { Authorization: `Bearer ${apiToken}` } }
    );

    return {
      success: true,
      message: data?.message ?? "Preferencia actualizada",
      data: { enableTutorials: data?.data?.enableTutorials === true },
    };
  } catch (error: unknown) {
    console.log(error);
    let message = "No se pudo actualizar la preferencia de tutoriales";
    if (axios.isAxiosError(error)) {
      message = error.response?.data?.message || error.message || message;
    }
    return { success: false, message };
  }
}

export async function fetchUsersPages(args: FetchUsersArgs = {}): Promise<{
  data: User[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  try {
    const { apiToken, API_URL: apiUrl } = await storeAction();

    const pageNum = Math.max(Number(args.page ?? 1) || 1, 1);
    const limitNum = Math.min(Math.max(Number(args.limit ?? 20) || 20, 1), 100);

    const params = new URLSearchParams();
    params.set("page", String(pageNum));
    params.set("limit", String(limitNum));

    if (args.search?.trim()) {
      params.set("search", args.search.trim());
    }

    const response = await axios.get(`${apiUrl}/allUsers?${params.toString()}`, {
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

    const total = Number(response.total ?? 0);
    const pages = Math.max(Math.ceil(total / limitNum), 1);

    return {
      data: response.data ?? [],
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

export async function fetchUsers(): Promise<User[]> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const response = await axios
      .get(`${API_URL}/allUsers`, {
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

    return response.data || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return [];
  }
}

export async function findUserById({
  id,
  _id,
}: {
  id?: number | null;
  _id?: string;
}): Promise<User | null> {
  try {
    const { apiToken, API_URL } = await storeAction();

    let params = {};

    if (_id) params = { idMongo: String(_id) };
    if (id) params = { id: Number(id) };

    const response = await axios
      .get(`${API_URL}/user`, {
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

export async function createUser({
  name,
  lastName,
  email,
  gender,
  role,
  permissions,
  status,
  phone,
  password,
  idEmployee,
}: {
  name: string;
  lastName: string;
  email: string;
  gender: "MASCULINO" | "FEMENINO" | null;
  role: UserRole | null;
  permissions: Permission[];
  status: number;
  phone: PhoneNumberFormat | string | null;
  password: string;
  idEmployee?: number | null;
}): Promise<ActionResponse<UserAxios>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const sanitizedPhone = sanitizePhoneNumber(phone as unknown as string);

    const dataSave = {
      name,
      lastName,
      email,
      gender,
      role,
      permissions,
      status,
      phone: sanitizedPhone,
      password,
      idEmployee,
    };

    const headers = {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    };

    try {
      const res = await axios.post(`${API_URL}/users`, dataSave,
        headers
      );

      revalidatePath("/app/users");
      return {

        success: true,
        message: "Usuario creado correctamente",
        data: res.data.data,
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

export async function updateUser({
  name,
  lastName,
  email,
  gender,
  role,
  permissions,
  status,
  phone,
  id,
  idEmployee,
  imageUrl,
}: {
  name: string;
  lastName: string;
  email: string;
  gender: "MASCULINO" | "FEMENINO" | null;
  role: UserRole | null;
  permissions: Permission[];
  status: number;
  phone: PhoneNumberFormat | string | null;
  id: number;
  idEmployee: number | null;
  imageUrl?: string | File | null;
}): Promise<ActionResponse<UserAxios>> {
  try {
    const { apiToken, API_URL } = await storeAction();
    const sanitizedPhone = sanitizePhoneNumber(phone as unknown as string);

    const dataSave = {
      name,
      lastName,
      email,
      gender,
      role,
      permissions,
      status: Number(status),
      phone: sanitizedPhone,
      idEmployee,
    };

    const headers = {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    };

    try {
      const res = await axios.put<{ data?: UserAxios; message?: string }>(
        `${API_URL}/users/${id}`,
        dataSave,
        headers
      );

      if (isNonEmptyImagePayload(imageUrl)) {
        await createUserImage({ imageUrl });
      }

      revalidatePath("/app/users");

      return {
        success: true,
        message: res.data.message || "Usuario actualizado correctamente",
        data: res.data.data,
      };
    } catch (err: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(err)
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

export async function updatePasswordUser({
  password,
  id,
}: {
  password: string;
  id: number;
}): Promise<boolean> {
  const { apiToken, API_URL } = await storeAction();

  const response = await axios
    .put(
      `${API_URL}/users/${id}/password`,
      {
        password,
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

  if (response.status === 200) {
    return true;
  } else {
    return false;
  }
}

export async function unsubscribeUser({
  dischargeReason,
  typeOfDischarge,
  dischargeDate,
  id,
}: {
  dischargeReason: string;
  typeOfDischarge: string;
  dischargeDate: string;
  id: number | null;
}): Promise<ActionResponse<boolean>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    await axios
      .put(
        `${API_URL}/employee/unsubscribe/${id}`,
        {
          dischargeReason,
          typeOfDischarge,
          dischargeDate
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

    revalidatePath("/app/employee");

    return {
      success: true,
      message: "",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any    
  } catch (error: any) {
    let message = "Error en la respuesta";

    if (axios.isAxiosError(error)) {
      message = error.response?.data?.message || error.message || message;
    } else if (error instanceof Error) {
      message = error.message;
    }

    return {
      success: false,
      message: message,
    };
  }
}

export async function reEntryUser({
  id,
}: {
  id: number | null;
}): Promise<ActionResponse<boolean>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    await axios
      .put(
        `${API_URL}/employee/reEntry/${id}`,
        {},
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

    revalidatePath("/app/employee");

    return {
      success: true,
      message: "Reingreso completado",
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

export async function loadAvatar(): Promise<ActionResponse<string>> {
  try {
    const { API_URL: apiUrl, apiToken } = await storeAction();

    if (!apiToken) throw new Error("TOKEN IS REQUIRED");

    const resImg = await axios.get(`${apiUrl}/users/imgProfile`, {
      headers: { Authorization: `Bearer ${apiToken}` },
      responseType: "arraybuffer",
      validateStatus: () => true, // para manejar 400 sin throw automático
    });

    if (resImg.status !== 200) {
      // aquí verás el motivo real que manda tu backend
      const raw = Buffer.from(resImg.data ?? "").toString("utf8");
      return {
        success: false,
        message: raw || `Error al cargar avatar (status ${resImg.status})`,
      };
    }

    const contentType = resImg.headers?.["content-type"] ?? "image/jpeg";
    const base64 = Buffer.from(resImg.data).toString("base64");
    const imageBase64Url = `data:${contentType};base64,${base64}`;

    return {
      success: true,
      message: "Imagen cargada",
      data: imageBase64Url,
    };
  } catch (error: unknown) {
    // si quieres, aquí puedes tipar AxiosError también
    console.log(error);
    return {
      success: false,
      message: "Error al cargar avatar",
    };
  }
}

