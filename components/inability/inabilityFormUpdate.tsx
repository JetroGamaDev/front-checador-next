"use client";

import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import { Entry, FieldSelect, RelationField } from "@/components/fields";
import { useModals } from "@/context/ModalContext";
import {
  Employee,
  ModalBasicProps,
} from "@/lib/definitions";
import { formatDate } from "date-fns";
import { useEffect, useState } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import { SubmitHandler, useForm } from "react-hook-form";
import { useSessionSnapshot } from "@/hooks/useSessionStore";
import { updateDocumentsInhability, updateInabilityModal } from "@/app/actions/inability-actions";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import { IInability } from "@/lib/inhability/interface";
import { compressPdf } from "@/lib/compressPdf";

type FeedbackState = "loading" | "success" | "error" | null;

const MAX_UPLOAD = 9 * 1024 * 1024;

export type TInputsInability = {
  idEmployee: number | null;
  disabilityCategory: string;
  folio: string;
  typeOfDisability: string;
  dateInit: string;
  dateEnd: string;
  firstDoc: FileList | null;
  notes: string | null;
};

type ModalAction = {
  inhability?: IInability | null;
  employees?: Employee[];
  id?: number;
  getData?: () => void | Promise<void>;
};

function getDefaultValues(
  inhability?: IInability | null,
  sessionRole?: string,
  sessionEmployeeId?: number
): TInputsInability {
  if (!inhability) {
    return {
      idEmployee: sessionRole === "EMPLOYEE" ? sessionEmployeeId || null : null,
      disabilityCategory: "",
      typeOfDisability: "inicial",
      dateInit: "",
      dateEnd: "",
      firstDoc: null,
      folio: "",
      notes: "",
    };
  }

  const firstDocument = inhability.documentsInability?.[0];

  return {
    idEmployee: inhability.idEmployee,
    disabilityCategory: inhability.disabilityCategory,
    typeOfDisability: inhability.typeOfDisability,
    firstDoc: null,
    folio: firstDocument?.folio || inhability.folio || "",
    notes: inhability.notes || "",
    dateInit: firstDocument?.dateInit
      ? formatDate(firstDocument.dateInit, "yyyy-MM-dd")
      : "",
    dateEnd: firstDocument?.dateEnd
      ? formatDate(firstDocument.dateEnd, "yyyy-MM-dd")
      : "",
  };
}

