"use server"

import { ActionResponse } from "@/lib/definitions";
import { storeAction } from "./storeActions";
import axios from "axios";

//REPORTE EXCEL PARA ABONO MENSUAL
export async function getAbonoMensual({
    dateInit,
    dateEnd,
}: {
    dateInit: string;
    dateEnd: string;
}): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
    try {
        const { apiToken, API_URL } = await storeAction();


        const params = new URLSearchParams();
        params.set("dateInit", dateInit);
        params.set("dateEnd", dateEnd);

        let base64Url = "";

        await axios
            .get(`${API_URL}/absencesAndAttendances-report-document?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
                responseType: "arraybuffer",
            })
            .then((res) => {
                const base64 = Buffer.from(res.data).toString("base64");
                base64Url = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
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
                fileName: `reporte_${dateInit}_a_${dateEnd}.xlsx`,
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

//REPORTE EXCEL PARA PRIMA ANUAL
export async function getPrimaAnual(idPeriod: string): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
    try {
        const { apiToken, API_URL } = await storeAction();

        let base64Url = "";

        const url = `${API_URL}/incidences/annualPremium/${idPeriod}`;


        // El back regresa el .xlsx como archivo; si algo falla regresa JSON con `message`.
        // Se pide como binario y, en error, se decodifica el JSON para mostrar su mensaje.
        const readMessage = (data: unknown, fallback: string) => {
            try {
                return JSON.parse(Buffer.from(data as ArrayBuffer).toString("utf8"))?.message || fallback;
            } catch {
                return fallback;
            }
        };

        await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
                responseType: "arraybuffer",
            })
            .then((res) => {
                // Un JSON con estado 200 no es el archivo: se trata como error para no descargar un Excel dañado
                if (String(res.headers["content-type"] ?? "").includes("application/json")) {
                    throw new Error("El servidor no regresó el archivo del reporte. Intenta de nuevo más tarde.");
                }
                const base64 = Buffer.from(res.data).toString("base64");
                base64Url = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
            })
            .catch((err) => {
                if (!axios.isAxiosError(err)) throw err;
                throw new Error(readMessage(err.response?.data, "Error al generar el reporte"));
            });

        return {
            success: true,
            message: "Reporte generado correctamente",
            data: {
                base64Url,
                fileName: `reporte_PrimaAnual_${idPeriod}.xlsx`,
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

//REPORTE EXCEL PARA BONO DE ASISTENCIA Y PUNTUALIDAD PERFECTA
export async function getPerfectAttendanceBonus({
    year,
    month,
}: {
    year: string;
    month: string;
}): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
    try {
        const { apiToken, API_URL } = await storeAction();

        let base64Url = "";

        const url = `${API_URL}/incidences/perfectAttendanceBonus/${year}/${month}`;

        await axios.get(url, {
            headers: {
                Authorization: `Bearer ${apiToken}`,
            },
            responseType: "arraybuffer",
        })
            .then((res) => {
                const base64 = Buffer.from(res.data).toString("base64");
                base64Url = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
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
            message: "Reporte generado correctamente",
            data: {
                base64Url,
                fileName: `reporte_AsistenciaPuntualidadPerfecta_${year}-${month}.xlsx`,
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

//REPORTE EXCEL PARA INGRESOS Y SALIDAS
export async function getReportInflowsAndOutflows(idPeriod: number): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
    try {
        const { apiToken, API_URL } = await storeAction();

        let base64Url = "";

        const url = `${API_URL}/incidences/inflowsAndOutflows/${idPeriod}`;

        await axios.get(url, {
            headers: {
                Authorization: `Bearer ${apiToken}`,
            },
            responseType: "arraybuffer",
        })
            .then((res) => {
                const base64 = Buffer.from(res.data).toString("base64");
                base64Url = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
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
            message: "Reporte generado correctamente",
            data: {
                base64Url,
                fileName: `reporte_ingresosEgresos_period_${idPeriod}.xlsx`,
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

//REPORTE EXCEL PARA VALES
export async function getReportVales(idPeriod: number): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
    try {
        const { apiToken, API_URL } = await storeAction();

        let base64Url = "";
        const url = `${API_URL}/incidences/vales-report/${idPeriod}`;

        await axios
            .get(url, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
                responseType: "arraybuffer",
            })
            .then((res) => {
                const base64 = Buffer.from(res.data).toString("base64");
                base64Url = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
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
            message: "Reporte generado correctamente",
            data: {
                base64Url,
                fileName: `reporte_Vales_${idPeriod}.xlsx`,
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

//REPORTE EXCEL PARA INCAPACIDADES
export async function getIncapacidades({
    dateInit,
    dateEnd,
}: {
    dateInit: string;
    dateEnd: string;
}): Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> {
    try {
        const { apiToken, API_URL } = await storeAction();


        const params = new URLSearchParams();
        params.set("dateInit", dateInit);
        params.set("dateEnd", dateEnd);

        let base64Url = "";

        await axios
            .get(`${API_URL}/absencesAndAttendances-report-document?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
                responseType: "arraybuffer",
            })
            .then((res) => {
                const base64 = Buffer.from(res.data).toString("base64");
                base64Url = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
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
                fileName: `reporte_${dateInit}_a_${dateEnd}.xlsx`,
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
