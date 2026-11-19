"use server";

import { ActionResponse, INewsletter, INoticeChecador } from "@/lib/definitions";
import { storeAction } from "./storeActions";
import axios from "axios";
import { storeToken } from "@/lib/useToken";
import { revalidatePath } from "next/cache";

export async function fetchNewsletters(): Promise<INewsletter[]> {
  try {
    const { apiToken, API_URL } = await storeAction();

    const response = await axios
      .get(`${API_URL}/notice/listAll`, {
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

export async function findNewslettersById({
  id,
}: {
  id: string | null;
}): Promise<INewsletter | null> {
  try {
    if (!id) throw new Error("ID NOT DEFINED");

    const { apiToken, API_URL } = await storeAction();

    const response = await axios
      .get(`${API_URL}/notice/listAll`, {
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

    const newsletter: INewsletter = response.data.find(
      (n: INewsletter) => n.id === Number(id)
    );

    const getImg = await axios
      .get(`${API_URL}/notice/img/${newsletter.id}`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        responseType: "arraybuffer",
      })
      .then((res) => {
        return res.data;
      });

    const base64 = Buffer.from(getImg, "binary").toString("base64");
    const imageBase64Url = `data:image/jpeg;base64,${base64}`;

    const newResponse = {
      ...newsletter,
      img: imageBase64Url,
    };

    return newResponse || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return null;
  }
}

export async function getActiveNotice(): Promise<INewsletter | null> {
  try {
    const { apiToken, API_URL } = await storeAction();

    let newsletter: INewsletter = {
        _id: "",
        id: 0,
        title: "",
        text: "",
        img: "",
        programing: false,
        dateInitiPublish: "",
        dateEndPublish: "",
        hourEndPublish: "",
        hourInitiPublish: ""
    };

    let getImg: string = '';

    await axios.get(`${API_URL}/notice/listActive`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      timeout: 15000,
    }).then(async (res) => {
      // Este then se resuelve cuendo el endpoint /notice/listActive devuelve respuesta correcta

        await axios.get(`${API_URL}/notice/img/${res.data.data.id}`, {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
          responseType: "arraybuffer",
          timeout: 15000,
        }).then((resImg) => {
          // Este then se resuelve cuendo el endpoint notice/img/${id} devuelve respuesta correcta
          getImg = resImg.data;
          return resImg.data;
        })        

      newsletter = res.data.data
      
      return res.data;
      
    }).catch(() => {
      // Este es el catch del endpoint /notice/listActive
      return null;
    });

    let imageBase64Url = '';

    if (getImg !== '') {
      const base64 = Buffer.from(getImg, "binary").toString("base64");
      imageBase64Url = `data:image/jpeg;base64,${base64}`;
    }
        
    const resData:INewsletter = {
            ...newsletter,
            img: imageBase64Url,
    }
    return resData; 

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return null;
  }
}

// Checadores que se pueden elegir al crear un anuncio
export async function fetchNoticeChecadores(): Promise<ActionResponse<INoticeChecador[]>> {
  try {
    const { apiToken, API_URL } = await storeAction();
    const { data } = await axios.get(`${API_URL}/notice/checadores`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    return { success: true, message: data?.message ?? "OK", data: Array.isArray(data?.data) ? data.data : [] };
  } catch (error: unknown) {
    console.log(error);
    let message = "No se pudieron cargar los checadores";
    if (axios.isAxiosError(error)) message = error.response?.data?.message || message;
    return { success: false, message, data: [] };
  }
}

const NO_CHECADORES_MESSAGE = "Selecciona al menos un checador para el aviso.";

export async function createNewsletter({
  data,
}: {
  data: {
    img: string | null;
    title: string;
    text: string;
    dateInitiPublish: string;
    hourInitiPublish: string;
    dateEndPublish: string;
    hourEndPublish: string;
    idUsers: number[];
  };
}): Promise<ActionResponse<INewsletter | null> & { invalidIdUsers?: number[] }> {
  try {
    const { apiToken, apiUrl } = await storeToken();

    const idUsers = (data.idUsers ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
    if (idUsers.length === 0) {
      return { success: false, message: NO_CHECADORES_MESSAGE };
    }

    const response = await axios.post(`${apiUrl}/notice`,
        {
          title: data.title,
          text: data.text,
          dateInitiPublish: data.dateInitiPublish,
          hourInitiPublish: data.hourInitiPublish,
          dateEndPublish: data.dateEndPublish,
          hourEndPublish: data.hourEndPublish,
          idUsers,
        },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        }
      ).then(async (res) => {
        const noticeId = res.data?.data?.id;
        const file = data.img;

        // Solo se sube la imagen si se creó la noticia y se seleccionó un archivo
        if (noticeId && file) {
          const formData = new FormData();
          formData.append("img", file);

          await axios.put(`${apiUrl}/notice/img/${noticeId}`, formData, {
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          });
        }

        return res.data;
      }).catch((err) => {
      console.log("ERROR DE CATCH:", err?.response?.data || err);
      // Checadores que ya no existen o no están activos: el back regresa sus ids en data.idUsers
      const invalid = err?.response?.data?.data?.idUsers;
      const error = new Error(
        err?.response?.data?.message || "Error en la respuesta"
      ) as Error & { invalidIdUsers?: number[] };
      if (Array.isArray(invalid)) error.invalidIdUsers = invalid.map(Number);
      throw error;
    });

    revalidatePath("/app/newsletter");

    return {
      success: true,
      message: "Se ha creador la publicación",
      data: response.data || null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return {
      success: false,
      message: error.message,
      invalidIdUsers: error.invalidIdUsers,
    };
  }
}

export async function deleteNotice({
  id,
}: {
  id: string | null;
}): Promise<boolean> {
  try {
    if (!id) throw new Error("ID NOT DEFINED");

    const { apiToken, apiUrl } = await storeToken();

    await axios.delete(`${apiUrl}/notice/${id}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    revalidatePath("/app/newsletter");

    return true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return false;
  }
}
