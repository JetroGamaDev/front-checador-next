"use client"

import { IPenaltyForOffeses, ISignaturesPenalties } from "@/lib/penalties/interface"
import ConditionalRender from "../ConditionalRender"
import Loading from "../LoadingSpinner"
import { Button, Card, Col, Collapse, Container, Row } from "react-bootstrap"
import { useSessionSnapshot } from "@/hooks/useSessionStore"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import OverLay from "../templates/OverLay"
import { formatCreatedAt, formatCreatedAtOnlyHours, formatDateMx } from "@/lib/helpers"
import Link from "next/link"
import SignaturesViewPenalty from "./signaturesPenalties"
import PenaltySignatureModal from "./PenaltySignatureModal"
import PenaltyOneError from "./penaltiesMessageError"
import ModalBlur from "../ModalBlur"
import DeletePenaltyModal from "./DeletePenaltyModal"


function fullName(p?: { name?: string; lastName?: string } | null) {
    if (!p) return "—";
    return `${p.lastName ?? ""} ${p.name ?? ""}`.trim().toUpperCase();
}

export function PenaltyOne({
    penalty,
}: {
    penalty: IPenaltyForOffeses | null;
}) {

    //Const
    const session = useSessionSnapshot();
    const roles = session?.uid?.roles;
    const [loading, setLoading] = useState(false);
    const [messageLoading, setMessageLoading] = useState("");
    const [penaltySignatureModal, setPenaltySignatureModal] = useState(false);
    const router = useRouter();
    const hasChecks = (penalty?.absencesAndAttendances?.length ?? 0) > 0;
    const [activeCheckId, setActiveCheckId] = useState<string | null>(null);
    const activeCheck = penalty?.absencesAndAttendances.find((c) => String(c.id) === activeCheckId);
    const handlePenaltySignature = () => setPenaltySignatureModal(true);
    const fechas = penalty?.dateOfAbsence ?? [];
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const signatures: ISignaturesPenalties[] = useMemo(() => penalty?.signatures ?? [], [penalty?.signatures]);

    const readInput = !roles?.isLeader
        && !roles?.isExtra
        && !roles?.isDoh
        && !roles?.isApproverLeaders
        && !roles?.isApproverDoh;

    const idEmployee = Number(session?.uid?.idEmployee);
    const penaltyEmployeeId = Number(penalty?.employee?.id);
    const currentSignature = useMemo(() => {
        return signatures.find((i: ISignaturesPenalties) => i.idSignatory === idEmployee) ?? null;
    }, [signatures, idEmployee]);
    const hasNotSigned = currentSignature?.url === '';

    const normalizeLabel = (label?: string) =>
        label
            ?.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

    const extraGroupAlreadySigned = useMemo(() => {
        return signatures.some(
            (s) => normalizeLabel(s.label) === "direccion" && s.url !== ""
        );
    }, [signatures]);

    const showCurrentUser = useMemo(() => {
        const isExtraUser = !!session?.uid?.roles?.isExtra;

        if (isExtraUser) {
            return !!currentSignature && hasNotSigned && !extraGroupAlreadySigned;
        }

        const isRelevantUser =
            idEmployee === penaltyEmployeeId ||
            !!session?.uid?.roles?.isLeader ||
            !!session?.uid?.roles?.isDoh;

        return isRelevantUser && !!currentSignature && hasNotSigned;
    }, [idEmployee, penaltyEmployeeId, currentSignature, hasNotSigned, session, extraGroupAlreadySigned]);

    //Helpers
    const handleBack = () => {
        setLoading(true);
        setMessageLoading("Cargando datos...");

        setTimeout(() => {
            router.push("/app/penalties");
        }, 100);
    }

    const upperCase = (text?: string) => {
        return text?.toUpperCase() || "";
    };

    const getEmployeeName = (u: IPenaltyForOffeses | null) => {
        if (!u) return "EMPLEADO NO DISPONIBLE";
        return u.employee
            ? `${upperCase(u.employee.lastName)} ${upperCase(u.employee.name)}`
            : `EMPLEADO #${u.idEmployee}`;
    };

    if (!penalty) {
        return (
            <PenaltyOneError />
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
                        {/* <OverLay string="Crear registro">
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
                        </OverLay> */}


                        <OverLay string="Eliminar registro">
                            <Button
                                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                                variant="danger"
                                onClick={() => setShowDeleteModal(true)}
                                disabled={loading}
                            >
                                <i className="bi bi-trash" />

                                <span className="d-none d-md-inline ms-2">
                                    Eliminar penalización
                                </span>
                            </Button>
                        </OverLay>

                        <OverLay string="Firmar">
                            <ConditionalRender cond={showCurrentUser}>
                                <Button
                                    className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3 btn-needs-signature"
                                    variant="warning"
                                    onClick={handlePenaltySignature}
                                    disabled={loading}
                                >
                                    <i className="bi bi-pen-fill" />

                                    <span className="d-none d-md-inline ms-2">
                                        Firmar
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
                    <h1 className="mb-1 ms-1">{getEmployeeName(penalty)}</h1>
                    <p className="text-muted mb-0 ms-1">
                        Información de la penalización.
                    </p>
                </div>

                <Card className="border shadow-sm rounded-4 mt-2">
                    <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <div>
                                <h5 className="mb-1 fw-bold">
                                    Penalización #{penalty?.id}
                                </h5>

                            </div>

                            {/* {statusLabel(overallStatus)} */}
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
                                                    <span className="text-muted">Fecha de creación</span>
                                                </div>

                                                <span className="fw-semibold text-end">
                                                    {formatDateMx(penalty?.createdAt)}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-clock" />
                                                    <span className="text-muted">Hora de creación</span>
                                                </div>

                                                <span className="fw-semibold text-end">
                                                    {formatCreatedAtOnlyHours(penalty?.createdAt)}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-person text-success" />
                                                    <span className="text-muted">Creada por</span>
                                                </div>

                                                <span className="fw-semibold text-end">
                                                    {fullName(penalty?.createForPerson)}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-chat-left-text text-primary" />
                                                    <span className="text-muted">Motivo</span>
                                                </div>

                                                <span className="fw-semibold text-end text-uppercase">
                                                    {penalty?.motive || "--"}
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
                                                    Detalles de la penalización
                                                </h6>

                                                <p className="text-muted mb-0 small">
                                                    Consulta las faltas causantes de la penalización.
                                                </p>
                                            </div>

                                            <span className="badge rounded-pill px3 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                                                Penalización
                                            </span>
                                        </div>

                                        <div className="d-flex flex-column gap-4">
                                            <div className="border rounded-3 p-3">

                                                <ConditionalRender cond={!readInput}>
                                                    <div className="border rounded-3 p-3">
                                                        <div className="d-flex align-items-center gap-2 mb-2">
                                                            <i className="bi bi-journal-text text-primary" />
                                                            <span className="text-muted fw-semibold">Notas adicionales</span>
                                                        </div>
                                                        <div className="text-uppercase">
                                                            {penalty.notes ? penalty.notes : "No hay notas adicionales"}
                                                        </div>
                                                    </div>
                                                </ConditionalRender>


                                                <Row className="justify-content-between">
                                                    <ConditionalRender cond={hasChecks}>
                                                        <Row className="g-3">
                                                            {penalty?.absencesAndAttendances.map((c) => {
                                                                const key = String(c.id);
                                                                const isActive = activeCheckId === key;

                                                                return (
                                                                    <Col key={key} xs={12} sm={12} md={6} lg={6} xl={4}>
                                                                        <div
                                                                            role="button"
                                                                            onClick={() => setActiveCheckId(isActive ? null : key)}
                                                                            className={`border rounded-3 p-3 h-100 ms-2 ${isActive ? "border-primary" : ""
                                                                                }`}
                                                                        >
                                                                            <div className="d-flex align-items-between gap-2 fw-bold">
                                                                                {formatDateMx(c.dateOfAbsence)}
                                                                                <i
                                                                                    className={`bi ms-auto ${isActive ? " bi-chevron-up" : "bi-chevron-down"
                                                                                        }`}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </Col>
                                                                );
                                                            })}
                                                        </Row>

                                                        <Collapse in={!!activeCheck}>
                                                            <div>
                                                                {activeCheck && (

                                                                    <div
                                                                        key={activeCheck.id}
                                                                        className="border rounded-3 p-3 mt-3 me-2 ms-1 collapse-detail-enter"
                                                                    >
                                                                        <Row className="g-3">
                                                                            {/* Columna de estadísticas */}
                                                                            <Col xs={12} lg={12}>
                                                                                <div className="d-flex flex-column gap-2 h-100">
                                                                                    <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
                                                                                        <i className="bi bi-hash text-primary fs-5" />
                                                                                        <div>
                                                                                            <div className="small fw-bold">ID:
                                                                                                <span className="fw-bold text-capitalize text-muted ms-1">
                                                                                                    {activeCheck.id}
                                                                                                </span>
                                                                                            </div>

                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
                                                                                        <i className="bi bi-clock text-primary fs-5" />
                                                                                        <div>
                                                                                            <div className="small fw-bold">Hora de registro:
                                                                                                <span className="fw-semibold text-muted ms-1">
                                                                                                    {formatCreatedAtOnlyHours(activeCheck.dateOfAbsence)}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
                                                                                        <i className="bi bi-patch-check text-primary fs-5" />
                                                                                        <div>
                                                                                            <div className="small fw-bold">Categoría:
                                                                                                <span className="fw-semibold text-capitalize text-muted ms-1">
                                                                                                    {activeCheck.category || "--"}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
                                                                                        <i className="bi bi-file-earmark-check text-primary fs-5" />
                                                                                        <div>
                                                                                            <div className="small fw-bold">Subcategoría:
                                                                                                <span className="fw-semibold text-capitalize text-muted ms-1">
                                                                                                    {activeCheck.subCategory || "--"}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
                                                                                        <i className="bi bi-eye text-primary fs-5" />
                                                                                        <div>
                                                                                            <Link
                                                                                                href={`/app/absences?view_type=form&id=${activeCheck.id}`}
                                                                                                target="_blank" //Para abriri en ventana nueva
                                                                                                rel="noopener noreferrer" //Buena practica de seguridad
                                                                                                className="ms-2 fw-semibold"
                                                                                            >
                                                                                                Ver detalles
                                                                                            </Link>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </Col>
                                                                        </Row>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Collapse>
                                                    </ConditionalRender>
                                                </Row>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        <Card className="border rounded-4 mb-4">
                            <Card.Body>
                                <div className="d-flex align-items-center justify-content-between mb-4">
                                    <h6 className="mb-0 fw-bold">Fecha(s) de penalización:</h6>
                                    <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                                        Fecha(s)
                                    </span>
                                </div>

                                <Row>
                                    <Col md={12}>
                                        <div className="d-flex flex-wrap gap-2">
                                            {fechas.map((d) => (
                                                <span
                                                    key={d.toString()}
                                                    className="badge rounded-pill bg-danger-subtle text-danger-emphasis border border-danger-subtle gap-2"
                                                >
                                                    {formatCreatedAt(d)}
                                                </span>
                                            ))
                                            }
                                        </div>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>

                        {/* FIRMAS */}
                        <Card className="border rounded-4">
                            <Card.Body>
                                <div className="d-flex align-items-center justify-content-between mb-4">
                                    <h6 className="mb-0 fw-bold">Firmas</h6>
                                    <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                                        Autorizaciones
                                    </span>
                                </div>

                                <Row className="g-3">
                                    {signatures.map((sign) => (
                                        <SignaturesViewPenalty
                                            key={`${sign.id}-${sign.url}`}
                                            id={Number(penalty?.id)}
                                            idEmployee={String(sign.idSignatory)}
                                            name={sign.name}
                                            url={sign.url}
                                            label={sign.label}
                                        />
                                    ))}
                                </Row>
                            </Card.Body>
                        </Card>

                        {/* MODALES ;) */}
                        <PenaltySignatureModal
                            show={penaltySignatureModal}
                            onHide={() => setPenaltySignatureModal(false)}
                            id={String(penalty?.id)}
                        />

                        <ConditionalRender cond={showDeleteModal}>
                            <ModalBlur onClose={() => setShowDeleteModal(false)}>
                                <DeletePenaltyModal
                                    show={showDeleteModal}
                                    onHide={() => { setShowDeleteModal(false); }}
                                    idPenalty={penalty.id}
                                    motive={penalty.delete?.reaseonDelete ?? ""}
                                    status={penalty.delete?.delete ?? false}
                                />
                            </ModalBlur>
                        </ConditionalRender>
                    </Card.Body>
                </Card>
            </Container>
        </>
    )
}
