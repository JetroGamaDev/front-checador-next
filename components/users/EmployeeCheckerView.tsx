"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Alert, Card, Col, Container, Form, Row } from "react-bootstrap";
import { checkIn } from "@/app/actions/entry-actions";
import { getActiveNotice } from "@/app/actions/newsletter-actions";
import { TCheckData } from "@/app/(auth)/app/checador/views/ChecadorFormView";
import FaceCheckPanel from "@/components/checador/FaceCheckPanel";
import ChecadorEntryForm from "@/components/forms/ChecadorEntryForm";
import Clock from "@/components/top-nav/Clock";
import ConditionalRender from "@/components/ConditionalRender";
import { IMyChecker } from "@/lib/checadores/interface";
import { ActionResponse, INewsletter } from "@/lib/definitions";
import { formatDatelocal } from "@/lib/helpers";

// 403 "No estás autorizado para checar en este checador" o 404 "El checador no existe o no está activo":
// el modo checador se apaga. El 403 "Solo puedes registrar tu propia checada" no lo apaga.
function isCheckerRevoked(status: number | undefined, message: string) {
  if (status === 404) return true;
  return status === 403 && /no est[aá]s autorizado/i.test(message);
}

// Vista del checador dentro del perfil del empleado (modo checador). Usa los mismos paneles que el
// usuario CHECADOR, pero cada petición va con el token del empleado y el header x-checker-id.
export default function EmployeeCheckerView({
  checker,
  idCheck,
  onExit,
  onRevoked,
}: {
  checker: IMyChecker;
  idCheck: number | null;
  onExit: () => void;
  onRevoked: (message: string) => void;
}) {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [notice, setNotice] = useState<INewsletter | null>(null);
  const [message, setMessage] = useState("");
  const [manualEnabled, setManualEnabled] = useState(false);

  // Mismos métodos que la vista del checador, según checkMethods del checador elegido
  const checkMethods = checker.checkMethods ?? "ambos";
  const allowFace = checkMethods === "ambos" || checkMethods === "rostro";
  const allowPin = checkMethods === "ambos" || checkMethods === "pin";
  const showFace = allowFace && (!manualEnabled || !allowPin);
  const showManual = allowPin && (manualEnabled || !allowFace);

  const checkerName = `${checker.name ?? ""} ${checker.lastName ?? ""}`.trim() || "Checador";

  useEffect(() => {
    let active = true;
    getActiveNotice({ checkerId: checker.id })
      .then((res) => { if (active) setNotice(res); })
      .catch(() => { if (active) setNotice(null); });
    return () => { active = false; };
  }, [checker.id]);

  // lat/lng igual que en la vista del checador
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({ lat: position.coords.latitude, lon: position.coords.longitude }),
      (err) => console.log(`Error obteniendo la ubicación: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const receiveCheckData = async (data: TCheckData): Promise<ActionResponse<string>> => {
    let res: ActionResponse<string> & { status?: number };
    try {
      res = await checkIn({
        ...data,
        idCheck: idCheck != null ? String(idCheck) : data.idCheck,
        lat: location?.lat || 0,
        lng: location?.lon || 0,
        checkerId: checker.id,
      });
    } catch (error) {
      console.error(error);
      return { success: false, message: "No se pudo registrar, revisa la conexión e intenta de nuevo" };
    }

    if (!res.success && isCheckerRevoked(res.status, res.message)) {
      onRevoked(res.message);
      return res;
    }

    if (res.success) setMessage(res.data || "");
    return res;
  };

  const handleFaceError = (info: { status?: number; message: string }) => {
    if (isCheckerRevoked(info.status, info.message)) onRevoked(info.message);
  };

  const handleEnableManual = () => {
    if (!allowPin) return;
    setManualEnabled(true);
    setMessage("No fue posible validar por rostro. Puedes continuar con tu contraseña.");
  };

  const handleFaceSuccess = (faceMessage: string) => {
    setManualEnabled(false);
    setMessage(faceMessage);
  };

  const showNotice = !!notice && (!!notice.title || !!notice.img);

  return (
    <Container className="py-3" style={{ maxWidth: "1600px" }}>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <span className="badge rounded-pill px-3 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle text-wrap text-start text-uppercase">
          <i className="bi bi-broadcast me-2" />
          Modo checador: {checkerName}
          {checker.branch?.name ? ` · ${checker.branch.name}` : ""}
        </span>

        <Form.Check
          type="switch"
          id="checker-mode-switch-active"
          label="Modo checador"
          checked
          onChange={onExit}
          className="fw-semibold"
        />
      </div>

      <Card className="border rounded-4">
        <Card.Header className="border-0">
          <div className="d-flex justify-content-between align-items-center fw-bolder flex-wrap gap-2">
            <div className="shadow-sm px-2 rounded text-center" style={{ fontSize: "clamp(1rem, 2.5vw, 1.5rem)" }}>
              {formatDatelocal(new Date())}
            </div>
            <div className="text-center text-uppercase fw-bold" style={{ fontSize: "clamp(1.2rem, 3vw, 2rem)" }}>
              <Clock />
            </div>
          </div>
        </Card.Header>

        <Card.Body className="p-2 p-md-3">
          <Row className="g-2">
            <Col xs={12} xl={showNotice ? 6 : 12}>
              <div className="border rounded shadow p-3">
                {/* Solo se monta si el checador permite rostro: al montarse abre la cámara */}
                {showFace && (
                  <FaceCheckPanel
                    lat={location?.lat}
                    lng={location?.lon}
                    onEnableManual={handleEnableManual}
                    onFaceSuccess={handleFaceSuccess}
                    allowManual={allowPin}
                    onCheckError={handleFaceError}
                    checkerId={checker.id}
                  />
                )}

                <ConditionalRender cond={showManual}>
                  <Alert
                    variant="none"
                    className="rounded-pill py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle text-center fs-6"
                  >
                    {message || "Captura tu contraseña para registrar tu checada."}
                  </Alert>
                  <div className="d-flex justify-content-center">
                    <ChecadorEntryForm
                      receiveCheckData={receiveCheckData}
                      disabled={false}
                      onBack={() => setManualEnabled(false)}
                      onHide={() => setManualEnabled(false)}
                      allowFace={allowFace}
                      fixedIdCheck={idCheck != null ? String(idCheck) : undefined}
                    />
                  </div>
                </ConditionalRender>
              </div>
            </Col>

            <ConditionalRender cond={showNotice}>
              <Col xs={12} xl={6}>
                <div className="border rounded shadow p-3 d-flex flex-column h-100">
                  <ConditionalRender cond={!!notice?.title}>
                    <div className="text-uppercase text-center fs-3 fw-semibold">{notice?.title}</div>
                    <ConditionalRender cond={!!notice?.text}>
                      <div className="text-uppercase text-center mt-2">{notice?.text}</div>
                    </ConditionalRender>
                  </ConditionalRender>
                  <ConditionalRender cond={!!notice?.img}>
                    <div className="d-flex justify-content-center align-items-center mt-2">
                      <Image
                        src={notice?.img || "/image/logo.png"}
                        height={100}
                        width={100}
                        alt="Aviso del checador"
                        className="img-fluid w-auto object-fit-contain rounded-3"
                        unoptimized
                      />
                    </div>
                  </ConditionalRender>
                </div>
              </Col>
            </ConditionalRender>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}
