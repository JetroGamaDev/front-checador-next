"use client"

import { IDevices, IExternalPerson } from "@/lib/devices/interface";
import { ExternalPersonSummary, externalPersonName } from "./ExternalPerson";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Col, Container, Row } from "react-bootstrap";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import { formatCreatedAt } from "@/lib/helpers";
import { useModals } from "@/context/ModalContext";
import { getHistorialDoc } from "@/app/actions/devices-actions";

type FeedbackState = "loading" | "success" | "error" | null;

type ModalAction = {
    device: IDevices;
    idDevice: number;
}

export default function HistorialDevice({
    device
}: ModalAction) {
    const router = useRouter();
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const filtrados = device.assignmentHistory?.filter((e) => e.returnedAt !== null);
    const noHistorial = device.assignmentHistory?.every((n) => n.returnedAt === null);
    const { modalConfirm } = useModals();


    const handleBack = () => {
        setFeedback("loading");
        setFeedbackMsg("Cargando datos...");

        setTimeout(() => {
            router.push(`/app/devices?view_type=form&id=${device.id}`);
        }, 100);
    };

    const downloadBase64File = (base64Url: string, fileName: string) => {
        const link = document.createElement("a");
        link.href = base64Url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const handleGenerate = async (idHistory: number) => {
        modalConfirm("Se descargará el PDF", async () => {

            try {
                setFeedback("loading");
                setFeedbackMsg("Descargando PDF...");

                const res = await getHistorialDoc({
                    idDoc: device.id,
                    idHistory: idHistory,
                });

                if (!res.success || !res.data) {
                    setFeedbackMsg(res.message || "No se pudo descargar el reporte");
                    setFeedback("error");
                    return;
                }

                const { base64Url, fileName } = res.data;
                downloadBase64File(base64Url, fileName);

                setFeedbackMsg("PDF descargado correctamente");
                setFeedback("success");

            } catch {
                setFeedbackMsg("Error inesperado al generar el PDF");
                setFeedback("error");
            }
        });
    };

    

    return (
        <>
            <ConditionalRender cond={feedback === "loading"}>
                <Loading message={feedbackMsg || "Cargando..."} />
            </ConditionalRender>

            <ConditionalRender cond={feedback === "success"}>
                <SuccessOverlay
                    message={feedbackMsg}
                    onDone={() => {
                        setFeedback(null);
                    }}
                />
            </ConditionalRender>

            <ConditionalRender cond={feedback === "error"}>
                <ErrorOverlay
                    message={feedbackMsg}
                    onDone={() => setFeedback(null)}
                />
            </ConditionalRender>

            <Container className="py-3" style={{ maxWidth: "1600px" }}>

                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
                    <div className="d-flex gap-2 flex-wrap">

                    </div>


                    <div className=" d-md-flex flex-wrap">
                        <Button
                            variant="outline-secondary"
                            onClick={handleBack}
                            disabled={feedback === "loading"}
                            className="d-inline-flex align-items-center gap-2 fw-semibold px-2 px-md-3"
                        >
                            <i className="bi bi-arrow-left" />
                            Regresar
                        </Button>
                    </div>
                </div>

                <div>
                    <h1 className="mb-1 ms-1">Historial del dispositivo</h1>
                    <p className="text-muted mb-0 ms-1">
                        Historial del dispositivo y condiciones de entrega.
                    </p>
                </div>


                <Card className="border shadow-sm rounded-4 mt-2">
                    <Card.Body className="p-4">

                        <ConditionalRender cond={noHistorial === true}>
                            <div className="card-body text-center">

                                <div className="mb-1">
                                    <i
                                        className="bi bi-hourglass-split text-danger"
                                        style={{ fontSize: "4rem" }}
                                    />
                                </div>

                                <p className="fw-bold">
                                    El dispositivo no cuenta con historial
                                </p>
                            </div>
                        </ConditionalRender>

                        {(filtrados ?? []).map((filtrados) => {
                            return (
                                <Row
                                    key={filtrados.id}
                                    className="g-0 border rounded-4 overflow-hidden mb-3">
                                    <Col xs={12} md={4} className="bg-info-subtle d-flex flex-column align-items-center justify-content-center text-center p-4">
                                        <div
                                            className="d-flex align-items-center justify-content-center rounded-circle bg-white text-primary mb-3 shadow-sm"
                                            style={{ width: 64, height: 64 }}
                                        >
                                            <i className="bi bi-person fs-3 text-info" />
                                        </div>
                                        <div className="fw-bold text-uppercase text-primary-emphasis">
                                            {filtrados.employee
                                                ? `${filtrados.employee.lastName ?? ""} ${filtrados.employee.name ?? ""}`.trim()
                                                : externalPersonName(filtrados.externalPerson) || "Sin registro"}
                                        </div>
                                        <ConditionalRender cond={!filtrados.employee && !!filtrados.externalPerson}>
                                            <ExternalPersonSummary person={filtrados.externalPerson as IExternalPerson} />
                                        </ConditionalRender>
                                        <span className="badge rounded-pill mt-2 px-3 py-2 fw-semibold bg-white text-info border border-primary-subtle">
                                            {formatCreatedAt(filtrados.assignedAt)} - {formatCreatedAt(filtrados.returnedAt ?? undefined)}
                                        </span>
                                    </Col>

                                    {/* Datos tipo ficha */}
                                    <Col xs={12} md={8}>
                                        <div className="p-4 h-100 d-flex flex-column justify-content-center">
                                            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                <span className="text-muted small">
                                                    <i className="bi bi-building me-2 text-warning" />
                                                    Sucursal
                                                </span>
                                                <span className="fw-semibold text-uppercase small text-end">
                                                    {filtrados.branch.name ? filtrados.branch.name : "No hubo registro"}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                <span className="text-muted small">
                                                    <i className="bi bi-columns-gap me-2 text-info" />
                                                    Departamento
                                                </span>
                                                <span className="fw-semibold text-uppercase small text-end">
                                                    {filtrados.department.nameDepartment ? filtrados.department.nameDepartment : "No hubo registro"}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                <span className="text-muted small">
                                                    <i className="bi bi-geo-alt-fill me-2 text-danger" />
                                                    Locación
                                                </span>
                                                <span className="fw-semibold text-uppercase small text-end">
                                                    {filtrados.location || "Sin registro"}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                <span className="text-muted small">
                                                    <i className="bi bi-envelope-check me-2 text-primary" />
                                                    Correo laboral
                                                </span>
                                                <span className="fw-semibold small text-end">
                                                    {filtrados.emailCompany ? filtrados.emailCompany : "NO HAY CORREO REGISTRADO"}
                                                </span>
                                            </div>
                                            
                                            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                <span className="text-muted small">
                                                    <i className="bi bi-envelope-at me-2 text-secondary" />
                                                    Correo institucional
                                                </span>
                                                <span className="fw-semibold small text-end">
                                                    {filtrados.emailGmail ? filtrados.emailGmail : "NO HAY CORREO REGISTRADO"}
                                                </span>
                                            </div>

                                            <div className="d-flex justify-content-end">
                                                <Button
                                                    variant="primary"
                                                    className="d-inline-flex align-items-center gap-2 fw-semibold px-3 mt-2"
                                                    onClick={() => handleGenerate(filtrados.id)}
                                                >
                                                    <i className="bi bi-download" />
                                                    Descargar responsiva
                                                </Button>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                            )
                        })}
                    </Card.Body>
                </Card>
            </Container>

        </>
    )
}