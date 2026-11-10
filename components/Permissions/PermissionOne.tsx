"use client";

import { useMemo, useState } from "react";
import { Button, Card, Col, Container, Row } from "react-bootstrap";
import { useSessionSnapshot } from "@/hooks/useSessionStore";
import { FormBook, FormPage } from "../templates/FormView";
import SignaturesView from "@/app/(auth)/app/permissions/views/SignaturesView";
import ApproveLeaderModal from "@/app/(auth)/app/permissions/views/ApproveLeaderModal";
import SignatureDohModal from "@/app/(auth)/app/permissions/views/SignatureDohModal";
import EmployeeSignatureModal from "@/app/(auth)/app/permissions/views/EmployeeSignatureModal";
import PermissionPDFownload from "@/app/(auth)/app/permissions/views/PermissionPDFownload";
import ConditionalRender from "../ConditionalRender";
import OverLay from "../templates/OverLay";
import Loading from "../LoadingSpinner";
import { useRouter } from "next/navigation";
import { ISignatures } from "@/lib/overTime/interface";
import PermissionsOneError from "./permissionsMessageError";
import { formatCreatedAt, formatCreatedAtOnlyHours, formatDateMx } from "@/lib/helpers";
import { IPermissionRequest } from "@/lib/permissions/interface";
import ModalBlur from "../ModalBlur";
import DeletePermissionModal from "./DeleteModal";
import WithPayBadge from "./WithPayBadge";


function fullName(p?: { name?: string; lastName?: string } | null) {
  if (!p) return "—";
  return `${p.lastName ?? ""} ${p.name ?? ""}`.trim().toUpperCase();
}

function statusVariant(status?: string | null) {
  switch ((status ?? "").toUpperCase()) {
    case "APPROVED":
      return (
        <span className="badge rounded-pill px2 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle">
          APROBADO
        </span>
      )

    case "PENDING":
      return (
        <span className="badge rounded-pill px2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
          PENDIENTE
        </span>
      )
    case "REFUSED":
      return (
        <span className="badge rounded-pill px2 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
          RECHAZADO
        </span>
      )
    default:
      return (
        <span className="badge rounded-pill px2 py-2 fw-semibold bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle" />
      )
  }
}

