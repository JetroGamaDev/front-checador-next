"use client";

import { signatureDohPermission } from "@/app/actions/permissions-actions";
import ConditionalRender from "@/components/ConditionalRender";
import ErrorOverlay from "@/components/ErrorOverlay";
import { SignatureInput } from "@/components/fields";
import Loading from "@/components/LoadingSpinner";
import SuccessOverlay from "@/components/SuccessOverlay";
import { useModals } from "@/context/ModalContext";
import { ModalBasicProps } from "@/lib/definitions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { useForm, SubmitHandler } from "react-hook-form";

type FeedbackState = "loading" | "success" | "error" | null;

type TInputs = {
  signature: string;
};

function EmployeeSignatureModal({
  show,
  onHide,
  id,
  title = "Firma del Empleado",
}: ModalBasicProps & { id: string; title?: string }) {
  const {
    reset,
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<TInputs>();

  const { modalConfirm } = useModals();
  const router = useRouter(); const [loading, setLoading] = useState(false);
  const [, setMessageLoading] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  // 409: la firma del líder ya la registró otra persona; al cerrar el aviso se recarga el detalle
  const [conflict, setConflict] = useState(false);

  const onSubmit: SubmitHandler<TInputs> = async (data) => {
    modalConfirm("¿Seguro que quieres guardar la firma?", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg("Enviando firma...");

        const res = await signatureDohPermission({
          data: { id, signature: data.signature },
        });

        if (!res.success) {
          setConflict(res.status === 409);
          setFeedbackMsg(res.message || "No se pudo mandar la firma");
          setFeedback("error");
          return;
        }

        setFeedbackMsg(res.message || "Firma enviada correctamente");
        setFeedback("success");
        router.refresh();
      } catch {
        setFeedbackMsg("Error inesperado, intenta de nuevo");
        setFeedback("error");
      } finally {
        setLoading(false);
        setMessageLoading("");
      }
    });
  };

  const handleOnExited = () => {
    reset({ signature: "" });
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
          onDone={() => {
            setFeedback(null);
            if (conflict) {
              setConflict(false);
              onHide();
              router.refresh();
            }
          }}
        />
      </ConditionalRender>

      <Modal
        show={show}
        onHide={onHide}
        backdrop="static"
        onExited={handleOnExited}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Body>
            <Form.Group className="mb-2">
              <SignatureInput
                control={control}
                name="signature"
                register={register}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={onHide}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-success border-success"
              disabled={isSubmitting}
            >
              Enviar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}

export default EmployeeSignatureModal;
