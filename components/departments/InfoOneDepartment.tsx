"use client";

import { deleteDepartment } from "@/app/actions/departments-actions";
import { Department, Employee, Position } from "@/lib/definitions";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import { Button, Card, Col, Container, Row } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useModals } from "@/context/ModalContext";
import ModalBlur from "../ModalBlur";
import FormUpdateDepartment from "./UpdateDepartment";
import CreatePositionModal from "./CreatePositionModal";
import { deletePosition } from "@/app/actions/positions-actions";
import OverLay from "../templates/OverLay";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import DepartmentOneError from "./DepartrmentsMessageError";

type FeedbackState = "loading" | "success" | "error" | null;

function formatText(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}


export default function InfoOneDepartment({
  department,
  employees = [],
}: {
  department: Department | null;
  employees?: Employee[];
  position?: Position;
}) {
  const [showUpdateDepartmentModal, setShowUpdateDepartmentModal] = useState(false);
  const [showCreatePositionModal, setShowCreatePositionModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setMessageLoading] = useState("");
  const { modalError, modalConfirm } = useModals();
  const router = useRouter();
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  if (!department) {
    return (
      <DepartmentOneError />
    );
  }

  const leader =
    employees.find((emp) => emp.id === department.idLeader) || department.leader;
  const subManager = department.subManager;

  const handleCreate = () => {
    setLoading(true);
    setMessageLoading("Cargando...");
    router.push("/app/departments/create");
  };


  const handleDeleteDepartment = async () => {
    if (!department?.id) {
      modalError("No se encontró el departamento");
      return;
    }

    modalConfirm("¿Deseas eliminar este departamento?", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg("Eliminando departamento...");

        const res = await deleteDepartment({ id: Number(department.id) });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo eliminar el departamento");
          setFeedback("error");
          return;
        }

        setFeedbackMsg(res.message || "Departamento eliminado correctamente");
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


  const handleDeletePosition = async (id?: number) => {
    if (!id) {
      modalError("No se encontró este puesto");
      return;
    }

    modalConfirm("¿Deseas eliminar este puesto?", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg("Eliminando puesto...");

        const res = await deletePosition({ id });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo eliminar el puesto");
          setFeedback("error");
          return;
        }

        setFeedbackMsg(res.message || "Puesto eliminado correctamente");
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

  const upperCase = (text?: string) => {
    return text?.toUpperCase() || "";
  };

  const getDepartmentName = (u: Department) => {
    return (
      `${upperCase(u.nameDepartment)}`
    )
  };

  const handleBack = () => {
    setFeedback("loading");
    setFeedbackMsg("Cargando...");
    router.push("/app/departments")
  }


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
          }}
        />
      </ConditionalRender>

      <ConditionalRender cond={feedback === "error"}>
        <ErrorOverlay
          message={feedbackMsg}
          onDone={() => setFeedback(null)}
        />
      </ConditionalRender>

      <Container className="py-3 overflow-x: auto" style={{ maxWidth: "1600px" }}>
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">

          <div className="d-flex gap-2 flex-wrap">

            <OverLay string="Crear Departamento">
              <Button
                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                variant="primary"
                onClick={handleCreate}
                disabled={loading}
              >
                <i className="bi bi-plus-lg" />

                <span className="d-none d-md-inline ms-2">
                  Crear Departamento
                </span>
              </Button>
            </OverLay>

            <OverLay string="Actualizar Departamento">
              <Button
                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                variant="info"
                onClick={() => setShowUpdateDepartmentModal(true)}
                disabled={loading}
              >
                <i className="bi bi-pencil" />

                <span className="d-none d-md-inline ms-2">
                  Actualizar Departamento
                </span>
              </Button>
            </OverLay>

            <OverLay string="Eliminar Departamento">
              <Button
                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                variant="danger"
                onClick={handleDeleteDepartment}
                disabled={loading}
              >
                <i className="bi bi-trash" />

                <span className="d-none d-md-inline ms-2">
                  Eliminar Departamento
                </span>
              </Button>
            </OverLay>
          </div>

          <Button
            variant="outline-secondary"
            onClick={handleBack}
            disabled={loading}
            className="d-inline-flex align-items-center gap-2 fw-semibold px-3"
          >
            <i className="bi bi-arrow-left" />
            Regresar
          </Button>
        </div>

        <div>
          <h1 className="mb-1 ms-1">{getDepartmentName(department)}</h1>
          <p className="text-muted mb-0 ms-1">
            Información del departamento.
          </p>
        </div>

        <Card className="border shadow-sm rounded-4 mt-2">
          <Card.Body className="p-4">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 className="mb-0 fw-bold">
                Departamento
              </h5>

              <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                Información General
              </span>
            </div>

            {/* INFORMACIÓN GENERAL */}
            <Card className="border rounded-4 mb-4">
              <Card.Body>
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-building text-primary" />
                      <span className="text-muted">Departamento</span>
                    </div>

                    <span className="fw-semibold">
                      {getDepartmentName(department)}
                    </span>
                  </div>

                  <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-person-workspace text-success" />
                      <span className="text-muted">Líder</span>
                    </div>

                    <span className="fw-semibold text-uppercase text-end">
                      {leader
                        ? `${leader.name} ${leader.lastName ?? ""}`.trim()
                        : "-"}
                    </span>
                  </div>

                  <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-person-badge text-warning" />
                      <span className="text-muted">Subgerente</span>
                    </div>

                    <span className="fw-semibold text-uppercase text-end">
                      {subManager
                        ? `${subManager.lastName ?? ""} ${subManager.name ?? ""}`.trim()
                        : "Sin subgerente"}
                    </span>
                  </div>

                  <div className="d-flex align-items-start justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-card-text text-info" />
                      <span className="text-muted">Descripción</span>
                    </div>

                    <span
                      className="fw-semibold text-end text-uppercase"
                      style={{ maxWidth: "400px" }}
                    >
                      {formatText(department.description)}
                    </span>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* PUESTOS */}
            <Card className="border rounded-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">

                  <div className="d-flex gap-2 flex-wrap">
                    <h6 className="mt-1 fw-bold">
                      Puestos
                    </h6>

                    <span className="badge rounded-pill px3 py-2 fw-semibold bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle">
                      {department.positions?.length || 0}
                    </span>
                  </div>

                  <Button variant="success" onClick={() => setShowCreatePositionModal(true)}>
                    <i className="bi bi-person me-2" />
                    Crear nuevo puesto
                  </Button>
                </div>

                <ConditionalRender cond={(department.positions?.length ?? 0) > 0}>
                  <Row className="g-3">
                    {(department.positions ?? []).map((puesto) => (
                      <Col
                        xs={12}
                        md={6}
                        lg={4}
                        key={puesto._id || puesto.id || puesto.namePosition}
                      >
                        <div className="border rounded p-3 d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-briefcase-fill text-primary fs-5" />

                            <span className="fw-semibold text-uppercase">
                              {formatText(puesto.namePosition)}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="btn btn-link p-0 border-0"
                            onClick={() => handleDeletePosition(puesto.id)}
                          >
                            <i className="bi bi-trash text-danger fs-5" />
                          </button>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </ConditionalRender>

                <ConditionalRender cond={(department.positions?.length ?? 0) === 0}>
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-briefcase fs-3 d-block mb-2" />
                    Sin puestos registrados
                  </div>
                </ConditionalRender>

              </Card.Body>
            </Card>

            <ConditionalRender cond={showUpdateDepartmentModal}>
              <ModalBlur onClose={() => setShowUpdateDepartmentModal(false)}>
                <FormUpdateDepartment
                  show={showUpdateDepartmentModal}
                  onHide={() => setShowUpdateDepartmentModal(false)}
                  id={Number(department.id)}
                  department={department}
                  employees={employees}
                />
              </ModalBlur>
            </ConditionalRender>

            <ConditionalRender cond={showCreatePositionModal && !!department?.id}>
              <ModalBlur onClose={() => setShowCreatePositionModal(false)}>
                <CreatePositionModal
                  show={showCreatePositionModal}
                  onHide={() => setShowCreatePositionModal(false)}
                  idDepartment={department.id!}
                  positionData={{
                    activeId: null,
                    namePosition: "",
                  }}
                />
              </ModalBlur>
            </ConditionalRender>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}