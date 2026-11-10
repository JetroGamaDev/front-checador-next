"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Carousel, Col, Dropdown, Overlay, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import ConditionalRender from "../ConditionalRender";
import DatePicker, { registerLocale } from "react-datepicker";
import { useSearchParams } from "next/navigation";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import moment from "moment";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import Loading from "../LoadingSpinner";
import { getLunchExcessReport, getPerfectAttendanceBonus, getPrimaAnual, getReportInflowsAndOutflows, getReportVales } from "@/app/actions/reports-actions";
import { ICurrentPeriod } from "@/lib/definitions";
import { createPortal } from "react-dom";
import { formatCreatedAt } from "@/lib/helpers";
import { useModals } from "@/context/ModalContext";


moment.locale("es");
registerLocale("es", es);


type FeedbackState = "loading" | "success" | "error" | null;

export interface StatCardData {
    id?: string;
    idCard?: number;
    label?: string;
    icon?: string;
    value?: string;
    accent?: string;
    changed?: boolean;
    view?: string;
    dateInit?: string;
    dateEnd?: string;
    periods?: ICurrentPeriod[];
    periodoActual?: ICurrentPeriod | null;
}


function chunk<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

function StatCard({ idCard, label, icon, value, accent = "primary", isPending, periods, periodoActual }: StatCardData & { isPending?: boolean; onClick?: () => void }) {
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const sp = useSearchParams();
    const searchParamsString = sp.toString();
    const { modalConfirm } = useModals();

    const [justArrived, setJustArrived] = useState(false);
    // Mes y año del bono de asistencia y puntualidad perfecta (por defecto el mes actual)
    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
    const [dateError] = useState("");

    const [showCalendar, setShowCalendar] = useState(false);
    const dateButtonRef = useRef(null);
    const [mounted, setMounted] = useState(false);

    const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
        periodoActual ? String(periodoActual.id) : ""
    );

    useEffect(() => {
        setFeedback(null);
        setFeedbackMsg("");
    }, [searchParamsString]);

    const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: es });

    const handleMonthChange = (date: Date | null) => {
        if (date) setSelectedMonth(date);
    };

    const handleClearDates = () => {
        setSelectedMonth(new Date());
    };

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!selectedPeriodId && periodoActual) {
            setSelectedPeriodId(String(periodoActual.id));
        }
    }, [periodoActual, selectedPeriodId]);

    useEffect(() => {
        // Solo dispara el flash cuando la data terminó de llegar (isPending pasó a false)
        if (!isPending) {
            setJustArrived(true);
        }
    }, [value, isPending]);

    //Boton de descargar
    const handleDownload = async (idCard: number | null) => {

        switch (idCard) {
            case 3: // Ingresos y salidas
                modalConfirm("¿Seguro que quieres descargar este reporte?", async () => {

                    try {
                        setFeedback("loading");
                        setFeedbackMsg("Generando reporte...")
                        const res = await getReportInflowsAndOutflows(Number(selectedPeriodId));

                        if (!res.success || !res.data) {
                            setFeedbackMsg(res.message || "No se pudo generar el reporte");
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
                        handleClearDates();
                        setFeedbackMsg("Reporte generado correctamente");
                        setFeedback("success");
                    } catch (err) {
                        console.log(err);
                        setFeedbackMsg("Error inesperado al generar el reporte");
                        setFeedback("error");
                    }
                })
                break;

            case 4: // Vales
                modalConfirm("¿Seguro que quieres descargar este reporte?", async () => {

                    try {
                        setFeedback("loading");
                        setFeedbackMsg("Generando reporte...")
                        const res = await getReportVales(Number(selectedPeriodId));

                        if (!res.success || !res.data) {
                            setFeedbackMsg(res.message || "No se pudo generar el reporte");
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
                        handleClearDates();
                        setFeedbackMsg("Reporte generado correctamente");
                        setFeedback("success");
                    } catch (err) {
                        console.log(err);
                        setFeedbackMsg("Error inesperado al generar el reporte");
                        setFeedback("error");
                    }
                })

                break;

            case 2: // Prima Anual
                modalConfirm("¿Seguro que quieres descargar este reporte?", async () => {
                    try {
                        setFeedback("loading");
                        setFeedbackMsg("Generando reporte...")
                        const res = await getPrimaAnual(String(selectedPeriodId));

                        if (!res.success || !res.data) {
                            setFeedbackMsg(res.message || "No se pudo generar el reporte");
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
                        handleClearDates();
                        setFeedbackMsg("Reporte generado correctamente");
                        setFeedback("success");
                    } catch (err) {
                        console.log(err);
                        setFeedbackMsg("Error inesperado al generar el reporte");
                        setFeedback("error");
                    }
                })
                break;

            case 5: // Excedentes de comida
                modalConfirm("¿Seguro que quieres descargar este reporte?", async () => {
                    try {
                        setFeedback("loading");
                        setFeedbackMsg("Generando reporte...")
                        const res = await getLunchExcessReport(String(selectedPeriodId), selectedPeriod?.numberPeriod);

                        if (!res.success || !res.data) {
                            setFeedbackMsg(res.message || "No se pudo generar el reporte");
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
                        setFeedbackMsg("Reporte generado correctamente");
                        setFeedback("success");
                    } catch (err) {
                        console.log(err);
                        setFeedbackMsg("Error inesperado al generar el reporte");
                        setFeedback("error");
                    }
                })
                break;

            case 1: // Asistencia y puntualidad perfecta
                modalConfirm("¿Seguro que quieres descargar este reporte?", async () => {
                    try {
                        setFeedback("loading");
                        setFeedbackMsg("Generando reporte...")
                        const res = await getPerfectAttendanceBonus({
                            year: moment(selectedMonth).format("YYYY"),
                            month: moment(selectedMonth).format("MM"),
                        });

                        if (!res.success || !res.data) {
                            setFeedbackMsg(res.message || "No se pudo generar el reporte");
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
                        handleClearDates();
                        setFeedbackMsg("Reporte generado correctamente");
                        setFeedback("success");
                    } catch (err) {
                        console.log(err);
                        setFeedbackMsg("Error inesperado al generar el reporte");
                        setFeedback("error");
                    }
                })
                break;

            default:
                break;
        }
    };

    const handleSearchPeriod = useCallback((value: string) => {
        setSelectedPeriodId(value);
    }, []);

    const handleClear = useCallback(() => {
        setSelectedPeriodId(periodoActual ? String(periodoActual.id) : "");
    }, [periodoActual]);

    const selectedPeriod = useMemo(
        () => periods?.find((p) => String(p.id) === selectedPeriodId),
        [periods, selectedPeriodId]
    );

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

            <div
                className={["border rounded-4 p-3 h-100 d-flex flex-column mt-1", isPending && "stat-card-loading", justArrived && "collapse-card"].filter(Boolean).join(" ")}
                onAnimationEnd={() => justArrived && setJustArrived(false)}
            >
                <div className="d-flex align-items-center justify-content-between gap-2 mb-3" style={{ minWidth: 0 }}>
                    <div
                        className={`d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 bg-${accent}-subtle text-${accent}-emphasis`}
                        style={{ width: 44, height: 44 }}
                    >
                        <i className={`bi bi-${icon} fs-5`} />
                    </div>

                    <div className="position-relative flex-shrink-1" style={{ minWidth: 0 }}>
                        <ConditionalRender cond={value === "Asistencia Y Puntualidad Perfecta"}>
                            <OverlayTrigger placement="top" overlay={<Tooltip className="text-capitalize">{monthLabel}</Tooltip>}>
                                <Button
                                    ref={dateButtonRef}
                                    variant="outline-secondary"
                                    className={`rounded-pill d-inline-flex align-items-center gap-2 px-2 px-md-3 ${dateError ? "border-danger text-danger" : ""}`}
                                    onClick={() => setShowCalendar((s) => !s)}
                                    aria-label={monthLabel}
                                >
                                    <i className="bi bi-calendar3" />
                                    <span className="d-none d-md-inline text-truncate text-capitalize" style={{ maxWidth: 140 }}>
                                        {monthLabel}
                                    </span>
                                </Button>
                            </OverlayTrigger>

                            <Overlay
                                target={dateButtonRef.current}
                                show={showCalendar}
                                placement="bottom-end"
                                rootClose
                                onHide={() => setShowCalendar(false)}
                                popperConfig={{
                                    modifiers: [
                                        { name: "preventOverflow", options: { padding: 8 } },
                                        { name: "flip", options: { fallbackPlacements: ["bottom-start", "top-end"] } },
                                    ],
                                }}
                            >
                                {({ ref, style }) => (
                                    <div
                                        ref={ref}
                                        style={{ ...style, zIndex: 1080, maxWidth: "calc(100vw - 16px)" }}
                                        className="mt-2 shadow-lg rounded-4 overflow-hidden bg-light text-capitalize"
                                    >
                                        <div className="px-3 pt-2 small fw-semibold text-muted">{monthLabel}</div>

                                        <DatePicker
                                            inline
                                            showMonthYearPicker
                                            selected={selectedMonth}
                                            onChange={handleMonthChange}
                                            maxDate={new Date()}
                                            locale="es"
                                        />
                                        <Row className="g-2 m-2">
                                            <Col xs={8}>
                                                <Button variant="primary" className="w-100" onClick={() => setShowCalendar(false)}>
                                                    Aplicar
                                                </Button>
                                            </Col>
                                            <Col xs={4}>
                                                <Button
                                                    variant="secondary"
                                                    className="w-100"
                                                    aria-label="Mes actual"
                                                    onClick={() => {
                                                        handleClearDates();
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
                        </ConditionalRender>

                        <ConditionalRender cond={value !== "Asistencia Y Puntualidad Perfecta"}>
                            <Dropdown align="end">
                                <Dropdown.Toggle
                                    id={`files-period-${idCard ?? "card"}`}
                                    variant="outline-info"
                                    className="rounded-pill d-inline-flex align-items-center gap-2 px-2 px-md-3 fw-semibold text-uppercase bg-info-subtle text-info-emphasis border-info-subtle"
                                    aria-label={selectedPeriod ? `Periodo ${selectedPeriod.numberPeriod}` : "Seleccionar periodo"}
                                >
                                    <i className="bi bi-calendar-week" />
                                    <span className="d-none d-md-inline text-truncate" style={{ maxWidth: 100 }}>
                                        {selectedPeriod ? selectedPeriod.numberPeriod : "Periodo"}
                                    </span>
                                </Dropdown.Toggle>

                                {mounted &&
                                    createPortal(
                                        <Dropdown.Menu
                                            className="shadow rounded-3 py-1"
                                            style={{ minWidth: 260, maxWidth: "calc(100vw - 16px)", maxHeight: 320, overflowY: "auto" }}
                                        >
                                            <Dropdown.Header className="text-uppercase small fw-bold">
                                                {selectedPeriod ? `Periodo actual: ${selectedPeriod.numberPeriod}` : "Periodos"}
                                            </Dropdown.Header>

                                            {periods?.map((p) => (
                                                <Dropdown.Item
                                                    key={p.id}
                                                    active={String(p.id) === selectedPeriodId}
                                                    onClick={() => handleSearchPeriod(String(p.id))}
                                                >
                                                    Periodo {p.numberPeriod}
                                                    <span className={`small ms-2 ${String(p.id) === selectedPeriodId ? "text-white-50" : "text-muted"}`}>
                                                        {formatCreatedAt(p.dateInit)} - {formatCreatedAt(p.dateEnd)}
                                                    </span>
                                                </Dropdown.Item>
                                            ))}

                                            <Dropdown.Divider />
                                            <Dropdown.Item onClick={handleClear} disabled={!periodoActual}>
                                                <i className="bi bi-arrow-counterclockwise me-2" />
                                                Periodo actual
                                            </Dropdown.Item>
                                        </Dropdown.Menu>,
                                        document.body
                                    )}
                            </Dropdown>
                        </ConditionalRender>
                    </div>
                </div>

                {dateError && (
                    <small className="text-danger d-block mb-2">{dateError}</small>
                )}

                <ConditionalRender cond={value === "Asistencia Y Puntualidad Perfecta"}>
                    <div className="text-muted small mb-1 text-capitalize">Mes: {monthLabel}</div>
                </ConditionalRender>

                <div className="fw-bold lh-1 mb-1 text-muted" style={{ fontSize: "clamp(1.20rem, 3vw, 2rem)" }}>
                    {value ?? "—"}
                </div>

                <div className="text-muted small mt-auto text-end">{label}</div>

                <ConditionalRender cond={value !== "Asistencia Y Puntualidad Perfecta"}>
                    {selectedPeriod && (
                        <div className="text-muted">Periodo: {selectedPeriod.numberPeriod}</div>
                    )}
                </ConditionalRender>

                <Button
                    className="hover-clickable mt-2"
                    variant="info"
                    onClick={() => handleDownload(idCard ?? null)}
                >
                    <i className="bi bi-download me-2" />
                    Descargar
                </Button>
            </div>
        </>
    );
}

export default function CardsFiles({
    items,
    chunkSize = 4,
    periods,
    periodoActual,
}: {
    items: StatCardData[];
    chunkSize?: number;
    periods: ICurrentPeriod[];
    periodoActual: ICurrentPeriod | null;
}) {

    const groups = chunk(items, chunkSize);
    const [index, setIndex] = useState(0);

    const isFirst = index === 0;
    const isLast = index === groups.length - 1;

    const goTo = (direction: 1 | -1) => {
        setIndex((prev) => {
            const next = prev + direction;
            if (next < 0 || next >= groups.length) return prev;
            return next;
        });
    };

    return (
        <div className="h-100 p-3">
            <ConditionalRender cond={groups.length > 1}>
                <div className="d-flex justify-content-end gap-2 mb-2">
                    <button
                        type="button"
                        onClick={() => goTo(-1)}
                        disabled={isFirst}
                        className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: 32, height: 32, opacity: isFirst ? 0.4 : 1 }}
                        aria-label="Anterior"
                    >
                        <i className="bi bi-chevron-left" />
                    </button>
                    <button
                        type="button"
                        onClick={() => goTo(1)}
                        disabled={isLast}
                        className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: 32, height: 32, opacity: isLast ? 0.4 : 1 }}
                        aria-label="Siguiente"
                    >
                        <i className="bi bi-chevron-right" />
                    </button>
                </div>
            </ConditionalRender>

            <Carousel
                activeIndex={index}
                onSelect={setIndex}
                controls={false}
                indicators={false}
                interval={null}
                touch
            >
                {groups.map((group, i) => (
                    <Carousel.Item key={i}>
                        <div
                            className="d-grid gap-3 px-1 mb-5"
                            // Cada tarjeta mide 1/{chunkSize} del ancho aunque la página tenga menos (en pantallas chicas bajan a mínimo 200px)
                            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(max(200px, calc((100% - ${chunkSize - 1}rem) / ${chunkSize})), 1fr))` }}
                        >
                            {group.map((item) => (
                                <StatCard
                                    key={item.idCard ?? item.id ?? item.label}
                                    {...item}
                                    periods={periods}
                                    periodoActual={periodoActual}
                                />
                            ))}
                        </div>
                    </Carousel.Item>
                )
                )}
            </Carousel>
        </div>
    );
}