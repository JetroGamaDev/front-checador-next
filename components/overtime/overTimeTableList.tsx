"use client"

import { ISignatures, OverTime } from "@/lib/overTime/interface";
import { TableTemplateColumn } from "../templates/TablePage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import { Button, Card, Col, Container, InputGroup, Overlay, OverlayTrigger, Pagination, Row, Tooltip } from "react-bootstrap";
import ListView from "../templates/ListView";
import { useSearchParams, useRouter } from "next/navigation";
import GenericSearchInput from "../employee/GenericSearchInput";
import { useSessionSnapshot } from "@/hooks/useSessionStore";
import { useSession } from "next-auth/react";
import { isOwnIncidenceDeleteLocked } from "@/lib/employeeVisibility";
import AlertSignatures from "./AlertSignatures";
import { formatCreatedAt, formatParseHours } from "@/lib/helpers";
import ModalBlur from "../ModalBlur";
import DeleteOvertimeModal from "./DeleteOvertimeModal";
import DatePicker from "react-datepicker";
import moment from "moment";

type FeedbackState = "loading" | "success" | "error" | null;

export default function OverTimeTableClient({
    total,
    page,
    limit,
    search = "",
    overtime,
    dateInit,
    dateEnd
}: {
    total: number;
    page: number;
    limit: number;
    search?: string;
    overtime?: OverTime[];
    overtimes?: OverTime | null;
    dateInit?: string;
    dateEnd?: string;
}) {
    //Aqui van los const 

    const session = useSessionSnapshot();
    // Sesión real (con isDoh) para la regla de eliminar incidencias propias
    const { data: authSession } = useSession();
    const isClearingSelectionRef = useRef(false);
    const [, setSelectedIds] = useState<Array<string | number>>([]);
    const sp = useSearchParams();
    const searchParamsString = sp.toString();
    const tableRef = useRef<{ clearSelection: () => void } | null>(null);
    const currentSearch = sp.get("search") ?? "";
    const [, setTableResetKey] = useState(0);
    const router = useRouter();
    const [hideSignatures, setHideSignatures] = useState(false);
    const idEmployee = Number(session?.uid?.idEmployee);
    const [showdeleteInhabilityModal, setShowDeleteInhabilityModal] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [motive, setMotive] = useState<string | null>(null);
    const [status, setStatus] = useState<boolean | null>(null);

    const [feedbackMsg, setFeedbackMsg] = useState("");
    const [feedback, setFeedback] = useState<FeedbackState>(null);

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

    //Calendario
    const [dateInitValue, setDateInitValue] = useState(dateInit ?? "");
    const [dateEndValue, setDateEndValue] = useState(dateEnd ?? "");
    const [dateError, setDateError] = useState("");
    const [showCalendar, setShowCalendar] = useState(false);
    const dateButtonRef = useRef(null);
    const parsedStart = dateInitValue ? moment(dateInitValue, "YYYY-MM-DD").toDate() : null;
    const parsedEnd = dateEndValue ? moment(dateEndValue, "YYYY-MM-DD").toDate() : null;

    useEffect(() => {
        setFeedback(null);
        setFeedbackMsg("");
    }, [searchParamsString]);

    const rangeLabel =
        parsedStart && parsedEnd
            ? `${moment(parsedStart).format("DD/MM/YYYY")} - ${moment(parsedEnd).format("DD/MM/YYYY")}`
            : "Selecciona un rango de fechas";

    const handleRangeChange = (dates: [Date | null, Date | null]) => {
        const [start, end] = dates;
        setDateInitValue(start ? moment(start).format("YYYY-MM-DD") : "");
        setDateEndValue(end ? moment(end).format("YYYY-MM-DD") : "");
        if (start && end) setShowCalendar(true);
    };

    const pendingOvertimes = useMemo(() => {
        return (overtime ?? []).filter((o: OverTime) => {
            const signatures: ISignatures[] = o.signatures ?? [];
            const mySignature = signatures.find((i: ISignatures) => Number(i.idSignatory) === idEmployee && o.delete?.delete !== true);
            if (!mySignature) return false;
            return mySignature.url === '';
        });
    }, [overtime, idEmployee]);

    const hasPendingSignature = pendingOvertimes.length > 0;

    useEffect(() => {
        setHideSignatures(hasPendingSignature);
    }, [hasPendingSignature]);


    // Para redirigir a la pagina de crear
    const handleCreate = () => {
        setFeedback("loading");
        setFeedbackMsg("Cargando...");
        router.push("/app/overtime/create");
    };

    //Helpers

    const goToPage = (nextPage: number) => {
        setFeedback("loading");
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

        router.push(`/app/overtime?${params.toString()}`);
    };


    const capitalize = (text?: string) => {
        if (!text) return "";

        return text
            .toLowerCase()
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    };

    const getEmployeeName = (e: OverTime) => {
        return e.employee
            ? `${capitalize(e.employee.lastName)} ${capitalize(e.employee.name)}`
            : `${e.idEmployee}`;
    };


    const clearSelectedIds = useCallback(() => {
        isClearingSelectionRef.current = true;

        tableRef.current?.clearSelection();
        setSelectedIds([]);
        setTableResetKey((k) => k + 1);

        setTimeout(() => {
            isClearingSelectionRef.current = false;
        }, 0);
    }, []);


    const renderCell = (row: OverTime, column: TableTemplateColumn<OverTime>) => {
        if (column.render) {
            return column.render(row);
        }

        if (column.accessor) {
            return String(column.accessor(row) ?? "-");
        }

        return String(row[column.key as keyof OverTime] ?? "-");
    };

    const handleDelete = (idOvertime: number, motive: string, status: boolean) => {
        setSelectedId(idOvertime);
        setMotive(motive);
        setStatus(status)
        setShowDeleteInhabilityModal(true);
    };


    const handleSearch = useCallback(
        (value: string) => {
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
            clearSelectedIds();
            router.push(`/app/overtime?${params.toString()}`);
        },
        [currentSearch, searchParamsString, limit, router, clearSelectedIds]
    );

    const handleDateFilter = useCallback(() => {
        if (!dateInitValue || !dateEndValue) {
            setDateError("Ambas fechas son requeridas");
            return;
        }
        if (dateEndValue < dateInitValue) {
            setDateError("'Hasta' debe ser posterior a 'Desde'");
            return;
        }
        setDateError("");

        if (dateInitValue === (dateInit ?? "") && dateEndValue === (dateEnd ?? "")) return;

        setFeedback("loading");
        setFeedbackMsg("Filtrando...");


        const params = new URLSearchParams(searchParamsString);
        params.set("id", "null");
        params.set("view_type", "list");
        params.set("page", "1");
        params.set("limit", String(limit));
        params.set("dateInit", dateInitValue);
        params.set("dateEnd", dateEndValue);

        clearSelectedIds();
        router.push(`/app/overtime?${params.toString()}`);
    }, [dateInitValue, dateEndValue, dateInit, dateEnd, searchParamsString, limit, router, clearSelectedIds]);

    const handleClear = useCallback(() => {
        setDateInitValue("");
        setDateEndValue("");
        setDateError("");
        clearSelectedIds();

        if (!dateInit && !dateEnd) return;

        setFeedback("loading");
        setFeedbackMsg("Cargando...");

        const params = new URLSearchParams(searchParamsString);
        params.set("id", "null");
        params.set("view_type", "list");
        params.set("page", "1");
        params.set("limit", String(limit));
        params.delete("dateInit");
        params.delete("dateEnd");

        router.push(`/app/overtime?${params.toString()}`);
    }, [router, searchParamsString, dateInit, dateEnd, clearSelectedIds, limit]);


    const columns: TableTemplateColumn<OverTime>[] = [
        {
            key: "id",
            label: "ID",
            accessor: (e) => e.id,
            filterable: true,
            type: "string",
            render: (e) => (
                <div className="text-uppercase">
                    {`${e.id}` || "-"}
                </div>
            )
        },
        {
            key: "employee",
            label: "Empleado",
            accessor: getEmployeeName,
            filterable: true,
            type: "string",
            render: (e) => (
                <div className="text-uppercase">
                    {getEmployeeName(e) || "-"}
                </div>
            )
        },
        {
            key: "motive",
            label: "Motivo",
            accessor: (e) => e.motive,
            filterable: true,
            type: "string",
            render: (e) =>
                <div className="text-uppercase">
                    {e.motive || "-"}
                </div>
        },
        {
            key: "date",
            label: "Fecha",
            accessor: (e) => e.informationDate?.dateInit,
            filterable: true,
            type: "date",
            render: (e) => (
                <div className="text-uppercase">
                    {formatCreatedAt(e.informationDate?.dateInit) || "-"}
                </div>
            )
        },
        {
            key: "hourInit",
            label: "Hora inicio",
            accessor: (e) => e.informationDate?.hourInit,
            filterable: true,
            type: "string",
            render: (e) => (
                <div className="text-uppercase">
                    {formatParseHours(e.informationDate?.hourInit)}
                </div>
            )
        },
        {
            key: "hourEnd",
            label: "Hora fin",
            accessor: (e) => e.informationDate?.hourEnd,
            filterable: true,
            type: "string",
            render: (e) =>
                <div className="text-uppercase">
                    {formatParseHours(e.informationDate?.hourEnd) || "-"}
                </div>
        },
        {
            key: "signatures",
            label: "Firmado",
            accessor: (row) => row.signatures,
            filterable: true,
            render: (row) => {
                const mySignature = (row.signatures ?? []).find(
                    (s) => Number(s.idSignatory) === idEmployee
                );
                const cancelado = row.delete?.delete === true;


                if (!mySignature) {
                    return (
                        <>
                            <span className="text-muted">Este permiso no corresponde a este perfil</span>
                        </>
                    );
                } else if (cancelado === true) {
                    return (
                        <>
                            <i className="bi bi-slash-circle ms-4" />
                        </>
                    )
                } else {
                    return mySignature.url === "" ? (
                        <i className="bi bi-x-lg text-danger ms-4" title="Pendiente de tu firma" />
                    ) : (
                        <i className="bi bi-check-lg text-success ms-4" title="Firmado" />
                    );
                }
            },
        },
        {
            key: "status",
            label: "Estatus",
            align: "center",
            accessor: (e) => e.status,
            filterable: true,
            type: "string",
            render: (e) => {
                const estado = e.status
                const cancelado = e.delete?.delete === true;

                if (cancelado === true) {
                    return (
                        <div className="text-center">
                            <span className="badge rounded-pill px3 py-2 fw-semibold bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle">
                                CANCELADO
                            </span>
                        </div>
                    );
                } else {
                    switch (estado) {
                        case "APPROVED":
                            return (
                                <div className="text-center">
                                    <span className="badge rounded-pill px3 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle">
                                        APROBADO
                                    </span>
                                </div>
                            );
                        case "PENDING":
                            return (
                                <div className="text-center">
                                    <span className="badge rounded-pill px3 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                                        PENDIENTE
                                    </span>
                                </div>
                            );
                        case "REFUSED":
                            return (
                                <div className="text-center">
                                    <span className="badge rounded-pill px3 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                                        RECHAZADO
                                    </span>
                                </div>
                            );
                    }
                }
            },
        }
    ];

    return (
        <>
            <ConditionalRender cond={hideSignatures}>
                <AlertSignatures
                    onClose={() => setHideSignatures(false)}
                    pendingIds={pendingOvertimes.map((o) => o.id)}
                />
            </ConditionalRender>

            <ConditionalRender cond={feedback === "loading"}>
                <Loading message={feedbackMsg || "Guardando..."} />
            </ConditionalRender>

            <Container className="py-3 " style={{ maxWidth: "1600px" }}>
                <Button
                    variant="primary"
                    className="d-inline-flex align-items-center gap-2 fw-semibold px-3"
                    onClick={handleCreate}
                >
                    <i className="bi bi-plus-lg" />
                    Crear registro
                </Button>

                <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
                    <div>
                        <h1 className="mb-0">Registro de horas extra</h1>

                        <span className="text-muted">
                            {total} registro{total !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                <Row className="justify-content-center">
                    <Col xs={12} xl={12} xxl={12}>
                        <Card className="rounded-4 shadow-sm border">
                            <Card.Body className="p-4 p-md-5">

                                <Row className="justify-content-center mb-3 g-3">
                                    {/* FILTRO POR EMPLEADO */}
                                    <Col xs={12} md={6} lg={6}>
                                        <Card className="border rounded-4 h-100">
                                            <Card.Body className="p-3">
                                                <div className="d-flex align-items-center gap-2 mb-3">
                                                    <i className="bi bi-person text-primary" />
                                                    <span className="fw-semibold small">Filtrar por empleado</span>
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
                                                        placeholder="Buscar por nombre o apellido..."
                                                    />
                                                </InputGroup>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                    {/* FILTRO POR FECHA */}
                                    <Col xs={12} md={6} lg={6}>
                                        <Card className="rounded-4 border h-100">
                                            <Card.Body className="p-3">
                                                <div className="d-flex align-items-center gap-2 mb-3">
                                                    <i className="bi bi-calendar-range text-primary" />
                                                    <span className="fw-semibold small">Filtrar por fechas</span>
                                                </div>

                                                <Button
                                                    ref={dateButtonRef}
                                                    variant="outline-secondary"
                                                    className={`w-100 d-flex align-items-center justify-content-between ${dateError ? "border-danger text-danger" : ""}`}
                                                    onClick={() => setShowCalendar((s) => !s)}
                                                >
                                                    <span>{rangeLabel}</span>
                                                    <i className="bi bi-calendar3" />
                                                </Button>

                                                {dateError && (
                                                    <small className="text-danger d-block mt-1">{dateError}</small>
                                                )}

                                                <Overlay
                                                    target={dateButtonRef.current}
                                                    show={showCalendar}
                                                    placement="bottom-start"
                                                    rootClose
                                                    onHide={() => setShowCalendar(false)}
                                                >
                                                    {({ ref, style }) => (
                                                        <div ref={ref} style={style} className="mt-2 shadow-lg rounded-4 overflow-hidden bg-light text-capitalize">
                                                            <DatePicker
                                                                selectsRange
                                                                inline
                                                                startDate={parsedStart}
                                                                endDate={parsedEnd}
                                                                onChange={handleRangeChange}
                                                                monthsShown={1}
                                                                locale="es"
                                                            />
                                                            <Row className="g-2 m-2">

                                                                <Col xs={12} md={6} lg={6}>
                                                                    <Button
                                                                        variant="primary"
                                                                        className="w-100"
                                                                        onClick={() => {
                                                                            handleDateFilter();
                                                                            setShowCalendar(false);
                                                                        }}
                                                                    >
                                                                        Filtrar fechas
                                                                    </Button>
                                                                </Col>

                                                                <Col xs={12} md={6} lg={6}>
                                                                    <Button
                                                                        variant="secondary"
                                                                        className="w-100"
                                                                        onClick={() => {
                                                                            handleClear();
                                                                            setShowCalendar(false);
                                                                        }}
                                                                    >
                                                                        <i className="bi bi-arrow-counterclockwise" />
                                                                    </Button>
                                                                </Col>
                                                            </Row>
                                                        </div>
                                                    )}
                                                </Overlay>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>

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
                                                        <th className=" fw-bold text-center">
                                                            Acciones
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody>

                                                    <ConditionalRender cond={overtime?.length === 0}>
                                                        <tr>
                                                            <td colSpan={columns.length + 1} className="text-center py-5 text-muted">
                                                                <i
                                                                    className={`bi ${search || dateInit ? "bi-clipboard-x" : "bi-inbox"} d-block mb-2`}
                                                                    style={{ fontSize: "2.5rem" }}
                                                                />
                                                                <span className="fw-semibold">
                                                                    {search || dateInit
                                                                        ? "No se encontraron horas extras con los filtros aplicados"
                                                                        : "No hay horas extras registradas"}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    </ConditionalRender>

                                                    {(overtime ?? []).map((row) => (
                                                        <tr key={row.id}>
                                                            {columns.map((column) => (
                                                                <td key={String(column.key)}>
                                                                    {renderCell(row, column)}
                                                                </td>
                                                            ))}
                                                            <td>
                                                                <div className="d-flex align-items-center justify-content-center gap-2">

                                                                    <a
                                                                        href={row.delete?.delete === true ? undefined : `/app/overtime?view_type=form&id=${row.id}`}
                                                                        className={`btn btn-sm btn-outline-info ${row.delete?.delete === true ? "disabled" : ""}`}
                                                                        aria-disabled={row.delete?.delete === true}
                                                                        onClick={(e) => {
                                                                            if (row.delete?.delete === true) e.preventDefault();
                                                                        }}
                                                                    >
                                                                        Ver
                                                                    </a>

                                                                    <ConditionalRender cond={!isOwnIncidenceDeleteLocked(authSession?.user, row)}>
                                                                        <a
                                                                            className={row.delete?.delete === true ? "btn btn-sm btn-outline-danger" : "btn btn-sm btn-danger"}
                                                                            onClick={() => handleDelete(row.id, row.delete?.reaseonDelete ?? "", row.delete?.delete ?? false)}
                                                                        >
                                                                            {row.delete?.delete === true ? "Ver motivo" : "Eliminar"}
                                                                        </a>
                                                                    </ConditionalRender>
                                                                    {/* Aprobada y propia: ya no la elimina el empleado */}
                                                                    <ConditionalRender cond={isOwnIncidenceDeleteLocked(authSession?.user, row) && row.leaderApproval === "APPROVED"}>
                                                                        <OverlayTrigger
                                                                            placement="top"
                                                                            overlay={<Tooltip id={`doh-tooltip-${row.id}`}>Para cancelarla acude a DOH</Tooltip>}
                                                                        >
                                                                            <i
                                                                                className="bi bi-info-circle-fill text-info fs-5"
                                                                                style={{ cursor: "help" }}
                                                                                aria-label="Para cancelarla acude a DOH"
                                                                            />
                                                                        </OverlayTrigger>
                                                                    </ConditionalRender>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
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

                <ConditionalRender cond={showdeleteInhabilityModal}>
                    <ModalBlur onClose={() => setShowDeleteInhabilityModal(false)}>
                        <DeleteOvertimeModal
                            show={showdeleteInhabilityModal}
                            onHide={() => { setShowDeleteInhabilityModal(false); }}
                            idOvertime={selectedId}
                            motive={motive}
                            status={status}
                        />
                    </ModalBlur>
                </ConditionalRender>
            </Container>
        </>
    );
}