"use client"

import { ActionResponse, Employee, ICheckInFeedback } from "@/lib/definitions";
import { User } from "@/lib/definitions";
import { TableTemplateColumn } from "../templates/TableTemplate";
import { format } from "date-fns";
import { Button, Card, Col, Container, Dropdown, InputGroup, Overlay, Pagination, Row } from "react-bootstrap";
import ListView from "../templates/ListView";
import GenericSearchInput from "../employee/GenericSearchInput";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useModals } from "@/context/ModalContext";
import { useForm } from "react-hook-form";
import DatePicker, { registerLocale } from "react-datepicker";
import moment from "moment-timezone";
import ModalBlur from "../ModalBlur";
import FormUpdateEvent from "./EventUpdate";
import { deleteRegristrosChecador, updateRegristrosChecador } from "@/app/actions/eventos-actions";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import { formatCreatedAtOnlyHours, formatDateMx } from "@/lib/helpers";
import { es } from "date-fns/locale";
import EventsTabs from "./EventsTabs";

registerLocale("es", es);

type FeedbackState = "loading" | "success" | "error" | null;

type TSearchInputs = {
    date: string | null;
    idEmployee: number | null;
    idUser: number | null;
};

function statusVariant(type: string) {
    switch ((type ?? "").toLowerCase()) {
        case "entrada_oficina":
            return (
                <span className="badge rounded-pill px2 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle">
                    <i className="bi bi-box-arrow-in-right text-success me-2" />
                    Entrada Oficina
                </span>
            )

        case "salida_oficina":
            return (
                <span className="badge rounded-pill px2 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                    <i className="bi bi-box-arrow-right text-danger me-2" />
                    Salida Oficina
                </span>
            )

        case "sale_a_comer":
            return (
                <span className="badge rounded-pill px2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    <i className="bi bi-cup-hot text-warning me-2" />
                    Sale a Comer
                </span>
            )
        case "regresa_de_comer":
            return (
                <span className="badge rounded-pill px2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    <i className="bi bi-cup-straw text-warning me-2" />
                    Regresa de Comer
                </span>
            )
        case "entrada_sabado":
            return (
                <span className="badge rounded-pill px2 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle">
                    <i className="bi bi-box-arrow-in-right text-success me-2" />
                    Entrada Sabatina
                </span>
            )
        case "salida_sabado":
            return (
                <span className="badge rounded-pill px2 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                    <i className="bi bi-box-arrow-right text-danger me-2" />
                    Salida Sabatina
                </span>
            )
        default:
            return (
                <span className="badge rounded-pill px2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    <i className="bi bi-question text-danger me-2" style={{ fontSize: "1rem" }} />
                    Desconocido
                </span>
            )
    }
}

