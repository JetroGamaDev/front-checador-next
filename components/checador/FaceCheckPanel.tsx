"use client";

import { identifyEmployeeByFace } from "@/app/actions/employee-actions";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Col, Row, Spinner } from "react-bootstrap";
import ConditionalRender from "../ConditionalRender";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import Loading from "../LoadingSpinner";
import { formatLabel } from "../devices/DevicesTableClient";

type FeedbackState = "loading" | "success" | "error" | null;

// Lado máximo de la foto que se manda a identifyByFace y calidad del JPEG
const MAX_PHOTO_SIDE = 1280;
const PHOTO_QUALITY = 0.9;
// Tiempo máximo para que el navegador entregue la cámara
const CAMERA_TIMEOUT_MS = 15000;
type Props = {
  lat?: number;
  lng?: number;
  onEnableManual: () => void;
  onFaceSuccess: (message: string) => void;
  // Checador "solo rostro": sin la opción de código y contraseña
  allowManual?: boolean;
  // Checada rechazada (ej. el administrador cambió el tipo de validación): el kiosco vuelve a consultar /me
  onCheckError?: (info: { status?: number; message: string }) => void;
  // Modo checador del perfil del empleado: id del checador elegido (header x-checker-id)
  checkerId?: number | null;
};

export default function FaceCheckPanel({
  lat = 0,
  lng = 0,
  onEnableManual,
  onFaceSuccess,
  allowManual = true,
  onCheckError,
  checkerId,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Evita mandar otra petición mientras una sigue en curso (doble toque); el backend responde 429
  const inFlightRef = useRef(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("Colócate frente a la cámara");

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const displayState = feedback ?? (processing || startingCamera ? "loading" : null);


  useEffect(() => { 
    if (!feedback) return;

    const timer = setTimeout(() => {
      setFeedback(null);
      setFeedbackMsg("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [feedback]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraOpen(false);
  }, []);

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => { });
    }
  }, []);

const handleOpenCamera = useCallback(async () => {
  try {
    setStartingCamera(true);
    setMessage("Abriendo cámara...");

    if (!streamRef.current) {
      let timedOut = false;
      const streamPromise = navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      // Si la cámara no responde (permiso sin contestar, cámara ocupada), no se queda cargando
      const stream = await Promise.race([
        streamPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            timedOut = true;
            reject(new Error("La cámara no respondió a tiempo"));
          }, CAMERA_TIMEOUT_MS)
        ),
      ]);

      // Si la cámara llega después del timeout, se libera para no dejarla encendida
      streamPromise.then((late) => {
        if (timedOut) late.getTracks().forEach((track) => track.stop());
      }).catch(() => { });

      streamRef.current = stream;
    }

    setCameraOpen(true);
    setMessage("Colócate frente a la cámara");
  } catch (error) {
    console.error(error);
    setMessage("No se pudo acceder a la cámara");
    setFeedback("error");
    setFeedbackMsg("No se pudo acceder a la cámara");
  } finally {
    setStartingCamera(false);
  }
}, []);

  useEffect(() => {
    handleOpenCamera();

    return () => {
      stopCamera();

      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [handleOpenCamera, stopCamera]);

  const capturePhotoAsFile = async (): Promise<File | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return null;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) return null;

    // Reduce la foto a un máximo de MAX_PHOTO_SIDE por lado (sin agrandar las pequeñas)
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(videoWidth, videoHeight));
    const width = Math.round(videoWidth * scale);
    const height = Math.round(videoHeight * scale);

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", PHOTO_QUALITY)
    );

    if (!blob) return null;

    return new File([blob], `check-face-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
  };

  const resetForNextEmployee = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = setTimeout(() => {
      setMessage("Colócate frente a la cámara");
    }, 2000);
  };

  const handleFaceCheck = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      setProcessing(true);
      setMessage("Capturando foto...");

      const file = await capturePhotoAsFile();

      if (!file) {
        setMessage("No se pudo capturar la foto");
        setFeedback("error");
        setFeedbackMsg("No se pudo capturar la foto");
        return;
      }

      setMessage("Validando rostro...");

      const res = await identifyEmployeeByFace({
        file,
        lat,
        lng,
        checkerId,
      });

      if (!res.success) {
        setMessage(res.message || "No se pudo validar por rostro");
        setFeedback("error");
        setFeedbackMsg(res.message || "No se pudo validar por rostro");
        onCheckError?.({ status: res.status, message: res.message });
        return;
      }

      const successMessage =
        res.data?.checkMessage || res.message || "Checada registrada por rostro";

      setMessage(successMessage);
      setFeedback("success");
      setFeedbackMsg(formatLabel(successMessage));
      onFaceSuccess(successMessage);

      resetForNextEmployee();
      } catch (error) {
        console.error(error);
        setMessage("Error al validar por rostro");
        setFeedback("error");
        setFeedbackMsg("Error al validar por rostro");
      }  finally {
      inFlightRef.current = false;
      setProcessing(false);
    }
  };

  return (
    <>
      <ConditionalRender cond={displayState === "loading"}>
        <Loading message="Cargando..." />
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
          onDone={() => {
            setFeedback(null);
            if (allowManual) onEnableManual();
          }}
        />
      </ConditionalRender>

      <Row className="g-2">

        <Col md="6">
          <div className="p-3 border rounded bg-body-tertiary">
            <h5 className="mb-3 text-uppercase fw-bold">Checado por rostro</h5>

            <Alert
              variant={processing || startingCamera ? "warning" : "info"}
              className="mb-3"
            >
              <div className="d-flex align-items-center gap-2">

                <ConditionalRender cond={processing || startingCamera}>
                  <Spinner animation="border" size="sm" />
                </ConditionalRender>

                <span>{message}</span>
              </div>
            </Alert>
          </div>
        </Col>

        <Col md="6">
          <ConditionalRender cond={cameraOpen}>
            <div className="text-center">
            <video
              ref={setVideoRef}
              className="w-100 rounded"
              style={{ maxHeight: 310, objectFit: "contain" }}
              autoPlay
              playsInline
              muted
            />

              <div className="d-flex justify-content-center gap-2 mb-1">
                <Button
                  variant="primary"
                  onClick={handleFaceCheck}
                  disabled={processing || startingCamera}
                >
                  <ConditionalRender cond={processing}>
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Validando...
                    </>
                  </ConditionalRender>

                  <ConditionalRender cond={!processing}>
                    Validar rostro
                  </ConditionalRender>
                </Button>

                <ConditionalRender cond={allowManual}>
                  <Button
                    variant="outline-secondary"
                    onClick={onEnableManual}
                    disabled={processing || startingCamera}
                  >
                    Usar código y contraseña
                  </Button>
                </ConditionalRender>
              </div>
            </div>
          </ConditionalRender>

          <ConditionalRender cond={!cameraOpen}>
            <div className="d-flex flex-column gap-2">
              <Button
                variant="primary"
                onClick={handleOpenCamera}
                disabled={startingCamera || processing}
              >
                <ConditionalRender cond={startingCamera}>
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Abriendo cámara...
                  </>
                </ConditionalRender>

                <ConditionalRender cond={!startingCamera}>
                  Abrir cámara
                </ConditionalRender>

              </Button>

              <ConditionalRender cond={allowManual}>
                <Button
                  variant="outline-secondary"
                  onClick={onEnableManual}
                  disabled={startingCamera || processing}
                >
                  Usar código y contraseña
                </Button>
              </ConditionalRender>
            </div>
          </ConditionalRender>


          <canvas ref={canvasRef} className="d-none" />
        </Col>
      </Row>
    </>
  );
}