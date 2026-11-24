"use client"

import { IDevices } from "@/lib/devices/interface";
import { externalPersonName } from "./ExternalPerson";
import { TableTemplateColumn } from "../templates/TableTemplate";
import { Button, Card, Col, Container, Dropdown, InputGroup, Pagination, Row } from "react-bootstrap";
import ListView from "../templates/ListView";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import GenericSearchInput from "../employee/GenericSearchInput";
import { Branch, Department } from "@/lib/definitions";
import { downloadDirectoryEmails, downloadDirectoryExtEmail, downloadDirectoryPhones, getDirectory } from "@/app/actions/devices-actions";
import { useModals } from "@/context/ModalContext";
import ErrorOverlay from "../ErrorOverlay";
import { ActionResponse } from "@/lib/definitions";

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

const TYPE_CONFIG: Record<string, { label: string; accent: string }> = {
    computadora: { label: "Computadora", accent: "primary" },
    laptop: { label: "Laptop", accent: "indigo" },
    impresora: { label: "Impresora", accent: "orange" },
    servidor: { label: "Servidor", accent: "purple" },
    switch: { label: "Switch", accent: "teal" },
    router: { label: "Router", accent: "dark" },
    telefono_ip: { label: "Teléfono IP", accent: "lime" },
    camara: { label: "Cámara", accent: "pink" },
    access_point: { label: "Access Point", accent: "light" },
    celular: { label: "Celular", accent: "brown" },
    television: { label: "Televisión", accent: "warning" },
    tablet: { label: "Tablet", accent: "tinto" },
    otro: { label: "Otro", accent: "secondary" },
};

function typeVariant(type: string) {
    const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.otro;

    return (
        <span
            className={`badge rounded-pill px-2 py-2 fw-semibold bg-${config.accent}-subtle text-${config.accent}-emphasis border border-${config.accent}-subtle`}
        >
            {config.label}
        </span>
    );
}

export function formatLabel(value: string) {
    return value
        .replace(/_/g, " ")
        .replace(/-/g, " ")
        .trim();
}

