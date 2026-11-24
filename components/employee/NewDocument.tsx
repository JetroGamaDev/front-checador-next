"use client";

import { createNewDocumentEmployee } from "@/app/actions/employee-actions";
import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import SuccessOverlay from "@/components/SuccessOverlay";
import ErrorOverlay from "@/components/ErrorOverlay";
import { Entry } from "@/components/fields";
import { useState } from "react";
import { Alert, Button, Card, Col, Form, Row } from "react-bootstrap";
import { SubmitHandler, useForm } from "react-hook-form";

type TInputs = {
  nameDocument: string;
};

type FeedbackState = "loading" | "success" | "error" | null;

// La plantilla se crea solo para el empleado del perfil abierto
export default function NewDocumentEmployeeComponent({
  idEmployee,
  onClose,
  onSuccess,
}: {
  idEmployee: number;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TInputs>({
    defaultValues: {
      nameDocument: "",
    },
  });

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const loading = feedback === "loading";

  const onSubmit: SubmitHandler<TInputs> = async (data) => {
    try {
      setFeedback("loading");
      setFeedbackMsg("Creando nueva plantilla...");

      const res = await createNewDocumentEmployee({
        idEmployee,
        nameDocument: data.nameDocument,
      });

      if (!res.success) {
        setFeedbackMsg(res.message || "No se pudo crear la plantilla");
        setFeedback("error");
        return;
      }

      setFeedbackMsg(res.message || "Nueva plantilla creada correctamente");
      setFeedback("success");
    } catch {
      setFeedbackMsg("Error inesperado, intenta de nuevo");
      setFeedback("error");
    }
  };

  return (
    <div className="p-2">
      <ConditionalRender cond={loading}>
        <Loading message={feedbackMsg} />
      </ConditionalRender>
      <ConditionalRender cond={feedback === "success"}>
        <SuccessOverlay
          message={feedbackMsg}
          onDone={() => {
            setFeedback(null);
            onSuccess?.();
            onClose();
          }}
        />
      </ConditionalRender>
      <ConditionalRender cond={feedback === "error"}>
        <ErrorOverlay message={feedbackMsg} onDone={() => setFeedback(null)} />
      </ConditionalRender>

      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1 fw-bold">Nueva plantilla</h4>
          <p className="text-muted mb-0">
            Crea un nuevo apartado de documento solo para este empleado.
          </p>
        </div>

        <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
          Nuevo
        </span>
      </div>

      <Alert variant="info" className="rounded-4">
        Captura el nombre visible de la nueva plantilla. El documento se agregará
        únicamente al expediente de este empleado.
      </Alert>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={loading || isSubmitting}>

          <Card className="border rounded-4 mb-3">
            <Card.Body>
              <div className="d-flex align-items-center gap-2 mb-4">
                <i className="bi bi-file-earmark-text text-primary" />
                <h6 className="mb-0 fw-bold">Datos de la plantilla</h6>
              </div>

              <Row className="g-3">
                <Col md={12}>
                  <Entry
                    register={register("nameDocument", {
                      validate: (value) => {
                        const length = value.trim().length;
                        if (!length) return "El nombre del documento es requerido";
                        if (length < 2 || length > 60) return "El nombre debe tener entre 2 y 60 caracteres";
                        return true;
                      },
                    })}
                    label="Nombre del documento:"
                    invalid={!!errors.nameDocument}
                    feedBack={errors.nameDocument?.message}
                    className="text-uppercase border"
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading || isSubmitting}
            >
              Cancelar
            </Button>

            <Button type="submit" variant="success" disabled={loading || isSubmitting}>
              Crear plantilla
            </Button>
          </div>

        </fieldset>
      </Form>
    </div>
  );
}