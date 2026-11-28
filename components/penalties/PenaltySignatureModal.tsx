"use client"

import { useModals } from "@/context/ModalContext";
import { ModalBasicProps } from "@/lib/definitions";
import { useRouter } from "next/navigation";
import { Button, Modal, Form } from "react-bootstrap";
import { SubmitHandler, useForm } from "react-hook-form";
import { SignatureInput } from "../fields";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import { useState } from "react";
import { sendSignaturePenalty } from "@/app/actions/penalties-actions";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";

type FeedbackState = "loading" | "success" | "error" | null;

type TInputs = {
    signature: string;
};

function PenaltySignatureModal({
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
    const router = useRouter();
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    // 409: la firma del líder ya la registró el líder o el subgerente; al cerrar el aviso se recarga el detalle
    const [conflict, setConflict] = useState(false);

    const onSubmit: SubmitHandler<TInputs> = async (data) => {
        onHide();

        modalConfirm("¿Seguro que quieres guardar la firma?", async () => {
            try {

                setFeedback("loading");
                setFeedbackMsg("Enviando firma...");


                const res = await sendSignaturePenalty({
                    id: id ? Number(id) : null,
                    signature: data.signature,
                });

                if (!res.success) {
                    setConflict(res.status === 409);
                    setFeedbackMsg(res.message || "No se pudo mandar la firma");
                    setFeedback("error");
                    return;
                }

                setFeedbackMsg(res.message || "Firma enviada correctamente");
                setFeedback("success");
                onHide();
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

    const [, setLoading] = useState(false);
    const [, setMessageLoading] = useState("");

    return (
        <>
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
                        <Form.Group>
                            <Form.Label className="fw-semibold">
                                Dibuja tu firma
                            </Form.Label>

                            <div>
                                <SignatureInput
                                    control={control}
                                    name="signature"
                                    register={register}
                                />
                            </div>
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

export default PenaltySignatureModal;