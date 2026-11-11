"use client"

import { IPrePayroll, IUpdatePrepayroll } from "@/lib/prePayroll/interface";
import { TableTemplateColumn } from "../templates/TableTemplate";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { formatCreatedAt } from "@/lib/helpers";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import { Button, Card, Col, Container, Dropdown, InputGroup, Pagination, Row } from "react-bootstrap";
import ListView from "../templates/ListView";
import { useRouter, useSearchParams } from "next/navigation";
import GenericSearchInput from "../employee/GenericSearchInput";
import { IPeriod } from "../attendanceReportComponents/AttendanceFiltersBar";
import ModalBlur from "../ModalBlur";
import UpdateModal from "./UpdateModal";
import { useModals } from "@/context/ModalContext";
import { completePrepayroll, downloadDocumentPrenom, downloadNomipaqPrenom, generateDocumentPrenom } from "@/app/actions/prePayroll-actions";
import OverLay from "../templates/OverLay";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import { es } from "date-fns/locale";
import { registerLocale } from "react-datepicker";
import { formatLabel } from "../devices/DevicesTableClient";

registerLocale("es", es);

type FeedbackState = "loading" | "success" | "error" | null;

type UpdatePayload = Pick<IPrePayroll, "idPeriod" | "idUnique" | "fechaNomina">;

interface IDataExtra {
    complete: boolean;
    document: {
        id: number;
        whoUploadId: number;
        urlDocument: string;
        createdAt: string;
        updatedAt: string;
    }
}

function viewType(refUrl?: string) {
    switch (refUrl) {
        case "falta_por_penalizacion":
            return "penalties";
        case "retardo":
            return "absences";
        case "falta":
            return "absences";
        case "VACACIONES":
            return "vacationList"
        case "PERMISOS":
            return "permissions";
        case "HORAS_EXTRAS":
            return "overtime";
        case "INCAPACIDAD":
            return "inability";
    }
}


function statusVariant(incidenceRef?: string | null, category?: string | null) {
    switch ((incidenceRef ?? "")) {
        case "falta":
            if (category && category === "justificada") {
                return (
                    <span className="badge rounded-pill px-2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                        FALTA JUSTIFICADA
                    </span>
                )
            } else if (category && category === "injustificada") {
                return (
                    <span className="badge rounded-pill px-2 py-2 fw-semibold bg-purple-subtle text-purple-emphasis border border-purple-subtle">
                        FALTA INJUSTIFICADA
                    </span>
                )
            }
        case "retardo":
            return (
                <span className="badge rounded-pill px-2 py-2 fw-semibold bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle">
                    RETARDO
                </span>
            )
        case "HORAS_EXTRAS":
            return (
                <span className="badge rounded-pill px-2 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                    HORAS EXTRAS
                </span>
            )
        case "INCAPACIDAD":
            return (
                <span className="badge rounded-pill px-2 py-2 fw-semibold bg-orange-subtle text-orange-emphasis border border-orange-subtle">
                    INCAPACIDAD
                </span>
            )
        case "VACACIONES":
            return (
                <span className="badge rounded-pill px-2 py-2 fw-semibold bg-pink-subtle text-pink-emphasis border border-pink-subtle">
                    VACACIONES
                </span>
            )
        case "PERMISOS":
            return (
                <span className="badge rounded-pill px-2 py-2 fw-semibold bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                    PERMISOS
                </span>
            )
        case "falta_por_penalizacion":
            return (
                <span className="badge rounded-pill px-2 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                    PENALIZACIÓN
                </span>
            )
    }
}

