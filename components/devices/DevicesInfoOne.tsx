"use client"

import { IDevices, IExternalPerson } from "@/lib/devices/interface"
import { ExternalPersonSummary, externalPersonName } from "./ExternalPerson";
import { Button, Card, Col, Collapse, Container, Row } from "react-bootstrap"
import OverLay from "../templates/OverLay"
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import { formatCreatedAt, formatCreatedAtOnlyHours, formatDateMx } from "@/lib/helpers";
import ModalBlur from "../ModalBlur";
import ModalAssignDevice from "./ModalAssignDevice";
import { Branch, Department, Employee } from "@/lib/definitions";
import FormUpdateDevice from "./UpdateDevice";
import DevicesOneError from "./DevicesOneError";
import UpdateCurrentUser from "./UpdateCurrentUser";

type FeedbackState = "loading" | "success" | "error" | null;

function statusVariant(status: string) {
    switch ((status ?? "")) {
        case "activo":
            return (
                <span className="badge rounded-pill px-2 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle">
                    ACTIVO
                </span>
            )
        case "inactivo":
            return (
                <span className="badge rounded-pill px-2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    INACTIVO
                </span>
            )
        case "en_reparacion":
            return (
                <span className="badge rounded-pill px-2 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                    EN REPARACIÓN
                </span>
            )
        case "baja":
            return (
                <span className="badge rounded-pill px-2 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                    BAJA
                </span>
            )
    }
}

function formatLabel(value: string) {
    return value
        .replace(/_/g, " ")
        .replace(/-/g, " ")
        .trim();
}

function maskValue(value?: string | null, reveal?: boolean) {
    if (!value) return "Sin registro";
    return reveal ? value : "•".repeat(Math.min(value.length, 10));
}

function SpecRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
    return (
        <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
            <i className={`bi ${icon} text-primary fs-5`} />
            <div>
                <div className="small fw-bold">
                    {label}:
                    <span className="fw-semibold text-muted ms-1">
                        {value || "Sin registro"}
                    </span>
                </div>
            </div>
        </div>
    );
}

function getNetworkInfo(device?: IDevices | null) {
    return Array.isArray(device?.networkInfo) ? device!.networkInfo : [];
}

type Props = {
    device: IDevices;
    employees: Employee[];
    branches: Branch[];
    departments: Department[];
}

