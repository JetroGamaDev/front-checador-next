"use client";

import { Button, Card, Col, Dropdown, DropdownButton } from "react-bootstrap";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import moment from "moment-timezone";
import {
  createDocument,
  deleteDocumentFile,
  deleteDocumentTemplate,
  getViewDocument,
} from "@/app/actions/documents-actions";
import { useModals } from "@/context/ModalContext";
import PDFViewerModal from "./PDFViewer";
import { IEmployeeDocument } from "@/lib/definitions";
import ModalExpirationDate from "./ModalExpirationDate";
import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import SuccessOverlay from "@/components/SuccessOverlay";
import ErrorOverlay from "@/components/ErrorOverlay";
import { formatCreatedAt } from "@/lib/helpers";

type FeedbackState = "loading" | "success" | "error" | null;

// Vencida si el día de vencimiento ya pasó (día de calendario en Ciudad de México)
function isExpired(date?: string | null) {
  if (!date) return false;
  const today = moment.tz("America/Mexico_City").format("YYYY-MM-DD");
  return String(date).slice(0, 10) < today;
}

function DocumentsGrid({
  doc,
  idEmployee,
  canDeleteFile = false,
  canDeleteTemplate = false,
}: {
  doc: IEmployeeDocument;
  idEmployee: number;
  canDeleteFile?: boolean;
  canDeleteTemplate?: boolean;
}) {
  const router = useRouter();
  const { modalConfirm } = useModals();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [modalExpirationDate, setModalExpirationDate] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  // Al reemplazar, el back borra la fecha de vencimiento: después del éxito se ofrece capturarla
  const [askDateAfter, setAskDateAfter] = useState(false);
  // Recién reemplazado: la fecha anterior ya no aplica aunque el listado aún no se recargue
  const [dateCleared, setDateCleared] = useState(false);

  const showGear = doc.exist || canDeleteTemplate;
  const expired = isExpired(doc.dateExpiration);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const resetFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    const isReplace = doc.exist;
    setFeedback("loading");
    setFeedbackMsg("Subiendo archivo...");

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await createDocument({
        formData,
        idEmployee,
        idDocument: doc.id,
        idPeriod: doc.idPeriod,
      });

      if (!res.success) {
        setFeedbackMsg(res.message || "No se pudo subir el archivo");
        setFeedback("error");
        return;
      }

      resetFiles();
      setAskDateAfter(isReplace);
      setDateCleared(isReplace);
      setFeedbackMsg(res.message || "Archivo cargado correctamente");
      setFeedback("success");
    } catch {
      setFeedbackMsg("Error inesperado, intenta de nuevo");
      setFeedback("error");
    }
  };

  const handleSuccessDone = () => {
    setFeedback(null);
    router.refresh();

    if (askDateAfter) {
      setAskDateAfter(false);
      modalConfirm(
        "El archivo nuevo no tiene fecha de vencimiento. ¿Quieres capturarla ahora?",
        () => setModalExpirationDate(true)
      );
    }
  };

  const handleGetDocument = async () => {
    try {
      setFeedback("loading");
      setFeedbackMsg("Cargando documento...");

      const res = await getViewDocument({
        idDocument: doc.id,
        idEmployee,
        idPeriod: doc.idPeriod,
      });

      if (!res.success) {
        setFeedbackMsg(res.message || "No se pudo abrir el documento");
        setFeedback("error");
        return;
      }

      setFeedback(null);
      setPdfUrl(res.data || "");
      setShowPdfModal(true);
    } catch {
      setFeedbackMsg("Error inesperado, intenta de nuevo");
      setFeedback("error");
    }
  };

  const handleDeleteFile = () => {
    modalConfirm("Se eliminará el archivo; la plantilla queda para volver a cargarlo.", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg("Eliminando documento...");

        const res = await deleteDocumentFile({ idEmployee, idDocument: doc.id, idPeriod: doc.idPeriod });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo eliminar el documento");
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

  const handleDeleteTemplate = () => {
    modalConfirm("Se eliminará la plantilla y su archivo (si tiene). No se puede deshacer.", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg("Eliminando plantilla...");

        const res = await deleteDocumentTemplate({ idEmployee, idDocument: doc.id });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo eliminar la plantilla");
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
      <ConditionalRender cond={feedback === "loading"}>
        <Loading message={feedbackMsg} />
      </ConditionalRender>
      <ConditionalRender cond={feedback === "success"}>
        <SuccessOverlay message={feedbackMsg} onDone={handleSuccessDone} />
      </ConditionalRender>
      <ConditionalRender cond={feedback === "error"}>
        <ErrorOverlay message={feedbackMsg} onDone={() => setFeedback(null)} />
      </ConditionalRender>

      <Col md="3">
        <Card
          className="rounded shadow-sm bg-body-tertiary"
          style={{ minHeight: "200px" }}
        >
          <Card.Header
            className="d-flex justify-content-between align-items-center gap-2"
            style={{ minHeight: "50px" }}
          >
            <div style={{ minWidth: 0 }}>
              <Card.Title
                className="text-uppercase mb-0 text-break"
                style={{ fontSize: "0.9rem" }}
              >
                {doc.titleView}
              </Card.Title>
              <ConditionalRender cond={doc.previousPeriod === true}>
                <span className="badge rounded-pill px-2 py-1 mt-1 fw-semibold bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle">
                  Periodo anterior
                </span>
              </ConditionalRender>
            </div>

            <ConditionalRender cond={showGear}>
              <DropdownButton
                size="sm"
                variant="secondary"
                title={<i className="bi bi-gear-fill"></i>}
                disabled={feedback === "loading"}
              >
                <ConditionalRender cond={doc.exist}>
                  <Dropdown.Item as={Button} onClick={() => setModalExpirationDate(true)}>
                    <i className="bi bi-calendar-minus me-1"></i>
                    Fecha de vencimiento
                  </Dropdown.Item>
                </ConditionalRender>
                <ConditionalRender cond={doc.exist && canDeleteFile}>
                  <Dropdown.Item as={Button} onClick={handleDeleteFile} className="text-danger">
                    <i className="bi bi-file-earmark-x me-1"></i>
                    Eliminar documento
                  </Dropdown.Item>
                </ConditionalRender>
                <ConditionalRender cond={canDeleteTemplate}>
                  <Dropdown.Item as={Button} onClick={handleDeleteTemplate} className="text-danger">
                    <i className="bi bi-trash me-1"></i>
                    Eliminar plantilla
                  </Dropdown.Item>
                </ConditionalRender>
              </DropdownButton>
            </ConditionalRender>
          </Card.Header>

          <Card.Body>
            {/* Input file oculto */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.pdf,.webp"
              multiple
              style={{ display: "none" }}
            />

            {/* Información de archivos seleccionados */}
            <ConditionalRender cond={selectedFiles.length > 0}>
              <div className="mb-2">
                <small className="text-muted">
                  {selectedFiles.length} archivo(s) seleccionado(s)
                </small>
                {selectedFiles.slice(0, 2).map((file, index) => (
                  <div key={index} className="small text-truncate">
                    {file.name}
                  </div>
                ))}
                <ConditionalRender cond={selectedFiles.length > 2}>
                  <div className="small text-muted">
                    +{selectedFiles.length - 2} más
                  </div>
                </ConditionalRender>
              </div>
            </ConditionalRender>

            <div className="d-flex flex-column justify-content-center gap-1">
              <ConditionalRender cond={selectedFiles.length === 0}>
                <ConditionalRender cond={doc.exist}>
                  <Button variant="info" onClick={handleButtonClick} disabled={feedback === "loading"}>
                    Reemplazar
                  </Button>

                  <Button variant="secondary" onClick={handleGetDocument} disabled={feedback === "loading"}>
                    Visualizar
                  </Button>

                  <ConditionalRender cond={!!doc.dateExpiration}>
                    <div
                      className={`fw-semibold text-center ${expired ? "text-danger-emphasis" : ""}`}
                      style={{ fontSize: "0.9rem" }}
                    >
                      {expired ? "Venció: " : "Expira: "}
                      {formatCreatedAt(doc.dateExpiration ?? undefined)}
                      <ConditionalRender cond={expired}>
                        <span className="badge rounded-pill px-2 py-1 ms-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                          Vencido
                        </span>
                      </ConditionalRender>
                    </div>
                  </ConditionalRender>
                </ConditionalRender>

                <ConditionalRender cond={!doc.exist}>
                  <Button variant="primary" onClick={handleButtonClick} disabled={feedback === "loading"}>
                    Cargar
                  </Button>
                </ConditionalRender>
              </ConditionalRender>

              <ConditionalRender cond={selectedFiles.length > 0}>
                <Button variant="success" onClick={handleUpload} disabled={feedback === "loading"}>
                  Subir
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={resetFiles}
                  disabled={feedback === "loading"}
                >
                  Cancelar
                </Button>
              </ConditionalRender>
            </div>
          </Card.Body>
        </Card>
      </Col>

      <PDFViewerModal
        show={showPdfModal}
        onHide={() => setShowPdfModal(false)}
        pdfBase64Url={pdfUrl}
      />

      <ConditionalRender cond={modalExpirationDate}>
        <ModalExpirationDate
          onHide={() => {
            setModalExpirationDate(false);
            setDateCleared(false);
          }}
          onSaved={() => {
            setModalExpirationDate(false);
            setDateCleared(false);
            router.refresh();
          }}
          idPeriod={doc.idPeriod}
          idDocument={doc.id}
          idEmpleado={idEmployee}
          title={doc.titleView}
          currentDate={dateCleared ? null : doc.dateExpiration}
        />
      </ConditionalRender>
    </>
  );
}

export default DocumentsGrid;
