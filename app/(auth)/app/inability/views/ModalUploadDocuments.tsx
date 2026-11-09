"use client";

import { createNewDocument } from "@/app/actions/inability-actions";
import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import { Entry } from "@/components/fields";
import React, { useRef, useState } from "react";
import { Button, Form, Row, Col, Card, InputGroup } from "react-bootstrap";
import { useForm } from "react-hook-form";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import moment from "moment-timezone";
import { useModals } from "@/context/ModalContext";
import SuccessOverlay from "@/components/SuccessOverlay";
import ErrorOverlay from "@/components/ErrorOverlay";

registerLocale("es", es);

type FeedbackState = "loading" | "success" | "error" | null;

type TInputs = {
  folio: string;
  document: FileList | null;
};

type Props = {
  idDoc: string;
  onHide: () => void;
  getData?: () => void | Promise<void>;
};

function ModalAddDocuments({ idDoc, onHide, getData }: Props) {
  const {
    register,
    reset,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<TInputs>({
    defaultValues: {
      folio: "",
      document: null,
    },
  });

  const [loading] = useState(false);

  const [selectedDateInit, setSelectedDateInit] = useState<Date | null>(null);
  const [dateInitError, setDateInitError] = useState(false);

  const [selectedDateEnd, setSelectedDateEnd] = useState<Date | null>(null);
  const [dateEndError, setDateEndError] = useState(false);
  const { modalConfirm } = useModals();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { ref: firstDocRef, ...firstDocField } = register("document");

  const firstDoc = watch("document");
  const selectedFile = firstDoc?.[0];

  const clearFirstDoc = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";   // limpia el input visualmente
    setValue("document", null, { shouldValidate: true });        // limpia el valor en el form
  };

  const handleClose = () => {
    reset({
      folio: "",
      document: null,
    });
    setSelectedDateInit(null);
    setSelectedDateEnd(null);
    setDateInitError(false);
    setDateEndError(false);
    onHide();
  };

  const onSubmit = handleSubmit(async (data) => {
    let hasError = false;

    if (!selectedDateInit) {
      setDateInitError(true);
      hasError = true;
    } else {
      setDateInitError(false);
    }

    if (!selectedDateEnd) {
      setDateEndError(true);
      hasError = true;
    } else {
      setDateEndError(false);
    }

    if (
      selectedDateInit &&
      selectedDateEnd &&
      moment(selectedDateInit).isAfter(selectedDateEnd)
    ) {
      setDateInitError(true);
      setDateEndError(true);
      hasError = true;
    }

    if (hasError) return;

    const dateInit = moment(selectedDateInit).format("YYYY-MM-DD");
    const dateEnd = moment(selectedDateEnd).format("YYYY-MM-DD");

    modalConfirm("¿Seguro que quieres cargar este documento?", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg("Creando nuevo documento...");

        const res = await createNewDocument({
          idDoc,
          folio: data.folio,
          dateEnd,
          dateInit,
          formData: data.document,
        });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo crear el documento");
          setFeedback("error");
          return;
        }

        setFeedbackMsg(res.message || "Documento creado correctamente");
        setFeedback("success");
      } catch {
        setFeedbackMsg("Error inesperado, intenta de nuevo");
        setFeedback("error");
      }
    });
  });

  return (
    <>
      <ConditionalRender cond={feedback === "loading"}>
        <Loading message={feedbackMsg || "Cargando documento..."} />
      </ConditionalRender>

      <ConditionalRender cond={feedback === "success"}>
        <SuccessOverlay
          message={feedbackMsg}
          onDone={() => {
            setFeedback(null);
            handleClose();
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

      <div className="p-2 mt-4">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h4 className="mb-1 fw-bold">Documento CITT</h4>
            <p className="text-muted mb-0">
              Agrega un nuevo documento con su rango de fechas y folio.
            </p>
          </div>

          <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
            Nuevo
          </span>
        </div>

        <Form onSubmit={onSubmit}>
          <Card className="border rounded-4 mb-3">
            <Card.Body>
              <div className="d-flex align-items-center gap-2 mb-4">
                <i className="bi bi-calendar-range text-primary" />
                <h6 className="mb-0 fw-bold">Vigencia</h6>
              </div>

              <Row className="g-3">
                <Col md={6} className="position-relative">
                  <Form.Label className="fw-semibold">Fecha inicio:</Form.Label>
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
                    className={`form-control text-uppercase ${dateInitError ? "is-invalid" : ""}`}
                    placeholderText="dd/mm/aaaa"
                    popperContainer={({ children }) => children}
                    withPortal
                    locale="es"
                  />
                  <Form.Control.Feedback
                    type="invalid"
                    className={dateInitError ? "d-block" : ""}
                  >
                    Selecciona la fecha de inicio.
                  </Form.Control.Feedback>
                </Col>

                <Col md={6} className="position-relative">
                  <Form.Label className="fw-semibold">Fecha fin:</Form.Label>
                  <DatePicker
                    selected={selectedDateEnd}
                    onChange={(date: Date | null) => {
                      setSelectedDateEnd(date);
                      if (date) setDateEndError(false);
                    }}
                    minDate={selectedDateInit ?? undefined}
                    dateFormat="dd/MM/yyyy"
                    className={`form-control text-uppercase ${dateEndError ? "is-invalid" : ""}`}
                    placeholderText="dd/mm/aaaa"
                    popperContainer={({ children }) => children}
                    withPortal
                    locale="es"
                  />
                  <Form.Control.Feedback
                    type="invalid"
                    className={dateEndError ? "d-block" : ""}
                  >
                    Selecciona la fecha de fin.
                  </Form.Control.Feedback>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="border rounded-4 mb-3">
            <Card.Body>
              <div className="d-flex align-items-center gap-2 mb-4">
                <i className="bi bi-upc-scan text-warning" />
                <h6 className="mb-0 fw-bold">Folio</h6>
              </div>

              <Row className="g-3">
                <Col md={12}>
                  <Entry
                    register={register("folio", { required: true })}
                    label="Folio CITT"
                    className="text-uppercase border"
                    invalid={!!errors.folio}
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="border rounded-4">
            <Card.Body>
              <div className="d-flex align-items-center gap-2 mb-4">
                <i className="bi bi-file-earmark-arrow-up text-info" />
                <h6 className="mb-0 fw-bold">Documento</h6>
              </div>

              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">CITT:</Form.Label>

                    <InputGroup>
                      <Form.Control
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf,.webp"
                        {...firstDocField}
                        ref={(el: HTMLInputElement | null) => {
                          firstDocRef(el);          // ref de RHF
                          fileInputRef.current = el; // ref propio
                        }}
                        isInvalid={!!errors.document}
                        className="border"
                      />

                      <ConditionalRender cond={!!selectedFile}>
                        <Button variant="outline-danger" onClick={clearFirstDoc} title="Quitar archivo">
                          <i className="bi bi-x-lg" />
                        </Button>
                      </ConditionalRender>
                    </InputGroup>

                    <ConditionalRender cond={!!selectedFile}>
                      <small className="text-muted d-block mt-1">
                        <i className="bi bi-paperclip me-1" />
                        {selectedFile?.name} ({((selectedFile?.size ?? 0) / 1024).toFixed(0)} KB)
                      </small>
                    </ConditionalRender>

                    <Form.Control.Feedback type="invalid" className={errors.document ? "d-block" : ""}>
                      Este campo es requerido
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={loading || isSubmitting}
            >
              Cancelar
            </Button>

            <Button type="submit" variant="success" disabled={loading || isSubmitting}>
              {loading || isSubmitting ? "Cargando..." : "Cargar"}
            </Button>
          </div>
        </Form>
      </div>
    </>
  );
}

export default ModalAddDocuments;