export function DeviceOne({
    device,
    employees,
    branches,
    departments,
}: Props) {

    //AUI LOS CONST
    const router = useRouter();
    const sp = useSearchParams();
    const searchParamsString = sp.toString();
    const [loading] = useState(false);
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const [activeCheckId, setActiveCheckId] = useState<string | null>(null);
    const activeCheck = getNetworkInfo(device).find((c, index) => String(index) === activeCheckId);
    const employeeTrue = device?.currentAssignment !== null;
    const [showAssignDevice, setShowAssignDevice] = useState(false);
    const [UpdateDeviceModal, setUpdateDeviceModal] = useState(false);
    const [showUpdateCurrent, setShowUpdateCurrent] = useState(false);
    const [activeSpecsSection, setActiveSpecsSection] = useState<"specs" | "credentials" | null>(null);
    const [showPasswords, setShowPasswords] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const noHistorial = device?.assignmentHistory?.every((n) => n.returnedAt === null);


    //HELPERS

    useEffect(() => {
        setFeedback(null);
        setFeedbackMsg("");
    }, [searchParamsString]);


    const handleBack = () => {
        setFeedback("loading");
        setFeedbackMsg("Cargando datos...");

        setTimeout(() => {
            router.push("/app/devices");
        }, 100);
    }

    const handleCreate = () => {
        setFeedback("loading");
        setFeedbackMsg("Cargando...");
        router.push("/app/devices/create");
    };

    const handleGenerateDoc = () => {
        setFeedback("loading");
        setFeedbackMsg("Cargando...")
        router.push(`/app/devices?view_type=responsiva&id=${device.id}`);
    }

    const handleViewHistorial = () => {
        setFeedback("loading");
        setFeedbackMsg("Cargando...")
        router.push(`/app/devices?view_type=historial&id=${device.id}`);
    }


    if (!device) {
        return (
            <DevicesOneError />
        )
    }
    return (
        <>
            <ConditionalRender cond={feedback === "loading"}>
                <Loading message={feedbackMsg || "Guardando..."} />
            </ConditionalRender>

            <Container className="py-3 overflow-x: auto" style={{ maxWidth: "1600px" }}>

                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">

                    {/* Izquierda */}
                    <div className="d-flex gap-2 flex-wrap">

                        <OverLay string="Crear dispositivo">
                            <Button
                                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                                variant="primary"
                                onClick={handleCreate}
                                disabled={loading}
                            >
                                <i className="bi bi-plus-lg" />

                                <span className="d-none d-md-inline ms-2">
                                    Crear Dispositivo
                                </span>
                            </Button>
                        </OverLay>

                        <OverLay string="Actualizar Dispositivo">
                            <Button
                                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                                variant="primary"
                                onClick={() => setUpdateDeviceModal(true)}
                                disabled={loading}
                            >
                                <i className="bi bi-pencil" />

                                <span className="d-none d-md-inline ms-2">
                                    Actualizar Dispositivo
                                </span>
                            </Button>
                        </OverLay>

                        <OverLay string="Ver historial del Dispositivo">
                            <Button
                                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                                variant="secondary"
                                onClick={handleViewHistorial}
                                disabled={noHistorial === true}
                            >
                                <i className="bi bi-hourglass-split" />

                                <span className="d-none d-md-inline ms-2">
                                    Ver historial del dispositivo
                                </span>
                            </Button>
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
                    <h1 className="mb-1 ms-1 text-uppercase">{device.name}</h1>
                    <p className="text-muted mb-0 ms-1">
                        Información del dispositivo.
                    </p>
                </div>

                <Card className="border shadow-sm rounded-4 mt-2">
                    <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <div>
                                <h5 className="mb-1 fw-bold">
                                    Registro #{device?.id}
                                </h5>

                                <p className="text-muted mb-0">
                                    DISPOSITIVO
                                </p>
                            </div>

                            {statusVariant(device?.status)}
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

                                            <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                                                General
                                            </span>
                                        </div>

                                        <div className="d-flex flex-column gap-3">
                                            <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-calendar-plus text-primary" />
                                                    <span className="text-muted">Creado</span>
                                                </div>

                                                <span className="fw-semibold text-end">
                                                    {formatDateMx(device.createdAt)}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-clock" />
                                                    <span className="text-muted">Hora de creación</span>
                                                </div>

                                                <span className="fw-semibold text-end">
                                                    {formatCreatedAtOnlyHours(device.createdAt)}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-hdd-stack text-info" />
                                                    <span className="text-muted">Tipo de dispositivo</span>
                                                </div>

                                                <span className="fw-semibold text-end text-uppercase">
                                                    {device?.type ? formatLabel(device.type) : "Sin registro"}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-toggle2-on text-warning" />
                                                    <span className="text-muted">Estatus</span>
                                                </div>

                                                <span className="fw-semibold text-end text-uppercase">
                                                    {formatLabel(device.status)}
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
                                                    Consulta los datos de red y las notas adicionales del dispositivo.
                                                </p>
                                            </div>

                                            <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                                                Dispositivo
                                            </span>
                                        </div>

                                        <div className="d-flex flex-column gap-4">
                                            <div className="border rounded-3 p-3">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-journal-text text-primary" />
                                                    <span className="text-muted fw-semibold">Notas adicionales</span>
                                                </div>
                                                <div className="text-uppercase">
                                                    {device.notes ? device.notes : "Sin notas adicionales"}
                                                </div>
                                            </div>

                                            <Row className="justify-content-between">
                                                <Row className="g-1">
                                                    {getNetworkInfo(device).map((n, index) => {
                                                        const key = String(index);
                                                        const isActive = activeCheckId === key;
                                                        const vlan1 = n.vlan === "1";

                                                        return (
                                                            <Col key={key} xs={12} sm={12} md={6} lg={6} xl={6}>
                                                                <div
                                                                    role="button"
                                                                    onClick={() => setActiveCheckId(isActive ? null : key)}
                                                                    className={`border rounded-3 p-3 h-100 ms-2 ${isActive ? "border-primary" : ""
                                                                        }`}
                                                                >
                                                                    <div className="d-flex align-items-between gap-2 fw-bold">
                                                                        {vlan1 ? "INFORMACIÓN DE RED VLAN 1" : "INFORMACIÓN DE RED VLAN 20"}
                                                                        <i
                                                                            className={`bi ms-auto ${isActive ? " bi-chevron-up" : "bi-chevron-down"
                                                                                }`}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </Col>
                                                        )
                                                    })}
                                                </Row>

                                                <Collapse in={!!activeCheck}>
                                                    <div>
                                                        {activeCheck && (
                                                            <div
                                                                key={activeCheckId}
                                                                className="border rounded-3 p-3 mt-3 me-2 ms-1 collapse-detail-enter"
                                                            >
                                                                <Row className="g-3">
                                                                    {/* Columna de estadísticas */}
                                                                    <Col xs={12} lg={12}>
                                                                        <div className="d-flex flex-column gap-2 h-100 w-100">
                                                                            <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
                                                                                <i className="bi bi-ethernet text-primary fs-5" />
                                                                                <div>
                                                                                    <div className="small fw-bold">Mac:
                                                                                        <span className="fw-bold text-capitalize text-muted ms-1">
                                                                                            {activeCheck?.mac}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
                                                                                <i className="bi bi-hdd-network text-primary fs-5" />
                                                                                <div>
                                                                                    <div className="small fw-bold">IP:
                                                                                        <span className="fw-semibold text-muted ms-1">
                                                                                            {activeCheck?.ip}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
                                                                                <i className="bi bi-card-text text-primary fs-5" />
                                                                                <div>
                                                                                    <div className="small fw-bold">Descripción:
                                                                                        <span className="fw-semibold text-capitalize text-muted ms-1">
                                                                                            {activeCheck?.description || "NO HAY DESCRIPCIÓN"}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
                                                                                <i className="bi bi-tag text-primary fs-5" />
                                                                                <div>
                                                                                    <div className="small fw-bold">Hostname:
                                                                                        <span className="fw-semibold text-capitalize text-muted ms-1">
                                                                                            {activeCheck?.hostname || "--"}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
                                                                                <i className="bi bi-signpost-split text-primary fs-5" />
                                                                                <div>
                                                                                    <div className="small fw-bold">Gateway:
                                                                                        <span className="fw-semibold text-capitalize text-muted ms-1">
                                                                                            {activeCheck?.gateway || "--"}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
                                                                                <i className="bi bi-server text-primary fs-5" />
                                                                                <div>
                                                                                    <div className="small fw-bold">Dns:
                                                                                        <span className="fw-semibold text-capitalize text-muted ms-1">
                                                                                            {activeCheck?.dns?.length ? activeCheck?.dns.join(", ") : "Sin registro"}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
                                                                                <i className="bi bi-diagram-3 text-primary fs-5" />
                                                                                <div>
                                                                                    <div className="small fw-bold">Vlan:
                                                                                        <span className="fw-semibold text-capitalize text-muted ms-1">
                                                                                            {activeCheck?.vlan ? activeCheck?.vlan : "Sin registro"}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="border rounded-3 p-1 d-flex align-items-center gap-3">
                                                                                <i className="bi bi-plug text-primary fs-5" />
                                                                                <div>
                                                                                    <div className="small fw-bold">Puerto:
                                                                                        <span className="fw-semibold text-capitalize text-muted ms-1">
                                                                                            {activeCheck?.port ? activeCheck?.port : "Sin registro"}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </Col>
                                                                </Row>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Collapse>
                                            </Row>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        <ConditionalRender cond={!!device.specs}>
                            <Card className="border rounded-4 mt-2 mb-2">
                                <Card.Body>
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <div>
                                            <h6 className="mb-1 fw-bold">Especificaciones del dispositivo</h6>
                                            <p className="text-muted mb-0 small">Hardware y credenciales de acceso.</p>
                                        </div>

                                        <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                                            Especificaciones
                                        </span>
                                    </div>

                                    <Row className="justify-content-between">
                                        <Row className="g-1">
                                            <Col xs={12} sm={12} md={6} lg={6} xl={6}>
                                                <div
                                                    role="button"
                                                    onClick={() => setActiveSpecsSection(activeSpecsSection === "specs" ? null : "specs")}
                                                    className={`border rounded-3 p-3 h-100 ms-2 ${activeSpecsSection === "specs" ? "border-primary" : ""}`}
                                                >
                                                    <div className="d-flex align-items-between gap-2 fw-bold">
                                                        <i className="bi bi-cpu text-primary me-2" />
                                                        ESPECIFICACIONES TÉCNICAS
                                                        <i className={`bi ms-auto ${activeSpecsSection === "specs" ? "bi-chevron-up" : "bi-chevron-down"}`} />
                                                    </div>
                                                </div>
                                            </Col>

                                            <ConditionalRender cond={["computadora", "laptop", "tablet", "celular", "telefono_ip"].includes(String(device.type))}>
                                                <Col xs={12} sm={12} md={6} lg={6} xl={6}>
                                                    <div
                                                        role="button"
                                                        onClick={() => setActiveSpecsSection(activeSpecsSection === "credentials" ? null : "credentials")}
                                                        className={`border rounded-3 p-3 h-100 ms-2 ${activeSpecsSection === "credentials" ? "border-primary" : ""}`}
                                                    >
                                                        <div className="d-flex align-items-between gap-2 fw-bold">
                                                            <i className="bi bi-shield-lock text-danger me-2" />
                                                            CREDENCIALES DE ACCESO
                                                            <i className={`bi ms-auto ${activeSpecsSection === "credentials" ? "bi-chevron-up" : "bi-chevron-down"}`} />
                                                        </div>
                                                    </div>
                                                </Col>
                                            </ConditionalRender>
                                        </Row>

                                        <Collapse in={activeSpecsSection !== null}>
                                            <div>
                                                {activeSpecsSection === "specs" && (
                                                    <div key="specs" className="border rounded-3 p-3 mt-3 me-2 ms-1 collapse-detail-enter">
                                                        <Row className="g-3">
                                                            <Col xs={12} lg={12}>
                                                                <div className="d-flex flex-column gap-2 h-100 w-100">
                                                                    <SpecRow icon="bi-tag" label="Marca" value={device.specs?.brand} />
                                                                    <SpecRow icon="bi-cpu-fill" label="Modelo" value={device.specs?.model} />
                                                                    <SpecRow icon="bi-upc-scan" label="No. de serie" value={device.specs?.serialNumber} />
                                                                    <SpecRow icon="bi-cpu" label="Procesador" value={device.specs?.processor} />
                                                                    <SpecRow icon="bi-memory" label="RAM" value={device.specs?.ram} />
                                                                    <SpecRow icon="bi-device-hdd" label="Almacenamiento" value={device.specs?.storage} />
                                                                    <SpecRow icon="bi-windows" label="Sistema operativo" value={formatLabel(device.specs?.os ?? "")} />
                                                                    <SpecRow icon="bi-info-circle" label="Versión de OS" value={device.specs?.osVersion} />
                                                                    <SpecRow icon="bi-gpu-card" label="Tarjeta gráfica" value={device.specs?.graphicCard} />
                                                                    <SpecRow icon="bi-diagram-3" label="Tipo de sistema" value={device.specs?.architecture} />
                                                                    <SpecRow icon="bi-calendar-check" label="Fecha de compra" value={formatCreatedAt(device.specs?.purchaseDate)} />
                                                                    <SpecRow icon="bi-calendar-x" label="Vencimiento de garantía" value={formatCreatedAt(device.specs?.warrantyExpiration)} />
                                                                    <SpecRow icon="bi-hash" label="ID de dispositivo" value={device.specs?.idDevice} />
                                                                    <SpecRow icon="bi-box-seam" label="ID de producto" value={device.specs?.idProduct} />
                                                                    <SpecRow icon="bi-flag-fill" label="Estatus actual" value={device.specs?.currentStatus} />
                                                                </div>
                                                            </Col>
                                                        </Row>
                                                    </div>
                                                )}

                                                {activeSpecsSection === "credentials" && (
                                                    <div key="credentials" className="border rounded-3 p-3 mt-3 me-2 ms-1 collapse-detail-enter">
                                                        <div className="d-flex justify-content-end mb-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline-secondary"
                                                                onClick={() => setShowPasswords((prev) => !prev)}
                                                            >
                                                                <i className={`bi ${showPasswords ? "bi-eye-slash" : "bi-eye"} me-1`} />
                                                                {showPasswords ? "Ocultar" : "Mostrar"} credenciales
                                                            </Button>
                                                        </div>

                                                        <Row className="g-3">
                                                            <Col xs={12} lg={12}>
                                                                <div className="d-flex flex-column gap-2 h-100 w-100">
                                                                    <ConditionalRender cond={["computadora", "laptop", "telefono_ip"].includes(String(device.type))}>
                                                                        <SpecRow icon="bi-person-badge" label="Usuario admin" value={device.specs?.userAdmin} />
                                                                        <SpecRow icon="bi-key" label="Contraseña admin" value={maskValue(device.specs?.passwordAdmin, showPasswords)} />
                                                                    </ConditionalRender>

                                                                    <ConditionalRender cond={["computadora", "laptop"].includes(String(device.type))}>
                                                                        <SpecRow icon="bi-person" label="Usuario" value={device.specs?.user} />
                                                                    </ConditionalRender>

                                                                    <ConditionalRender cond={["computadora", "laptop", "telefono_ip"].includes(String(device.type))}>
                                                                        <SpecRow icon="bi-key-fill" label={device.type === "telefono_ip" ? "Contraseña Issabel" : "Contraseña de usuario"} value={maskValue(device.specs?.userPassword, showPasswords)} />
                                                                    </ConditionalRender>

                                                                    <ConditionalRender cond={["celular", "tablet"].includes(String(device.type))}>
                                                                        <SpecRow icon="bi-phone" label="Pin" value={maskValue(device.currentAssignment?.pinPhone, showPasswords)} />
                                                                    </ConditionalRender>
                                                                </div>
                                                            </Col>
                                                        </Row>
                                                    </div>
                                                )}
                                            </div>
                                        </Collapse>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </ConditionalRender>

                        {/* SI NO HAY EMPLEADO ASIGANDO */}

                        <ConditionalRender cond={!employeeTrue}>
                            <Card className="border rounded-4">
                                <Card.Body>
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <div className="d-flex align-items-center gap-2 mb-4">
                                            <h6 className="mb-0 fw-bold">Empleado asignado</h6>
                                        </div>

                                        {/* ====== Boton para abrir modal =======*/}
                                        <Button
                                            variant="outline-primary"
                                            type="button"
                                            onClick={() => setShowAssignDevice(true)}
                                        >
                                            <i className="bi bi-plus-circle me-1" />
                                            Agregar empleado asignado
                                        </Button>
                                    </div>

                                    <div className="text-center">
                                        <i className="bi bi-person-slash text-danger"
                                            style={{ fontSize: "3rem" }}
                                        />
                                    </div>

                                    <p className="text-muted small mb-0 text-center">
                                        El dispositivo no cuenta con empleado asignado.
                                    </p>
                                </Card.Body>
                            </Card>
                        </ConditionalRender>

                        {/* EMPLEADO ASIGNADO*/}
                        <ConditionalRender cond={employeeTrue}>
                            <Card className="border rounded-4 overflow-hidden">
                                <Card.Body className="p-4">
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <h6 className="mb-0 fw-bold">
                                            Empleado asignado
                                        </h6>

                                        <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                                            Empleado
                                        </span>
                                    </div>

                                    <Row className="g-0 border rounded-4 overflow-hidden">
                                        {/* Franja lateral tipo carnet */}
                                        <Col xs={12} md={4} className="bg-primary-subtle d-flex flex-column align-items-center justify-content-center text-center p-4">
                                            <div
                                                className="d-flex align-items-center justify-content-center rounded-circle bg-white text-primary mb-3 shadow-sm"
                                                style={{ width: 64, height: 64 }}
                                            >
                                                <i className="bi bi-person-fill fs-3" />
                                            </div>
                                            <div className="fw-bold text-uppercase text-primary-emphasis">
                                                {device?.employee
                                                    ? `${device.employee.lastName ?? ""} ${device.employee.name ?? ""}`.trim()
                                                    : device?.currentAssignment?.externalPerson
                                                        ? externalPersonName(device.currentAssignment.externalPerson)
                                                        : "Sin empleado asignado"}
                                            </div>
                                            <ConditionalRender cond={!device?.employee && !!device?.currentAssignment?.externalPerson}>
                                                <ExternalPersonSummary person={device?.currentAssignment?.externalPerson as IExternalPerson} />
                                            </ConditionalRender>

                                            <Button
                                                className="hover-clickable mt-2"
                                                variant="outline-primary"
                                                onClick={() => setShowUpdateCurrent(true)}
                                            >
                                                <i className="bi bi-pencil me-1" />
                                                Actualizar empleado
                                            </Button>
                                        </Col>

                                        {/* Datos tipo ficha */}
                                        <Col xs={12} md={8}>
                                            <div className="p-4 h-100 d-flex flex-column justify-content-center">

                                                <div className="d-flex justify-content-end mb-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline-secondary"
                                                        onClick={() => setShowPassword((prev) => !prev)}
                                                    >
                                                        <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"} me-1`} />
                                                        {showPassword ? "Ocultar" : "Mostrar"} contraseña
                                                    </Button>
                                                </div>

                                                <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                    <span className="text-muted small">
                                                        <i className="bi bi-building me-2 text-warning" />
                                                        Sucursal
                                                    </span>
                                                    <span className="fw-semibold text-uppercase small text-end">
                                                        {device?.branch?.name || "Sin sucursal"}
                                                    </span>
                                                </div>

                                                <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                    <span className="text-muted small">
                                                        <i className="bi bi-columns-gap me-2 text-info" />
                                                        Departamento
                                                    </span>
                                                    <span className="fw-semibold text-uppercase small text-end">
                                                        {device?.department?.nameDepartment || "Sin departamento"}
                                                    </span>
                                                </div>

                                                <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                    <span className="text-muted small">
                                                        <i className="bi bi-geo-alt-fill me-2 text-danger" />
                                                        Locación
                                                    </span>
                                                    <span className="fw-semibold text-uppercase small text-end">
                                                        {device?.currentAssignment?.location || "Sin registro"}
                                                    </span>
                                                </div>

                                                <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                    <span className="text-muted small">
                                                        <i className="bi bi-calendar-date me-2 text-secondary" />
                                                        Fecha de asignación
                                                    </span>
                                                    <span className="fw-semibold small text-end">
                                                        {device?.currentAssignment?.assignedAt
                                                            ? formatCreatedAt(device.currentAssignment.assignedAt)
                                                            : "Sin registro"}
                                                    </span>
                                                </div>

                                                <ConditionalRender cond={device.type === "celular"}>
                                                    <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                        <span className="text-muted small">
                                                            <i className="bi bi-telephone me-2 text-info" />
                                                            Número de celular
                                                        </span>
                                                        <span className="fw-semibold small text-end text-uppercase">
                                                            {device?.currentAssignment?.phoneNumber?.number ? device?.currentAssignment?.phoneNumber.number : "NO SE REGISTRO UN NÚMERO"}
                                                        </span>
                                                    </div>
                                                </ConditionalRender>

                                                <ConditionalRender cond={device.type === "telefono_ip"}>
                                                    <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                        <span className="text-muted small">
                                                            <i className="bi bi-telephone me-2 text-info" />
                                                            Número de extensión
                                                        </span>
                                                        <span className="fw-semibold small text-end text-uppercase">
                                                            {device?.currentAssignment?.extentionNumber ? device?.currentAssignment?.extentionNumber : "NO SE REGISTRO UN NÚMERO"}
                                                        </span>
                                                    </div>
                                                </ConditionalRender>

                                                <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                    <span className="text-muted small">
                                                        <i className="bi bi-envelope-check me-2 text-primary" />
                                                        Correo laboral
                                                    </span>
                                                    <span className="fw-semibold small text-end">
                                                        {device?.currentAssignment?.emailCompany ? device?.currentAssignment?.emailCompany : "NO HAY CORREO REGISTRADO"}
                                                    </span>
                                                </div>

                                                <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                    <span className="text-muted small">
                                                        <i className="bi bi-envelope-at me-2 text-warning" />
                                                        Correo Gmail
                                                    </span>
                                                    <span className="fw-semibold small text-end">
                                                        {device?.currentAssignment?.emailGmail ? device?.currentAssignment?.emailGmail : "NO HAY CORREO REGISTRADO"}
                                                    </span>
                                                </div>

                                                <div className="d-flex align-items-center justify-content-between py-2">
                                                    <span className="text-muted small">
                                                        <i className="bi bi-shield-lock me-2 text-info" />
                                                        Contraseña Correo Gmail
                                                    </span>
                                                    <span className="fw-semibold small text-end">
                                                        {device?.currentAssignment?.passwordEmail ? maskValue(device?.currentAssignment?.passwordEmail, showPassword) : "NO HAY CONTRASEÑA REGISTRADA"}
                                                    </span>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>

                                    <div className="d-flex align-items-center justify-content-end mt-2">
                                        <Button
                                            variant="warning"
                                            onClick={handleGenerateDoc}>
                                            <i className="bi bi-eye me-2" />
                                            Ver responsiva
                                        </Button>
                                    </div>

                                </Card.Body>
                            </Card>
                        </ConditionalRender>
                    </Card.Body>
                </Card>
            </Container>

            <ConditionalRender cond={showAssignDevice}>
                <ModalBlur onClose={() => setShowAssignDevice(false)}>
                    <ModalAssignDevice
                        show={showAssignDevice}
                        onHide={() => setShowAssignDevice(false)}
                        idDevice={device.id}
                        device={device}
                        employees={employees}
                        branches={branches}
                        departments={departments}
                    />
                </ModalBlur>
            </ConditionalRender>

            <ConditionalRender cond={UpdateDeviceModal}>
                <ModalBlur onClose={() => setUpdateDeviceModal(false)}>
                    <FormUpdateDevice
                        show={UpdateDeviceModal}
                        onHide={() => setUpdateDeviceModal(false)}
                        device={device}
                        idDevice={device.id}
                    />
                </ModalBlur>
            </ConditionalRender>

            <ConditionalRender cond={showUpdateCurrent}>
                <ModalBlur onClose={() => setShowUpdateCurrent(false)}>
                    <UpdateCurrentUser
                        show={showUpdateCurrent}
                        onHide={() => setShowUpdateCurrent(false)}
                        device={
                            {
                                phoneNumber: device?.currentAssignment?.phoneNumber?.number,
                                extentionNumber: device?.currentAssignment?.extentionNumber,
                                emailCompany: device?.currentAssignment?.emailCompany,
                                emailGmail: device?.currentAssignment?.emailGmail,
                                passwordEmail: device?.currentAssignment?.passwordEmail,
                                pinPhone: device?.currentAssignment?.pinPhone,
                                location: device?.currentAssignment?.location
                            }
                        }
                        idDevice={device.id}
                        type={device.type ?? ""}
                    />
                </ModalBlur>
            </ConditionalRender>
        </>
    )
}