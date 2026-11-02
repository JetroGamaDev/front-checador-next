"use client";

import { useEffect, useState } from "react";
import { Button, Card, Col, Container, Form, Row } from "react-bootstrap";
import { SubmitHandler, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import { ImageField } from "@/components/fields/ImageField";
import { useModals } from "@/context/ModalContext";
import { User } from "@/lib/definitions";
import { loadAvatar } from "@/app/actions/user-actions";
import { createUserImage, deleteUserImage } from "@/app/actions/image-field-actions";
import ProfileError from "./profileMessageError";
import TwoFactorCard from "./TwoFactorCard";
import TutorialsCard from "./TutorialsCard";
import PasswordSystemModal from "./PasswordSystemModal";

type FeedbackState = "loading" | "success" | "error" | null;

type TInputsPhoto = {
  imageUrl: string | File | null;
};

function formatText(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

// Perfil de la sesión de empleado: solo puede ver sus datos, cambiar su foto y administrar su 2FA
export default function EmployeeProfileView({
  me,
}: {
  me: User | null;
}) {
  const {
    handleSubmit,
    control,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<TInputsPhoto>({
    defaultValues: { imageUrl: null },
  });

  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const { modalConfirm } = useModals();
  const router = useRouter();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  // La primera vez se confirma con el NIP; ya creada, con la contraseña actual
  const [passwordPending, setPasswordPending] = useState(me?.passwordSystemPending === true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const res = await loadAvatar();
      if (!active || !res.success) return;
      reset({ imageUrl: res.data ?? null });
    };
    run();
    return () => { active = false; };
  }, [reset]);

  if (!me) {
    return (
      <ProfileError />
    );
  }

  const upperCase = (text?: string) => {
    return text?.toUpperCase() || "";
  };

  const onSubmit: SubmitHandler<TInputsPhoto> = async (data) => {
    modalConfirm("¿Seguro que quieres guardar tu foto de perfil?", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg(data.imageUrl ? "Subiendo foto..." : "Eliminando foto...");

        // Con el bote de basura de ImageField el valor queda en null → se elimina la foto
        if (!data.imageUrl) {
          const res = await deleteUserImage();

          if (!res.success) {
            setFeedbackMsg(res.message || "No se pudo eliminar la foto");
            setFeedback("error");
            return;
          }

          const avatar = await loadAvatar();
          reset({ imageUrl: avatar.success ? avatar.data ?? null : null });

          setFeedbackMsg(res.message || "Imagen eliminada correctamente");
          setFeedback("success");
          router.refresh();
          return;
        }

        const res = await createUserImage({ imageUrl: data.imageUrl });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo subir la foto");
          setFeedback("error");
          return;
        }

        reset({ imageUrl: res.data ?? null });

        setFeedbackMsg(res.message || "Imagen subida correctamente");
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
      <ConditionalRender cond={feedback === "loading"}>
        <Loading message={feedbackMsg || "Guardando..."} />
      </ConditionalRender>

      <ConditionalRender cond={feedback === "success"}>
        <SuccessOverlay
          message={feedbackMsg}
          onDone={() => setFeedback(null)}
        />
      </ConditionalRender>

      <ConditionalRender cond={feedback === "error"}>
        <ErrorOverlay
          message={feedbackMsg}
          onDone={() => setFeedback(null)}
        />
      </ConditionalRender>

      <Container className="py-3 overflow-x: auto" style={{ maxWidth: "1600px" }}>

        <div className="d-flex flex-nowrap gap-2 mb-4">
          <Button
            className="d-inline-flex align-items-center fw-semibold px-3"
            variant="secondary"
            onClick={() => setShowPasswordModal(true)}
          >
            <i className="bi bi-key me-2" />
            Cambiar contraseña
          </Button>
        </div>

        <div>
          <h1 className="ms-1">
            {`${upperCase(me.name)} ${upperCase(me.lastName)}`}
          </h1>

          <p className="text-muted mb-1 ms-1">
            Consulta tu información y administra la seguridad de tu cuenta.
          </p>
        </div>

        <Card className="rounded-4 shadow-sm border">
          <Card.Body className="p-3 p-md-5">
            <Row className="g-2">
              <Col xs={12} lg={6}>
                <Card className="border rounded-4 h-100">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center justify-content-between mb-4">
                      <h6 className="mb-0 fw-bold">Foto de perfil</h6>

                      <span className="badge rounded-pill px3 py-2 fw-semibold bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                        Perfil
                      </span>
                    </div>

                    <Form onSubmit={handleSubmit(onSubmit)}>
                      <fieldset disabled={isSubmitting}>
                        <div className="d-flex flex-column align-items-center">
                          <ImageField
                            name="imageUrl"
                            width={150}
                            height={150}
                            control={control}
                            editable={true}
                          />

                          <p className="text-muted small text-center mb-3">
                            Haz clic en la imagen para elegir una nueva foto (.jpg, .jpeg o .png).
                          </p>

                          <Button
                            type="submit"
                            variant="success"
                            className="d-inline-flex align-items-center justify-content-center fw-semibold px-3"
                            disabled={!isDirty || isSubmitting}
                          >
                            <i className="bi bi-image me-2" />
                            {isSubmitting ? "Guardando..." : "Guardar foto"}
                          </Button>
                        </div>
                      </fieldset>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12} lg={6}>
                <Card className="border rounded-4 h-100">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center justify-content-between mb-4">
                      <h6 className="mb-0 fw-bold">Datos personales</h6>

                      <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                        Empleado
                      </span>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex align-items-start justify-content-between gap-3 border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2 text-muted">
                          <i className="bi bi-person text-primary" />
                          <span>Nombre</span>
                        </div>

                        <span className="fw-semibold text-end text-uppercase">
                          {formatText(me.name)}
                        </span>
                      </div>

                      <div className="d-flex align-items-start justify-content-between gap-3 border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2 text-muted">
                          <i className="bi bi-person-lines-fill text-primary" />
                          <span>Apellidos</span>
                        </div>

                        <span className="fw-semibold text-end text-uppercase">
                          {formatText(me.lastName)}
                        </span>
                      </div>

                      <div className="d-flex align-items-start justify-content-between gap-3">
                        <div className="d-flex align-items-center gap-2 text-muted">
                          <i className="bi bi-hash text-secondary" />
                          <span>ID Empleado</span>
                        </div>

                        <span className="fw-semibold text-end">
                          {formatText(me.idCheck)}
                        </span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12}>
                <TwoFactorCard twoFactorEnabled={me.twoFactorEnabled === true} />
              </Col>

              <Col xs={12}>
                <TutorialsCard enableTutorials={me.enableTutorials !== false} />
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Container>

      {showPasswordModal && (
        <PasswordSystemModal
          firstTime={passwordPending}
          idCheck={me.idCheck ?? null}
          onClose={() => setShowPasswordModal(false)}
          onSaved={() => {
            setShowPasswordModal(false);
            setPasswordPending(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
