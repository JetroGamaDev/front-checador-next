"use client"

import { ReadNotifications } from "@/app/actions/notifies-actions";
import { INotifications } from "@/lib/notis/interface";
import { useState } from "react";
import { Dropdown } from "react-bootstrap";
import useSWR from "swr";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";

type FeedbackState = "loading" | "success" | "error" | null;

const fetcher = (url: string) => fetch(url).then((res) => res.json());


function typeVariant(incidenceRef: string) {
    switch (incidenceRef ?? "") {
        case "HORAS_EXTRAS":
            return { icon: "bi-clock-history", color: "primary" };
        case "PENALIZACION":
            return { icon: "bi-exclamation-octagon", color: "danger" };
        case "PERMISOS":
            return { icon: "bi-file-earmark-ruled", color: "info" };
        case "VACACIONES":
            return { icon: "bi-calendar4-week", color: "warning" };
        case "DEVICE_IT":
            return { icon: "bi-laptop", color: "purple" };
        case "INCAPACIDAD":
            return { icon: "bi-clipboard2-pulse", color: "orange" };
        case "DOCUMENTO_EMPLEADO":
            return { icon: "bi-file-earmark-text", color: "teal" };
        default:
            return { icon: "bi-bell", color: "secondary" };
    }
}

function normalizeView(view: string){
    switch(view){
         case "HORAS_EXTRAS":
            return "overtime";
        case "PENALIZACION":
            return "penalties";
        case "PERMISOS":
            return "permissions";
        case "VACACIONES":
            return "vacationList";
        case "DEVICE_IT":
            return "devices";
        case "INCAPACIDAD":
            return "inability";
        case "DOCUMENTO_EMPLEADO":
            return "employee";
    }
}

// Vencimiento de documento: idIncidence es el id del empleado; se abre su perfil en la pestaña Documentos
function notificationHref(el: INotifications) {
    const base = `/app/${normalizeView(el.incidenceRef)}?view_type=form&id=${el.idIncidence}`;
    return el.incidenceRef === "DOCUMENTO_EMPLEADO" ? `${base}&tab=documents` : base;
}

// export type NotificationIncidenceType =
//     | "PERMISOS"
//     | "VACACIONES"
//     | "HORAS_EXTRAS"
//     | "INCAPACIDAD"
//     | "PENALIZACION"
//     | "DEVICE_IT";

function NotificationsBell() {
    const { data, mutate } = useSWR("/api/notifications", fetcher);

    const noti = data?.data ?? [];
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const [feedback, setFeedback] = useState<FeedbackState>(null);

    // const handleOnClick = async (idNotification: string, url: string) => {
    //     try {
    //         setFeedback("loading");
    //         setFeedbackMsg("Cargando...");
    //         await ReadNotifications({ idNotifie: idNotification });
    //         mutate();
    //         router.push(url);
    //     } catch (err: unknown) {
    //         const message = err instanceof Error ? err.message : "Error inesperado";
    //         setFeedback("error");
    //         setFeedbackMsg(message);
    //         return;
    //     } finally {

    //     }
    //     setFeedback(null);
    // }

    

    const handleMarkAsRead = async (idNotification: string) => {
        try {
            await ReadNotifications({ idNotifie: idNotification });
            mutate();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error inesperado";
            setFeedback("error");
            setFeedbackMsg(message);
        }
    }
    return (
        <>
            <ConditionalRender cond={feedback === "loading"}>
                <Loading message={feedbackMsg || "Generando..."} />
            </ConditionalRender>

            <ConditionalRender cond={feedback === "success"}>
                <SuccessOverlay
                    message={feedbackMsg}
                    onDone={() => setFeedback(null)}
                />
            </ConditionalRender>

            <ConditionalRender cond={feedback === "error"}>
                <ErrorOverlay
                    message={feedbackMsg}
                    onDone={() => setFeedback(null)}
                />
            </ConditionalRender>

            <Dropdown className="flex-shrink-0">
                <Dropdown.Toggle
                    id="notifications-dropdown-toggle"
                    variant="light"
                    className="w-100 border-0 bg-transparent text-primary"
                >
                    <span
                        className="btn btn-danger rounded-pill position-absolute d-flex align-items-center justify-content-center"
                        style={{
                            top: "-5px",
                            right: "-5px",
                            minWidth: "20px",
                            height: "20px",
                            padding: "0 5px",
                            fontSize: "0.7rem",
                            lineHeight: 1,
                        }}
                    >
                        {noti.length > 99 ? "99+" : noti.length}
                    </span>
                    <i className="bi bi-bell fs-6 text-primary" />
                </Dropdown.Toggle>

                <Dropdown.Menu
                    align="end"
                    style={{
                        position: "absolute",
                        top: "100%",
                        right: "-80px",
                        left: "auto",
                        zIndex: 2000,
                        width: "300px",
                        maxWidth: "90vw",
                        maxHeight: "300px",
                        overflowY: "auto",
                        padding: 0,
                    }}
                >
                    <div className="px-3 py-2 border-bottom d-flex align-items-center justify-content-between">
                        <span className="small fw-bold text-uppercase">
                            Notificaciones
                        </span>

                        <span
                            className="btn btn-danger rounded-pill d-flex align-items-center justify-content-center"
                            style={{
                                minWidth: "20px",
                                height: "20px",
                                padding: "0 5px",
                                fontSize: "0.7rem",
                                lineHeight: 1,
                            }}
                        >
                            {noti.length > 99 ? "99+" : noti.length}
                        </span>
                    </div>

                    <ConditionalRender cond={noti?.length === 0}>
                        <div className="text-center text-muted small py-4">
                            <i className="bi bi-bell-slash d-block fs-4 mb-1" />
                            No hay notificaciones
                        </div>
                    </ConditionalRender>

                    {data?.data?.map((el: INotifications, idx: number) => {
                        const { icon, color } = typeVariant(el.incidenceRef);
                        const isLast = idx === data.data.length - 1;

                        return (
                            <Dropdown.Item
                                key={el._id}
                                as="a"
                                href={notificationHref(el)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleMarkAsRead(String(el._id))}
                                className={`d-flex align-items-start gap-2 py-2 px-3 ${isLast ? "" : "border-bottom"}`}
                            >
                                <span
                                    className={`rounded-circle bg-${color}-subtle text-${color}-emphasis d-flex align-items-center justify-content-center flex-shrink-0`}
                                    style={{ width: "30px", height: "30px" }}
                                >
                                    <i className={`bi ${icon}`} style={{ fontSize: "0.85rem" }} />
                                </span>

                                <div className="small fw-semibold text-wrap lh-sm">
                                    {el.title}
                                </div>
                            </Dropdown.Item>
                        );
                    })}
                </Dropdown.Menu>
            </Dropdown>
        </>
    )
}

export default NotificationsBell;