export default function DevicesTableClient({
    total,
    page,
    limit,
    devices,
    branches,
    departments,
    search = "",
}: {
    total: number;
    page: number;
    limit: number;
    devices: IDevices[];
    branches: Branch[];
    departments: Department[];
    search?: string;
    status?: string;
    idEmployee?: string;
    idDepartment?: string;
    idBranch?: string;
}) {
    //AQUI LOS CONST
    const router = useRouter();
    const sp = useSearchParams();
    const searchParamsString = sp.toString();
    const currentSearch = sp.get("search") ?? "";
    const currentType = sp.get("type") ?? "";
    const currentBranch = sp.get("idBranch") ?? "";
    const currentIdDepartment = sp.get("idDepartment") ?? "";
    const { modalConfirm } = useModals();

    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const totalPages = Math.ceil(total / limit);

    const MAX_VISIBLE = 5;

    const visiblePages = useMemo(() => {
        if (totalPages <= MAX_VISIBLE) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        let start = Math.max(1, page - Math.floor(MAX_VISIBLE / 2));
        let end = start + MAX_VISIBLE - 1;

        if (end > totalPages) {
            end = totalPages;
            start = end - MAX_VISIBLE + 1;
        }

        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }, [page, totalPages]);
    
    const deviceTypeOptions = [
        { value: "computadora", label: "COMPUTADORA" },
        { value: "laptop", label: "LAPTOP" },
        { value: "impresora", label: "IMPRESORA" },
        { value: "servidor", label: "SERVIDOR" },
        { value: "switch", label: "SWITCH" },
        { value: "router", label: "ROUTER" },
        { value: "telefono_ip", label: "TELÉFONO IP" },
        { value: "camara", label: "CÁMARA" },
        { value: "access_point", label: "ACCESS POINT" },
        { value: "celular", label: "CELULAR" },
        { value: "television", label: "TELEVISIÓN" },
        { value: "tablet", label: "TABLET" },
        { value: "monitor", label: "MONITOR" },
        { value: "no-break", label: "NO-BREAK" },
        { value: "otro", label: "OTRO" },
    ];

    useEffect(() => {
        setFeedback(null);
        setFeedbackMsg("");
    }, [searchParamsString]);

    const goToPage = (nextPage: number) => {
        setFeedback(null);
        setFeedbackMsg("Cargando...");
        const params = new URLSearchParams(searchParamsString);
        params.set("id", "null");
        params.set("view_type", "list");
        params.set("page", String(nextPage));
        params.set("limit", String(limit));

        if (search?.trim()) {
            params.set("search", search.trim());
        } else {
            params.delete("search");
        }

        router.push(`/app/devices?${params.toString()}`);
    };

    const renderCell = (row: IDevices, column: TableTemplateColumn<IDevices>) => {
        if (column.render) {
            return column.render(row);
        }

        if (column.accessor) {
            return String(column.accessor(row) ?? "-");
        }

        return String(row[column.key as keyof IDevices] ?? "-");
    };

    const handleCreate = () => {
        setFeedback("loading");
        setFeedbackMsg("Cargando...");
        router.push("/app/devices/create");
    };

    const handleSearch = useCallback((value: string) => {

        if (value === currentSearch) return;

        setFeedback("loading");
        setFeedbackMsg("Buscando...");

        const params = new URLSearchParams(searchParamsString);
        params.set("id", "null");
        params.set("view_type", "list");
        params.set("page", "1");
        params.set("limit", String(limit));

        if (value) {
            params.set("search", value);
        } else {
            params.delete("search");
        }
        router.push(`/app/devices?${params.toString()}`);
    },
        [currentSearch, searchParamsString, limit, router]
    );

    const handleTypeFilter = useCallback((value: string) => {
        const trimedSuc = value.trim();
        const normalizedCurrent = currentType ? String(currentType) : "";

        if (trimedSuc === normalizedCurrent) return;


        setFeedback("loading");
        setFeedbackMsg("Buscando...");

        const params = new URLSearchParams(searchParamsString);
        params.set("id", "null");
        params.set("view_type", "list");
        params.set("page", "1");
        params.set("limit", String(limit));

        if (value) {
            params.set("type", value);
        } else {
            params.delete("type");
        }
        router.push(`/app/devices?${params.toString()}`);
    },
        [currentType, searchParamsString, limit, router]
    );

    const selectedType = currentType
        ? deviceTypeOptions.find((opt) => opt.value === currentType)?.label ?? currentType
        : "TODOS";

    const selectedBranchName = useMemo(() => {
        if (!currentBranch) return "Sucursales";
        const found = branches.find(
            (br) => String(br.id) === currentBranch
        );
        return found ? found.name : "Sucursales";
    }, [currentBranch, branches]);

    const handleBranchFilter = useCallback((value: string) => {
        const trimedSuc = value.trim();
        const normalizedCurrent = currentBranch ? String(currentBranch) : "";

        if (trimedSuc === normalizedCurrent) return;

        setFeedback("loading");
        setFeedbackMsg("Filtrando...");

        const params = new URLSearchParams(searchParamsString);
        params.delete("id");
        params.set("view_type", "list");
        params.set("page", "1");
        params.set("limit", String(limit));

        if (trimedSuc !== "") {
            params.set("idBranch", value.trim());
            params.delete("idDepartment")
            params.delete("idPosition")
        } else {
            params.delete("idBranch");
            params.delete("idDepartment")
            params.delete("idPosition")

        }
        router.push(`/app/devices?${params.toString()}`);
    }, [searchParamsString, limit, router, currentBranch]);

    const handleDepartmentFilter = useCallback((value: string) => {
        const trimmedValue = value.trim();
        const normalizedCurrent = currentIdDepartment ? String(currentIdDepartment) : "";

        if (trimmedValue === normalizedCurrent) return;

        setFeedback('loading');
        setFeedbackMsg("Filtrando...");

        const params = new URLSearchParams(searchParamsString);
        params.delete("id");
        params.delete("idBranch");
        params.set("view_type", "list");
        params.set("page", "1");
        params.set("limit", String(limit));

        if (trimmedValue !== "") {
            params.set("idDepartment", trimmedValue);
            params.delete("idPosition");
            params.delete("idBranch");
        } else {
            params.delete("idBranch");
            params.delete("idDepartment");
            params.delete("idPosition");
        }

        router.push(`/app/devices?${params.toString()}`);
    }, [searchParamsString, limit, router, currentIdDepartment]);

    const selectedDepartmentName = useMemo(() => {
        if (!currentIdDepartment) return "Departamentos";
        const found = departments.find(
            (dep) => String(dep.id) === currentIdDepartment
        );
        return found ? found.nameDepartment : "Departamentos";
    }, [currentIdDepartment, departments]);

    //GENERAR DIRECTORIO
    const handleGenerate = async () => {
        modalConfirm("¿Seguro que quieres descargar el directorio?", async () => {
            try {
                setFeedback("loading");
                setFeedbackMsg("Descargando...");
                const res = await getDirectory();

                if (!res.success || !res.data) {
                    setFeedbackMsg(res.message || "No se pudo generar el directorio");
                    setFeedback("error");
                    return;
                }

                const { base64Url, fileName } = res.data;

                const link = document.createElement("a");
                link.href = base64Url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                link.remove();

                setFeedbackMsg("Directorio generado correctamente");
                setFeedback("success");
            } catch {
                setFeedbackMsg("Error inesperado al generar el directorio");
                setFeedback("error");
            }
        })
    };

    //GENERAR DIRECTORIOS EN PDF (ext. y correos, celulares, correos)
    const handleDownloadDirectory = (
        action: () => Promise<ActionResponse<{ base64Url: string; fileName: string } | null>>
    ) => {
        modalConfirm("¿Seguro que quieres descargar el directorio?", async () => {
            try {
                setFeedback("loading");
                setFeedbackMsg("Descargando...");
                const res = await action();

                if (!res.success || !res.data) {
                    setFeedbackMsg(res.message || "No se pudo generar el directorio");
                    setFeedback("error");
                    return;
                }

                const { base64Url, fileName } = res.data;

                const link = document.createElement("a");
                link.href = base64Url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                link.remove();

                setFeedback(null);
            } catch {
                setFeedbackMsg("Error inesperado al generar el directorio");
                setFeedback("error");
            }
        })
    };

    const directoryButtons: { key: string; label: string; action: () => Promise<ActionResponse<{ base64Url: string; fileName: string } | null>> }[] = [
        { key: "extEmail", label: "Directorio Ext. y Correos", action: downloadDirectoryExtEmail },
        { key: "phones", label: "Directorio Celulares", action: downloadDirectoryPhones },
        { key: "emails", label: "Directorio Correos", action: downloadDirectoryEmails },
    ];

    //TABLA
    const columns: TableTemplateColumn<IDevices>[] = [
        {
            key: "id",
            label: "ID",
            accessor: (u) => u.id,
            filterable: false,
            type: "string",
            render: (u) => <div className="text-uppercase">{u.id}</div>,
        },
        {
            key: "name",
            label: "Nombre",
            accessor: (u) => u.name,
            filterable: false,
            type: "string",
            render: (u) => (
                <div className="text-uppercase">{u.name}</div>
            ),
        },
        {
            key: "employee",
            label: "Empleado Responsable",
            accessor: (u) => u.employee?.name ?? u.currentAssignment?.externalPerson?.name,
            filterable: false,
            type: "string",
            render: (u) => (
                u.employee || !u.currentAssignment?.externalPerson
                    ? <div className="text-uppercase">{u.employee?.lastName} {u.employee?.name}</div>
                    : (
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            <span className="text-uppercase">{externalPersonName(u.currentAssignment.externalPerson)}</span>
                            <span className="badge rounded-pill px-2 py-1 fw-semibold bg-orange-subtle text-orange-emphasis border border-orange-subtle">
                                Externo
                            </span>
                        </div>
                    )
            ),
        },
        {
            key: "mac",
            label: "Mac",
            accessor: (u) => u.networkInfo.find((e) => e.mac)?.mac ?? "-",
            filterable: false,
            type: "string",
            render: (u) => (
                <div className="text-uppercase">
                    {u.networkInfo.filter((e) => e.mac).map((e) => e.mac).join(" -  ")}
                </div>
            ),
        },
        {
            key: "vlan1",
            label: "VLAN 1",
            accessor: (u) => u.networkInfo.find((e) => e.vlan === "1")?.vlan ?? "-",
            filterable: false,
            type: "string",
            render: (u) => (
                <div className="text-uppercase">
                    {u.networkInfo.filter((e) => e.vlan === "1").map((e) => e.ip).join(" - ")}
                </div>
            ),
        },
        {
            key: "vlan20",
            label: "VLAN 20",
            accessor: (u) => u.networkInfo.find((e) => e.vlan === "20")?.vlan ?? "-",
            filterable: false,
            type: "string",
            render: (u) => (
                <div className="text-uppercase">
                    {u.networkInfo.filter((e) => e.vlan === "20").map((e) => e.ip).join(" - ")}
                </div>
            ),
        },
        {
            key: "type",
            label: "Tipo",
            align: "center",
            accessor: (u) => u.type,
            filterable: false,
            type: "string",
            render: (u) => (
                <div className="text-uppercase text-center">{typeVariant(u.type!)}</div>
            ),
        },
        {
            key: "status",
            label: "Estatus",
            align: "center",
            accessor: (u) => u.status,
            filterable: false,
            type: "string",
            render: (u) => (
                <div className="text-uppercase text-center">{statusVariant(u.status)}</div>
            ),
        },

    ];

    return (
        <>
            <ConditionalRender cond={feedback === "loading"}>
                <Loading message={feedbackMsg || "Guardando..."} />
            </ConditionalRender>

            <ConditionalRender cond={feedback === "error"}>
                <ErrorOverlay
                    message={feedbackMsg}
                    onDone={() => setFeedback(null)}
                />
            </ConditionalRender>

            <Container className="py-3" style={{ maxWidth: "1600px" }}>

                <div className="d-flex flex-wrap gap-2">
                <Button
                    variant="primary"
                    className="d-inline-flex align-items-center gap-2 fw-semibold px-3"
                    onClick={handleCreate}
                >
                    <i className="bi bi-plus-lg" />
                    Crear dispositivo
                </Button>

                <Button
                    variant="black"
                    className="text-light bg-black border-light d-inline-flex align-items-center gap-2 fw-semibold px-3"
                    onClick={handleGenerate}
                >
                    <i className="bi bi-file-earmark-pdf" />
                    Descargar Directorio
                </Button>

                {directoryButtons.map(({ key, label, action }) => (
                    <Button
                        key={key}
                        variant="black"
                        className="text-light bg-black border-light d-inline-flex align-items-center gap-2 fw-semibold px-3"
                        onClick={() => handleDownloadDirectory(action)}
                    >
                        <i className="bi bi-file-earmark-pdf" />
                        {label}
                    </Button>
                ))}
                </div>

                <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
                    <div>
                        <h1 className="mb-0">Dispositivos</h1>

                        <span className="text-muted">
                            {total} dispositivo{total !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                <Row className="justify-content-center">
                    <Col xs={12} xl={12} xxl={12}>
                        <Card className="rounded-4 shadow-sm border">
                            <Card.Body className="p-4 p-md-5">

                                <div className="mb-4">
                                    <Row className="mb-4 g-3 align-items-between">

                                        {/* FILTRO DE EMPLEADOS */}
                                        <Col xs={12} sm={6} md={6} lg={6} xl={3} style={{ minWidth: 0 }}>
                                            <Card className="border rounded-4 h-100">
                                                <Card.Body className="p-3">
                                                    <div className="d-flex align-items-center gap-2 mb-3">
                                                        <i className="bi bi-laptop text-primary" />
                                                        <span className="fw-semibold small">Filtrar dispositivos</span>
                                                    </div>

                                                    <InputGroup>
                                                        <InputGroup.Text
                                                            className="bg-gray"
                                                            style={{ color: "#6c757d" }}
                                                        >
                                                            <i className="bi bi-search" />
                                                        </InputGroup.Text>
                                                        <GenericSearchInput
                                                            initialValue={search}
                                                            onSearch={handleSearch}
                                                            placeholder="Buscar por nombre o empleado..."
                                                        />
                                                    </InputGroup>
                                                </Card.Body>
                                            </Card>
                                        </Col>

                                        <Col xs={12} sm={6} md={6} lg={6} xl={3} style={{ minWidth: 0 }}>
                                            <Card className="rounded-4 border h-100">
                                                <Card.Body className="p-3">
                                                    <div className="d-flex align-items-center gap-2 mb-3">
                                                        <i className="bi bi-tags-fill text-primary" />
                                                        <span className="fw-semibold small">Filtrar por tipo</span>
                                                    </div>

                                                    <Dropdown className="w-100">
                                                        <Dropdown.Toggle
                                                            id="devices-filter-type"
                                                            as={Button}
                                                            variant="outline-secondary"
                                                            className="w-100 d-flex align-items-center justify-content-between text-uppercase"
                                                            style={{ minWidth: 0 }}
                                                        >
                                                            <span
                                                                style={{
                                                                    whiteSpace: "normal",
                                                                    overflowWrap: "break-word",
                                                                    wordBreak: "break-word",
                                                                    textAlign: "left",
                                                                }}
                                                            >
                                                                {selectedType}
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu className="w-100" style={{ maxHeight: "300px", overflowY: "auto" }}>
                                                            <Dropdown.Item
                                                                active={!currentType}
                                                                onClick={() => handleTypeFilter("")}
                                                            >
                                                                <span className="text-uppercase text-muted">TODOS</span>
                                                            </Dropdown.Item>

                                                            {deviceTypeOptions.map((opt) => (
                                                                <Dropdown.Item
                                                                    key={opt.value}
                                                                    active={opt.value === currentType}
                                                                    onClick={() => handleTypeFilter(opt.value)}
                                                                >
                                                                    <span className="text-uppercase">{opt.label}</span>
                                                                </Dropdown.Item>
                                                            ))}
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </Card.Body>
                                            </Card>
                                        </Col>

                                        {/* FILTRO DE SUCURSALES */}
                                        <Col xs={12} sm={6} md={6} lg={3} xl={3} style={{ minWidth: 0 }}>
                                            <Card className="rounded-4 border h-100">
                                                <Card.Body className="p-3">
                                                    <div className="d-flex align-items-center gap-2 mb-3">
                                                        <i className="bi bi-building text-primary" />
                                                        <span className="fw-semibold small">Filtrar por sucursal</span>
                                                    </div>

                                                    <Dropdown className="w-100">
                                                        <Dropdown.Toggle
                                                            id="devices-filter-branch"
                                                            as={Button}
                                                            variant="outline-secondary"
                                                            className="w-100 d-flex align-items-center justify-content-between text-uppercase"
                                                            style={{ minWidth: 0 }}
                                                        >
                                                            <span
                                                                style={{
                                                                    whiteSpace: "normal",
                                                                    overflowWrap: "break-word",
                                                                    wordBreak: "break-word",
                                                                    textAlign: "left",
                                                                }}
                                                            >
                                                                {selectedBranchName}
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item
                                                                active={!currentBranch}
                                                                onClick={() => handleBranchFilter("")}
                                                            >
                                                                <span className="text-uppercase text-muted">TODOS</span>
                                                            </Dropdown.Item>

                                                            {branches.map((br) => (
                                                                <Dropdown.Item
                                                                    key={br.id}
                                                                    active={String(br.id) === currentBranch}
                                                                    onClick={() => handleBranchFilter(String(br.id))}>
                                                                    <span className="text-uppercase">
                                                                        {br.name}
                                                                    </span>
                                                                </Dropdown.Item>
                                                            ))}
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </Card.Body>
                                            </Card>
                                        </Col>

                                        {/* FILTRO DE DEPARTAMENTOS */}
                                        <Col xs={12} sm={6} md={6} lg={6} xl={3} style={{ minWidth: 0 }}>
                                            <Card className="rounded-4 border h-100">
                                                <Card.Body className="p-3">
                                                    <div className="d-flex align-items-center gap-2 mb-3">
                                                        <i className="bi bi-columns-gap text-primary" />
                                                        <span className="fw-semibold small">Filtrar por departamento</span>
                                                    </div>

                                                    <Dropdown className="w-100">
                                                        <Dropdown.Toggle
                                                            id="devices-filter-department"
                                                            as={Button}
                                                            variant="outline-secondary"
                                                            className="w-100 d-flex align-items-center justify-content-between text-uppercase"
                                                            style={{ minWidth: 0 }}
                                                        >
                                                            <span
                                                                style={{
                                                                    whiteSpace: "normal",
                                                                    overflowWrap: "break-word",
                                                                    wordBreak: "break-word",
                                                                    textAlign: "left",
                                                                }}
                                                            >
                                                                {selectedDepartmentName}
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu className="w-100" style={{ maxHeight: "300px", overflowY: "auto" }}>
                                                            <Dropdown.Item
                                                                active={!currentIdDepartment}
                                                                onClick={() => handleDepartmentFilter("")}
                                                            >
                                                                <span className="text-uppercase text-muted">TODOS</span>
                                                            </Dropdown.Item>

                                                            {departments.map((dep) => (
                                                                <Dropdown.Item
                                                                    key={dep.id}
                                                                    active={String(dep.id) === currentIdDepartment}
                                                                    onClick={() => handleDepartmentFilter(String(dep.id))}>
                                                                    <span className="text-uppercase">
                                                                        {dep.nameDepartment}
                                                                    </span>
                                                                </Dropdown.Item>
                                                            ))}
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                </div>
                                <ListView>
                                    <ListView.Body>
                                        <div className="table-responsive rounded-3 border overflow-auto">
                                            <table className="table table-hover align-middle mb-0">
                                                <thead className="table-dark border-secondary">
                                                    <tr>
                                                        {columns.map((column) => (
                                                            <th
                                                                key={String(column.key)}
                                                                className={`fw-bold ${column.align === "center" ? "text-center" : "text-left"}`}
                                                            >
                                                                {column.label}
                                                            </th>
                                                        ))}

                                                        <th className="fw-bold">Detalles</th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {(devices ?? []).map((row) => {
                                                        return (
                                                            <tr key={row.id}>
                                                                {columns.map((column) => (
                                                                    <td key={String(column.key)}>{renderCell(row, column)}</td>
                                                                ))}
                                                                <td className="align-middle">
                                                                    <div className="d-flex justify-content-center align-items-center gap-2">

                                                                        <a href={`/app/devices?view_type=form&id=${row.id}`} className="btn btn-sm btn-outline-info">
                                                                            Ver
                                                                        </a>

                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="d-flex justify-content-between align-items-center mt-4">
                                            <small className="text-muted">
                                                Página {page} de {totalPages}
                                            </small>

                                            <ConditionalRender cond={totalPages > 1}>
                                                <Pagination size="sm" className="m-0">
                                                    <Pagination.Prev
                                                        disabled={page <= 1}
                                                        onClick={() => goToPage(page - 1)}
                                                    >
                                                        Anterior
                                                    </Pagination.Prev>

                                                    {/* Primera página + … si la ventana no empieza en 1 */}
                                                    <ConditionalRender cond={visiblePages[0] > 1}>
                                                        <Pagination.Item onClick={() => goToPage(1)}>1</Pagination.Item>
                                                        <ConditionalRender cond={visiblePages[0] > 2}>
                                                            <Pagination.Ellipsis disabled />
                                                        </ConditionalRender>
                                                    </ConditionalRender>

                                                    {visiblePages.map((num) => (
                                                        <Pagination.Item
                                                            key={num}
                                                            active={num === page}
                                                            onClick={() => goToPage(num)}
                                                        >
                                                            {num}
                                                        </Pagination.Item>
                                                    ))}

                                                    {/* … + última página si la ventana no termina en totalPages */}
                                                    <ConditionalRender cond={visiblePages[visiblePages.length - 1] < totalPages}>
                                                        <ConditionalRender cond={visiblePages[visiblePages.length - 1] < totalPages - 1}>
                                                            <Pagination.Ellipsis disabled />
                                                        </ConditionalRender>
                                                        <Pagination.Item onClick={() => goToPage(totalPages)}>{totalPages}</Pagination.Item>
                                                    </ConditionalRender>

                                                    <Pagination.Next
                                                        disabled={page >= totalPages}
                                                        onClick={() => goToPage(page + 1)}
                                                    >
                                                        Siguiente
                                                    </Pagination.Next>
                                                </Pagination>
                                            </ConditionalRender>
                                        </div>
                                    </ListView.Body>
                                </ListView>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container >
        </>
    )
}