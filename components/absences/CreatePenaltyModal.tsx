"use client";

import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import { useModals } from "@/context/ModalContext";
import { IAbsence } from "@/lib/absences/interface";
import { useRef, useState } from "react";
import { Button, Card, Col, Form, Overlay, Row } from "react-bootstrap";
import { SubmitHandler, useForm } from "react-hook-form";
import { formatDate } from "date-fns";
import { createPenalty } from "@/app/actions/penalties-actions";
import { IPenalty } from "@/lib/penalties/interface";
import { ModalBasicProps } from "@/lib/definitions";
import { useRouter } from "next/navigation";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";

registerLocale("es", es);

type FeedbackState = "loading" | "success" | "error" | null;

const upperCase = (text?: string) => {
    return text?.toUpperCase() || "";
};

function fullName(emp?: IAbsence) {
    if (!emp) return "-";
    return `${upperCase(emp.employee?.lastName ?? "")} ${upperCase(emp.employee?.name ?? "")}`.trim();
}


export default function CreatePenaltyComponent({
    absence,
    onHide,
}: ModalBasicProps & { absence: IAbsence[] }) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<IPenalty>();

    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [, setMessageLoading] = useState("");
    const { modalConfirm } = useModals();
    const dateButtonRef = useRef(null);
    const [dateError, setDateError] = useState("");
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const sortedSelectedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const [feedback, setFeedback] = useState<FeedbackState>(null);

    const rangeLabel =
        selectedDates.length === 0
            ? "Selecciona fechas"
            : selectedDates.length === 1
                ? formatDate(selectedDates[0], "dd/MM/yyyy")
                : `${selectedDates.length} fechas seleccionadas`;


    const getDate = (date?: string | number | Date) => {
        if (!date) return "-";
        return formatDate(date, "dd/MM/yyyy");
    };

    const handleDatesChange = (dates: Date[] | null) => {
        setSelectedDates(dates ?? []);
    };

    const handleRemove = (dateToRemove: Date) => {
        setSelectedDates((prev) =>
            prev.filter((d) => d.getTime() !== dateToRemove.getTime())
        );
    };

    const onSubmit: SubmitHandler<IPenalty> = async (data) => {
        if (selectedDates.length === 0) {
            setDateError("Selecciona al menos una fecha");
            return;
        }
        setDateError("");


        const payload: IPenalty = {
            idEmployee: absence[0]?.employee?.id ?? 0,
            idsAbsencesAndAttendances: absence.map((row) => row.id),
            dateOfAbsence: selectedDates.map((d) =>
                formatDate(d, "yyyy-MM-dd")
            ),
            PenaltyForOffensesType: String(data.PenaltyForOffensesType),
            motive: String(data.motive),
            notes: String(data.notes)
        };

        modalConfirm("¿Seguro que quieres guardar la penalización?", async () => {
            try {
                setFeedback("loading");
                setFeedbackMsg("Guardando penalización...");

                const res = await createPenalty({ data: payload });

                if (!res.success) {
                    setFeedbackMsg(res.message || "No se pudo crear la penalización");
                    setFeedback("error");
                    return;
                }

                setFeedbackMsg(res.message || "Penalización creada correctamente");
                setFeedback("success");
                router.push("/app/penalties");
            } catch {
                setFeedbackMsg("Error inesperado, intenta de nuevo");
                setFeedback("error");
            } finally {
                setLoading(false);
                setMessageLoading("");
            }
        });
    };

    return (
        <>
            <ConditionalRender cond={feedback === "loading"}>
                <Loading message={feedbackMsg || "Actualizando..."} />
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

            <div className="p-2 mt-4">

                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                        <h4 className="mb-1 fw-bold">Penalización</h4>
                        <p className="text-muted mb-0">
                            Crea una nueva penalización a{" "}
                            <span className="fw-bold text-primary">{fullName(absence[0])}.</span>
                        </p>
                    </div>

                    <span className="badge rounded-pill px-3 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                        Nuevo
                    </span>
                </div>

                <Form onSubmit={handleSubmit(onSubmit)}>
                    <fieldset disabled={loading || isSubmitting}>

                        <Card className="border rounded-4 mb-3">
                            <Card.Body>
                                <div className="d-flex align-items-center gap-2 mb-4">
                                    <i className="bi bi-exclamation-octagon text-danger" />
                                    <h6 className="mb-0 fw-bold">Fechas por penalizar</h6>
                                </div>

                                <Row className="g-3">
                                    {absence.map((row) => (
                                        <Col key={row.id} md={4}>
                                            <Card className="m-1 p-2 d-flex flex-row align-items-center gap-2">
                                                <i className="bi bi-calendar text-danger" />
                                                {getDate(row.dateOfAbsence)}
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            </Card.Body>
                        </Card>

                        <Card className="border rounded-4 mb-3">
                            <Card.Body>
                                <div className="d-flex align-items-center gap-2 mb-4">
                                    <i className="bi bi-tag text-danger" />
                                    <h6 className="mb-0 fw-bold">Tipo, fecha(s) de penalización y motivo</h6>
                                </div>

                                <Row className="g-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">Tipo de penalización</Form.Label>
                                            <Form.Select
                                                {...register("PenaltyForOffensesType", {
                                                    required: "Selecciona un tipo de penalización",
                                                })}
                                                isInvalid={!!errors.PenaltyForOffensesType}
                                                className="border text-uppercase"
                                            >
                                                <option value="">Selecciona...</option>
                                                <option value="retardos">Retardos</option>
                                                <option value="faltas_injustificadas">Faltas</option>
                                            </Form.Select>
                                            <Form.Control.Feedback type="invalid">
                                                {errors.PenaltyForOffensesType?.message}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>

                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold mt-2">Fecha(s) de penalización</Form.Label>
                                        </Form.Group>

                                        <Button
                                            ref={dateButtonRef}
                                            variant="outline-secondary"
                                            className={`w-100 d-flex align-items-center justify-content-between text-uppercase ${dateError ? "border-danger text-danger" : ""}`}
                                            onClick={() => setShowCalendar((s) => !s)}
                                        >
                                            <span>{rangeLabel}</span>
                                            <i className="bi bi-calendar3" />
                                        </Button>

                                        <ConditionalRender cond={!!dateError}>
                                            <small className="text-danger d-block mt-1">{dateError}</small>
                                        </ConditionalRender>

                                        <Overlay
                                            target={dateButtonRef.current}
                                            show={showCalendar}
                                            placement="bottom-start"
                                            rootClose
                                            container={() => document.body}
                                            onHide={() => setShowCalendar(false)}
                                        >
                                            {({ ref, style }) => (
                                                <div
                                                    ref={ref}
                                                    style={style}
                                                    className="date-multi-popover mt-2 shadow-lg rounded-4 overflow-hidden bg-light text-capitalize"
                                                >
                                                    <DatePicker
                                                        selectsMultiple
                                                        inline
                                                        selectedDates={selectedDates}
                                                        onChange={handleDatesChange}
                                                        shouldCloseOnSelect={false}
                                                        disabledKeyboardNavigation
                                                        monthsShown={1}
                                                        locale="es"
                                                    />
                                                    <Col xs={12}>
                                                        <Button variant="primary" className="w-100" onClick={() => setShowCalendar(false)}>
                                                            Aplicar
                                                        </Button>
                                                    </Col>
                                                </div>
                                            )}
                                        </Overlay>

                                        <div className="fw-semibold mt-3"> Fecha(s) Seleccionada(s): </div>
                                        <ConditionalRender cond={selectedDates.length > 0}>
                                            <div className="d-flex flex-wrap gap-2 mt-2">
                                                {sortedSelectedDates.map((d) => (
                                                    <span
                                                        key={d.toISOString()}
                                                        className="badge rounded-pill bg-info-subtle text-info-emphasis border border-info-subtle position-relative pe-4"
                                                    >
                                                        {formatDate(d, "dd/MM/yyyy")}
                                                        <i
                                                            role="button"
                                                            className="bi bi-x-circle-fill position-absolute"
                                                            style={{
                                                                cursor: "pointer",
                                                                top: "-4px",
                                                                right: "-3px",
                                                                fontSize: "0.9rem",
                                                            }}
                                                            onClick={() => handleRemove(d)}
                                                        />
                                                    </span>
                                                ))}
                                            </div>
                                        </ConditionalRender>
                                    </Col>

                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold mt-2">Motivo:</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                className="border text-uppercase"
                                                rows={3}
                                                {...register("motive")}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>

                        <Card className="border rounded-4 mb-3">
                            <Card.Body>
                                <div className="d-flex align-items-center gap-2 mb-4">
                                    <i className="bi bi-journal-text text-info" />
                                    <h6 className="mb-0 fw-bold">Notas</h6>
                                </div>

                                <Row className="g-3">
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold mt-2">Notas adicionales:</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                className="border text-uppercase"
                                                rows={3}
                                                {...register("notes")}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>

                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onHide}
                                disabled={loading || isSubmitting}
                            >
                                Cancelar
                            </Button>

                            <Button type="submit" variant="success" disabled={loading || isSubmitting}>
                                {isSubmitting ? "Guardando..." : "Crear penalización"}
                            </Button>
                        </div>

                    </fieldset>
                </Form>
            </div >
        </>
    );
}