export default function EvenstsTableClient({
    total,
    page,
    limit,
    search = "",
    events,
    users,
    pendingTab = null,
}: {
    total: number;
    page: number;
    limit: number;
    search?: string;
    events: ICheckInFeedback[];
    users: User[];
    employees: Employee[];
    idUser?: string;
    date?: string;
    pendingTab?: { count: number } | null;
}) {

    const {
        watch,
        setValue,
        formState: { isSubmitting },
    } = useForm<TSearchInputs>({
        defaultValues: {
            date: null,
            idEmployee: null,
            idUser: null,
        },
    });


    //CONST 
    const router = useRouter();
    const sp = useSearchParams();
    const searchParamsString = sp.toString();
    const currentSearch = sp.get("search") ?? "";
    const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);
    const { modalError, modalConfirm } = useModals();
    const dateButtonRef = useRef<HTMLButtonElement>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const selectedDate = watch("date");
    const parsedDate = selectedDate
        ? moment.tz(selectedDate, "America/Mexico_City").toDate()
        : null;
    const currentIdUser = sp.get("idUser") ?? "";
    const checadores = users.filter((p) => p.role === "CHECADOR")
    const [, setDateError] = useState("");
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [eventosList, setEventosList] = useState<ICheckInFeedback[]>(events);
    const [statusUpdate, setStatusUpdate] = useState("");
    const [dateModify, setDateModify] = useState("");
    const [typeUpdate, setTypeUpdate] = useState("");
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
    
    //HELPERS

    useEffect(() => {
        setFeedback(null);
        setFeedbackMsg("");
    }, [searchParamsString]);

    const dateLabel = parsedDate
        ? format(parsedDate, "dd/MM/yyyy")
        : "Selecciona una fecha";

    const handleDateChange = (date: Date | null) => {
        setValue("date", date ? moment.utc(date).format("YYYY-MM-DD") : "", { shouldDirty: true });
    };

    const handleClear = useCallback(() => {
        setFeedback("loading");
        setFeedbackMsg("Cargando...");
        setDateError("")
        router.push("/app/eventos");
    }, [router]);

    const goToPage = (nextPage: number) => {
        setFeedback("loading");
        setFeedbackMsg("Cargando...");
        const params = new URLSearchParams(searchParamsString);
        params.set("id", "null");
        params.set("view_type", "list");
        params.set("page", String(nextPage));
        params.set("limit", String(limit));

        if (currentSearch.trim()) {
            params.set("search", currentSearch.trim());
        } else {
            params.delete("search");
        }

        router.push(`/app/eventos?${params.toString()}`);
    };
    const clearSelectedIds = useCallback(() => {
        setSelectedIds([]);
    }, []);

    //Filtro de empleado
    const handleSearch = useCallback(
        (value: string) => {
            const cleanValue = value.trim();

            if (cleanValue === currentSearch.trim()) return;

            setFeedback("loading");
            setFeedbackMsg("Buscando...");

            const params = new URLSearchParams(searchParamsString);
            params.set("id", "null");
            params.set("view_type", "list");
            params.set("page", "1");
            params.set("limit", String(limit));

            if (cleanValue) {
                params.set("search", cleanValue);
            } else {
                params.delete("search");
            }

            clearSelectedIds();
            router.push(`/app/eventos?${params.toString()}`);
        },
        [currentSearch, searchParamsString, limit, router, clearSelectedIds]
    );

    const handleToggleSelect = (row: ICheckInFeedback) => {
        setStatusUpdate(row.checks.status!)
        setTypeUpdate(row.checks.type)
        setDateModify(row.checks.timestamp)

        const rowId = String(row.checks.id);
        const isSelected = selectedIds.includes(rowId);

        // Si ya está seleccionada, la deselecciona (toggle off)
        if (isSelected) {
            setSelectedIds([]);
            return;
        }

        // Si no está seleccionada, reemplaza cualquier selección previa por esta sola
        setSelectedIds([rowId]);
    };

    const getSechedule = (type: string, schedules: Employee) => {
        let string: string = "";

        switch (type) {
            case "entrada_oficina":
                string = `${schedules.scheduleOffice?.entry || " "} - ${schedules.scheduleOffice?.exit || " "
                    }`;
                break;
            case "salida_oficina":
                string = `${schedules.scheduleOffice?.entry || " "} - ${schedules.scheduleOffice?.exit || " "
                    }`;
                break;
            case "sale_a_comer":
                string = `${schedules.scheduleLunch?.entry || " "} - ${schedules.scheduleLunch?.exit || " "
                    }`;
                break;
            case "regresa_de_comer":
                string = `${schedules.scheduleLunch?.entry || " "} - ${schedules.scheduleLunch?.exit || " "
                    }`;
                break;
            case "entrada_sabado":
                string = `${schedules.scheduleSaturday?.entry || " "} - ${schedules.scheduleSaturday?.exit
                    }`;
                break;
            case "salida_sabado":
                string = `${schedules.scheduleSaturday?.entry || " "} - ${schedules.scheduleSaturday?.exit
                    }`;
                break;
            default:
                string = "sin definir";
                break;
        }

        return string;
    };

    const selectedUserName = useMemo(() => {
        if (!currentIdUser) return "Checadores";
        const found = checadores.find((u) => String(u.id) === currentIdUser);
        return found ? `${found.name} ${found.lastName}` : "Checadores";
    }, [currentIdUser, checadores]);

    const handleUserFilter = useCallback((value: string) => {
        setFeedback("loading");
        setFeedbackMsg("Filtrando...");

        const params = new URLSearchParams(searchParamsString);
        params.delete("id");
        params.set("view_type", "list");
        params.set("page", "1");
        params.set("limit", String(limit));

        if (value && value.trim() !== "") {
            params.set("idUser", value.trim());
        } else {
            params.delete("idUser");
        }

        clearSelectedIds();
        router.push(`/app/eventos?${params.toString()}`);
    }, [searchParamsString, limit, router, clearSelectedIds]);

    //Filtro por fecha
    const handleDateFilter = useCallback(() => {
        setFeedback("loading");
        setFeedbackMsg("Filtrando...");

        const params = new URLSearchParams(searchParamsString);
        params.delete("id");
        params.set("view_type", "list");
        params.set("page", "1");
        params.set("limit", String(limit));

        const value = watch("date");
        if (value) {
            params.set("date", value);
        } else {
            params.delete("date");
        }

        clearSelectedIds();
        router.push(`/app/eventos?${params.toString()}`);
    }, [searchParamsString, limit, router, clearSelectedIds, watch]);

    useEffect(() => {
        setEventosList(events ?? []);
    }, [events]);

    //TABLA
    const columns: TableTemplateColumn<ICheckInFeedback>[] = [
        {
            key: "employee",
            label: "Empleado",
            accessor: (row) =>
                `${row.employee.lastName?.toUpperCase()} ${row.employee.name?.toUpperCase()}`,
            filterable: true,
            render: (row) => (
                <div className="text-uppercase text-left">
                    {row.employee.lastName} {row.employee.name}
                </div>
            ),
        },
        {
            key: "type",
            label: "Evento",
            filterable: true,
            accessor: (row) => row.checks.type.replace(/_/g, " ").toUpperCase(),
            render: (row) => (
                <div className="text-uppercase text-left">
                    {statusVariant(row.checks.type)}
                </div>
            ),
        },
        {
            key: "timestamp",
            label: "Fecha",
            accessor: (row) => row.checks.timestamp,
            filterable: false,
            render: (row) => (
                <div className="text-uppercase text-left">
                    {formatDateMx(row.checks.timestamp)}
                </div>
            ),
            type: "date",
            groupFormat: "dd/MM/yyyy",
        },
        {
            key: "hourDate",
            label: "Hora",
            accessor: (row) => row.checks.timestamp,
            filterable: false,
            render: (row) => (
                <div className="text-uppercase text-left">
                    {formatCreatedAtOnlyHours(row.checks.timestamp)}
                </div>
            ),
        },
        {
            key: "differences",
            label: "Diferencia",
            accessor: (row) => row.checks.minutesDifference,
            render: (row) => (
                <div className="text-uppercase text-left">
                    <div className="text-end" style={{ width: "50%" }}>
                        {row.checks.minutesDifference}
                    </div>
                </div>
            ),
        },
        {
            key: "schedule",
            label: "Horario",
            accessor: (row) => row.employee.scheduleDescription,
            render: (row) => (
                <div className="text-uppercase text-left">
                    {getSechedule(row.checks.type, row.employee)}
                </div>
            ),
        },
        {
            key: "status",
            label: "Estatus",
            align: "center",
            accessor: (row) =>
                row.checks.status
                    ? row.checks.status.replace(/_/g, " ").toUpperCase()
                    : null,
            render: (row) => {
                const status = row.checks.status?.toLowerCase();

                const bgClass =
                    status === "desconocido"
                        ? "badge rounded-pill px-2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                        : status === "retardo"
                            ? "badge rounded-pill px-2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                            : status === "hora_comida_antes"
                                ? "badge rounded-pill px-2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                                : status === "regreso_comida_tardia"
                                    ? "badge rounded-pill px-2 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle"
                                    : status === "ausencia"
                                        ? "badge rounded-pill px-2 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle"
                                        : "badge rounded-pill px2 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle";

                return (
                    <div className="text-center">
                        <span className={`text-uppercase ${bgClass}`}>
                            {status?.replace(/_/g, " ").toUpperCase()}
                        </span>
                    </div>
                );
            },
        },
        {
            key: "user",
            label: "Checador",
            accessor: (row) => `${row.user.name} ${row.user.lastName}`,
            render: (row) => (
                <div className="text-uppercase text-left">{`${row.user.name} ${row.user.lastName}`}</div>
            ),
        },
        {
            key: "position",
            label: "Puesto",
            accessor: (row) => row.positionEmployee.namePosition,
            render: (row) => (
                <div className="text-uppercase text-left">
                    {row.positionEmployee.namePosition}
                </div>
            ),
            filterable: true,
        },
        {
            key: "branch",
            label: "Sucursal",
            accessor: (row) => row.branchEmployee.name,
            filterable: true,
            render: (row) => (
                <div className="text-uppercase text-left">{row.branchEmployee.name}</div>
            ),
        },
    ];

    const onSubmitData = async (
        type: string,
        status: string,
        dateHour: string,
        minutesDifference: string
    ): Promise<ActionResponse<boolean>> => {
        const idSel = Number(selectedIds[0]);
        const registro = eventosList.find((even) => even.checks.id === idSel);

        const idRegistro = registro?.id || null;
        const idCheck = registro?.checks.id || null;

        const res = await updateRegristrosChecador({
            idCheck,
            idRegistro,
            status,
            type,
            dateHour,
            minutesDifference: Number(minutesDifference),
        });

        if (!res.success) {
            modalError(res.message);
            return res;
        }

        const changedList = eventosList.map((evento) => {
            if (evento.checks.id === idCheck && evento.id === idRegistro) {
                return {
                    ...evento,
                    checks: {
                        ...evento.checks,
                        type,
                        status,
                        timestamp: moment(dateHour, "YYYY-MM-DDTHH:mm").utc().format(),
                        minutesDifference: Number(minutesDifference)
                    },
                };
            }
            return evento;
        });

        setEventosList(changedList);
        clearSelectedIds();

        return res;
    };

    const modalDelete = async () => {
        if (selectedIds.length === 0)
            return modalError("No hay registros seleccionados");

        if (selectedIds.length > 1)
            return modalError("Sólo eliminar un registro a la vez");

        const idSel = Number(selectedIds[0]);
        const registro = eventosList.find((even) => even.checks.id === idSel);

        if (!registro) return modalError("No se encontró el registro seleccionado");

        modalConfirm("¿Seguro que desea eliminar este registro?", async () => {
            try {
                setFeedback("loading");
                setFeedbackMsg("Eliminando Registro...");

                const res = await deleteRegristrosChecador({
                    idRegistro: registro.id,
                    idCheck: registro.checks.id,
                });

                if (!res.success) {
                    setFeedbackMsg(res.message || "No se pudo eliminar");
                    setFeedback("error");
                    return;
                }

                // Quita el registro eliminado del estado local, para reflejo inmediato
                setEventosList((prev) =>
                    prev.filter((evento) => evento.checks.id !== registro.checks.id)
                );

                setFeedbackMsg(res.message || "Eliminado correctamente");
                setFeedback("success");
                clearSelectedIds();
                router.refresh();
            } catch {
                setFeedbackMsg("Error inesperado, intenta de nuevo");
                setFeedback("error");
            }
        });
    };

    return (
        <>
            <ConditionalRender cond={feedback === "loading" || isSubmitting}>
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

                <ConditionalRender cond={!!pendingTab}>
                    <EventsTabs
                        active="registros"
                        pendingCount={pendingTab?.count ?? 0}
                        onNavigate={(url) => {
                            setFeedback("loading");
                            setFeedbackMsg("Cargando...");
                            router.push(url);
                        }}
                    />
                </ConditionalRender>

                {/* <ConditionalRender cond={!isLeader}> */}
                <Button
                    variant="primary"
                    className="d-inline-flex align-items-center gap-2 fw-semibold px-3"
                    onClick={() => setShowUpdateModal(true)}
                    disabled={selectedIds.length === 0}
                >
                    <i className="bi bi-pencil me-2" />
                    Modificar Registro
                </Button>

                <Button
                    variant="danger"
                    className="d-inline-flex align-items-center gap-2 fw-semibold px-3 ms-2"
                    onClick={modalDelete}
                    disabled={selectedIds.length === 0}
                >
                    <i className="bi bi-trash" />
                    Eliminar Registro
                </Button>
                {/* </ConditionalRender> */}

                <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
                    <div>
                        <h1 className="mb-0">Eventos del checador</h1>

                        <span className="text-muted">
                            {total} usuario{total !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                <Row className="justify-content-center" style={{ height: "100%" }}>
                    <Col xs={12} sm={12} md={12} lg={12} xl={12} xxl={12}>
                        <Card className="rounded-4 shadow-sm border">
                            <Card.Body className="p-4 p-md-5">
                                <Row className="justify-content-center mb-3 g-3">
                                    {/* FILTRO POR EMPLEADO */}
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

                                    {/* FILTRO POR FECHA */}
                                    <Col xs={12} md={4} lg={4}>
                                        <Card className="border rounded-4 h-100">
                                            <Card.Body className="p-3">
                                                <div className="d-flex align-items-center gap-2 mb-3">
                                                    <i className="bi bi-calendar3 text-primary" />
                                                    <span className="fw-semibold small">Filtrar por fecha</span>
                                                </div>

                                                <Button
                                                    ref={dateButtonRef}
                                                    variant="outline-secondary"
                                                    className="w-100 d-flex align-items-center justify-content-between"
                                                    onClick={() => setShowCalendar((s) => !s)}
                                                    type="button"
                                                >
                                                    <span className="text-truncate">{dateLabel}</span>
                                                    <i className="bi bi-calendar3 flex-shrink-0" />
                                                </Button>

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
                                                                inline
                                                                selected={parsedDate}
                                                                onChange={handleDateChange}
                                                                locale="es"
                                                            />
                                                            <Row className="g-2 m-2">
                                                                <Col xs={6}>
                                                                    <Button
                                                                        variant="primary"
                                                                        className="w-100"
                                                                        onClick={() => {
                                                                            handleDateFilter();
                                                                            setShowCalendar(false);
                                                                        }}
                                                                    >
                                                                        Aplicar
                                                                    </Button>
                                                                </Col>
                                                                <Col xs={6}>
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

                                    {/* FILTRO POR CHECADOR */}
                                    <Col xs={12} md={4} lg={4} style={{ minWidth: 0 }}>
                                        <Card className="rounded-4 border h-100">
                                            <Card.Body className="p-3">
                                                <div className="d-flex align-items-center gap-2 mb-3">
                                                    <i className="bi bi-person-badge text-primary" />
                                                    <span className="fw-semibold small">Filtrar por checador</span>
                                                </div>

                                                <Dropdown className="w-100">
                                                    <Dropdown.Toggle
                                                        id="events-filter-1"
                                                        as={Button}
                                                        variant="outline-secondary"
                                                        className="w-100 d-flex align-items-center justify-content-between text-uppercase"
                                                        style={{ minWidth: 0 }}
                                                    >
                                                        <span className="text-truncate">{selectedUserName}</span>
                                                    </Dropdown.Toggle>

                                                    <Dropdown.Menu className="w-100">
                                                        <Dropdown.Item
                                                            active={!currentIdUser}
                                                            onClick={() => handleUserFilter("")}
                                                        >
                                                            <span className="text-uppercase text-muted">TODOS</span>
                                                        </Dropdown.Item>

                                                        {checadores.map((u) => (
                                                            <Dropdown.Item
                                                                key={u.id}
                                                                active={String(u.id) === currentIdUser}
                                                                onClick={() => handleUserFilter(String(u.id))}
                                                            >
                                                                <span className="text-uppercase">{u.name} {u.lastName}</span>
                                                            </Dropdown.Item>
                                                        ))}
                                                    </Dropdown.Menu>
                                                </Dropdown>
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
                                                        <th className="text-center fw-bold">
                                                            Acciones
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {(eventosList ?? []).map((row) => {
                                                        const rowId = row.checks.id;
                                                        const isSelected = selectedIds.includes(String(rowId));

                                                        return (
                                                            <tr key={rowId} className={isSelected ? "table-secondary table-row-selected" : ""}>
                                                                {columns.map((column) => (
                                                                    <td key={String(column.key)}>
                                                                        {column.render
                                                                            ? column.render(row)
                                                                            : String(column.accessor(row) ?? "-")}
                                                                    </td>
                                                                ))}
                                                                <td className="align-middle">
                                                                    <div className="d-flex justify-content-center align-items-center gap-2">

                                                                        <button
                                                                            className={isSelected ? "btn btn-info btn-sm" : "btn btn-sm btn-outline-info"}
                                                                            onClick={() => handleToggleSelect(row)}
                                                                        >
                                                                            {isSelected ? "Seleccionado" : "Seleccionar"}
                                                                        </button>

                                                                        <a
                                                                            href={`/app/employee?view_type=form&id=${row.employee.id}`} className="btn btn-sm btn-outline-info"
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
                </Row>

                <ConditionalRender cond={showUpdateModal}>
                    <ModalBlur onClose={() => setShowUpdateModal(false)}>
                        <FormUpdateEvent
                            show={showUpdateModal}
                            onHide={() => {
                                clearSelectedIds()
                                setShowUpdateModal(false)
                            }}
                            date={dateModify}
                            sendData={onSubmitData}
                            status={statusUpdate}
                            type={typeUpdate}
                        />
                    </ModalBlur>
                </ConditionalRender>
            </Container>
        </>
    );
}