"use client"
import { IAbsence } from "@/lib/absences/interface";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TableTemplateColumn } from "../templates/TableTemplate";
import moment from "moment";
import { Button, Card, Col, Container, Dropdown, InputGroup, Overlay, Pagination, Row } from "react-bootstrap";
import ListView from "../templates/ListView";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import GenericSearchInput from "../employee/GenericSearchInput";
import DatePicker, { registerLocale } from "react-datepicker";
import { useModals } from "@/context/ModalContext";
import ModalBlur from "../ModalBlur";
import CreatePenaltyComponent from "./CreatePenaltyModal";
import { generateFault } from "@/app/actions/eventos-actions";
import useSWR from "swr";
import { ICheckInFeedback } from "@/lib/definitions";
import { useSessionSnapshot } from "@/hooks/useSessionStore";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import { es } from "date-fns/locale";
import { formatDateMx } from "@/lib/helpers";
import GenerateModal from "./GenerateModal";

registerLocale("es", es);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type FeedbackState = "loading" | "success" | "error" | null;

function statusVariant(type: string, category?: string) {
    switch ((type ?? "").toLowerCase()) {
        case "asistencia":
            return (
                <span className="badge rounded-pill px-2 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle">
                    ASISTENCIA
                </span>
            )

        case "falta":
            if (category === "injustificada") {
                return (
                    <span className="badge rounded-pill px-2 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                        FALTA
                    </span>
                )
            } else if (category === "justificada") {
                return (
                    <span className="badge rounded-pill px-2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                        FALTA JUSTIFICADA
                    </span>
                )
            }

        case "retardo":
            return (
                <span className="badge rounded-pill px-2 py-2 fw-semibold bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle">
                    RETARDO
                </span>
            )

        case "falta_por_penalizacion":
            return (
                <span className="badge rounded-pill px2 py-2 fw-semibold bg-orange-subtle text-orange-emphasis border border-orange-subtle">
                    FALTA POR PENALIZACIÓN
                </span>
            )
    }
}

