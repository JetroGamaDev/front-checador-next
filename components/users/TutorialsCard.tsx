"use client";

import { useState } from "react";
import { Card, Form } from "react-bootstrap";
import { useSession } from "next-auth/react";
import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import SuccessOverlay from "@/components/SuccessOverlay";
import ErrorOverlay from "@/components/ErrorOverlay";
import { updateTutorialsPreference } from "@/app/actions/user-actions";

type FeedbackState = "loading" | "success" | "error" | null;

// Switch "Mostrar tutoriales" del perfil (usuario y empleado). Al cambiarlo se guarda en el back
// y se actualiza la sesión, así los tutoriales se encienden o apagan sin recargar la página.
export default function TutorialsCard({ enableTutorials }: { enableTutorials: boolean }) {
  const { update } = useSession();
  const [enabled, setEnabled] = useState(enableTutorials);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const handleChange = async (value: boolean) => {
    setFeedback("loading");
    setFeedbackMsg(value ? "Activando tutoriales..." : "Desactivando tutoriales...");

    const res = await updateTutorialsPreference(value);
    if (!res.success || !res.data) {
      setFeedbackMsg(res.message || "No se pudo guardar el cambio");
      setFeedback("error");
      return;
    }

    // La sesión vuelve a leer el valor de /me
    await update({ refreshTutorials: true });
    setEnabled(res.data.enableTutorials);
    setFeedbackMsg(res.data.enableTutorials ? "Tutoriales activados" : "Tutoriales desactivados");
    setFeedback("success");
  };

  return (
    <>
      <ConditionalRender cond={feedback === "loading"}>
        <Loading message={feedbackMsg} />
      </ConditionalRender>
      <ConditionalRender cond={feedback === "success"}>
        <SuccessOverlay message={feedbackMsg} onDone={() => setFeedback(null)} />
      </ConditionalRender>
      <ConditionalRender cond={feedback === "error"}>
        <ErrorOverlay message={feedbackMsg} onDone={() => setFeedback(null)} />
      </ConditionalRender>

      <Card className="border rounded-4 h-100">
        <Card.Body className="p-4">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <h6 className="mb-0 fw-bold">Tutoriales</h6>

            <span
              className={`badge rounded-pill px3 py-2 fw-semibold border ${enabled
                ? "bg-success-subtle text-success-emphasis border-success-subtle"
                : "bg-secondary-subtle text-secondary-emphasis border-secondary-subtle"
                }`}
            >
              {enabled ? "Activos" : "Inactivos"}
            </span>
          </div>

          <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2 text-muted">
              <i className="bi bi-signpost-2 text-primary" />
              <span>
                {enabled
                  ? "Al entrar por primera vez a cada pantalla verás un recorrido guiado."
                  : "No se mostrarán recorridos guiados en ninguna pantalla."}
              </span>
            </div>

            <Form.Check
              type="switch"
              id="profile-enable-tutorials"
              label="Mostrar tutoriales"
              className="fw-semibold flex-shrink-0"
              checked={enabled}
              disabled={feedback === "loading"}
              onChange={(e) => handleChange(e.target.checked)}
            />
          </div>
        </Card.Body>
      </Card>
    </>
  );
}
