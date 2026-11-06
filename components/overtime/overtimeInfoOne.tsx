"use client"

import { Department } from "@/lib/definitions";
import { ISignatures, OverTime } from "@/lib/overTime/interface";
import { useMemo, useState } from "react";
import OvertimeOneError from "./overtimeMessageError";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import { Button, Card, Col, Container, Row } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { IConfigSystem } from "@/app/actions/configSystem-actions";
import { FormBook, FormPage } from "../templates/FormView";
import SignaturesViewOvertime from "./signaturesOvertime";
import { useSessionSnapshot } from "@/hooks/useSessionStore";
import OvertimeSignatureModal from "./OvertimeSignatureModal"
import SignatureLeaderModal from "./SignatureLeaderModal";
import SignatureDohModal from "./SignatureDohModal";
import OverLay from "../templates/OverLay";
import { formatCreatedAt, formatParseHours, formatDateMx } from "@/lib/helpers";
import ModalBlur from "../ModalBlur";
import DeleteOvertimeModal from "./DeleteOvertimeModal";


function fullName(p?: { name?: string; lastName?: string } | null) {
    if (!p) return "—";
    return `${p.lastName ?? ""} ${p.name ?? ""}`.trim().toUpperCase();
}

function statusLabel(status?: string | null) {

    switch ((status ?? "").toUpperCase()) {
        case "APPROVED":
            return (
                <span className="badge rounded-pill px3 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle">
                    APROBADO
                </span>
            );
        case "PENDING":
            return (
                <span className="badge rounded-pill px3 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    PENDIENTE
                </span>
            );
        case "REFUSED":
            return (
                <span className="badge rounded-pill px3 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                    RECHAZADO
                </span>
            );
        default:
            return status ? status.toUpperCase() : "—";
    }
}


