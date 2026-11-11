"use client";

import { useState } from "react";
import { Button, Card, Col, Container, Row } from "react-bootstrap";
import ModalBlur from "@/components/ModalBlur";
import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import { User } from "@/lib/definitions";
import FormUpdateProfile from "./UpdateProfile";
import ChangePasswordModal from "@/app/(auth)/app/users/views/ModalChangePassword";
import ProfileError from "./profileMessageError";
import { formatLabel } from "../devices/DevicesTableClient";
import TwoFactorCard from "./TwoFactorCard";
import TutorialsCard from "./TutorialsCard";


function formatText(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}


export default function UserProfileView({
  user,
  me,
}: {
  user: User | null;
  me?: User | null;
}) {
  const [showUpdateProfileModal, setShowUpdateProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [loading] = useState(false);
  const [messageLoading] = useState("Cargando datos...");


  // useEffect(() => {
  //   if (user) {
  //     setLoading(false);
  //   }
  // }, [user])

  if (!user) {
    return (
      <ProfileError />
    );
  }

  const upperCase = (text?: string) => {
    return text?.toUpperCase() || "";
  };

  const getUser = (u: User) => {
    return (`${upperCase(u.name)} ${upperCase(u.lastName)}`)
  }

  // La verificación en dos pasos solo se administra en el perfil propio y nunca para el checador
  const showTwoFactor = !!me && Number(me.id) === Number(user.id) && me.role !== "CHECADOR";
  const twoFactorEnabled = me?.twoFactorEnabled === true;

  return (
    <>

      <ConditionalRender cond={loading}>
        <Loading message={messageLoading} />
      </ConditionalRender>

      <Container className="py-3 overflow-x: auto" style={{ maxWidth: "1600px" }}>


        <div className="d-flex flex-nowrap gap-2 mb-4">
          <Button
            className="d-inline-flex align-items-center fw-semibold px-3"
            variant="primary"
            onClick={() => setShowUpdateProfileModal(true)}
          >
            <i className="bi bi-pencil me-2" />
            Actualizar perfil
          </Button>

          <Button
            className="d-inline-flex align-items-center fw-semibold px-3"
            variant="secondary"
            onClick={() => setShowChangePasswordModal(true)}
          >
            <i className="bi bi-key me-2" />
            Cambiar contraseña
          </Button>
        </div>


        <div>
          <h1 className="ms-1">
            {getUser(user)}
          </h1>

          <p className="text-muted mb-1 ms-1">
            Consulta y administra la información de tu cuenta.
          </p>
        </div>

        <Card className="rounded-4 shadow-sm border">
          <Card.Body className="p-3 p-md-5">
            <Row className="g-2">
              <Col xs={12} lg={6}>
                <Card className="border rounded-4 h-100">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center justify-content-between mb-4">
                      <h6 className="mb-0 fw-bold">Datos personales</h6>

                      <span className="badge rounded-pill px3 py-2 fw-semibold bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                        Perfil
                      </span>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex align-items-start justify-content-between gap-3 border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2 text-muted">
                          <i className="bi bi-person text-primary" />
                          <span>Nombre</span>
                        </div>

                        <span className="fw-semibold text-end text-uppercase">
                          {formatText(user.name)}
                        </span>
                      </div>

                      <div className="d-flex align-items-start justify-content-between gap-3 border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2 text-muted">
                          <i className="bi bi-person-lines-fill text-primary" />
                          <span>Apellidos</span>
                        </div>

                        <span className="fw-semibold text-end text-uppercase">
                          {formatText(user.lastName)}
                        </span>
                      </div>

                      <div className="d-flex align-items-start justify-content-between gap-3 border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2 text-muted">
                          <i className="bi bi-telephone text-success" />
                          <span>Teléfono</span>
                        </div>

                        <span className="fw-semibold text-end">
                          {formatText(user.phone?.internationalNumber)}
                        </span>
                      </div>

                      <div className="d-flex align-items-start justify-content-between gap-3">
                        <div className="d-flex align-items-center gap-2 text-muted">
                          <i className="bi bi-gender-ambiguous text-info" />
                          <span>Género</span>
                        </div>

                        <span className="fw-semibold text-end">
                          {formatText(user.gender)}
                        </span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12} lg={6}>
                <Card className="border rounded-4 h-100">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center justify-content-between mb-4">
                      <h6 className="mb-0 fw-bold">Cuenta</h6>

                      <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                        Acceso
                      </span>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex align-items-start justify-content-between gap-3 border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2 text-muted">
                          <i className="bi bi-envelope text-primary" />
                          <span>Correo</span>
                        </div>

                        <span className="fw-semibold text-end text-break">
                          {formatText(user.email)}
                        </span>
                      </div>

                      <div className="d-flex align-items-start justify-content-between gap-3 border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2 text-muted">
                          <i className="bi bi-person-badge text-warning" />
                          <span>Rol</span>
                        </div>

                        <span className="fw-semibold text-end">
                          {formatLabel(user.role)}
                        </span>
                      </div>

                      <div className="d-flex align-items-start justify-content-between gap-3 border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2 text-muted">
                          <i className="bi bi-check-circle text-success" />
                          <span>Estatus</span>
                        </div>

                        <span className="fw-semibold text-end text-uppercase">
                          {user.status === 1
                            ? "Activo"
                            : user.status === 2
                              ? "Suspendido"
                              : user.status === 3
                                ? "Eliminado"
                                : "-"}
                        </span>
                      </div>

                      <div className="d-flex align-items-start justify-content-between gap-3">
                        <div className="d-flex align-items-center gap-2 text-muted">
                          <i className="bi bi-hash text-secondary" />
                          <span>ID Empleado</span>
                        </div>

                        {/* Número de empleado (idCheck de /me). Null = usuario del sistema sin empleado ligado */}
                        <span className="fw-semibold text-end">
                          {user.idCheck ?? "—"}
                        </span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <ConditionalRender cond={showTwoFactor}>
                <Col xs={12}>
                  <TwoFactorCard twoFactorEnabled={twoFactorEnabled} />
                </Col>
                <Col xs={12}>
                  <TutorialsCard enableTutorials={me?.enableTutorials !== false} />
                </Col>
              </ConditionalRender>
            </Row>
          </Card.Body>
        </Card>

        <ConditionalRender cond={showUpdateProfileModal}>
          <ModalBlur onClose={() => setShowUpdateProfileModal(false)}>
            <FormUpdateProfile
              show={showUpdateProfileModal}
              onHide={() => setShowUpdateProfileModal(false)}
              user={user}
              id={user.id}
            />
          </ModalBlur>
        </ConditionalRender>

        <ConditionalRender cond={showChangePasswordModal}>
          <ModalBlur onClose={() => setShowChangePasswordModal(false)}>
            <ChangePasswordModal
              show={showChangePasswordModal}
              userId={Number.isFinite(Number(user.id)) ? Number(user.id) : null}
              onHide={() => setShowChangePasswordModal(false)}
            />
          </ModalBlur>
        </ConditionalRender>

      </Container>
    </>
  );
}