export default function PrePayrollTableClient({
    total,
    page,
    limit,
    search = "",
    prepayroll,
    periods,
    periodoActual,
    prepayrollextra,
}: {
    total: number;
    page: number;
    limit: number;
    search?: string;
    prepayroll: IPrePayroll[];
    periods: IPeriod[];
    periodoActual: IPeriod | null;
    prepayrollextra: IDataExtra;
}) {
    //CONST
    const router = useRouter();
    const sp = useSearchParams();
    const searchParamsString = sp.toString();


    const isClearingSelectionRef = useRef(false);
    const [, setTableResetKey] = useState(0);
    const { modalConfirm } = useModals();
    const [selectedRow, setSelectedRow] = useState<UpdatePayload | null>(null);
    const [, setSelectedIds] = useState<Array<string | number>>([]);
    const tableRef = useRef<{ clearSelection: () => void } | null>(null);
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const currentSearch = sp.get("search") ?? "";
    const currentPeriod = sp.get("idPeriod") ?? "";
    const currentType = sp.get("type") ?? "";
    const currentYear = sp.get("year") ?? "";
    const [showModalUpdate, setShowModalUpdate] = useState(false);
    const hasAppliedDefaultFilters = useRef(false);
    const [isPending, startTransition] = useTransition();
    const dates = prepayroll.map((f) => f.fechaNomina);
    const datesComplete = dates.every((n) => n !== null);
    const [docBase64Url, setDocBase64Url] = useState<string | null>(null);
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

    const documentAlreadyGenerated = !!prepayrollextra?.document?.urlDocument;

    const typeOptions = [
        { label: "Todos", value: "todos" },
        { label: "Horas extras", value: "horas_extras" },
        { label: "Permisos", value: "permisos" },
        { label: "Retardos", value: "retardos" },
        { label: "Vacaciones", value: "vacaciones" },
        { label: "Incapacidades", value: "incapacidades" },
        { label: "Faltas por penalización", value: "faltas_por_penalizacion" },
        { label: "Faltas injustificadas", value: "faltas_injustificadas" },
        { label: "Faltas justificadas", value: "faltas_justificadas" },
    ];

    const selectedPeriod = useMemo(
        () => periods.find((p) => String(p.id) === currentPeriod),
        [periods, currentPeriod]
    );

    //Para detener el loading
    useEffect(() => {
        setFeedback(null);
        setFeedbackMsg("");
    }, [searchParamsString]);

    useEffect(() => {
        setDocBase64Url(null);
    }, [searchParamsString]);

    //Al montar: si no hay filtros en la URL, usar periodo actual y año en curso
    useEffect(() => {
        if (hasAppliedDefaultFilters.current) return;
        hasAppliedDefaultFilters.current = true;

        if (currentPeriod || currentYear) return;
        if (!periodoActual) return;

        const params = new URLSearchParams(searchParamsString);
        params.set("idPeriod", String(periodoActual.id));
        params.set("year", String(new Date().getFullYear()));
        params.set("view_type", "list");
        params.set("page", "1");
        params.set("limit", String(limit));

        startTransition(() => {
            router.replace(`/app/prePayroll?${params.toString()}`);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const list: number[] = [];
        for (let y = currentYear; y >= 2000; y--) {
            list.push(y);
        }
        return list;
    }, []);

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

        router.push(`/app/prePayroll?${params.toString()}`);
    };

    //Buscar por empleado
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
            router.push(`/app/prePayroll?${params.toString()}`);
        },
        [currentSearch, searchParamsString, limit, router, clearSelectedIds]
    );

    //Buscar por periodo
    const handleSearchPeriod = useCallback(
        (value: string) => {
            if (value === currentPeriod) return;

            setFeedback("loading");
            setFeedbackMsg("Buscando...");

            const params = new URLSearchParams(searchParamsString);
            params.set("id", "null");
            params.set("view_type", "list");
            params.set("page", "1");
            params.set("limit", String(limit));

            if (value) {
                params.set("idPeriod", value);
                params.delete("type");
            } else {
                params.delete("idPeriod");
            }
            clearSelectedIds();
            router.push(`/app/prePayroll?${params.toString()}`);
        },
        [currentPeriod, searchParamsString, limit, router, clearSelectedIds]
    );

    //Buscar por año
    const handleSearchYear = useCallback(
        (value: string) => {

            if (value === currentYear) return;

            setFeedback("loading");
            setFeedbackMsg("Buscando...");

            const params = new URLSearchParams(searchParamsString);
            params.set("id", "null");
            params.set("view_type", "list");
            params.set("page", "1");
            params.set("limit", String(limit));

            if (value) {
                params.set("year", value);
                params.delete("idPeriod")
            } else {
                params.delete("year");
            }
            clearSelectedIds();
            router.push(`/app/prePayroll?${params.toString()}`);
        },
        [currentYear, searchParamsString, limit, router, clearSelectedIds]
    );

    //Filtrar por tipo
    const filterType = useCallback(
        (value: string) => {
            if (value === currentType) return;

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
            clearSelectedIds();
            router.push(`/app/prePayroll?${params.toString()}`);
        },
        [currentType, searchParamsString, limit, router, clearSelectedIds]
    );

    const handleClear = useCallback(() => {
        setFeedback("loading");
        setFeedbackMsg("Cargando...");

        const params = new URLSearchParams(searchParamsString);
        params.set("id", "null");
        params.set("view_type", "list");
        params.set("page", "1");
        params.set("limit", String(limit));
        params.delete("idPeriod");

        clearSelectedIds();
        router.push(`/app/prePayroll?${params.toString()}`);
    }, [searchParamsString, limit, router, clearSelectedIds]);


    //ACTUALIZAR FECHA NOMINA
    const handleUpdate = (row: IUpdatePrepayroll) => {
        setSelectedRow({
            idPeriod: row.idPeriod,
            idUnique: row.idUnique,
            fechaNomina: row.fechaNomina,
        });
        setShowModalUpdate(true);
    };

    //COMPLETAR PRENOMINA 
    const handleComplete = () => {
        modalConfirm("¿Seguro que deseas validar?", async () => {
            try {
                setFeedback("loading")
                setFeedbackMsg("Completando validación...")

                const res = await completePrepayroll(
                    {
                        idPrePayRoll: prepayroll[0].idPrePayRoll,
                        data: {
                            complete: true
                        }
                    }
                );

                if (!res.success) {
                    setFeedbackMsg(res.message || "No se pudieron generar las faltas");
                    setFeedback("error");
                    return;
                }

                setFeedbackMsg(res.message || "Faltas generadas correctamente");
                setFeedback("success");

                router.refresh();
            } catch {
                setFeedbackMsg("Error inesperado, intenta de nuevo");
                setFeedback("error");
            }
        })
    }

    //GENERAR DOCUMENTO
    const handleGetDocument = async () => {
        const idPrePayRoll = prepayroll[0]?.idPrePayRoll;
        if (!idPrePayRoll) return;

        if (docBase64Url) {
            triggerDownload(docBase64Url, idPrePayRoll);
            return;
        }

        setFeedback("loading");
        setFeedbackMsg(documentAlreadyGenerated ? "Obteniendo documento..." : "Generando documento...");

        const res = await generateDocumentPrenom({
            idPrePayRoll
        });

        if (!res.success || !res.data) {
            setFeedbackMsg(res.message || "Error al obtener el documento");
            setFeedback("error");
            return;
        }

        setDocBase64Url(res.data.base64Url);
        setFeedback(null);
        triggerDownload(res.data.base64Url, idPrePayRoll);
    };

    //Descargar DOCUMENTO
    const handleDownloadDocument = async () => {
        const idPrePayRoll = prepayroll[0]?.idPrePayRoll;
        if (!idPrePayRoll) return;

        if (docBase64Url) {
            triggerDownload(docBase64Url, idPrePayRoll);
            return;
        }

        setFeedback("loading");
        setFeedbackMsg(documentAlreadyGenerated ? "Obteniendo documento..." : "Generando documento...");

        const res = await downloadDocumentPrenom({
            idPrePayRoll
        });

        if (!res.success || !res.data) {
            setFeedbackMsg(res.message || "Error al obtener el documento");
            setFeedback("error");
            return;
        }

        setDocBase64Url(res.data.base64Url);
        setFeedback(null);
        triggerDownload(res.data.base64Url, idPrePayRoll);
    };


    //Descargar FORMATO NOMIPAQ (independiente del documento; siempre con los datos actuales, sin caché)
    const handleDownloadNomipaq = async () => {
        const idPrePayRoll = prepayroll[0]?.idPrePayRoll;
        if (!idPrePayRoll || feedback === "loading") return;

        setFeedback("loading");
        setFeedbackMsg("Generando formato Nomipaq...");

        const res = await downloadNomipaqPrenom({
            idPrePayRoll,
            numberPeriod: selectedPeriod?.numberPeriod,
        });

        if (!res.success || !res.data) {
            setFeedbackMsg(res.message || "Error al generar la plantilla de Nomipaq");
            setFeedback("error");
            return;
        }

        const link = document.createElement("a");
        link.href = res.data.base64Url;
        link.download = res.data.fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setFeedback(null);
    };

    const triggerDownload = useCallback((base64Url: string, idPrePayRoll: number) => {
        const link = document.createElement("a");
        link.href = base64Url;
        link.download = `prenomina-${idPrePayRoll}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);


    //Tabla
    const columns: TableTemplateColumn<IPrePayroll>[] = useMemo(
        () => [
            // {
            //     key: "id",
            //     label: "ID",
            //     accessor: (row) => row.idPrePayRoll,
            //     filterable: true,
            //     type: "string",
            //     render: (row) => (
            //         <div className="text-uppercase fw-semibold">
            //             {row.idPrePayRoll}
            //         </div>
            //     ),
            // },
            {
                key: "idEmployee",
                label: "ID Empleado",
                accessor: (row) => row.data.employee.id,
                filterable: true,
                type: "string",
                render: (row) => (
                    <div className="text-uppercase">
                        {row.data.employee.id}
                    </div>
                ),
            },
            {
                key: "employee",
                label: "Nombre Empleado",
                accessor: (row) => `${row.data.employee.lastName} ${row.data.employee.name}`.toUpperCase(),
                filterable: true,
                type: "string",
                render: (row) => (
                    <div className="text-left text-uppercase">
                        {row.data.employee.lastName} {row.data.employee.name}
                    </div>
                ),
            },
            {
                key: "incidence",
                label: "Incidencia",
                accessor: (row) => row.incidenceRef,
                filterable: true,
                type: "string",
                align: "center",
                render: (row) => <div className="text-center">{statusVariant(row.incidenceRef, row.data.category)} </div>
            },
            {
                key: "notes",
                label: "Notas",
                accessor: (row) => row.data.notes,
                filterable: true,
                type: "string",
                render: (row) => (
                    <div className="text-left text-uppercase text-wrap" style={{ maxWidth: "200px" }}>
                        {row.data.notes}
                    </div>
                ),
            },
            {
                key: "dateOfAbsence",
                label: "Fecha Incidente",
                align: "center",
                accessor: (row) => row.fechaIncidencia,
                filterable: true,
                type: "number",
                render: (row) => (
                    <div className="text-left text-center">
                        {formatCreatedAt(row.fechaIncidencia)}
                    </div>
                ),
            },
            {
                key: "fechaNomina",
                label: "Fecha Nómina",
                align: "center",
                accessor: (row) => row.fechaNomina,
                filterable: true,
                type: "string",
                render: (row) => (
                    <div className="text-left text-uppercase text-center">
                        {row.fechaNomina ? (
                            <>
                                <i className="bi bi-calendar-check text-success me-1" />
                                {formatCreatedAt(row.fechaNomina)}
                            </>
                        ) : (
                            <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                                <i className="bi bi-exclamation-triangle me-1" />
                                Falta de completar
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: "claveNomipaq",
                label: "Clave Nomipaq",
                align: "center",
                accessor: (row) => row.claveNomipaq,
                filterable: true,
                type: "string",
                render: (row) => (
                    <div className="text-left text-uppercase text-center">
                        {row.claveNomipaq}
                    </div>
                ),
            },
            {
                key: "duracion",
                label: "Duración",
                align: "center",
                accessor: (row) => row.duracion,
                filterable: true,
                type: "number",
                render: (row) => (
                    <div className="text-center text-uppercase">
                        {row.duracion}
                    </div>
                ),
            },
        ],
        []
    );

    return (
        <>
            <ConditionalRender cond={feedback === "loading" || isPending}>
                <Loading message={feedbackMsg || "Buscando..."} />
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

            <Container className="py-3" style={{ maxWidth: "1600px" }}>

                <ConditionalRender cond={prepayrollextra?.complete === false}>
                    <Button
                        variant="success"
                        className="d-inline-flex align-items-center gap-2 fw-semibold px-3"
                        onClick={handleComplete}
                        disabled={!datesComplete}
                    >
                        <i className="bi bi-check2-circle" />
                        Validar
                    </Button>
                </ConditionalRender>

                <ConditionalRender cond={documentAlreadyGenerated !== true && prepayrollextra?.complete !== false}>
                    <Button
                        variant="primary"
                        className="d-inline-flex align-items-center gap-2 fw-semibold px-3"
                        onClick={handleGetDocument}
                        disabled={!prepayroll[0]?.idPrePayRoll}
                    >
                        <i className="vi bi-check2-circle" />
                        Obtener documento
                    </Button>
                </ConditionalRender>

                <ConditionalRender cond={documentAlreadyGenerated === true}>
                    <Button
                        variant="dark"
                        className="d-inline-flex align-items-center gap-2 fw-semibold px-3"
                        onClick={handleDownloadDocument}
                        disabled={!prepayroll[0]?.idPrePayRoll}
                    >
                        <i className="bi bi-file-earmark-excel" />
                        Descargar documento
                    </Button>
                </ConditionalRender>

                {/* Solo con la prenómina completa; no depende de que el documento ya exista */}
                <ConditionalRender cond={prepayrollextra?.complete === true && !!prepayroll[0]?.idPrePayRoll}>
                    <OverLay string="Plantilla de incidencias por día para importar en Nomipaq">
                        <Button
                            variant="dark"
                            className="d-inline-flex align-items-center gap-2 fw-semibold px-3 ms-2"
                            onClick={handleDownloadNomipaq}
                            disabled={feedback === "loading"}
                        >
                            <i className="bi bi-file-earmark-spreadsheet" />
                            Descargar formato Nomipaq
                        </Button>
                    </OverLay>
                </ConditionalRender>

                <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
                    <div>
                        <h1 className="mb-0">Prenómina</h1>

                        <span className="text-muted">
                            {total} registro{total !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                <Row className="justify-content-center">
                    <Col xs={12} xl={12} xxl={12}>
                        <Card className="rounded-4 shadow-sm border">
                            <Card.Body className="p-4 p-md-5">
                                <div className="mb-4">
                                    <Row className="mb-4 g-3 align-items-between">
                                        {/* Filtrar por empleado */}
                                        <Col xs={12} md={3} lg={3}>
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

                                        {/* Filtrar por año */}
                                        <Col xs={12} md={3} lg={3}>
                                            <Card className="rounded-4 border h-100">
                                                <Card.Body className="p-3">
                                                    <div className="d-flex align-items-center gap-2 mb-3">
                                                        <i className="bi bi-hourglass-split text-primary" />
                                                        <span className="fw-semibold small">Filtrar por año</span>
                                                    </div>

                                                    <Dropdown className="w-100">
                                                        <Dropdown.Toggle
                                                            id="prepayroll-filter-1"
                                                            as={Button}
                                                            variant="outline-secondary"
                                                            className="w-100 d-flex align-items-center justify-content-between text-uppercase"
                                                        >
                                                            {currentYear ? currentYear : "SELECCIONA UN AÑO"}
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu className="w-100" style={{ maxHeight: "300px", overflowY: "auto" }}>
                                                            <Dropdown.Item
                                                                active={currentYear === ""}
                                                                onClick={() => handleSearchYear("")}
                                                            >
                                                                LIMPIAR
                                                            </Dropdown.Item>
                                                            {years.map((y) => (
                                                                <Dropdown.Item
                                                                    key={y}
                                                                    active={currentYear === String(y)}
                                                                    onClick={() => handleSearchYear(String(y))}
                                                                >
                                                                    {y}
                                                                </Dropdown.Item>
                                                            ))}
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </Card.Body>
                                            </Card>
                                        </Col>

                                        {/* Filtrar por periodo */}
                                        <Col xs={12} md={3} lg={3}>
                                            <Card className="rounded-4 border h-100">
                                                <Card.Body className="p-3">
                                                    <div className="d-flex align-items-center gap-2 mb-3">
                                                        <i className="bi bi-calendar-range text-primary" />
                                                        <span className="fw-semibold small">Filtrar por periodo</span>
                                                    </div>

                                                    <Dropdown className="w-100">
                                                        <Dropdown.Toggle
                                                            id="prepayroll-filter-2"
                                                            as={Button}
                                                            variant="outline-secondary"
                                                            className="w-100 d-flex align-items-center justify-content-between text-uppercase"
                                                        >
                                                            {selectedPeriod ? selectedPeriod.numberPeriod : "SELECCIONA UN PERIODO"}
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu className="w-100" style={{ maxHeight: "300px", overflowY: "auto" }}>
                                                            <Dropdown.Item
                                                                active={currentPeriod === ""}
                                                                onClick={() => handleClear()}
                                                            >
                                                                LIMPIAR
                                                            </Dropdown.Item>
                                                            {periods.map((p) => (
                                                                <Dropdown.Item
                                                                    key={p.id}
                                                                    onClick={() => handleSearchPeriod(String(p.id))}
                                                                >
                                                                    {p.numberPeriod}
                                                                </Dropdown.Item>
                                                            ))}
                                                        </Dropdown.Menu>
                                                    </Dropdown>

                                                </Card.Body>
                                            </Card>
                                        </Col>

                                        {/* Filtrar por tipo de incidencia */}
                                        <Col xs={12} md={3} lg={3} style={{ minWidth: 0 }}>
                                            <Card className="rounded-4 border h-100">
                                                <Card.Body className="p-3">
                                                    <div className="d-flex align-items-center gap-2 mb-3">
                                                        <i className="bi bi-tags-fill text-primary" />
                                                        <span className="fw-semibold small">Filtrar incidencia</span>
                                                    </div>

                                                    <Dropdown className="w-100">
                                                        <Dropdown.Toggle
                                                            id="prepayroll-filter-3"
                                                            as={Button}
                                                            variant="outline-secondary"
                                                            className="w-100 d-flex align-items-center justify-content-between text-uppercase"
                                                            style={{ minWidth: 0 }}
                                                        >
                                                            <span style={{ whiteSpace: "normal", overflowWrap: "break-word", wordBreak: "break-word", textAlign: "left" }}>
                                                                {typeOptions.find((o) => o.value === currentType)?.label ?? "Todos"}
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            {typeOptions.map((o) => (
                                                                <Dropdown.Item
                                                                    key={o.value || "todos"}
                                                                    active={o.value === currentType}
                                                                    onClick={() => filterType(o.value)}
                                                                >
                                                                    <span className="text-uppercase">{formatLabel(o.value)}</span>
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

                                                        <th className="fw-bold text-center">Acciones</th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {(prepayroll ?? []).map((row, index) => (
                                                        <tr key={`row-${index}`}>
                                                            {columns.map((column) => (
                                                                <td key={String(column.key)}>
                                                                    {column.render
                                                                        ? column.render(row)
                                                                        : column.accessor(row)}
                                                                </td>
                                                            ))}


                                                            <td className="align-middle">
                                                                <div className="d-flex justify-content-center align-items-center gap-2">

                                                                    <ConditionalRender cond={prepayrollextra?.complete === false}>
                                                                        <Button
                                                                            variant="outline-info"
                                                                            className="btn-sm"
                                                                            onClick={() => handleUpdate(row)}
                                                                        >
                                                                            Actualizar
                                                                        </Button>
                                                                    </ConditionalRender>

                                                                    <a
                                                                        href={`/app/${viewType(row.incidenceRef)}?view_type=form&id=${row.data.idRaiz}`}
                                                                        className="btn btn-sm btn-outline-info"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        Ver
                                                                    </a>
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

                <ConditionalRender cond={showModalUpdate}>
                    <ModalBlur onClose={() => setShowModalUpdate(false)}>
                        <UpdateModal
                            show={showModalUpdate}
                            onHide={() => {
                                setShowModalUpdate(false);
                                clearSelectedIds();
                            }}
                            prenom={selectedRow ? [selectedRow] : []}
                        />
                    </ModalBlur>
                </ConditionalRender>
            </Container>
        </>
    )
}