export default function FormUpdateInability({
  onHide,
  inhability,
  employees = [],
  id,
  getData
}: ModalBasicProps & ModalAction) {
  const session = useSessionSnapshot();
  const sessionEmployeeId = Number(session?.uid?.idEmployee);

  const {
    reset,
    register,
    handleSubmit,
    watch,
    control,
    formState: { isSubmitting, errors },
  } = useForm<TInputsInability>({
    defaultValues: getDefaultValues(
      inhability,
      session?.uid?.role,
      sessionEmployeeId
    ),
  });

  const onChangeDateInit = watch("dateInit");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const [loading, setLoading] = useState(false);

  const { modalError, modalConfirm } = useModals();

  useEffect(() => {
    setLoading(true);

    try {
      reset(
        getDefaultValues(inhability, session?.uid?.role, sessionEmployeeId)
      );
    } catch {
      modalError("No se pudo cargar la información de la incapacidad");
    } finally {
      setLoading(false);
    }
  }, [inhability, reset, modalError, session?.uid?.role, sessionEmployeeId]);

 
 
  const onSubmit: SubmitHandler<TInputsInability> = async (data) => {
    const firstDocument = inhability?.documentsInability?.[0];

    if (!id || !firstDocument) {
      setFeedbackMsg("No se encontró el documento de esta incapacidad");
      setFeedback("error");
      return;
    }

    modalConfirm("¿Deseas guardar los cambios de esta incapacidad?", async () => {

      try {
        setFeedback("loading");
        setFeedbackMsg("Actualizando incapacidad...");

        let file = data.firstDoc?.[0];

        // Mismo límite que al crear la incapacidad
        if (file && file.size > MAX_UPLOAD) {
          setFeedbackMsg("Optimizando documento...");
          file = await compressPdf(file);

          if (file.size > MAX_UPLOAD) {
            setFeedbackMsg("El documento sigue siendo muy pesado. Escanéalo con menor resolución.");
            setFeedback("error");
            return;
          }
        }

        // Primero los datos: si las fechas no son válidas, el PDF actual no se toca
        const res = await updateDocumentsInhability({
          id: Number(id),
          selfId: firstDocument.id,
          data: {
            ...firstDocument,
            folio: data.folio,
            dateInit: data.dateInit,
            dateEnd: data.dateEnd,
            expirationDateDocument: undefined,
          },
        });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo actualizar");
          setFeedback("error");
          return;
        }

        if (file) {
          setFeedbackMsg("Subiendo documento...");

          const formData = new FormData();
          formData.append("files", file);

          const upload = await updateInabilityModal({
            idDoc: String(id),
            selfId: String(firstDocument.id),
            formData,
            folio: data.folio,
          });

          if (!upload.success) {
            setFeedbackMsg(`Los datos se guardaron, pero no se pudo subir el PDF: ${upload.message}`);
            setFeedback("error");
            return;
          }
        }

        setFeedbackMsg("Incapacidad actualizada correctamente");
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

      <div className="p-2">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h4 className="mb-1 fw-bold">Actualizar incapacidad</h4>
            <p className="text-muted mb-0">
              Modifica la vigencia, el folio y, si lo necesitas, reemplaza el documento PDF.
            </p>
          </div>

          <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
            Actualizar
          </span>
        </div>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <fieldset disabled={loading || isSubmitting}>

            <Card className="border rounded-4 mb-3">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <i className="bi bi-person text-primary" />
                  <h6 className="mb-0 fw-bold">Empleado</h6>
                </div>

                <Row className="g-3">
                  <Col md={12}>
                    <RelationField
                      callBackMode="id"
                      control={control}
                      label="Empleado"
                      options={employees.map((em) => ({
                        id: Number(em.id),
                        displayName: `${em.lastName} ${em.name}`.toUpperCase(),
                        name: `${em.lastName} ${em.name}`.toUpperCase(),
                      }))}
                      register={register("idEmployee")}
                      readonly
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border rounded-4 mb-3">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <i className="bi bi-tags text-warning" />
                  <h6 className="mb-0 fw-bold">Clasificación</h6>
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <FieldSelect
                      label="Categoría:"
                      className="text-uppercase border"
                      options={[
                        { label: "Enfermedad general", value: "enfermedad general" },
                        { label: "Riesgo de trabajo", value: "riesgo de trabajo" },
                        { label: "Maternidad", value: "maternidad" },
                      ]}
                      register={register("disabilityCategory")}
                      readonly
                    />
                  </Col>

                  <Col md={6}>
                    <FieldSelect
                      label="Tipo:"
                      className="text-uppercase border"
                      options={[
                        { label: "Inicial", value: "inicial" },
                        { label: "Subsecuente", value: "subsecuente" },
                        { label: "Alta", value: "alta" },
                      ]}
                      register={register("typeOfDisability")}
                      readonly
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border rounded-4 mb-3">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <i className="bi bi-calendar-range text-success" />
                  <h6 className="mb-0 fw-bold">Vigencia</h6>
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <Entry
                      label="Fecha inicio:"
                      type="date"
                      register={register("dateInit", { required: true })}
                      readonly={session?.uid?.role === "EMPLOYEE"}
                      invalid={!!errors.dateInit}
                      className="border"
                    />
                  </Col>

                  <Col md={6}>
                    <Entry
                      label="Fecha fin:"
                      type="date"
                      min={onChangeDateInit}
                      register={register("dateEnd", { required: true })}
                      readonly={session?.uid?.role === "EMPLOYEE"}
                      invalid={!!errors.dateEnd}
                      className="border"
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border rounded-4">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <i className="bi bi-upc-scan text-info" />
                  <h6 className="mb-0 fw-bold">Documento CITT</h6>
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Reemplazar PDF (opcional):</Form.Label>
                      <Form.Control
                        type="file"
                        accept=".pdf"
                        className="border"
                        {...register("firstDoc")}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Entry
                      register={register("folio", { required: true })}
                      label="Folio CITT:"
                      className="text-uppercase border"
                      invalid={!!errors.folio}
                      feedBack="El folio es obligatorio"
                    />
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
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </div>

          </fieldset>
        </Form>
      </div>
    </>
  );
}