"use client";

import { Branch } from "@/lib/definitions";
import { useState } from "react";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import { Button, Card, Col, Container, Row } from "react-bootstrap";
import { useRouter } from "next/navigation";
import ModalBlur from "../ModalBlur";
import FormUpdateBranch from "./FormUpdateBranch";
import { deleteBranch } from "@/app/actions/branches-actionst";
import { useModals } from "@/context/ModalContext";
import OverLay from "../templates/OverLay";
import BranchesOneError from "./branchesMessageError";
import ErrorOverlay from "../ErrorOverlay";
import SuccessOverlay from "../SuccessOverlay";

type FeedbackState = "loading" | "success" | "error" | null;

function formatText(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}


export default function BrancheOne({
  branch,
}: {
  branch: Branch | null;
}) {
  const [showUpdateBranchModal, setShowUpdateBranchModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setMessageLoading] = useState("");
  const { modalError, modalConfirm } = useModals();
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const router = useRouter();

  if (!branch) {
    return (
      <BranchesOneError />
    );
  }

  const handleCreate = () => {
    setFeedback("loading");
    setFeedbackMsg("Cargando...");
    router.push("/app/branches/create");
  };

  const handleDeleteBranch = async () => {
    if (!branch?.id) {
      modalError("No se encontró la sucursal");
      return;
    }

    modalConfirm("¿Deseas eliminar esta sucursal?", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg("Eliminando sucursal...");

        const res = await deleteBranch({ id: Number(branch.id) });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo eliminar la sucursal");
          setFeedback("error");
          return;
        }

        setFeedbackMsg(res.message || "Sucursal eliminada correctamente");
        setFeedback("success");
        setTimeout(() => {
          router.push("/app/branches");
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

  const handleBack = () => {
    setFeedback("loading");
    setFeedbackMsg("Cargando...");
    setTimeout(() => {
      router.push("/app/branches");
    }, 1200);
  };

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
            <OverLay string="Crear sucursal">
              <Button
                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                variant="primary"
                onClick={handleCreate}
                disabled={loading}
              >
                <i className="bi bi-plus-lg" />

                <span className="d-none d-md-inline ms-2">
                  Crear Sucursal
                </span>
              </Button>
            </OverLay>

            <OverLay string="Actualizar Sucursal">
              <Button
                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                variant="info"
                onClick={() => setShowUpdateBranchModal(true)}
                disabled={loading}
              >
                <i className="bi bi-pencil" />

                <span className="d-none d-md-inline ms-2">
                  Actualizar Sucursal
                </span>
              </Button>
            </OverLay>

            <OverLay string="Eliminar Sucursal">
              <Button
                className="d-inline-flex align-items-center fw-semibold px-2 px-md-3"
                variant="danger"
                onClick={handleDeleteBranch}
                disabled={loading}
              >
                <i className="bi bi-trash" />
                <span className="d-none d-md-inline ms-2">
                  Eliminar Sucursal
                </span>
              </Button>
            </OverLay>
          </div>

          <div className=" d-md-flex flex-wrap">
            <Button
              variant="outline-secondary"
              onClick={handleBack}
              disabled={feedback === "loading"}
              className="d-inline-flex align-items-center gap-2 fw-semibold px-2 px-md-3"
            >
              <i className="bi bi-arrow-left" />
              Regresar
            </Button>
          </div>
        </div>

        <div>
          <h1 className="mb-1 ms-1 text-uppercase">
            {branch.name}
          </h1>

          <p className="text-muted mb-0 ms-1">
            Información general de la sucursal.
          </p>
        </div>

        <Card className="border shadow-sm rounded-4 mt-2">
          <Card.Body className="p-4">
            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
              <h5 className="mb-0 fw-bold">
                Sucursal
              </h5>
            </div>

            <Row className="g-4">
              <Col xs={12} lg={6}>
                <Card className="border rounded-4 h-100">
                  <Card.Body>
                    <div className="d-flex align-items-center justify-content-between mb-4">
                      <h6 className="mb-0 fw-bold">
                        Información general
                      </h6>

                      <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                        Datos
                      </span>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex align-items-center justify-content-between border-bottom pb-2 gap-3">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-building text-primary" />
                          <span className="text-muted">Nombre</span>
                        </div>

                        <span className="fw-semibold text-end text-uppercase">
                          {formatText(branch.name)}
                        </span>
                      </div>

                      {/* <div className="d-flex align-items-center justify-content-between gap-3">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-person-badge text-success" />
                          <span className="text-muted">ID Manager</span>
                        </div>

                        <span className="fw-semibold text-end">
                          {formatText(branch.idManager)}
                        </span>
                      </div> */}
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12} lg={6}>
                <Card className="border rounded-4 h-100">
                  <Card.Body>
                    <div className="d-flex align-items-center justify-content-between mb-4">
                      <h6 className="mb-0 fw-bold">
                        Coordenadas
                      </h6>

                      <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                        Ubicación
                      </span>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex align-items-center justify-content-between border-bottom pb-2 gap-3">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-geo-alt text-danger" />
                          <span className="text-muted">Latitud</span>
                        </div>

                        <span className="fw-semibold text-end">
                          {formatText(branch.address?.coordinates?.lat)}
                        </span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between gap-3">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-geo text-info" />
                          <span className="text-muted">Longitud</span>
                        </div>

                        <span className="fw-semibold text-end">
                          {formatText(branch.address?.coordinates?.lng)}
                        </span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Card className="border rounded-4 mt-4">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                  <h6 className="mb-0 fw-bold">
                    Dirección
                  </h6>

                  <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                    Domicilio
                  </span>
                </div>

                <Row className="g-3">
                  <Col xs={12} lg={6}>
                    <div className="border rounded-3 p-3 h-100 d-flex align-items-center justify-content-between gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-signpost text-primary fs-5" />
                        <span className="text-muted">Calle</span>
                      </div>

                      <span className="fw-semibold text-end text-uppercase">
                        {formatText(branch.address?.street)}
                      </span>
                    </div>
                  </Col>

                  <Col xs={12} md={4} lg={2}>
                    <div className="border rounded-3 p-3 h-100 d-flex align-items-center justify-content-between gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-house-door text-success fs-5" />
                        <span className="text-muted">No. Exterior</span>
                      </div>

                      <span className="fw-semibold text-end">
                        {formatText(branch.address?.numberOut)}
                      </span>
                    </div>
                  </Col>

                  <Col xs={12} md={4} lg={2}>
                    <div className="border rounded-3 p-3 h-100 d-flex align-items-center justify-content-between gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-door-open text-warning fs-5" />
                        <span className="text-muted">No. Interior</span>
                      </div>

                      <span className="fw-semibold text-end">
                        {formatText(branch.address?.numberIn)}
                      </span>
                    </div>
                  </Col>

                  <Col xs={12} md={4} lg={2}>
                    <div className="border rounded-3 p-3 h-100 d-flex align-items-center justify-content-between gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-mailbox text-secondary fs-5" />
                        <span className="text-muted">C.P.</span>
                      </div>

                      <span className="fw-semibold text-end">
                        {formatText(branch.address?.zipCode)}
                      </span>
                    </div>
                  </Col>

                  <Col xs={12} md={6}>
                    <div className="border rounded-3 p-3 h-100 d-flex align-items-center justify-content-between gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-map text-info fs-5" />
                        <span className="text-muted">Colonia</span>
                      </div>

                      <span className="fw-semibold text-end text-uppercase">
                        {formatText(branch.address?.neighborhood)}
                      </span>
                    </div>
                  </Col>

                  <Col xs={12} md={6}>
                    <div className="border rounded-3 p-3 h-100 d-flex align-items-center justify-content-between gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-bank text-primary fs-5" />
                        <span className="text-muted">Municipio</span>
                      </div>

                      <span className="fw-semibold text-end text-uppercase">
                        {formatText(branch.address?.municipality)}
                      </span>
                    </div>
                  </Col>

                  <Col xs={12} md={6}>
                    <div className="border rounded-3 p-3 h-100 d-flex align-items-center justify-content-between gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-geo-alt-fill text-danger fs-5" />
                        <span className="text-muted">Estado</span>
                      </div>

                      <span className="fw-semibold text-end text-uppercase">
                        {formatText(branch.address?.state)}
                      </span>
                    </div>
                  </Col>

                  <Col xs={12} md={6}>
                    <div className="border rounded-3 p-3 h-100 d-flex align-items-center justify-content-between gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-globe-americas text-success fs-5" />
                        <span className="text-muted">País</span>
                      </div>

                      <span className="fw-semibold text-end text-uppercase">
                        {formatText(branch.address?.country)}
                      </span>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <ConditionalRender cond={showUpdateBranchModal}>
              <ModalBlur onClose={() => setShowUpdateBranchModal(false)}>
                <FormUpdateBranch
                  show={showUpdateBranchModal}
                  onHide={() => setShowUpdateBranchModal(false)}
                  id={Number(branch.id)}
                  branch={branch}
                />
              </ModalBlur>
            </ConditionalRender>
          </Card.Body>
        </Card>
      </Container >
    </>
  );
}