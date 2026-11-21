"use client";

import { Branch } from "@/lib/definitions";
import { CHECK_METHOD_LABELS, CheckMethods, IChecador, IChecadorEmployee } from "@/lib/checadores/interface";
import { updateCheckMethods } from "@/app/actions/checadores-actions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Container, Dropdown, Form, InputGroup, Pagination, Row } from "react-bootstrap";
import { useRouter, useSearchParams } from "next/navigation";
import { useModals } from "@/context/ModalContext";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import GenericSearchInput from "../employee/GenericSearchInput";
import { formatDateHours } from "@/lib/helpers";
import OverLay from "../templates/OverLay";
import ChecadorEmployeesModal from "./ChecadorEmployeesModal";

type FeedbackState = "loading" | "success" | "error" | null;

const METHOD_OPTIONS = Object.entries(CHECK_METHOD_LABELS) as [CheckMethods, string][];

const STATUS_OPTIONS = [
    { value: "1", label: "Activo" },
    { value: "2", label: "Suspendido" },
    { value: "3", label: "Eliminado" },
];

const wrapStyle: React.CSSProperties = {
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    minWidth: 0,
};

// Mismo badge de estatus que Usuarios
function statusBadge(status: number) {
    switch (status) {
        case 1:
            return <span className="badge rounded-pill px3 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle">ACTIVO</span>;
        case 2:
            return <span className="badge rounded-pill px3 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">SUSPENDIDO</span>;
        case 3:
            return <span className="badge rounded-pill px3 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">ELIMINADO</span>;
        default:
            return <span className="text-muted">—</span>;
    }
}