export default function ShowInfoPermissionRequest({
  permission,
  id,
}: {
  permission: IPermissionRequest | null;
  id: string;
}) {
  const session = useSessionSnapshot();
  const roles = session?.uid?.roles;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState("");
  const [approveModal, setApproveModal] = useState(false);
  const [signatureModal, setSignatureModal] = useState(false);
  const [employeeSignatureModal, setEmployeeSignatureModal] = useState(false);
  const [permissionPDFModal, setPermissionPDFModal] = useState(false);
  const [showdeletePermissionModal, setShowDeletePermissionModal] = useState(false);


  const readInput = !roles?.isLeader
    && !roles?.isExtra
    && !roles?.isDoh
    && !roles?.isApproverLeaders
    && !roles?.isApproverDoh;

  const signatures = useMemo(() =>
    Array.isArray(permission?.signatures) ? permission.signatures : [],
    [permission?.signatures]
  );

  // ID del empleado con sesión activa
  const idEmployee = Number(session?.uid?.idEmployee);

  // ID del empleado al que pertenece el registro de overtime
  const overtimeEmployeeId = Number(permission?.employee?.id);

  // Indica si el registro aún está pendiente de aprobación
  const isPending = permission?.status === 'PENDING';

  // Busca la firma correspondiente al empleado con sesión activa
  // Solo recalcula si cambia el array de firmas o el id del empleado en sesión
  const currentSignature = useMemo(() => {
    return signatures.find((i: ISignatures) => i.idSignatory === idEmployee) ?? null;
  }, [signatures, idEmployee]);

  // Indica si el firmante actual aún no ha firmado (url vacía = sin firma)
  const hasNotSigned = currentSignature?.url === '';

  const getSignatureEmployee = () => {
    const sign = permission?.signatures?.filter(
      (f) => f.idSignatory === Number(session?.uid?.idEmployee)
    )?.[0];

    return sign?.url !== "";
  };

  const showLeaderApprove = useMemo(() => {
    return (!!session?.uid?.roles?.isLeader || !!session?.uid?.roles?.isExtra)
      && idEmployee !== overtimeEmployeeId
      && !!currentSignature
      && hasNotSigned
      && isPending;
  }, [session, idEmployee, overtimeEmployeeId, currentSignature, hasNotSigned, isPending]);



  const showDohApprove =
    session?.uid?.idEmployee === permission?.personDoh.id &&
    permission?.dohApproval !== "APPROVED";

  const showEmployeeSign =
    session?.uid?.idEmployee === permission?.employee.id &&
    !getSignatureEmployee();

  // const showAnyActions = useMemo(() => {
  //   return showLeaderApprove || showDohApprove || showEmployeeSign || true;
  // }, [showLeaderApprove, showDohApprove, showEmployeeSign]);

  if (!permission) {
    return (
      <PermissionsOneError />
    );
  }

  const overallStatus = permission.status ?? "PENDING";
  const handleApprove = () => setApproveModal(true);
  const handleSignatureDoh = () => setSignatureModal(true);
  const handleEmployeeSignature = () => setEmployeeSignatureModal(true);
  const handleDownloadPDF = () => setPermissionPDFModal(true);

  const handleCreate = () => {
    setLoading(true);
    setMessageLoading('Cargando...');
    router.push("/app/permissions/create");
  };


  const handleBack = () => {
    setLoading(true);
    setMessageLoading("Cargando datos...");
    router.push("/app/permissions");
  }

  const signaturesComplete = permission.signatures.every((f) => f.url);


  return (
    <>
      <ConditionalRender cond={loading}>
        <Loading message={messageLoading} />
      </ConditionalRender>

      <Container className="py-3 overflow-x: auto" style={{ maxWidth: "1600px" }}>

        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">


          <div className="d-flex gap-2 flex-wrap">
            <OverLay string="Crear registro">
              <Button
                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                variant="primary"
                onClick={handleCreate}
                disabled={loading}
              >
                <i className="bi bi-plus-lg" />

                <span className="d-none d-md-inline ms-2">
                  Crear permiso
                </span>
              </Button>
            </OverLay>

            <OverLay string="Eliminar registro">
              <Button
                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                variant="danger"
                onClick={() => setShowDeletePermissionModal(true)}
                disabled={loading}
              >
                <i className="bi bi-trash" />

                <span className="d-none d-md-inline ms-2">
                  Eliminar permiso
                </span>
              </Button>
            </OverLay>

            <ConditionalRender cond={showEmployeeSign}>
              <OverLay string="Firmar">
                <Button
                  className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3 btn-needs-signature"
                  variant="warning"
                  onClick={handleEmployeeSignature}
                >
                  <i className="bi bi-pen-fill" />
                  <span className="d-none d-md-inline ms-2">Firmar</span>
                </Button>
              </OverLay>
            </ConditionalRender>

            <ConditionalRender cond={showLeaderApprove}>
              <OverLay string="Aprobar / Rechazar">
                <Button
                  className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3 btn-needs-signature"
                  variant="success"
                  onClick={handleApprove}
                >
                  <i className="bi bi-check-circle" />
                  <span className="d-none d-md-inline ms-2">Aprobar / Rechazar</span>
                </Button>
              </OverLay>
            </ConditionalRender>

            <ConditionalRender cond={showDohApprove}>
              <OverLay string="Firmar">
                <Button
                  className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3 btn-needs-signature"
                  variant="secondary"
                  onClick={handleSignatureDoh}
                >
                  <i className="bi bi-card-checklist" />
                  <span className="d-none d-md-inline ms-2">Firmar de enterado</span>
                </Button>
              </OverLay>
            </ConditionalRender>

            <ConditionalRender cond={signaturesComplete}>
              <OverLay string="Descargar PDF">
                <Button
                  className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3 border"
                  variant="dark"
                  onClick={handleDownloadPDF}
                >
                  <i className="bi bi-filetype-pdf" />
                  <span className="d-none d-md-inline ms-2">Descargar</span>
                </Button>
              </OverLay>
            </ConditionalRender>
          </div>

          <div className=" d-md-flex flex-wrap">
            <Button
              variant="outline-secondary"
              onClick={handleBack}
              disabled={loading}
              className="d-inline-flex align-items-center gap-2 fw-semibold px-2 px-md-3"
            >
              <i className="bi bi-arrow-left" />
              Regresar
            </Button>
          </div>
        </div>

        <div>
          <h1 className="mb-1 ms-1 text-uppercase">{permission.employee.lastName} {permission.employee.name}</h1>
          <p className="text-muted mb-0 ms-1">
            Información de la solicitud de permiso.
          </p>
        </div>

        <Card className="border shadow-sm rounded-4 mt-2">
          <Card.Body className="p-4">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h5 className="mb-1 fw-bold">
                  Solicitud #{permission.id}
                </h5>

                <p className="text-muted mb-0">
                  {permission.type ?? "Permiso"}
                </p>
              </div>

              <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
                <WithPayBadge withPay={permission.withPay} showUndefined />
                {statusVariant(overallStatus)}
              </div>

            </div>


            <Row className="g-4 mb-4">
              {/* RESUMEN */}
              <Col xs={12} lg={4}>
                <Card className="border rounded-4 h-100">
                  <Card.Body>
                    <div className="d-flex align-items-center justify-content-between mb-4">
                      <h6 className="mb-0 fw-bold">Resumen</h6>
                      <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                        General
                      </span>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-calendar-plus text-primary" />
                          <span className="text-muted">Creada</span>
                        </div>
                        <span className="fw-semibold text-end">{formatDateMx(permission.createdAt)}</span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-clock" />
                          <span className="text-muted">Hora de creación</span>
                        </div>
                        <span className="fw-semibold text-end">{formatCreatedAtOnlyHours(permission.createdAt)}</span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-person text-success" />
                          <span className="text-muted">Creada por</span>
                        </div>

                        <span className="fw-semibold text-end">
                          {fullName(permission.createForPerson)}
                        </span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-person-workspace text-warning" />
                          <span className="text-muted">Líder</span>
                        </div>
                        <span className="fw-semibold text-end">
                          {fullName(permission.leader)}
                        </span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-person-check text-info" />
                          <span className="text-muted">D.O.H.</span>
                        </div>
                        <span className="fw-semibold text-end">
                          {fullName(permission.personDoh)}
                        </span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-chat-left-text text-primary" />
                          <span className="text-muted">Motivo</span>
                        </div>
                        <span className="fw-semibold text-end text-uppercase">
                          {permission.motive ?? "—"}
                        </span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>


              {/* DETALLES */}
              <Col xs={12} lg={8}>
                <Card className="border rounded-4 h-100">
                  <Card.Body>
                    <div className="d-flex align-items-center justify-content-between mb-4">
                      <div>
                        <h6 className="mb-1 fw-bold">Detalles del registro</h6>
                        <p className="text-muted mb-0 small">
                          { readInput ? "Consulta los detalles del permiso." :"Consulta el tipo, vigencia y notas extra registradas."}
                        </p>
                      </div>
                      <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                        Registro
                      </span>
                    </div>

                    <div className="d-flex flex-column gap-4">

                      <ConditionalRender cond={!readInput}>
                        <div className="border rounded-3 p-3">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <i className="bi bi-journal-text text-primary" />
                            <span className="text-muted fw-semibold">Notas adicionales</span>
                          </div>
                          <div className="text-uppercase">
                            {permission.notes ? permission.notes : "No hay notas adicionales"}
                          </div>
                        </div>
                      </ConditionalRender>

                      <Row className="g-3">
                        <Col xs={12} md={6} xl={3}>
                          <div className="border rounded-3 p-3 text-center h-100">
                            <i className="bi bi-calendar-event text-success fs-5 mb-2 d-block" />
                            <div className="text-muted small">Fecha inicio</div>
                            <div className="fw-semibold">
                              {formatCreatedAt(permission.informationDate.dateInit)}
                            </div>
                          </div>
                        </Col>

                        <Col xs={12} md={6} xl={3}>
                          <div className="border rounded-3 p-3 text-center h-100">
                            <i className="bi bi-calendar-x text-danger fs-5 mb-2 d-block" />
                            <div className="text-muted small">Fecha fin</div>
                            <div className="fw-semibold">
                              {formatCreatedAt(permission.informationDate.dateEnd)}
                            </div>
                          </div>
                        </Col>

                        <Col xs={12} md={6} xl={3}>
                          <div className="border rounded-3 p-3 text-center h-100">
                            <i className="bi bi-clock text-warning fs-5 mb-2 d-block" />
                            <div className="text-muted small">Hora inicio</div>
                            <div className="fw-semibold">
                              {permission.informationDate.hourInit ?? "—"}
                            </div>
                          </div>
                        </Col>

                        <Col xs={12} md={6} xl={3}>
                          <div className="border rounded-3 p-3 text-center h-100">
                            <i className="bi bi-clock-history text-info fs-5 mb-2 d-block" />
                            <div className="text-muted small">Hora fin</div>
                            <div className="fw-semibold">
                              {permission.informationDate.hourEnd ?? "—"}
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* FIRMAS */}
            <Card className="border rounded-4">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <h6 className="mb-0 fw-bold">
                    Firmas
                  </h6>

                  <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                    Autorizaciones
                  </span>
                </div>

                <FormBook dKey="newArray">
                  <FormPage title="" eventKey="newArray">
                    <Row className="g-3">
                      {signatures.map((sign) => (
                        <SignaturesView
                          key={`${sign.id}-${sign.url}`}
                          idPermission={String(permission.id)}
                          idEmployee={String(sign.idSignatory)}
                          name={sign.name}
                          dateApproved={sign.dateApproved}
                          status={sign.status}
                          dateApprove={permission.dateApprove}
                          dateApproveDoh={permission.dateApproveDoh}
                          label={sign.label}
                        />
                      ))}
                    </Row>
                  </FormPage>
                </FormBook>
              </Card.Body>
            </Card >
          </Card.Body>
        </Card>
      </Container >


      {/* Modales */}
      <ApproveLeaderModal
        show={approveModal}
        onHide={() => setApproveModal(false)
        }
        id={id}
      />

      <SignatureDohModal
        show={signatureModal}
        onHide={() => setSignatureModal(false)}
        id={id}
      />

      <EmployeeSignatureModal
        show={employeeSignatureModal}
        onHide={() => setEmployeeSignatureModal(false)}
        id={id}
      />

      <PermissionPDFownload
        id={id}
        show={permissionPDFModal}
        onHide={() => setPermissionPDFModal(false)}
      />

      <ConditionalRender cond={showdeletePermissionModal}>
        <ModalBlur onClose={() => setShowDeletePermissionModal(false)}>
          <DeletePermissionModal
            show={showdeletePermissionModal}
            onHide={() => { setShowDeletePermissionModal(false); }}
            idPermission={permission.id}
            motive={permission.delete?.reaseonDelete ?? ""}
            status={permission.delete?.delete ?? false}
          />
        </ModalBlur>
      </ConditionalRender>
    </>
  );
}
