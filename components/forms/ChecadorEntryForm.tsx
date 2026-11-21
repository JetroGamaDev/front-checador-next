"use client";

import { TCheckData } from "@/app/(auth)/app/checador/views/ChecadorFormView";
import { ActionResponse } from "@/lib/definitions";
import { useEffect, useRef, useState } from "react";
import { Button, Col, Form, Row } from "react-bootstrap";
import { useForm, SubmitHandler } from "react-hook-form";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";

type FeedbackState = "loading" | "success" | "error" | null;

type TInputs = {
  idCheck: string;
  passwordCheck: string;
};

type Props = {
  receiveCheckData: (data: TCheckData) => Promise<ActionResponse<string>>;
  disabled?: boolean;
  onBack: () => void;
  onHide: () => void;
  // Checador "solo NIP": sin el botón para regresar a validar por rostro
  allowFace?: boolean;
  // Modo checador del empleado: su número de empleado ya capturado y sin poder editarlo
  fixedIdCheck?: string;
};

function ChecadorEntryForm({
  receiveCheckData,
  disabled = false,
  onBack,
  onHide,
  allowFace = true,
  fixedIdCheck,
}: Props) {
  const passwordRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { isSubmitting, errors, isDirty },
  } = useForm<TInputs>({
    defaultValues: {
      idCheck: fixedIdCheck ?? "",
      passwordCheck: "",
    },
  });

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const displayState = feedback ?? (isSubmitting ? "loading" : null);

  const onSubmit: SubmitHandler<TInputs> = async (formData) => {
    if (disabled) return;

    const res = await receiveCheckData(formData);

    if (!res.success) {
      setFeedback("error");
      setFeedbackMsg(res.message);

      reset({ idCheck: fixedIdCheck ?? "", passwordCheck: "" });
      setTimeout(() => setFocus(fixedIdCheck ? "passwordCheck" : "idCheck"), 100); 
      return;
    }

    setFeedback("success");
    setFeedbackMsg(res.data ?? "Registro completado");

    reset({ idCheck: fixedIdCheck ?? "", passwordCheck: "" });
    setTimeout(() => setFocus(fixedIdCheck ? "passwordCheck" : "idCheck"), 100);
  };


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !disabled) {
        e.preventDefault();
        setFocus("idCheck");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setFocus, disabled]);

  const handleBack = () => {
    onBack();
  }

  return (
    <>
      <ConditionalRender cond={displayState === "loading"}>
        <Loading message="Cargando..." />
      </ConditionalRender>

      <ConditionalRender cond={displayState === "success"}>
        <SuccessOverlay
          message={feedbackMsg}
          onDone={() => {
            setFeedback(null);
            onHide();
          }}
        />
      </ConditionalRender>

      <ConditionalRender cond={displayState === "error"}>
        <ErrorOverlay
          message={feedbackMsg}
          onDone={() => setFeedback(null)}
        />
      </ConditionalRender>

      <Row className="m-0" style={{ minWidth: '40%' }}>
        <Col md="12" className="px-0">
          <Form className="card bg-body-tertiary border-0 mt-2 w-100" onSubmit={handleSubmit(onSubmit)}>
            <fieldset className="card-body" disabled={isSubmitting || disabled}>

              {/* Apartao de codido */}
              <Form.Group className="mb-2">
                <Form.Control
                  type="text"
                  placeholder="Código"
                  className="text-center fw-bold"
                  size="lg"
                  autoComplete="off"
                  autoFocus={!disabled && !fixedIdCheck}
                  readOnly={!!fixedIdCheck}
                  {...register("idCheck")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      passwordRef.current?.focus();
                    }
                  }}
                />
              </Form.Group>

              {/* Apartado de contrasena */}
              <Form.Group>
                <Form.Control
                  type="password"
                  placeholder="Contraseña"
                  className="text-center fw-bold"
                  size="lg"
                  autoComplete="off"
                  {...register("passwordCheck")}
                  ref={(e) => {
                    register("passwordCheck").ref(e);
                    passwordRef.current = e;
                  }}
                  isInvalid={!!errors.passwordCheck}
                />
              </Form.Group>

              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div className="d-flex gap-2 flex-wrap">

                  <Button
                    type="submit"
                    variant="info"
                    className="mt-2"
                    disabled={isSubmitting || disabled || !isDirty}>
                    {isSubmitting ? "Registrando..." : "Completar registro"}
                  </Button>
                </div>

                <ConditionalRender cond={allowFace}>
                  <div className=" d-md-flex flex-wrap">

                    <Button
                      type="button"
                      variant="outline-secondary"
                      className="mt-2"
                      onClick={handleBack}
                    >
                      <i className="bi bi-arrow-left me-2" />
                      Validar por rostro
                    </Button>
                  </div>
                </ConditionalRender>
              </div>
            </fieldset>
          </Form>
        </Col>
      </Row>

      <Row className="my-6">
        <Col lg="12">
          <Form.Control.Feedback type="invalid">
            {errors.passwordCheck?.message}
          </Form.Control.Feedback>
        </Col>
      </Row>
    </>
  );
}

export default ChecadorEntryForm;