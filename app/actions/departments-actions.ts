"use server";

import { ActionResponse, Department } from "@/lib/definitions";
import axios from "axios";
import { revalidatePath } from "next/cache";
import { storeAction } from "./storeActions";

type FetchUsersArgs = {
  page?: number;
  limit?: number;
  status?: string;
  leader?: number;
  personDoh?: number;
  employee?: number;
};


export async function fetchDepartments(): Promise<Department[]> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const response = await axios
      .get(`${API_URL}/department/listAll`, {
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

export async function fetchDepartmentsQuery(args: FetchUsersArgs = {}): Promise<{
  data: Department[];
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

    const response = await axios
      .get(`${API_URL}/department/listAll?${params.toString()}`, {
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

export async function findDepartmentById({
  id,
  _id,
}: {
  id?: number | null;
  _id?: string;
}): Promise<Department | null> {
  const { apiToken, API_URL } = await storeAction();

  let params = {};

  if (_id) params = { id: String(_id) };
  if (id) params = { id: Number(id) };

  const response = await axios
    .get(`${API_URL}/department/listOne`, {
      params,
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

  // El backend puede regresar el departamento directo o envuelto en { status, message, data }
  const body = response.data;
  const department = body && !("nameDepartment" in body) && body.data ? body.data : body;

  return department || null;
}

export async function createDepartment({
  data,
}: {
  data: Department;
}): Promise<ActionResponse<Department | null>> {
  try {
    // El back aún exige la descripción
    const description = String(data.description ?? "").trim();
    if (!description) {
      return { success: false, message: "La descripción es requerida" };
    }

    const { apiToken, API_URL } = await storeAction();

    await axios
      .post(
        `${API_URL}/department`,
        {
          nameDepartment: data.nameDepartment,
          description,
          // id interno del empleado como número; sin líder va null
          idLeader: data.idLeader ? Number(data.idLeader) : null,
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

    revalidatePath("/app/departments");

    return {
      success: true,
      message: "Departamento creado",
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

export async function updateDepartment({
  data,
  id,
}: {
  data: Department;
  id: number;
}): Promise<ActionResponse<Department | null>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    if (!id) {
      throw new Error("No se ha definido ID");
    }

    await axios
      .put(
        `${API_URL}/department/${id}`,
        {
          nameDepartment: data.nameDepartment,
          description: data.description,
          idLeader: data.idLeader,
          // null quita al subgerente; si no viene en el formulario no se manda
          ...(data.idSubManager !== undefined ? { idSubManager: data.idSubManager ?? null } : {}),
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

    revalidatePath("/app/departments");

    return {
      success: true,
      message: "Departamento actualizado",
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

export async function deleteDepartment({
  id,
}: {
  id: number;
}): Promise<ActionResponse<Department | null>> {
  try {
    const { apiToken, API_URL } = await storeAction();

    if (!id) {
      throw new Error("No se ha definido ID");
    }

    await axios
      .delete(`${API_URL}/department/${id}`, {
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

    revalidatePath("/app/departments");

    return {
      success: true,
      message: "Departamento eliminado",
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
