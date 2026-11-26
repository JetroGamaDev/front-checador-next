"use client";

import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import { Entry } from "@/components/fields";
import { useModals } from "@/context/ModalContext";
import { Branch, ModalBasicProps } from "@/lib/definitions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import { SubmitHandler, useForm } from "react-hook-form";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import { updateBranch } from "@/app/actions/branches-actionst";

type FeedbackState = "loading" | "success" | "error" | null;

type ModalAction = {
  id: number;
  branch?: Branch | null;
};

function getDefaultValues(branch?: Branch | null): Branch {
  return {
    name: branch?.name || "",
    idManager: branch?.idManager || null,
    street: branch?.address?.street || "",
    numberIn: branch?.address?.numberIn || "",
    numberOut: branch?.address?.numberOut || "",
    state: branch?.address?.state || "",
    country: branch?.address?.country || "México",
    neighborhood: branch?.address?.neighborhood || "",
    municipality: branch?.address?.municipality || "",
    zipCode: branch?.address?.zipCode || 0,
    lng: branch?.address?.coordinates?.lng || 0,
    lat: branch?.address?.coordinates?.lat || 0,
  };
}

export default function FormUpdateBranch({
  onHide,
  id,
  branch,
}: ModalBasicProps & ModalAction) {
  const {
    reset,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Branch>({
    defaultValues: getDefaultValues(branch),
  });

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { modalError, modalConfirm } = useModals();
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    setLoading(true);

    try {
      reset(getDefaultValues(branch));
    } catch {
      modalError("No se pudo cargar la información de la sucursal");
    } finally {
      setLoading(false);
    }
  }, [branch, reset, modalError]);

  const onSubmit: SubmitHandler<Branch> = async (data) => {
    modalConfirm("¿Seguro que quieres guardar los cambios?", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg("Actualizando sucursal...");

        const res = await updateBranch({
          id: Number(id),
          branch: data,
        });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo actualizar la sucursal");
          setFeedback("error");
          return;
        }

        setFeedbackMsg(res.message || "Sucursal actualizada correctamente");
        setFeedback("success");
        router.refresh();
      } catch {
        setFeedbackMsg("Error inesperado, intenta de nuevo");
        setFeedback("error");
      }
    });
  };

  return (
    <>
      <ConditionalRender cond={loading || isSubmitting}>
        <Loading message={isSubmitting ? "Guardando..." : "Cargando..."} />
      </ConditionalRender>

      <ConditionalRender cond={feedback === "loading"}>
        <Loading message={feedbackMsg || "Guardando..."} />
      </ConditionalRender>

      <ConditionalRender cond={feedback === "success"}>
        <SuccessOverlay
          message={feedbackMsg}
          onDone={() => {
            setFeedback(null);
            onHide();
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
            <h4 className="mb-1 fw-bold">Sucursal</h4>
            <p className="text-muted mb-0">
              Registra el nombre, domicilio y ubicación de la sucursal.
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
                  <i className="bi bi-building text-primary" />
                  <h6 className="mb-0 fw-bold">Identificación</h6>
                </div>

                <Row className="g-3">
                  <Col md={12}>
                    <Entry
                      register={register("name", { required: "Este campo es requerido" })}
                      label="Nombre:"
                      invalid={!!errors.name}
                      feedBack={errors.name?.message}
                      className="border text-uppercase"
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border rounded-4 mb-3">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <i className="bi bi-house text-warning" />
                  <h6 className="mb-0 fw-bold">Domicilio</h6>
                </div>

                <Row className="g-3">
                  <Col md={8}>
                    <Entry
                      register={register("street", { required: "Este campo es requerido" })}
                      label="Calle:"
                      invalid={!!errors.street}
                      feedBack={errors.street?.message}
                      className="border text-uppercase"
                    />
                  </Col>

                  <Col md={4}>
                    <Entry
                      register={register("numberOut", { required: "Número exterior es requerido" })}
                      label="Ext:"
                      invalid={!!errors.numberOut}
                      feedBack={errors.numberOut?.message}
                      className="border text-uppercase"
                    />
                  </Col>

                  <Col md={4}>
                    <Entry
                      register={register("numberIn")}
                      label="Int:"
                      invalid={!!errors.numberIn}
                      feedBack={errors.numberIn?.message}
                      className="border text-uppercase"
                    />
                  </Col>

                  <Col md={4}>
                    <Entry
                      register={register("zipCode")}
                      label="C.P.:"
                      invalid={!!errors.zipCode}
                      feedBack={errors.zipCode?.message}
                      className="border text-uppercase"
                    />
                  </Col>

                  <Col md={4}>
                    <Entry
                      register={register("neighborhood", { required: "Colonia es requerida" })}
                      label="Colonia:"
                      invalid={!!errors.neighborhood}
                      feedBack={errors.neighborhood?.message}
                      className="border text-uppercase"
                    />
                  </Col>

                  <Col md={6}>
                    <Entry
                      register={register("municipality", { required: "Municipio es requerido" })}
                      label="Municipio:"
                      invalid={!!errors.municipality}
                      feedBack={errors.municipality?.message}
                      className="border text-uppercase"
                    />
                  </Col>

                  <Col md={6}>
                    <Entry
                      register={register("state", { required: "Estado es requerido" })}
                      label="Estado:"
                      invalid={!!errors.state}
                      feedBack={errors.state?.message}
                      className="border text-uppercase"
                    />
                  </Col>

                  <Col md={12}>
                    <Entry
                      register={register("country", { required: "País es requerido" })}
                      label="País:"
                      invalid={!!errors.country}
                      feedBack={errors.country?.message}
                      className="border text-uppercase"
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border rounded-4">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <i className="bi bi-geo-alt text-success" />
                  <h6 className="mb-0 fw-bold">Geolocalización</h6>
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <Entry
                      register={register("lat")}
                      label="Latitud:"
                      invalid={!!errors.lat}
                      feedBack={errors.lat?.message}
                      className="border text-uppercase"
                    />
                  </Col>

                  <Col md={6}>
                    <Entry
                      register={register("lng")}
                      label="Longitud:"
                      invalid={!!errors.lng}
                      feedBack={errors.lng?.message}
                      className="border text-uppercase"
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
                {isSubmitting ? "Actualizando..." : "Actualizar"}
              </Button>
            </div>

          </fieldset>
        </Form>
      </div>
    </>
  );
}