export default function AbsencesTableClient({
    total,
    page,
    limit,
    search = "",
    absence,
    dateInit,
    dateEnd,
    eventos,
    yaGenerado
}: {
    total: number;
    page: number;
    limit: number;
    search?: string;
    dateInit?: string;
    dateEnd?: string;
    type?: string;
    absence?: IAbsence[];
    eventos?: ICheckInFeedback[];
    yaGenerado: boolean;
}) {
    //Aqui los const 
    const router = useRouter();
    const session = useSessionSnapshot();
    const roles = session?.uid?.roles;
    const sp = useSearchParams();
    const searchParamsString = sp.toString();
    const currentSearch = sp.get("search") ?? "";
    const currentType = sp.get("type") ?? "";
    const isClearingSelectionRef = useRef(false);
    const tableRef = useRef<{ clearSelection: () => void } | null>(null);
    const [, setTableResetKey] = useState(0);
    const isLeader = roles?.isLeader && !roles.isExtra;
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

    //Filtro
    const [dateInitValue, setDateInitValue] = useState(dateInit ?? "");
    const [dateEndValue, setDateEndValue] = useState(dateEnd ?? "");
    const [dateError, setDateError] = useState("");

    const [showCalendar, setShowCalendar] = useState(false);
    const dateButtonRef = useRef(null);
    const parsedStart = dateInitValue ? moment(dateInitValue, "YYYY-MM-DD").toDate() : null;
    const parsedEnd = dateEndValue ? moment(dateEndValue, "YYYY-MM-DD").toDate() : null;
    const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);
    const { modalError, modalConfirm } = useModals();
    const [showModalPenalty, setShowModalPenalty] = useState(false);
    const [, setStatusUpdate] = useState("");
    const [, setTypeUpdate] = useState("");
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const disabled = yaGenerado || feedback === "loading" || feedback === "success";

    const { mutate } = useSWR<ICheckInFeedback[]>(
        "/api/eventos",
        fetcher,
        {
            fallbackData: eventos,
        }
    );

    useEffect(() => {
        setDateInitValue(dateInit ?? "");
        setDateEndValue(dateEnd ?? "");
    }, [dateInit, dateEnd]);


    useEffect(() => {
        setFeedback(null);
        setFeedbackMsg("");
    }, [searchParamsString]);

    //Helpers
    const capitalize = (text?: string) => {
        if (!text) return "";

        return text
            .toLowerCase()
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    };

    const getEmployeeName = (e: IAbsence) => {
        return e.employee
            ? `${capitalize(e.employee.lastName)} ${capitalize(e.employee.name)}`
            : `${e.idEmployee}`;
    };


    const renderCell = (row: IAbsence, column: TableTemplateColumn<IAbsence>) => {
        if (column.render) {
            return column.render(row);
        }

        if (column.accessor) {
            return String(column.accessor(row) ?? "-");
        }

        return String(row[column.key as keyof IAbsence] ?? "-");
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

        router.push(`/app/absences?${params.toString()}`);
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
            router.push(`/app/absences?${params.toString()}`);
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
        router.push(`/app/absences?${params.toString()}`);
    }, [dateInitValue, dateEndValue, dateInit, dateEnd, searchParamsString, limit, router, clearSelectedIds]);

    const handleTypeFilter = useCallback((value: string) => {
        setFeedback("loading");
        setFeedbackMsg("Filtrando...");


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

        clearSelectedIds();
        router.push(`/app/absences?${params.toString()}`);
    }, [searchParamsString, limit, router, clearSelectedIds]);

    const handleClear = useCallback(() => {
        setFeedback("loading");
        setFeedbackMsg("Cargando...")
        setDateError("")
        router.push("/app/absences");
    }, [router]);

    const handleRangeChange = (dates: [Date | null, Date | null]) => {
        const [start, end] = dates;
        setDateInitValue(start ? moment(start).format("YYYY-MM-DD") : "");
        setDateEndValue(end ? moment(end).format("YYYY-MM-DD") : "");
        if (start && end) setShowCalendar(true);
    };

    const rangeLabel =
        parsedStart && parsedEnd
            ? `${moment(parsedStart).format("DD/MM/YYYY")} - ${moment(parsedEnd).format("DD/MM/YYYY")}`
            : "Selecciona un rango de fechas";

    const actionCreatePenalty = () => {
        const selectedRows = (absence ?? []).filter((row) =>
            selectedIds.includes(String(row.id))
        );

        const hasAsistencia = selectedRows.some((row) => row.type === "asistencia");
        const ambos = selectedRows.every((row) => row.type === "retardo" || "falta");
        const sameEmployee = selectedRows.every((row) => row.idEmployee === selectedRows[0].idEmployee)


        if (hasAsistencia) {
            return modalError("Para generar una penalización debes seleccionar únicamente FALTAS");
        }

        if (ambos && !sameEmployee) {
            return modalError("La selección de faltas debe pertenecer al mismo empleado")
        }

        if (ambos && sameEmployee) {
            setShowModalPenalty(true);
        }

    };

    const handleToggleSelect = (row: IAbsence) => {
        const rowId = String(row.id);
        const isSelected = selectedIds.includes(rowId);

        // Deseleccionar siempre se permite, sin validar nada
        if (isSelected) {
            setSelectedIds((prev) => prev.filter((id) => id !== rowId));
            return;
        }

        const selectedRows = (absence ?? []).filter((r) =>
            selectedIds.includes(String(r.id))
        );

        const sameEmployee = selectedRows.every(
            (r) => r.employee?.id === row.employee?.id
        );

        if (!sameEmployee) {
            modalError("Solo puedes seleccionar registros del mismo empleado");
            return;
        }

        setSelectedIds((prev) => [...prev, rowId]);
    };

    const handleGenerateFaults = () => {
        modalConfirm("¿Seguro que desea generar las faltas del día?", async () => {
            try {
                setFeedback("loading");
                setFeedbackMsg("Generando registros...");

                const res = await generateFault();

                if (!res.success) {
                    setFeedbackMsg(res.message || "No se pudieron generar las faltas");
                    setFeedback("error");
                    return;
                }

                setFeedbackMsg(res.message || "Faltas generadas correctamente");
                setFeedback("success");

                mutate();
                setStatusUpdate("");
                setTypeUpdate("");
                clearSelectedIds();
                router.refresh();
            } catch {
                setFeedbackMsg("Error inesperado, intenta de nuevo");
                setFeedback("error");
                setStatusUpdate("");
                setTypeUpdate("");
                clearSelectedIds();
            }
        });
    };


    //Desgloce de la tabla
    const columns: TableTemplateColumn<IAbsence>[] = [
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
            key: "department",
            label: "Departamento",
            accessor: (e) => e.department.nameDepartment,
            filterable: true,
            type: "string",
            render: (e) =>
                <div className="text-uppercase">
                    {e.department.nameDepartment || "-"}
                </div>
        },
        {
            key: "position",
            label: "Puesto",
            accessor: (e) => e.position.namePosition,
            filterable: true,
            type: "string",
            render: (e) =>
                <div className="text-uppercase">
                    {e.position.namePosition || "-"}
                </div>
        },
        {
            key: "type",
            label: "Tipo",
            align: "center",
            accessor: (e) => e.type,
            filterable: true,
            type: "string",
            render: (e) => <div className="text-center"> {statusVariant(e.type, e.category)} </div>,
        },
        {
            key: "dateOfAbsence",
            label: "Fecha del registro",
            align: "center",
            accessor: (e) => e.dateOfAbsence,
            filterable: true,
            type: "string",
            render: (e) => (
                <div className="text-uppercase text-center">
                    {formatDateMx(e.dateOfAbsence) || "-"}
                </div>
            )
        }
    ];

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

            <Container className="py-3 " style={{ maxWidth: "1600px" }}>

                <ConditionalRender cond={!isLeader}>
                    <Button
                        variant="primary"
                        className="d-inline-flex align-items-center gap-2 fw-semibold px-3"
                        onClick={actionCreatePenalty}
                        disabled={selectedIds.length === 0}
                    >
                        <i className="bi bi-plus-lg" />
                        Crear Penalización
                    </Button>

                    <Button
                        variant="warning"
                        className="d-inline-flex align-items-center gap-2 fw-semibold px-3 ms-2"
                        onClick={handleGenerateFaults}
                        disabled={disabled}
                    >
                        <i className="bi bi-person-x" />
                        Generar faltas
                    </Button>

                    <Button
                        variant="black"
                        className="border-light text-light bg-black d-inline-flex align-items-center gap-2 fw-semibold px-3 ms-2"
                        onClick={() => setShowGenerateModal(true)}
                    >
                        <i className="bi bi-file-earmark-excel" />
                        Generar Excel
                    </Button>
                </ConditionalRender>

                <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
                    <div>
                        <h1 className="mb-0">Faltas y Asistencias</h1>

                        <span className="text-muted">
                            {total} registro{total !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                <Row className="justify-content-center">
                    <Col xs={12} xl={12} xxl={12}>
                        <Card className="rounded-4 shadow-sm">
                            <Card.Body className="p-4 p-md-5">
                                <div className="mb-4">
                                    <Row className="mb-4 g-3 align-items-between">
                                        {/* Filtrar por empleado */}
                                        <Col xs={12} md={4} lg={4}>
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

                                        {/* Filtrar por fechas */}
                                        <Col xs={12} md={4} lg={4}>
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

                                        {/* Filtrar por tipo */}
                                        <Col xs={12} md={4} lg={4}>
                                            <Card className="rounded-4 border h-100">
                                                <Card.Body className="p-3">
                                                    <div className="d-flex align-items-center gap-2 mb-3">
                                                        <i className="bi bi-tag text-primary" />
                                                        <span className="fw-semibold small">Filtrar por tipo</span>
                                                    </div>

                                                    <Dropdown className="w-100">
                                                        <Dropdown.Toggle
                                                            id="absences-filter-1"
                                                            as={Button}
                                                            variant="outline-secondary"
                                                            className="w-100 d-flex align-items-center justify-content-between text-uppercase"
                                                        >
                                                            {currentType === "asistencia" ? "Asistencia" : currentType === "falta" ? "Falta" : currentType === "retardo" ? "Retardo" : "Todos"}
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu className="w-100">
                                                            <Dropdown.Item
                                                                active={currentType === ""}
                                                                onClick={() => handleTypeFilter("")}
                                                            >
                                                                TODOS
                                                            </Dropdown.Item>
                                                            <Dropdown.Item
                                                                active={currentType === "asistencia"}
                                                                onClick={() => handleTypeFilter("asistencia")}
                                                            >
                                                                ASISTENCIA
                                                            </Dropdown.Item>
                                                            <Dropdown.Item
                                                                active={currentType === "falta"}
                                                                onClick={() => handleTypeFilter("falta")}
                                                            >
                                                                FALTA
                                                            </Dropdown.Item>
                                                            <Dropdown.Item
                                                                active={currentType === "falta_por_penalizacion"}
                                                                onClick={() => handleTypeFilter("falta_por_penalizacion")}
                                                            >
                                                                FALTA POR PENALIZACIÓN
                                                            </Dropdown.Item>
                                                            <Dropdown.Item
                                                                active={currentType === "retardo"}
                                                                onClick={() => handleTypeFilter("retardo")}
                                                            >
                                                                RETARDO
                                                            </Dropdown.Item>
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
                                                        <th className="text-center fw-bold">
                                                            Acciones
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {(absence ?? []).map((row) => {
                                                        const isSelected = selectedIds.includes(String(row.id));

                                                        return (
                                                            <tr key={row.id} className={isSelected ? "table-secondary table-row-selected" : ""}>
                                                                {columns.map((column) => (
                                                                    <td
                                                                        key={String(column.key)}>
                                                                        {renderCell(row, column)}
                                                                    </td>
                                                                ))}
                                                                <td className="align-middle">
                                                                    <div className="d-flex justify-content-center align-items-center gap-2">

                                                                        <ConditionalRender cond={!isLeader}>
                                                                            <button
                                                                                className={isSelected ? "btn btn-info btn-sm" : "btn btn-sm btn-outline-info"}
                                                                                onClick={() => handleToggleSelect(row)}
                                                                            >
                                                                                {isSelected ? "Seleccionado" : "Seleccionar"}
                                                                            </button>
                                                                        </ConditionalRender>

                                                                        <a
                                                                            href={`/app/absences?view_type=form&id=${row.id}`} className="btn btn-sm btn-outline-info"
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                        >
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
                </Row >

                <ConditionalRender cond={showModalPenalty}>
                    <ModalBlur onClose={() => setShowModalPenalty(false)}>
                        <CreatePenaltyComponent
                            show={showModalPenalty}
                            onHide={() => setShowModalPenalty(false)}
                            absence={(absence ?? []).filter((row) =>
                                selectedIds.includes(String(row.id))
                            )}
                        />
                    </ModalBlur>
                </ConditionalRender>

                <ConditionalRender cond={showGenerateModal}>
                    <ModalBlur onClose={() => setShowGenerateModal(false)}>
                        <GenerateModal
                            show={showGenerateModal}
                            onHide={() => { setShowGenerateModal(false); }}
                            dateInit={dateInit}
                            dateEnd={dateEnd}
                        />
                    </ModalBlur>
                </ConditionalRender>
            </Container >
        </>
    )
}


