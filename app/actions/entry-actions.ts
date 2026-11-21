"use server";

import { FetchUsersArgs } from "@/lib/constancy/interface";
import { ActionResponse, ICheckInFeedback } from "@/lib/definitions";
import { CheckMethods } from "@/lib/checadores/interface";
import { storeToken } from "@/lib/useToken";
import axios, { AxiosResponse } from "axios";
import { redirect } from "next/navigation";

export async function getWelcome(): Promise<ActionResponse<AxiosResponse>> {
  try {
    const { apiToken, apiUrl } = await storeToken();

    const response = await axios
      .get(`${apiUrl}/welcome`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      })
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        return err?.response?.data;
      });

    // Token pendiente de verificación en dos pasos: falta capturar el código, no es sesión vencida
    if (response?.status === 401 && response?.data?.twoFactorPending === true) {
      return {
        success: false,
        message: "twoFactorPending",
      };
    }

    if (
      response?.status === 401 ||
      (response?.status === 403 && response?.message === "jwt expired")
    ) {
      redirect("/auth");
    }

    if (response?.status >= 400) {
      throw new Error(response?.message || "NO HAY RESPUESTA DEL SERVIDOR");
    }

    return {
      success: true,
      message: response,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.log(err);

    return {
      success: false,
      message: err.message,
    };
  }
}

// checkerId: modo checador del perfil del empleado (va en el header x-checker-id con el token del empleado)
export async function checkIn({
  idCheck,
  passwordCheck,
  lat,
  lng,
  checkerId,
}: {
  idCheck: string;
  passwordCheck: string;
  lat: number;
  lng: number;
  checkerId?: number | null;
}): Promise<ActionResponse<string> & { status?: number }> {
  try {
    const { apiToken, apiUrl } = await storeToken();

    const response = await axios
      .post(
        `${apiUrl}/checador`,
        {
          idCheck: Number(idCheck),
          passwordCheck: Number(passwordCheck),
          lat,
          lng,
        },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            ...(checkerId ? { "x-checker-id": String(checkerId) } : {}),
          },
          timeout: 15000,
        }
      )
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        if (err?.code === "ECONNABORTED") {
          throw new Error("El registro tardó demasiado, intenta de nuevo");
        }

        if (
          err?.response?.status === 401 ||
          (err?.response?.status === 403 &&
            err?.response?.data?.message === "jwt expired")
        ) {
          redirect("/auth");
        }

        // Se conserva el estado HTTP: el modo checador apaga el modo con 403/404
        const failure = new Error(
          err?.response?.data?.message
            ? err.response.data.message
            : "Error en la respuesta"
        ) as Error & { status?: number };
        failure.status = err?.response?.status;
        throw failure;
      });

    return {
      success: true,
      message: "REGISTRO CORRECTO",
      data: response.data.message,
    };
  } catch (error: unknown) {
    const err = error as Error & { status?: number };
    console.log(err);

    return {
      success: false,
      message: err.message,
      status: err.status,
    };
  }
}

export async function fetchCheckInFeedback(args: FetchUsersArgs): Promise<
  ActionResponse<ICheckInFeedback[]>
> {
  try {
    const { apiToken, apiUrl, user } = await storeToken();

    const limitNum = Math.min(Math.max(Number(args.limit ?? 500) || 500, 1), 500);
    
    const params = new URLSearchParams();
    params.set("limit", String(limitNum));
    
    if (user?.role === "CHECADOR") params.set("idUser", String(user.id));

    const url:string = `${apiUrl}/checador/view?${params.toString()}`;

    const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        timeout: 15000,
      })
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        if (
          err?.response?.status === 401 ||
          (err?.response?.status === 403 &&
            err?.response?.data?.message === "jwt expired")
        ) {
          redirect("/auth");
        }

        throw new Error(
          err?.response?.data?.message
            ? err.response.data.message
            : "Error en la respuesta"
        );
      });

    return {
      success: true,
      message: response.message,
      data: response.data,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.log(err);

    return {
      success: false,
      message: err.message,
    };
  }
}

//Tipo de validación del checador con sesión (rostro, NIP o ambos), de /me. Si no viene, como siempre: ambos
export async function getCheckMethods(): Promise<{ success: boolean; checkMethods: CheckMethods }> {
  try {
    const { apiToken, apiUrl } = await storeToken();

    const me = await axios
      .get(`${apiUrl}/me`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        timeout: 15000,
      })
      .then((res) => res.data?.data);

    const value = me?.checkMethods;
    return {
      success: true,
      checkMethods: value === "rostro" || value === "pin" ? value : "ambos",
    };
  } catch (error: unknown) {
    console.log(error);
    return { success: false, checkMethods: "ambos" };
  }
}