//En esta funcion colocaremos las sesiones para identificar quien firma 
export function OvertimeOne({
    overtime,
    connfigSystem
}: {
    overtime: OverTime | null;
    departments: Department[];
    connfigSystem: IConfigSystem[];
}) {


    // Aqui los const 
    const session = useSessionSnapshot();
    const roles = session?.uid?.roles;
    const [loading, setLoading] = useState(false);
    const [messageLoading, setMessageLoading] = useState("");
    const router = useRouter();
    const [overtimeSignatureModal, setOvertimeSignatureModal] = useState(false);
    const [signatureLeaderModal, setSignatureLeaderModal] = useState(false);
    const [signatureDohModal, setSignatureDohModal] = useState(false);

    const handleOvertimeSignature = () => setOvertimeSignatureModal(true);
    const handleSignatureLeader = () => setSignatureLeaderModal(true);
    const handleSignatureDoh = () => setSignatureDohModal(true);

    const [showDeleteModal, setShowDeleteModal] = useState(false);


    const readInput = !roles?.isLeader
        && !roles?.isExtra
        && !roles?.isDoh
        && !roles?.isApproverLeaders
        && !roles?.isApproverDoh;


    // Configuración de overtime del sistema
    const configOvertime = connfigSystem[0]?.overTime;

    // Firmas del registro de overtime (array vacío si no existe)
    const signatures: ISignatures[] = useMemo(() => overtime?.signatures ?? [], [overtime?.signatures]);

    // ID del empleado con sesión activa
    const idEmployee = Number(session?.uid?.idEmployee);

    // ID del empleado al que pertenece el registro de overtime
    const overtimeEmployeeId = Number(overtime?.employee?.id);

    // Indica si el registro aún está pendiente de aprobación
    const isPending = overtime?.status === 'PENDING';

    // Busca la firma correspondiente al empleado con sesión activa
    // Solo recalcula si cambia el array de firmas o el id del empleado en sesión
    const currentSignature = useMemo(() => {
        return signatures.find((i: ISignatures) => i.idSignatory === idEmployee) ?? null;
    }, [signatures, idEmployee]);

    // Indica si el firmante actual aún no ha firmado (url vacía = sin firma)
    const hasNotSigned = currentSignature?.url === '';

    // Muestra el botón de firma para el empleado dueño del registro
    // Condiciones: el empleado en sesión es el mismo del registro, tiene entrada en signatures y no ha firmado
    const showCurrentUser = useMemo(() => {
        return idEmployee === overtimeEmployeeId
            && !!currentSignature
            && hasNotSigned;
    }, [idEmployee, overtimeEmployeeId, currentSignature, hasNotSigned]);

    // Muestra el botón de aprobación para líderes y extras
    // Condiciones: tiene rol de líder o extra, no es el dueño del registro,
    // tiene entrada en signatures, no ha firmado y el registro está pendiente
    const showCurrentLeader = useMemo(() => {
        return (!!session?.uid?.roles?.isLeader || !!session?.uid?.roles?.isExtra)
            && idEmployee !== overtimeEmployeeId
            && !!currentSignature
            && hasNotSigned
            && isPending;
    }, [session, idEmployee, overtimeEmployeeId, currentSignature, hasNotSigned, isPending]);

    // Muestra el botón de aprobación para el DOH
    // Condiciones: tiene rol DOH, su id coincide con el aprobador DOH configurado en el sistema,
    // tiene entrada en signatures y no ha firmado
    const showCurrentDoh = useMemo(() => {
        return !!session?.uid?.roles?.isDoh
            && idEmployee === Number(configOvertime.approvalDoh.idPerson)
            && !!currentSignature
            && hasNotSigned;
    }, [session, idEmployee, configOvertime, currentSignature, hasNotSigned]);
    const overallStatus = overtime?.status ?? "PENDING";

    // ============ Aqui los helpers ===============

    //crear
    const handleCreate = () => {
        setLoading(true);
        setMessageLoading('Cargando...');
        router.push("/app/overtime/create");
    };

    //Regresar a pagina principal
    const handleBack = () => {
        setLoading(true);
        setMessageLoading("Cargando datos...");

        setTimeout(() => {
            router.push("/app/overtime");
        }, 100);
    }

    const upperCase = (text?: string) => {
        return text?.toUpperCase() || "";
    };

    const getEmployeeName = (u: OverTime) => {
        return u.employee
            ? `${upperCase(u.employee.lastName)} ${upperCase(u.employee.name)} `
            : `EMPLEADO #${u.idEmployee}`;
    };

    //Mensaje de error al encontrar
    if (!overtime) {
        return (
            <OvertimeOneError />
        )
    }

    return (
        <>
            <ConditionalRender cond={loading}>
                <Loading message={messageLoading} />
            </ConditionalRender>

            <Container className="py-3 overflow-x: auto" style={{ maxWidth: "1600px" }}>

                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">

                    {/* Izquierda */}
                    <div className="d-flex gap-2 flex-wrap">
                        <OverLay string="Crear registro">
                            <Button
                                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                                variant="primary"
                                onClick={handleCreate}
                                disabled={loading}
                            >
                                <i className="bi bi-plus-lg" />

                                <span className="d-none d-md-inline ms-2">
                                    Crear registro
                                </span>
                            </Button>
                        </OverLay>


                        <OverLay string="Eliminar registro">
                            <Button
                                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                                variant="danger"
                                onClick={() => setShowDeleteModal(true)}
                                disabled={loading}
                            >
                                <i className="bi bi-trash" />

                                <span className="d-none d-md-inline ms-2">
                                    Eliminar registro
                                </span>
                            </Button>
                        </OverLay>

                        <OverLay string="Firmar">
                            <ConditionalRender cond={showCurrentUser}>
                                <Button
                                    className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3 btn-needs-signature"
                                    variant="warning"
                                    onClick={handleOvertimeSignature}
                                    disabled={loading}
                                >
                                    <i className="bi bi-pen-fill" />

                                    <span className="d-none d-md-inline ms-2">
                                        Firmar
                                    </span>
                                </Button>
                            </ConditionalRender>
                        </OverLay>

                        <OverLay string="Aprobar / Rechazar">
                            <ConditionalRender cond={showCurrentLeader}>
                                <Button
                                    className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3 btn-needs-signature"
                                    variant="success"
                                    onClick={handleSignatureLeader}
                                    disabled={loading}
                                >
                                    <i className="bi bi-check-circle" />

                                    <span className="d-none d-md-inline ms-2">
                                        Aprobar / Rechazar
                                    </span>
                                </Button>
                            </ConditionalRender>
                        </OverLay>

                        <OverLay string="Firmar de enterado">
                            <ConditionalRender cond={showCurrentDoh}>
                                <Button
                                    className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3 btn-needs-signature"
                                    variant="secondary"
                                    onClick={handleSignatureDoh}
                                    disabled={loading}
                                >
                                    <i className="bi bi-card-checklist" />

                                    <span className="d-none d-md-inline ms-2">
                                        Firmar de enterado
                                    </span>
                                </Button>
                            </ConditionalRender>
                        </OverLay>

                    </div>

                    {/* Derecha */}
                    <div className=" d-md-flex flex-wrap">
                        <Button
                            variant="outline-secondary"
                            onClick={handleBack}
                            disabled={loading}
                            className="d-inline-flex align-items-center gap-2 fw-semibold px-2 px-md-3"
                        >
                            <i className="bi bi-arrow-left" />
                            Regresar
                        </Button>
                    </div>
                </div>

                <div>
                    <h1 className="mb-1 ms-1">{getEmployeeName(overtime)}</h1>
                    <p className="text-muted mb-0 ms-1">
                        Información de la solicitud de horas extra.
                    </p>
                </div>

                <Card className="border shadow-sm rounded-4 mt-2">
                    <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <div>
                                <h5 className="mb-1 fw-bold">
                                    Solicitud #{overtime.id}
                                </h5>

                                <p className="text-muted mb-0">
                                    HORAS EXTRAS
                                </p>
                            </div>

                            {statusLabel(overallStatus)}
                        </div>

                        <Row className="g-4 mb-4">
                            {/* RESUMEN */}
                            <Col xs={12} lg={4}>
                                <Card className="border rounded-4 h-100">
                                    <Card.Body>
                                        <div className="d-flex align-items-center justify-content-between mb-4">
                                            <h6 className="mb-0 fw-bold">
                                                Resumen
                                            </h6>

                                            <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                                                General
                                            </span>
                                        </div>

                                        <div className="d-flex flex-column gap-3">
                                            <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-calendar-plus text-primary" />
                                                    <span className="text-muted">Creada</span>
                                                </div>

                                                <span className="fw-semibold text-end">
                                                    {formatDateMx(overtime.createdAt)}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-person text-success" />
                                                    <span className="text-muted">Creada por</span>
                                                </div>

                                                <span className="fw-semibold text-end">
                                                    {fullName(overtime.createForPerson)}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-person-workspace text-warning" />
                                                    <span className="text-muted">Líder</span>
                                                </div>

                                                <span className="fw-semibold text-end">
                                                    {fullName(overtime.leader)}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-person-check text-info" />
                                                    <span className="text-muted">D.O.H.</span>
                                                </div>

                                                <span className="fw-semibold text-end">
                                                    {fullName(overtime.personDoh)}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-chat-left-text text-info" />
                                                    <span className="text-muted">Motivo</span>
                                                </div>

                                                <span className="fw-semibold text-end text-uppercase">
                                                    {overtime.motive ? overtime.motive : "No se registró un motivo"}
                                                </span>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>

                            {/* DETALLES */}
                            <Col xs={12} lg={8}>
                                <Card className="border rounded-4 h-100">
                                    <Card.Body>
                                        <div className="d-flex align-items-center justify-content-between mb-4">
                                            <div>
                                                <h6 className="mb-1 fw-bold">
                                                    Detalles del registro
                                                </h6>

                                                <p className="text-muted mb-0 small">
                                                    Consulta la fecha, horario y motivo registrado.
                                                </p>
                                            </div>

                                            <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                                                Registro
                                            </span>
                                        </div>

                                        <div className="d-flex flex-column gap-4">
                                            <ConditionalRender cond={!readInput}>
                                                <div className="border rounded-3 p-3">
                                                    <div className="d-flex align-items-center gap-2 mb-2">
                                                        <i className="bi bi-journal-text text-primary" />
                                                        <span className="text-muted fw-semibold">Notas adicionales</span>
                                                    </div>
                                                    <div className="text-uppercase">
                                                        {overtime.notes ? overtime.notes : "No hay notas adicionales"}
                                                    </div>
                                                </div>
                                            </ConditionalRender>

                                            <Row className="g-3">
                                                <Col xs={12} md={6} xl={3}>
                                                    <div className="border rounded-3 p-3 text-center h-100">
                                                        <i className="bi bi-calendar-event text-success fs-5 mb-2 d-block" />

                                                        <div className="text-muted small">
                                                            Fecha
                                                        </div>

                                                        <div className="fw-semibold">
                                                            {formatCreatedAt(overtime.informationDate?.dateInit)}
                                                        </div>
                                                    </div>
                                                </Col>

                                                <Col xs={12} md={6} xl={3}>
                                                    <div className="border rounded-3 p-3 text-center h-100">
                                                        <i className="bi bi-clock text-warning fs-5 mb-2 d-block" />

                                                        <div className="text-muted small">
                                                            Hora inicio
                                                        </div>

                                                        <div className="fw-semibold">
                                                            {formatParseHours(overtime.informationDate?.hourInit)}
                                                        </div>
                                                    </div>
                                                </Col>

                                                <Col xs={12} md={6} xl={3}>
                                                    <div className="border rounded-3 p-3 text-center h-100">
                                                        <i className="bi bi-clock-history text-danger fs-5 mb-2 d-block" />

                                                        <div className="text-muted small">
                                                            Hora fin
                                                        </div>

                                                        <div className="fw-semibold">
                                                            {formatParseHours(overtime.informationDate?.hourEnd)}
                                                        </div>
                                                    </div>
                                                </Col>

                                                <Col xs={12} md={6} xl={3}>
                                                    <div className="border rounded-3 p-3 text-center h-100">
                                                        <i className="bi bi-hourglass-split text-info fs-5 mb-2 d-block" />

                                                        <div className="text-muted small">
                                                            Total horas
                                                        </div>

                                                        <div className="fw-bold fs-5">
                                                            {overtime.informationDate?.totalHours ?? "—"}
                                                        </div>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* FIRMAS */}
                        <Card className="border rounded-4">
                            <Card.Body>
                                <div className="d-flex align-items-center justify-content-between mb-4">
                                    <h6 className="mb-0 fw-bold">
                                        Firmas
                                    </h6>

                                    <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                                        Autorizaciones
                                    </span>
                                </div>

                                <FormBook dKey="newArray">
                                    <FormPage title="" eventKey="newArray">
                                        <Row className="g-3">
                                            {signatures.map((sign) => (
                                                <SignaturesViewOvertime
                                                    key={`${sign.id}-${sign.url}`}
                                                    id={Number(overtime?.id)}
                                                    idEmployee={String(sign.idSignatory)}
                                                    name={sign.name}
                                                    url={sign.url}
                                                    label={sign.label}
                                                    status={overtime.status}
                                                />
                                            ))}
                                        </Row>
                                    </FormPage>
                                </FormBook>
                            </Card.Body>
                        </Card>

                        {/* MODALES ;) */}
                        <OvertimeSignatureModal
                            show={overtimeSignatureModal}
                            onHide={() => setOvertimeSignatureModal(false)}
                            id={String(overtime.id)}
                        />

                        <SignatureLeaderModal
                            show={signatureLeaderModal}
                            onHide={() => setSignatureLeaderModal(false)}
                            id={String(overtime.id)}
                        />

                        <SignatureDohModal
                            show={signatureDohModal}
                            onHide={() => setSignatureDohModal(false)}
                            id={String(overtime.id)}
                        />

                        <ConditionalRender cond={showDeleteModal}>
                            <ModalBlur onClose={() => setShowDeleteModal(false)}>
                                <DeleteOvertimeModal
                                    show={showDeleteModal}
                                    onHide={() => { setShowDeleteModal(false); }}
                                    idOvertime={overtime.id}
                                    motive={overtime.delete?.reaseonDelete ?? ""}
                                    status={overtime.delete?.delete ?? false}
                                />
                            </ModalBlur>
                        </ConditionalRender>
                    </Card.Body>
                </Card>
            </Container>
        </>
    );
}
