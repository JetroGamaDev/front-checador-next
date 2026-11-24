"use client";

import { useState } from "react";
import { Button } from "react-bootstrap";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import moment from "moment";
import { updateExpirationDocument } from "@/app/actions/documents-actions";
import { useModals } from "@/context/ModalContext";
import ModalBlur from "@/components/ModalBlur";
import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import SuccessOverlay from "@/components/SuccessOverlay";
import ErrorOverlay from "@/components/ErrorOverlay";
import { formatCreatedAt } from "@/lib/helpers";

registerLocale("es", es);

type FeedbackState = "loading" | "success" | "error" | null;

// Fecha de vencimiento de un documento: se manda solo el día "YYYY-MM-DD" (sin hora ni zona)
function ModalExpirationDate({
  onHide,
  onSaved,
  idEmpleado,
  idDocument,
  idPeriod,
  title,
  currentDate,
}: {
  onHide: () => void;
  onSaved: () => void;
  idEmpleado: number;
  idDocument: number;
  idPeriod: number;
  title: string;
  currentDate?: string | null;
}) {
  const { modalConfirm } = useModals();
  const current = currentDate ? String(currentDate).slice(0, 10) : null;
  const [selected, setSelected] = useState<Date | null>(
    current ? moment(current, "YYYY-MM-DD").toDate() : null
  );
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const save = (date: string | null) => {
    const question = date
      ? `¿Seguro que quieres guardar la fecha de vencimiento ${formatCreatedAt(date)}?`
      : "¿Seguro que quieres quitar la fecha de vencimiento?";

    modalConfirm(question, async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg(date ? "Guardando fecha..." : "Quitando fecha...");

        const res = await updateExpirationDocument({ idEmpleado, idDocument, idPeriod, date });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo guardar la fecha de vencimiento");
          setFeedback("error");
          return;
        }

        setFeedbackMsg(res.message);
        setFeedback("success");
      } catch {
        setFeedbackMsg("Error inesperado, intenta de nuevo");
        setFeedback("error");
      }
    });
  };

  return (
    <>
      <ModalBlur onClose={onHide} locked={feedback === "loading"}>
        <div className="p-2 mt-4">
          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-3">
            <h4 className="mb-0 fw-bold">Fecha de vencimiento</h4>
            <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle text-uppercase">
              {title}
            </span>
          </div>

          <div className="text-muted mb-3">
            {current
              ? <>Fecha actual: <span className="fw-semibold text-body">{formatCreatedAt(current)}</span></>
              : "Este documento no tiene fecha de vencimiento."}
          </div>

          <div className="d-flex justify-content-center mb-3">
            <DatePicker
              inline
              locale="es"
              selected={selected}
              onChange={(date: Date | null) => setSelected(date)}
            />
          </div>

          <div className="d-flex flex-wrap justify-content-end gap-2">
            <ConditionalRender cond={!!current}>
              <Button
                variant="outline-danger"
                onClick={() => save(null)}
                disabled={feedback === "loading"}
                className="me-auto"
              >
                <i className="bi bi-calendar-x" />
                <span className="d-none d-md-inline ms-2">Quitar fecha</span>
              </Button>
            </ConditionalRender>

            <Button variant="secondary" onClick={onHide} disabled={feedback === "loading"}>
              Cancelar
            </Button>

            <Button
              variant="success"
              onClick={() => selected && save(moment(selected).format("YYYY-MM-DD"))}
              disabled={!selected || feedback === "loading"}
            >
              <i className="bi bi-check-lg" />
              <span className="d-none d-md-inline ms-2">Guardar</span>
            </Button>
          </div>
        </div>
      </ModalBlur>

      {/* Overlays después del ModalBlur para que queden encima */}
      <ConditionalRender cond={feedback === "loading"}>
        <Loading message={feedbackMsg} />
      </ConditionalRender>
      <ConditionalRender cond={feedback === "success"}>
        <SuccessOverlay
          message={feedbackMsg}
          onDone={() => {
            setFeedback(null);
            onSaved();
          }}
        />
      </ConditionalRender>
      <ConditionalRender cond={feedback === "error"}>
        <ErrorOverlay message={feedbackMsg} onDone={() => setFeedback(null)} />
      </ConditionalRender>
    </>
  );
}

export default ModalExpirationDate;
