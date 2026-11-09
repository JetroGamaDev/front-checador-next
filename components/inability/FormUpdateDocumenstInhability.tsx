import { updateDocumentsInhability } from "@/app/actions/inability-actions";
import { useModals } from "@/context/ModalContext";
import { ModalBasicProps } from "@/lib/definitions";
import { useState } from "react";
import { Button, Card, Col, Form as BForm, Row } from "react-bootstrap";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import moment from "moment-timezone";
import { Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import { IdocumentsInability } from "@/lib/inhability/interface";
import DateButton from "./DatePickerHelper";

registerLocale("es", es);

type FeedbackState = "loading" | "success" | "error" | null;

type ModalAction = {
    id: number;
    selfId: number;
    doc: IdocumentsInability;
    getData?: () => void | Promise<void>;
};

type FormValues = {
    folio: string;
};

export default function FormUpdateDocumenstInhability({
    id,
    doc,
    selfId,
    onHide,
    getData
}: ModalBasicProps & ModalAction) {

    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const { modalConfirm } = useModals();

    const [selectedDateInit, setSelectedDateInit] = useState<Date | null>(
        doc?.dateInit
            ? moment.tz(doc.dateInit, "YYYY-MM-DD", "America/Mexico_City").toDate()
            : null
    );
    const [dateInitError, setDateInitError] = useState(false);

    const [selectedDateEnd, setSelectedDateEnd] = useState<Date | null>(
        doc?.dateEnd
            ? moment.tz(doc.dateEnd, "YYYY-MM-DD", "America/Mexico_City").toDate()
            : null
    );
    const [dateEndError, setDateEndError] = useState(false);

    const [selectedExpirationDate, setSelectedExpirationDate] = useState<Date | null>(
        doc?.expirationDateDocument
            ? moment.tz(doc.expirationDateDocument, "YYYY-MM-DD", "America/Mexico_City").toDate()
            : null
    );
    const [expirationDateError, setExpirationDateError] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: {
            folio: doc?.folio ?? "",
        },
    });

    const onSubmit = async (data: FormValues) => {
        if (!id) return;

        // Solo validamos que dateInit no sea posterior a dateEnd, y solo si AMBAS existen
        if (selectedDateInit && selectedDateEnd && moment(selectedDateInit).isAfter(selectedDateEnd)) {
            setDateInitError(true);
            setDateEndError(true);
            return;
        }
        setDateInitError(false);
        setDateEndError(false);

        // Si el usuario no tocó una fecha, se conserva la que ya tenía el doc (o null)
        const dateInit = selectedDateInit
            ? moment(selectedDateInit).format("YYYY-MM-DD")
            : doc?.dateInit ?? undefined;

        const dateEnd = selectedDateEnd
            ? moment(selectedDateEnd).format("YYYY-MM-DD")
            : doc?.dateEnd ?? undefined;

        const expirationDateDocument = selectedExpirationDate
            ? moment(selectedExpirationDate).format("YYYY-MM-DD")
            : doc?.expirationDateDocument ?? undefined;

        modalConfirm("¿Seguro que quieres guardar los cambios?", async () => {
            try {
                setFeedback("loading");
                setFeedbackMsg("Actualizando documento...");

                const res = await updateDocumentsInhability({
                    id: id,
                    selfId: selfId,
                    data: {
                        ...doc,
                        folio: data.folio,
                        dateInit,
                        dateEnd,
                        expirationDateDocument,
                    },
                });

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
                        onHide();
                        getData?.();
                    }}
                />
            </ConditionalRender>

            <ConditionalRender cond={feedback === "error"}>
                <ErrorOverlay
                    message={feedbackMsg}
                    onDone={() => setFeedback(null)}
                />
            </ConditionalRender>

            <Form onSubmit={handleSubmit(onSubmit)}>
                <div className="p-2 mt-4">

                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between mb-4">
                        <div>
                            <h4 className="mb-1 fw-bold">Actualizar documento</h4>
                            <p className="text-muted mb-0">
                                Modifica el folio, vigencia y fecha de expiración del archivo.
                            </p>
                        </div>
                        <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Actualizar
                        </span>
                    </div>

                    {/* Datos del documento */}
                    <Card className="border rounded-4 mb-3">
                        <Card.Body>
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <i className="bi bi-file-earmark-text text-primary" />
                                <h6 className="mb-0 fw-bold">Datos del documento</h6>
                            </div>

                            <Row className="g-3">
                                <Col md={12}>
                                    <BForm.Label>Folio:</BForm.Label>
                                    <BForm.Control
                                        className="border"
                                        type="text"
                                        placeholder="Folio del documento"
                                        isInvalid={!!errors.folio}
                                        {...register("folio", {
                                            required: "El folio es obligatorio",
                                        })}
                                    />
                                    <BForm.Control.Feedback
                                        type="invalid"
                                        className={errors.folio ? "d-block" : ""}
                                    >
                                        {errors.folio?.message}
                                    </BForm.Control.Feedback>
                                </Col>

                                <Col md={6} className="position-relative">
                                    <BForm.Label>Fecha inicio:</BForm.Label>
                                    <DatePicker
                                        selected={selectedDateInit}
                                        onChange={(date: Date | null) => {
                                            setSelectedDateInit(date);
                                            if (date) setDateInitError(false);
                                            if (date && selectedDateEnd && moment(date).isAfter(selectedDateEnd)) {
                                                setSelectedDateEnd(null);
                                            }
                                        }}
                                        dateFormat="dd/MM/yyyy"
                                        placeholderText="dd/mm/aaaa"
                                        popperContainer={({ children }) => children}
                                        withPortal
                                        locale="es"
                                        customInput={
                                            <DateButton
                                                isInvalid={dateInitError}
                                                placeholder="dd/mm/aaaa"
                                            />
                                        }
                                    />
                                    <BForm.Control.Feedback
                                        type="invalid"
                                        className={dateInitError ? "d-block" : ""}
                                    >
                                        Selecciona la fecha de inicio.
                                    </BForm.Control.Feedback>
                                </Col>

                                <Col md={6} className="position-relative">
                                    <BForm.Label>Fecha fin:</BForm.Label>
                                    <DatePicker
                                        selected={selectedDateEnd}
                                        onChange={(date: Date | null) => {
                                            setSelectedDateEnd(date);
                                            if (date) setDateEndError(false);
                                        }}
                                        minDate={selectedDateInit ?? undefined}
                                        dateFormat="dd/MM/yyyy"
                                        placeholderText="dd/mm/aaaa"
                                        popperContainer={({ children }) => children}
                                        withPortal
                                        locale="es"
                                        customInput={
                                            <DateButton
                                                isInvalid={dateEndError}
                                                placeholder="dd/mm/aaaa"
                                            />
                                        }
                                    />
                                    <BForm.Control.Feedback
                                        type="invalid"
                                        className={dateEndError ? "d-block" : ""}
                                    >
                                        Selecciona la fecha de fin.
                                    </BForm.Control.Feedback>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Fecha de expiración */}
                    <Card className="border rounded-4 mb-3">
                        <Card.Body>
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <i className="bi bi-calendar-range text-primary" />
                                <h6 className="mb-0 fw-bold">Nueva fecha de expiración</h6>
                            </div>

                            <Row className="g-3">
                                <Col md={12} className="position-relative">
                                    <DatePicker
                                        selected={selectedExpirationDate}
                                        onChange={(date: Date | null) => {
                                            setSelectedExpirationDate(date);
                                            if (date) setExpirationDateError(false);
                                        }}
                                        dateFormat="dd/MM/yyyy"
                                        placeholderText="DD/MM/AAAA"
                                        popperContainer={({ children }) => children}
                                        withPortal
                                        locale="es"
                                        customInput={
                                            <DateButton
                                                isInvalid={expirationDateError}
                                                placeholder="DD/MM/AAAA"
                                            />
                                        }
                                    />
                                    <BForm.Control.Feedback
                                        type="invalid"
                                        className={expirationDateError ? "d-block" : ""}
                                    >
                                        Selecciona una fecha de expiración.
                                    </BForm.Control.Feedback>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Acciones */}
                    <div className="d-flex justify-content-end gap-2 mt-4">
                        <Button
                            variant="outline-secondary"
                            type="button"
                            disabled={feedback === "loading"}
                            onClick={onHide}
                        >
                            Cancelar
                        </Button>

                        <Button
                            variant="success"
                            type="submit"
                            disabled={feedback === "loading"}
                        >
                            {feedback === "loading" ? "Guardando..." : "Actualizar"}
                        </Button>
                    </div>
                </div>
            </Form>
        </>
    );
}