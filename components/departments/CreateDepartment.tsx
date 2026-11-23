"use client";

import { createDepartment } from "@/app/actions/departments-actions";
import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import { Entry, RelationField } from "@/components/fields";
import { useModals } from "@/context/ModalContext";
import { Department, Employee } from "@/lib/definitions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Col, Container, Form, Row } from "react-bootstrap";
import { SubmitHandler, useForm } from "react-hook-form";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";

type FeedbackState = "loading" | "success" | "error" | null;

const DEFAULT_VALUES: Department = {
  nameDepartment: "",
  description: "",
  idLeader: null,
  positions: [],
};

export default function CreateDepartmentComponent({
  employees = [],
}: {
  employees?: Employee[];
}) {
  const {
    register,
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Department>({
    defaultValues: DEFAULT_VALUES,
  });

  const { modalConfirm } = useModals();
  const router = useRouter();
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);


  const [loading, setLoading] = useState(false);
  const [, setMessageLoading] = useState("");

  const handleBack = () => {
    setLoading(true);
    setMessageLoading("Cargando...");
    router.push("/app/departments");
  };

  const onSubmit: SubmitHandler<Department> = async (data) => {
    modalConfirm("¿Seguro que quieres guardar este departamento?", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg("Guardando departamento...");

        const res = await createDepartment({ data });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo crear el departamento");
          setFeedback("error");
          return;
        }

        setFeedbackMsg(res.message || "Departamento creado correctamente");
        setFeedback("success");
        setTimeout(() => {
          router.push("/app/departments");
        }, 1200);
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

      <Container className="justify-content-between" style={{ maxWidth: "1200px" }}>
        <Row className="m-2">
          <Col xs={12}>
            <Form onSubmit={handleSubmit(onSubmit)}>
              <fieldset disabled={isSubmitting || loading}>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
                  <div>
                    <h1 className="mb-1">Crear departamento</h1>
                    <p className="text-muted mb-0">
                      Registra la información del departamento.
                    </p>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      variant="outline-secondary"
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleBack}
                    >
                      Cancelar
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isSubmitting || loading || !isDirty}
                      onClick={() => reset(DEFAULT_VALUES)}
                    >
                      Limpiar
                    </Button>

                    <Button
                      className="bg-success border-success"
                      type="submit"
                      disabled={isSubmitting || loading}
                    >
                      {isSubmitting || loading ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>

                <Card className="rounded-4 shadow-sm mb-3">
                  <Card.Body className="p-3 p-md-5">
                    <div className="mb-4">
                      <h5 className="fw-semibold mb-1">Datos generales</h5>
                      <p className="text-muted mb-3">
                        Captura la información básica del departamento.
                      </p>

                      <Card className="border rounded-4 mb-3">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-2 mb-4">
                            <i className="bi bi-diagram-3 text-primary" />
                            <h6 className="mb-0 fw-bold">Datos del departamento</h6>
                          </div>

                          <Row className="g-3">
                            <Col md={6}>
                              <Entry
                                register={register("nameDepartment", {
                                  required: "Este campo es requerido",
                                })}
                                label="Nombre:"
                                invalid={!!errors.nameDepartment}
                                feedBack={errors.nameDepartment?.message}
                                className="text-uppercase border"
                              />
                            </Col>

                            <Col md={6}>
                              <RelationField
                                register={register("idLeader")}
                                label="Líder:"
                                control={control}
                                callBackMode="id"
                                className="text-uppercase border"
                                options={employees.map((emp) => ({
                                  id: emp.id ?? 0,
                                  displayName: `${emp.lastName?.toUpperCase()} ${emp.name?.toUpperCase()}`,
                                  name: `${emp.lastName?.toUpperCase()} ${emp.name?.toUpperCase()}`,
                                }))}
                              />
                            </Col>

                            <Col md={12}>
                              <Entry
                                register={register("description", {
                                  validate: (value) => !!String(value ?? "").trim() || "Este campo es requerido",
                                })}
                                label="Descripción:"
                                invalid={!!errors.description}
                                feedBack={errors.description?.message}
                                className="border text-uppercase"
                              />
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </div>
                  </Card.Body>
                </Card>
              </fieldset>
            </Form>
          </Col>
        </Row>
      </Container>
    </>
  );
}