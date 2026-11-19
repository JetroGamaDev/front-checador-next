import { ModalBasicProps } from "@/lib/definitions";
import { IUpdatePrepayroll } from "@/lib/prePayroll/interface";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import { useModals } from "@/context/ModalContext";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Col, Form, Overlay } from "react-bootstrap";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import DatePicker from "react-datepicker";
import moment from "moment";
import { updatePrepayroll } from "@/app/actions/prePayroll-actions";
import { formatCreatedAt } from "@/lib/helpers";
import { useRouter } from "next/navigation";
import { es } from "date-fns/locale";
import { registerLocale } from "react-datepicker";

registerLocale("es", es);

type FeedbackState = "loading" | "success" | "error" | null;

export default function UpdateModal({
    prenom,
    onHide,
    closed = false,
}: ModalBasicProps & {
    prenom: IUpdatePrepayroll[];
    // Prenómina cerrada: la fecha nómina solo se cambia para pasar la incidencia a la siguiente prenómina abierta
    closed?: boolean;
}) {
    const {
        handleSubmit,
        watch,
        setValue,
        setError,
        clearErrors,
        control,
        formState: { isSubmitting, errors },
    } = useForm<IUpdatePrepayroll>({
        defaultValues: {
            idPeriod: prenom[0]?.idPeriod,
            idUnique: prenom[0]?.idUnique,
            fechaNomina: prenom[0]?.fechaNomina ?? "",
        },
    });

    const router = useRouter();
    const { modalConfirm } = useModals();
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const dateButtonRef = useRef<HTMLButtonElement>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [overlayContainer, setOverlayContainer] = useState<HTMLElement | null>(null);
    const originalDate = prenom[0]?.fechaNomina ?? null;

    useEffect(() => {
        setOverlayContainer(document.body);
    }, []);

    const selectedDateHour = watch("fechaNomina");

    const parsedDateHour = selectedDateHour
        ? moment(selectedDateHour, "YYYY-MM-DD").toDate()
        : null;

    const dateLabel = selectedDateHour
        ? moment(selectedDateHour, "YYYY-MM-DD").format("DD [de] MMMM [de] YYYY")
        : "Selecciona la fecha";


    const handleDateHourChange = (date: Date | null) => {
        const value = date ? moment(date).format("YYYY-MM-DD") : "";
        setValue("fechaNomina", value, { shouldDirty: true });

        if (value) {
            clearErrors("fechaNomina"); // quita el rojo en cuanto elige fecha válida
        }
    };


    const onSubmit: SubmitHandler<IUpdatePrepayroll> = async (data) => {

        if (!data.fechaNomina) {
            setError("fechaNomina", {
                type: "manual",
                message: "La fecha es requerida",
            });
            return; // detiene aquí, modalConfirm no se llama
        }

        modalConfirm("¿Seguro que quieres guardar los cambios?", async () => {
            try {
                setFeedback("loading");
                setFeedbackMsg("Actualizando registro...");

                const payload: IUpdatePrepayroll = {
                    idPeriod: prenom[0].idPeriod,
                    idUnique: prenom[0].idUnique,
                    fechaNomina: data.fechaNomina,
                };


                const res = await updatePrepayroll({ data: payload });

                if (!res.success) {
                    setFeedbackMsg(res.message || "No se pudo actualizar");
                    setFeedback("error");
                    return;
                }

                setFeedbackMsg(res.message || "Actualizado correctamente");
                setFeedback("success");
            } catch {
                setFeedbackMsg("Error inesperado, intenta de nuevo");
                setFeedback("error");
            }
        })
    };


    return (
        <>
            <ConditionalRender cond={feedback === "loading" || isSubmitting}>
                <Loading message={feedbackMsg || "Actualizando..."} />
            </ConditionalRender>

            <ConditionalRender cond={feedback === "success"}>
                <SuccessOverlay
                    message={feedbackMsg}
                    onDone={() => {
                        setFeedback(null);
                        onHide();
                        router.refresh();
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
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 mt-2">
                    <h4 className="mb-0 fw-bold">Actualizar Fecha Nómina</h4>

                    <Badge
                        bg="info-subtle"
                        text="info-emphasis"
                        className="rounded-pill px-3 py-2 fw-semibold border border-info-subtle"
                    >
                        Actualizar
                    </Badge>
                </div>

                <Form onSubmit={handleSubmit(onSubmit)}>

                    <Card className="border rounded-4 mb-4">
                        <Card.Body>
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <i className="bi bi-calendar-event text-primary fs-5 ms-1" />
                                <h6 className="mb-0 fw-bold">Fecha Nómina</h6>
                            </div>
                            <Col md={12}>
                                <Form.Group>
                                    <Button
                                        ref={dateButtonRef}
                                        variant="outline-secondary"
                                        className="w-100 d-flex align-items-center justify-content-between border rounded-3 py-2 px-3"
                                        onClick={() => setShowCalendar((s) => !s)}
                                        type="button"
                                    >
                                        <span className="d-flex align-items-center gap-2">
                                            {/* <i className="bi bi-calendar-event text-primary fs-5" /> */}
                                            <span className="fw-semibold text-truncate">{dateLabel}</span>
                                        </span>
                                        <i className="bi bi-chevron-down text-muted flex-shrink-0" />
                                    </Button>

                                    {errors.fechaNomina && (
                                        <div className="text-danger small mt-1">
                                            <i className="bi bi-exclamation-triangle-fill me-1" />
                                            {errors.fechaNomina.message}
                                        </div>
                                    )}

                                    <Overlay
                                        target={dateButtonRef.current}
                                        show={showCalendar}
                                        placement="bottom-start"
                                        container={overlayContainer}
                                        rootClose
                                        onHide={() => setShowCalendar(false)}
                                        popperConfig={{
                                            modifiers: [
                                                {
                                                    name: "flip",
                                                    enabled: true,
                                                    options: { fallbackPlacements: ["top-start", "bottom-start"] },
                                                },
                                                {
                                                    name: "preventOverflow",
                                                    enabled: true,
                                                    options: { boundary: "viewport" },
                                                },
                                            ],
                                        }}
                                    >
                                        {({ ref, style }) => (
                                            <div
                                                ref={ref}
                                                style={{ ...style, zIndex: 2100 }}
                                                className="mt-2 shadow-lg rounded-4 overflow-hidden bg-light"
                                            >
                                                <Controller
                                                    name="fechaNomina"
                                                    control={control}
                                                    render={() => (
                                                        <DatePicker
                                                            inline
                                                            selected={parsedDateHour}
                                                            onChange={handleDateHourChange}
                                                            dateFormat="dd-MM-yyyy"
                                                            locale="es"
                                                        />
                                                    )}
                                                />

                                                <div className="p-2">
                                                    <Button
                                                        variant="primary"
                                                        className="w-100"
                                                        onClick={() => setShowCalendar(false)}
                                                    >
                                                        Aplicar
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </Overlay>
                                    <div className="text-muted small mb-2">
                                        <i className="bi bi-info-circle me-1" />
                                        Registro original: {originalDate ? formatCreatedAt(originalDate) : "Sin registro de fecha"}
                                    </div>
                                    <ConditionalRender cond={closed}>
                                        <div className="small text-info-emphasis bg-info-subtle border border-info-subtle rounded-3 px-3 py-2">
                                            <i className="bi bi-arrow-right-circle me-1" />
                                            Para pasar una incidencia a la siguiente prenómina, ponle una fecha nómina de ese periodo
                                        </div>
                                    </ConditionalRender>
                                </Form.Group>
                            </Col>
                        </Card.Body>
                    </Card>

                    <div className="d-flex justify-content-end gap-2 mt-4">
                        <Button
                            variant="outline-secondary"
                            type="button"
                            disabled={isSubmitting || feedback === "loading"}
                            onClick={onHide}
                        >
                            Cancelar
                        </Button>

                        <Button
                            variant="success"
                            type="submit"
                            disabled={isSubmitting || feedback === "loading"}
                        >
                            {isSubmitting || feedback === "loading" ? "Guardando..." : "Actualizar"}
                        </Button>
                    </div>

                </Form>
            </div>
        </>
    )
}