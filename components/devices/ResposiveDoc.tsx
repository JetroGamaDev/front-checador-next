"use client"

import { IDevices, IWaiverContent } from "@/lib/devices/interface"
import { externalPersonName } from "./ExternalPerson";
import { Button, Card, Col, Container, Row } from "react-bootstrap";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SignatureEmployeeModal from "./SignatureEmployeeModal";
import SignatureITModal from "./SignatureITModal";
import ConditionalRender from "../ConditionalRender";
import SignatureDevicewOne from "./SignaturesDeviceView";
import SignatureDevicewTwo from "./SignatureDevicewTwo";
import Loading from "../LoadingSpinner";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import { useModals } from "@/context/ModalContext";
import { getFirstDoc, getSecondDoc } from "@/app/actions/devices-actions";
import SignatureDeviceThree from "./SignatureDeviceThree";
import SignatureEmployeeModalTwo from "./SignatureEmployeeModalTwo";
import SignatureITModalTwo from "./SignatureITModalTwo";

type FeedbackState = "loading" | "success" | "error" | null;

type ModalAction = {
    device: IDevices;
    idDevice: number;
    waiver: IWaiverContent | null;
    waiverError?: string;
}

// Cuerpo de la carta tal cual lo manda el back: no se filtran ni reordenan renglones
// (un value vacío o "$" es para llenarse a mano en el impreso)
function WaiverBody({ waiver }: { waiver: IWaiverContent }) {
    return (
        <div className="d-flex flex-column gap-3" style={{ lineHeight: 1.7, textAlign: "justify" }}>
            <p className="mb-0 text-end">{waiver.placeAndDate}</p>

            <p className="mb-0">{waiver.intro}</p>

            <table className="table table-bordered align-middle mb-0" style={{ textAlign: "left", tableLayout: "fixed" }}>
                <tbody>
                    {(waiver.rows ?? []).map((row, i) => (
                        <tr key={`${row.label}-${i}`}>
                            <th scope="row" className="fw-bold" style={{ width: "30%", wordBreak: "break-word" }}>
                                {row.label}:
                            </th>
                            <td style={{ wordBreak: "break-word" }}>{row.value ?? ""}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {(waiver.clauses ?? []).map((clause, i) => (
                <p key={`${clause.title}-${i}`} className="mb-0">
                    <strong>{clause.title}</strong> {clause.text}
                </p>
            ))}
        </div>
    );
}

export default function ResposiveDoc({
    device,
    waiver,
    waiverError,
}: ModalAction) {
    const router = useRouter();
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const { modalConfirm } = useModals();

    const [signatureEmployee, setSignatureEmployee] = useState(false);
    const [signatureEmployeeTwo, setSignatureEmployeeTwo] = useState(false);
    const [signatureIt, setSignatureIt] = useState(false);
    const [signatureItTwo, setSignatureItTwo] = useState(false);
    const [completeSignatures, setCompleteSignatures] = useState(false);
    const [signaturesOneComplete, setSignaturesOneComplete] = useState(false);
    const [showSecondSignatures, setShowSecondSignatures] = useState(false);

    // Persona externa (practicante, etc.): firma en persona desde la sesión de IT con idSignatory = 0
    const externalPerson = device.currentAssignment?.externalPerson ?? null;
    const isExternal = waiver?.isExternal === true || (!device.employee && !!externalPerson);
    const assigneeName = isExternal
        ? waiver?.employeeName || externalPersonName(externalPerson)
        : `${device.employee?.name ?? ""} ${device.employee?.lastName ?? ""}`.trim();
    const employeeSignatoryId = isExternal ? 0 : Number(device.employee?.id);

    const isSignatureComplete = (label: string) => {
        const matches = device.currentAssignment?.signatures?.filter((l) => l.label === label) ?? [];
        return matches.length > 0 && matches.every((f) => f.url);
    };

    //PARA FIRMAS
    const firstSignatureEmployee = isSignatureComplete("Empleado - Recibido");
    const firstSignatureIt = isSignatureComplete("IT - Entregado");

    const secondSignatureEmployee = isSignatureComplete("Empleado - Entregado");
    const secondSignatureIt = isSignatureComplete("IT - Recibido");

    const firmaUno = device.currentAssignment?.signatures?.find((m) => m.label === "Empleado - Recibido");
    const firmaDos = device.currentAssignment?.signatures?.find((m) => m.label === "IT - Entregado");

    const firmaTres = device.currentAssignment?.signatures?.find((m) => m.label === "Empleado - Entregado");
    const firmaCuatro = device.currentAssignment?.signatures?.find((m) => m.label === "IT - Recibido");

    const handleSignatureEmployee = () => setSignatureEmployee(true);
    const handleSignatureIt = () => setSignatureIt(true);

    const handleSignatureEmployeeTwo = () => setSignatureEmployeeTwo(true);
    const handleSignatureItTwo = () => setSignatureItTwo(true);


    const handleBack = () => {
        setFeedback("loading");
        setFeedbackMsg("Cargando datos...");

        setTimeout(() => {
            router.push(`/app/devices?view_type=form&id=${device.id}`);
        }, 100);
    };

    useEffect(() => {
        if (device.currentAssignment === null) {

            setFeedback("loading");
            setFeedbackMsg("Cargando datos...");
            setTimeout(() => {
                router.push(`/app/devices?view_type=historial&id=${device.id}`);
            }, 100);
        }
    }, [device, router])

    useEffect(() => {
        const oneComplete = firstSignatureEmployee && firstSignatureIt;
        const allComplete = oneComplete && secondSignatureEmployee && secondSignatureIt;

        setSignaturesOneComplete(oneComplete);
        setCompleteSignatures(allComplete);
    }, [firstSignatureEmployee, firstSignatureIt, secondSignatureEmployee, secondSignatureIt]);

    const downloadBase64File = (base64Url: string, fileName: string) => {
        const link = document.createElement("a");
        link.href = base64Url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const handleGenerate = async () => {
        modalConfirm("Se descargará el PDF", async () => {

            const fetchDoc = completeSignatures
                ? getSecondDoc
                : signaturesOneComplete
                    ? getFirstDoc
                    : null;

            if (!fetchDoc) return;

            try {
                setFeedback("loading");
                setFeedbackMsg("Descargando PDF...");

                const res = await fetchDoc({ idDoc: device.id });

                if (!res.success || !res.data) {
                    setFeedbackMsg(res.message || "No se pudo generar el reporte");
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

                <div className="mb-3 mx-auto" style={{ maxWidth: "1200px" }}>
                    <h1 className="mb-1 ms-1">Carta Responsiva</h1>
                    <p className="text-muted mb-0 ms-1">
                        Información del dispositivo y condiciones de entrega.
                    </p>
                </div>

                <Card className="border shadow-sm rounded-4 mx-auto" style={{ maxWidth: "1200px" }}>
                    <Card.Body className="p-4">

                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4 p-2">
                            <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3" style={{ minWidth: 0 }}>
                                <Image
                                    src="/image/logo.png"
                                    alt="Gama Consumibles Especiales"
                                    width={150}
                                    height={68}
                                    className="flex-shrink-0"
                                    style={{ objectFit: "contain", width: "clamp(100px, 25vw, 150px)", height: "auto" }}
                                />
                                <h5 className="mb-0 fw-bold" style={{ minWidth: 0 }}>{waiver?.title || "Carta Responsiva"}</h5>
                            </div>

                            <span className="badge rounded-pill px-3 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle flex-shrink-0 ms-auto">
                                Responsiva
                            </span>
                        </div>

                        <Card className="border rounded-0 mb-4">
                            <Card.Body>
                                <ConditionalRender cond={!!waiver}>
                                    <WaiverBody waiver={waiver as IWaiverContent} />
                                </ConditionalRender>

                                <ConditionalRender cond={!waiver}>
                                    <div className="d-flex flex-column align-items-center text-center text-muted py-4 gap-2">
                                        <i className="bi bi-file-earmark-x" style={{ fontSize: "2rem" }} />
                                        <span>{waiverError || "No se pudo cargar el contenido de la responsiva"}</span>
                                    </div>
                                </ConditionalRender>
                            </Card.Body>
                        </Card>

                        <Card className="border rounded-4">
                            <Card.Body>
                                <div className="d-flex align-items-center gap-2 mb-4">
                                    <i className="bi bi-pen text-warning" />
                                    <h6 className="mb-0 fw-bold">Firmas</h6>
                                </div>

                                <Row className="g-3">
                                    {/* FIRMA UNO EMPLEADO */}
                                    <Col xs={12} md={6}>
                                        <div className="border rounded-3 p-3 d-flex flex-column align-items-center gap-2 text-center h-100 w-100">
                                            <span className="fw-semibold text-capitalize">{assigneeName}</span>
                                            <ConditionalRender cond={!!waiver?.employeePosition}>
                                                <span className="small text-uppercase">{waiver?.employeePosition}</span>
                                            </ConditionalRender>
                                            <span className="text-muted small">Nombre y firma del trabajador</span>

                                            <ConditionalRender cond={!firstSignatureEmployee}>
                                                <div className="d-flex flex-column justify-content-center align-items-center h-100 text-center gap-2">
                                                    <div>
                                                        <i
                                                            className="bi bi-hourglass-split text-danger icon-hourglass-animated"
                                                            style={{ fontSize: "2rem" }}
                                                        />
                                                        <p className="text-danger mb-0"> Esperando firma del empleado</p>
                                                    </div>

                                                    <Button
                                                        className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3 btn-needs-signature mt-3"
                                                        variant="success"
                                                        onClick={handleSignatureEmployee}
                                                    >
                                                        <i className="bi bi-check-circle" />
                                                        <span className="d-none d-md-inline ms-2">Firmar</span>
                                                    </Button>
                                                </div>
                                            </ConditionalRender>

                                            {/* FIX 2: era `firmaUno !== null` — .find() regresa undefined, no null,
                                                así que esa condición era SIEMPRE true. Se cambia a chequeo explícito. */}
                                            <ConditionalRender cond={firstSignatureEmployee}>
                                                <Row className="g-3 w-100">
                                                    <ConditionalRender cond={!!firmaUno}>
                                                        <SignatureDevicewOne
                                                            key={`${firmaUno?.id}-${firmaUno?.url}`}
                                                            idDevice={Number(device.id)}
                                                            idEmployee={isExternal ? 0 : Number(firmaUno?.idSignatory)}
                                                            external={isExternal}
                                                            idSignature={Number(firmaUno?.id)}
                                                            status={String(firmaUno?.status)}
                                                            dateSigner={String(firmaUno?.dateSigner)}
                                                            label={firmaUno?.label}
                                                        />
                                                    </ConditionalRender>
                                                </Row>
                                            </ConditionalRender>
                                        </div>
                                    </Col>

                                    {/* FIRMA UNO IT */}
                                    <Col xs={12} md={6}>
                                        <div className="border rounded-3 p-3 d-flex flex-column align-items-center gap-2 text-center h-100">
                                            <span className="fw-semibold text-capitalize">{device.personIt?.name} {device.personIt?.lastName}</span>
                                            <ConditionalRender cond={!!waiver?.itPosition}>
                                                <span className="small text-uppercase">{waiver?.itPosition}</span>
                                            </ConditionalRender>
                                            <span className="text-muted small">Nombre, puesto y firma por la empresa</span>

                                            <ConditionalRender cond={!firstSignatureIt}>
                                                <div className="d-flex flex-column justify-content-center align-items-center h-100 text-center gap-2">
                                                    <div>
                                                        <i
                                                            className="bi bi-hourglass-split text-danger icon-hourglass-animated"
                                                            style={{ fontSize: "2rem" }}
                                                        />
                                                        <p className="text-danger mb-0"> Esperando firma de IT</p>
                                                    </div>
                                                    <Button
                                                        className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3 btn-needs-signature mt-3"
                                                        variant="info"
                                                        onClick={handleSignatureIt}
                                                    >
                                                        <i className="bi bi-check-circle" />
                                                        <span className="d-none d-md-inline ms-2">Firmar</span>
                                                    </Button>
                                                </div>
                                            </ConditionalRender>

                                            <ConditionalRender cond={firstSignatureIt}>
                                                <Row className="g-3 w-100">
                                                    <ConditionalRender cond={!!firmaDos}>
                                                        <SignatureDevicewTwo
                                                            key={`${firmaDos?.id}-${firmaDos?.url}`}
                                                            idDevice={Number(device.id)}
                                                            idEmployee={Number(firmaDos?.idSignatory)}
                                                            idSignature={Number(firmaDos?.id)}
                                                            status={String(firmaDos?.status)}
                                                            dateSigner={String(firmaDos?.dateSigner)}
                                                            label={firmaDos?.label}
                                                        />
                                                    </ConditionalRender>
                                                </Row>
                                            </ConditionalRender>
                                        </div>
                                    </Col>
                                </Row>

                                <ConditionalRender cond={showSecondSignatures === true || completeSignatures === true}>
                                    <Row className="g-3 mt-2">
                                        {/* FIRMA DOS EMPLEADO */}
                                        <Col xs={12} md={6}>
                                            <div className="border rounded-3 p-3 d-flex flex-column align-items-center gap-2 text-center h-100 w-100">
                                                <span className="fw-semibold text-capitalize">{assigneeName}</span>
                                                <ConditionalRender cond={!!waiver?.employeePosition}>
                                                    <span className="small text-uppercase">{waiver?.employeePosition}</span>
                                                </ConditionalRender>
                                                <span className="text-muted small">Nombre y firma del trabajador</span>

                                                <ConditionalRender cond={!secondSignatureEmployee}>
                                                    <div className="d-flex flex-column justify-content-center align-items-center h-100 text-center gap-2">
                                                        <div>
                                                            <i
                                                                className="bi bi-hourglass-split text-danger icon-hourglass-animated"
                                                                style={{ fontSize: "2rem" }}
                                                            />
                                                            <p className="text-danger mb-0"> Esperando firma del empleado</p>
                                                        </div>

                                                        <Button
                                                            className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3 btn-needs-signature mt-3"
                                                            variant="success"
                                                            onClick={handleSignatureEmployeeTwo}
                                                        >
                                                            <i className="bi bi-check-circle" />
                                                            <span className="d-none d-md-inline ms-2">Firmar</span>
                                                        </Button>
                                                    </div>
                                                </ConditionalRender>

                                                <ConditionalRender cond={secondSignatureEmployee}>
                                                    <Row className="g-3 w-100">
                                                        <ConditionalRender cond={!!firmaTres}>
                                                            <SignatureDeviceThree
                                                                key={`${firmaTres?.id}-${firmaTres?.url}`}
                                                                idDevice={Number(device.id)}
                                                                idEmployee={isExternal ? 0 : Number(firmaTres?.idSignatory)}
                                                            external={isExternal}
                                                                idSignature={Number(firmaTres?.id)}
                                                                status={String(firmaTres?.status)}
                                                                dateSigner={String(firmaTres?.dateSigner)}
                                                                label={firmaTres?.label}
                                                            />
                                                        </ConditionalRender>
                                                    </Row>
                                                </ConditionalRender>
                                            </div>
                                        </Col>

                                        {/* FIRMA DOS DE IT */}
                                        <Col xs={12} md={6}>
                                            <div className="border rounded-3 p-3 d-flex flex-column align-items-center gap-2 text-center h-100">
                                                <span className="fw-semibold text-capitalize">{device.personIt?.name} {device.personIt?.lastName}</span>
                                                <ConditionalRender cond={!!waiver?.itPosition}>
                                                    <span className="small text-uppercase">{waiver?.itPosition}</span>
                                                </ConditionalRender>
                                                <span className="text-muted small">Nombre, puesto y firma por la empresa</span>

                                                <ConditionalRender cond={!secondSignatureIt}>
                                                    <div className="d-flex flex-column justify-content-center align-items-center h-100 text-center gap-2">
                                                        <div>
                                                            <i
                                                                className="bi bi-hourglass-split text-danger icon-hourglass-animated"
                                                                style={{ fontSize: "2rem" }}
                                                            />
                                                            <p className="text-danger mb-0"> Esperando firma de IT</p>
                                                        </div>
                                                        <Button
                                                            className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3 btn-needs-signature mt-3"
                                                            variant="info"
                                                            onClick={handleSignatureItTwo}
                                                        >
                                                            <i className="bi bi-check-circle" />
                                                            <span className="d-none d-md-inline ms-2">Firmar</span>
                                                        </Button>
                                                    </div>
                                                </ConditionalRender>

                                                <ConditionalRender cond={secondSignatureIt}>
                                                    <Row className="g-3 w-100">
                                                        <ConditionalRender cond={!!firmaCuatro}>
                                                            <SignatureDevicewTwo
                                                                key={`${firmaCuatro?.id}-${firmaCuatro?.url}`}
                                                                idDevice={Number(device.id)}
                                                                idEmployee={Number(firmaCuatro?.idSignatory)}
                                                                idSignature={Number(firmaCuatro?.id)}
                                                                status={String(firmaCuatro?.status)}
                                                                dateSigner={String(firmaCuatro?.dateSigner)}
                                                                label={firmaCuatro?.label}
                                                            />
                                                        </ConditionalRender>
                                                    </Row>
                                                </ConditionalRender>
                                            </div>
                                        </Col>
                                    </Row>
                                </ConditionalRender>
                            </Card.Body>
                        </Card>

                        <div className="d-flex justify-content-end gap-2 mt-4">

                            <ConditionalRender cond={signaturesOneComplete}>
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowSecondSignatures(true)}
                                    disabled={showSecondSignatures === true || completeSignatures === true}
                                >
                                    Regresar equipo
                                </Button>
                            </ConditionalRender>


                            <Button
                                variant="warning"
                                disabled={!signaturesOneComplete && !completeSignatures}
                                onClick={handleGenerate}
                            >
                                <i className="bi bi-printer me-2" />
                                {completeSignatures ? "Descargar PDF de liberación" : "Descargar carta responsiva"}
                            </Button>
                        </div>

                    </Card.Body>
                </Card>

                <SignatureEmployeeModal
                    show={signatureEmployee}
                    onHide={() => setSignatureEmployee(false)
                    }
                    idDevice={device.id}
                    idEmployee={employeeSignatoryId}
                    idSignature={
                        device.currentAssignment?.signatures?.find((s) => s.label === "Empleado - Recibido")?.id ?? 0
                    }
                />

                <SignatureEmployeeModalTwo
                    show={signatureEmployeeTwo}
                    onHide={() => setSignatureEmployeeTwo(false)
                    }
                    idDevice={device.id}
                    idEmployee={employeeSignatoryId}
                    idSignature={
                        device.currentAssignment?.signatures?.find((s) => s.label === "Empleado - Entregado")?.id ?? 0
                    }
                />

                <SignatureITModal
                    show={signatureIt}
                    onHide={() => setSignatureIt(false)
                    }
                    idDevice={device.id}
                    idIt={Number(device.personIt?.id ?? 0)}
                    idSignature={
                        device.currentAssignment?.signatures?.find((s) => s.label === "IT - Entregado")?.id ?? 0
                    }
                />

                <SignatureITModalTwo
                    show={signatureItTwo}
                    onHide={() => setSignatureItTwo(false)
                    }
                    idDevice={device.id}
                    idIt={Number(device.personIt?.id ?? 0)}
                    idSignature={
                        device.currentAssignment?.signatures?.find((s) => s.label === "IT - Recibido")?.id ?? 0
                    }
                />
            </Container>
        </>
    );
}