function FilterDropdown({
    id,
    icon,
    title,
    selectedLabel,
    allLabel = "TODOS",
    options,
    current,
    onSelect,
}: {
    id: string;
    icon: string;
    title: string;
    selectedLabel: string;
    allLabel?: string;
    options: { value: string; label: string }[];
    current: string;
    onSelect: (value: string) => void;
}) {
    return (
        <Card className="rounded-4 border h-100">
            <Card.Body className="p-3">
                <div className="d-flex align-items-center gap-2 mb-3">
                    <i className={`bi bi-${icon} text-primary`} />
                    <span className="fw-semibold small">{title}</span>
                </div>

                <Dropdown className="w-100">
                    <Dropdown.Toggle
                        id={id}
                        as={Button}
                        variant="outline-secondary"
                        className="w-100 d-flex align-items-center justify-content-between text-uppercase"
                        style={{ minWidth: 0 }}
                    >
                        <span style={{ ...wrapStyle, textAlign: "left" }}>{selectedLabel}</span>
                    </Dropdown.Toggle>

                    <Dropdown.Menu className="w-100" style={{ maxHeight: "300px", overflowY: "auto" }}>
                        <Dropdown.Item active={!current} onClick={() => onSelect("")}>
                            <span className="text-uppercase text-muted">{allLabel}</span>
                        </Dropdown.Item>

                        {options.map((option) => (
                            <Dropdown.Item
                                key={option.value}
                                active={option.value === current}
                                onClick={() => onSelect(option.value)}
                            >
                                <span className="text-uppercase">{option.label}</span>
                            </Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                </Dropdown>
            </Card.Body>
        </Card>
    );
}

export default function ChecadoresClient({
    checadores,
    total,
    page,
    limit,
    errorMessage,
    search,
    status,
    checkMethods,
    branches = [],
    canUpdate,
}: {
    checadores: IChecador[];
    total: number;
    page: number;
    limit: number;
    errorMessage?: string;
    search?: string;
    status: string;
    checkMethods: string;
    branches?: Branch[];
    canUpdate: boolean;
}) {
    const router = useRouter();
    const sp = useSearchParams();
    const searchParamsString = sp.toString();
    const currentSearch = sp.get("search") ?? "";
    const currentBranch = sp.get("branch") ?? "";
    const { modalConfirm } = useModals();

    const [rows, setRows] = useState<IChecador[]>(checadores);
    const [feedbackMsg, setFeedbackMsg] = useState(errorMessage ?? "");
    const [feedback, setFeedback] = useState<FeedbackState>(errorMessage ? "error" : null);
    // Checador al que se le editan los empleados del modo checador
    const [employeesRow, setEmployeesRow] = useState<IChecador | null>(null);

    const totalPages = Math.max(Math.ceil(total / limit), 1);
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

    useEffect(() => {
        setRows(checadores);
    }, [checadores]);

    // Al llegar datos nuevos se quita el loading; si el back respondió error se muestra su message
    useEffect(() => {
        setFeedback(errorMessage ? "error" : null);
        setFeedbackMsg(errorMessage ?? "");
    }, [searchParamsString, errorMessage]);

    const pushParams = useCallback((params: URLSearchParams, message = "Cargando...") => {
        setFeedback("loading");
        setFeedbackMsg(message);
        router.push(`/app/checadores?${params.toString()}`);
    }, [router]);

    const goToPage = (nextPage: number) => {
        const params = new URLSearchParams(searchParamsString);
        params.set("page", String(nextPage));
        params.set("limit", String(limit));
        pushParams(params);
    };

    const setFilter = useCallback((key: string, value: string, current: string, message = "Filtrando...") => {
        if (value === current) return;

        const params = new URLSearchParams(searchParamsString);
        params.set("page", "1");
        params.set("limit", String(limit));
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        pushParams(params, message);
    }, [searchParamsString, limit, pushParams]);

    const handleSearch = useCallback(
        (value: string) => setFilter("search", value.trim(), currentSearch.trim(), "Buscando..."),
        [setFilter, currentSearch]
    );

    const branchOptions = branches.map((br) => ({ value: String(br.id), label: br.name }));
    const methodOptions = METHOD_OPTIONS.map(([value, label]) => ({ value, label }));

    const selectedBranchName = branches.find((br) => String(br.id) === currentBranch)?.name ?? "Sucursales";
    const selectedStatusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "Todos";
    const selectedMethodLabel = CHECK_METHOD_LABELS[checkMethods as CheckMethods] ?? "Todos";

    // El select es controlado: si se cancela o el back responde error, se queda con el valor anterior
    const handleMethodChange = (row: IChecador, next: CheckMethods) => {
        if (next === row.checkMethods) return;

        const name = `${row.name ?? ""} ${row.lastName ?? ""}`.trim();

        modalConfirm(`¿Cambiar el tipo de validación de ${name} a ${CHECK_METHOD_LABELS[next]}? Aplica desde la siguiente checada.`, async () => {
            try {
                setFeedback("loading");
                setFeedbackMsg("Guardando...");

                const res = await updateCheckMethods(row.id, next);

                if (!res.success) {
                    setFeedbackMsg(res.message || "No se pudo cambiar el tipo de validación");
                    setFeedback("error");
                    return;
                }

                setRows((prev) => prev.map((r) => r.id === row.id
                    ? {
                        ...r,
                        checkMethods: res.data?.checkMethods ?? next,
                        checkMethodsUpdatedAt: res.data?.checkMethodsUpdatedAt ?? r.checkMethodsUpdatedAt,
                    }
                    : r));

                setFeedbackMsg(res.message);
                setFeedback("success");
            } catch {
                setFeedbackMsg("Error inesperado, intenta de nuevo");
                setFeedback("error");
            }
        });
    };

    const handleEmployeesSaved = (message: string, employees: IChecadorEmployee[]) => {
        const id = employeesRow?.id;
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, employees } : r)));
        setEmployeesRow(null);
        setFeedbackMsg(message);
        setFeedback("success");
    };

    const hasFilters = !!(search || currentBranch || status || checkMethods);

    return (
        <>
            <ConditionalRender cond={feedback === "loading"}>
                <Loading message={feedbackMsg || "Cargando..."} />
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

            <ConditionalRender cond={!!employeesRow}>
                <ChecadorEmployeesModal
                    key={employeesRow?.id}
                    checador={employeesRow as IChecador}
                    onHide={() => setEmployeesRow(null)}
                    onSaved={handleEmployeesSaved}
                />
            </ConditionalRender>

            <Container className="py-3" style={{ maxWidth: "1600px" }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h1 className="mb-0">Checadores</h1>
                        <span className="text-muted">
                            {total} checador{total !== 1 ? "es" : ""}
                        </span>
                    </div>
                </div>

                <Card className="rounded-4 shadow-sm border">
                    <Card.Body className="p-3 p-md-5">
                        <Row className="mb-4 g-3">
                            {/* BUSCADOR */}
                            <Col xs={12} lg={6} xl={3} style={{ minWidth: 0 }}>
                                <Card className="border rounded-4 h-100">
                                    <Card.Body className="p-3">
                                        <div className="d-flex align-items-center gap-2 mb-3">
                                            <i className="bi bi-person text-primary" />
                                            <span className="fw-semibold small">Buscar checador</span>
                                        </div>

                                        <InputGroup>
                                            <InputGroup.Text className="bg-gray" style={{ color: "#6c757d" }}>
                                                <i className="bi bi-search" />
                                            </InputGroup.Text>
                                            <GenericSearchInput
                                                initialValue={search}
                                                onSearch={handleSearch}
                                                placeholder="Nombre o correo"
                                            />
                                        </InputGroup>
                                    </Card.Body>
                                </Card>
                            </Col>

                            <Col xs={12} sm={6} lg={6} xl={3} style={{ minWidth: 0 }}>
                                <FilterDropdown
                                    id="checadores-filter-branch"
                                    icon="building"
                                    title="Filtrar por sucursal"
                                    selectedLabel={selectedBranchName}
                                    options={branchOptions}
                                    current={currentBranch}
                                    onSelect={(value) => setFilter("branch", value, currentBranch)}
                                />
                            </Col>

                            <Col xs={12} sm={6} lg={6} xl={3} style={{ minWidth: 0 }}>
                                <FilterDropdown
                                    id="checadores-filter-status"
                                    icon="check-circle"
                                    title="Filtrar por estatus"
                                    selectedLabel={selectedStatusLabel}
                                    options={STATUS_OPTIONS}
                                    current={status}
                                    onSelect={(value) => setFilter("status", value, status)}
                                />
                            </Col>

                            <Col xs={12} sm={6} lg={6} xl={3} style={{ minWidth: 0 }}>
                                <FilterDropdown
                                    id="checadores-filter-methods"
                                    icon="shield-check"
                                    title="Filtrar por tipo de validación"
                                    selectedLabel={selectedMethodLabel}
                                    options={methodOptions}
                                    current={checkMethods}
                                    onSelect={(value) => setFilter("checkMethods", value, checkMethods)}
                                />
                            </Col>
                        </Row>

                        <div className="table-responsive rounded-3 border overflow-auto">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-dark border-secondary">
                                    <tr>
                                        <th className="fw-bold">Nombre</th>
                                        <th className="fw-bold">Correo</th>
                                        <th className="fw-bold">Sucursal</th>
                                        <th className="fw-bold text-center">Estatus</th>
                                        <th className="fw-bold">Tipo de validación</th>
                                        <th className="fw-bold text-nowrap">Última modificación</th>
                                        <th className="fw-bold">Empleados</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    <ConditionalRender cond={rows.length === 0}>
                                        <tr>
                                            <td colSpan={7} className="text-center text-muted py-4">
                                                {errorMessage || (hasFilters
                                                    ? "No se encontró ningún checador con los filtros aplicados"
                                                    : "No hay checadores registrados")}
                                            </td>
                                        </tr>
                                    </ConditionalRender>

                                    {rows.map((row) => (
                                        <tr key={row.id}>
                                            <td className="text-uppercase text-nowrap">{`${row.name ?? ""} ${row.lastName ?? ""}`.trim() || "—"}</td>
                                            <td style={wrapStyle}>{row.email || "—"}</td>
                                            <td className="text-uppercase">{row.branch?.name ?? "—"}</td>
                                            <td className="text-center">{statusBadge(row.status)}</td>
                                            <td style={{ minWidth: 170 }}>
                                                <Form.Select
                                                    id={`checador-methods-${row.id}`}
                                                    size="sm"
                                                    aria-label={`Tipo de validación de ${row.name}`}
                                                    value={row.checkMethods ?? "ambos"}
                                                    disabled={!canUpdate}
                                                    onChange={(e) => handleMethodChange(row, e.target.value as CheckMethods)}
                                                >
                                                    {METHOD_OPTIONS.map(([value, label]) => (
                                                        <option key={value} value={value}>{label}</option>
                                                    ))}
                                                </Form.Select>
                                            </td>
                                            <td className="text-nowrap small text-muted">
                                                {row.checkMethodsUpdatedAt ? formatDateHours(row.checkMethodsUpdatedAt) : "—"}
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    <ConditionalRender cond={(row.employees?.length ?? 0) > 0}>
                                                        <OverLay string={(row.employees ?? []).map((e) => `${e.lastName ?? ""} ${e.name ?? ""}`.trim()).join(", ").toUpperCase()}>
                                                            <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle text-nowrap">
                                                                {row.employees?.length} empleado{row.employees?.length !== 1 ? "s" : ""}
                                                            </span>
                                                        </OverLay>
                                                    </ConditionalRender>
                                                    <ConditionalRender cond={(row.employees?.length ?? 0) === 0}>
                                                        <span className="text-muted">—</span>
                                                    </ConditionalRender>
                                                    <ConditionalRender cond={canUpdate}>
                                                        <OverLay string="Asignar empleados para el modo checador">
                                                            <Button
                                                                size="sm"
                                                                variant="outline-primary"
                                                                aria-label={`Editar empleados de ${row.name}`}
                                                                onClick={() => setEmployeesRow(row)}
                                                                disabled={feedback === "loading"}
                                                            >
                                                                <i className="bi bi-people" />
                                                            </Button>
                                                        </OverLay>
                                                    </ConditionalRender>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 mt-4">
                            <small className="text-muted">
                                Página {page} de {totalPages}
                            </small>

                            <ConditionalRender cond={totalPages > 1}>
                                <Pagination size="sm" className="m-0">
                                    <Pagination.Prev disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                                        Anterior
                                    </Pagination.Prev>

                                    <ConditionalRender cond={visiblePages[0] > 1}>
                                        <Pagination.Item onClick={() => goToPage(1)}>1</Pagination.Item>
                                        <ConditionalRender cond={visiblePages[0] > 2}>
                                            <Pagination.Ellipsis disabled />
                                        </ConditionalRender>
                                    </ConditionalRender>

                                    {visiblePages.map((num) => (
                                        <Pagination.Item key={num} active={num === page} onClick={() => goToPage(num)}>
                                            {num}
                                        </Pagination.Item>
                                    ))}

                                    <ConditionalRender cond={visiblePages[visiblePages.length - 1] < totalPages}>
                                        <ConditionalRender cond={visiblePages[visiblePages.length - 1] < totalPages - 1}>
                                            <Pagination.Ellipsis disabled />
                                        </ConditionalRender>
                                        <Pagination.Item onClick={() => goToPage(totalPages)}>{totalPages}</Pagination.Item>
                                    </ConditionalRender>

                                    <Pagination.Next disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
                                        Siguiente
                                    </Pagination.Next>
                                </Pagination>
                            </ConditionalRender>
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        </>
    );
}
