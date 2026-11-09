import { updateExpirationDateST7V1 } from "@/app/actions/inability-actions";
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
import { IInability } from "@/lib/inhability/interface";
import DateButton from "./DatePickerHelper";

registerLocale("es", es);


type FeedbackState = "loading" | "success" | "error" | null;

type ModalAction = {
    id: number;
    doc: IInability["sT7FillingDocumentv1"] | undefined;
    getData?: () => void | Promise<void>;
};

export default function FormUpdateDateV1({
    id,
    doc,
    onHide,
    getData

}: ModalBasicProps & ModalAction) {

    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const { modalConfirm } = useModals();

    const [selectedDate, setSelectedDate] = useState<Date | null>(
        doc?.expirationDateDocument
            ? moment.tz(doc.expirationDateDocument, "YYYY-MM-DD", "America/Mexico_City").toDate()
            : null
    );
    const [dateError, setDateError] = useState(false);

    const { handleSubmit } = useForm();

    const onSubmit = async () => {
        if (!id) return;

        if (!selectedDate) {
            setDateError(true);
            return;
        }
        setDateError(false);

        const expirationDateDocument = moment(selectedDate).format("YYYY-MM-DD");

        modalConfirm("¿Seguro que quieres guardar los cambios?", async () => {

            try {
                setFeedback("loading");
                setFeedbackMsg("Actualizando fecha de expiración...");

                const res = await updateExpirationDateST7V1({
                    id: id,
                    data: {
                        expirationDateDocument
                    }
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
        })
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
                            <h4 className="mb-1 fw-bold">Actualizar fecha de expiración</h4>
                            <p className="text-muted mb-0">
                                Modifica la fecha de expiración del archivo.
                            </p>
                        </div>
                        <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Actualizar
                        </span>
                    </div>

                    {/* Datos de la ausencia */}
                    <Card className="border rounded-4 mb-3">
                        <Card.Body>
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <i className="bi bi-calendar-range text-primary" />
                                <h6 className="mb-0 fw-bold">Nueva fecha de expiración</h6>
                            </div>

                            <Row className="g-3">
                                <Col md={12} className="position-relative">
                                    <Col md={12} className="position-relative">
                                        <DatePicker
                                            selected={selectedDate}
                                            onChange={(date: Date | null) => {
                                                setSelectedDate(date);
                                                if (date) setDateError(false);
                                            }}
                                            dateFormat="dd/MM/yyyy"
                                            placeholderText="DD/MM/AAAA"
                                            popperContainer={({ children }) => children}
                                            withPortal
                                            locale="es"
                                            customInput={
                                                <DateButton isInvalid={dateError} placeholder="dd/mm/aaaa" />
                                            }
                                        />
                                        <BForm.Control.Feedback
                                            type="invalid"
                                            className={dateError ? "d-block" : ""}
                                        >
                                            Selecciona una fecha de expiración.
                                        </BForm.Control.Feedback>
                                    </Col>
                                    <BForm.Control.Feedback
                                        type="invalid"
                                        className={dateError ? "d-block" : ""}
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