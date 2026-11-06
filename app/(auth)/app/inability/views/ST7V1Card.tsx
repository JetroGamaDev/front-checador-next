"use client";

import { useModals } from "@/context/ModalContext";
import { useRef, useState } from "react";
import {
  Button,
  Card,
  Col,
  Dropdown,
  DropdownButton,
  ProgressBar,
} from "react-bootstrap";
import PDFViewerModal from "../../employee/views/PDFViewer";
import { getViewSTDocument, uploadST } from "@/app/actions/st-actions";
import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import SuccessOverlay from "@/components/SuccessOverlay";
import ErrorOverlay from "@/components/ErrorOverlay";
import ModalBlur from "@/components/ModalBlur";
import FormUpdateDateV1 from "@/components/inability/FormUpdateDateV1";
import { IInability } from "@/lib/inhability/interface";
import { formatCreatedAt } from "@/lib/helpers";
import { useSessionSnapshot } from "@/hooks/useSessionStore";

type FeedbackState = "loading" | "success" | "error" | null;

function ST7V1Card({
  st2v1Doc,
  idDoc,
  getData
}: {
  st2v1Doc: IInability["sT7FillingDocumentv1"] | undefined;
  idDoc: string;
  getData?: () => void | Promise<void>;
}) {

  const session = useSessionSnapshot();
  const roles = session?.uid?.roles;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [loading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [showUpdateDateModal, setShowUpdateDateModal] = useState(false);
  const { modalConfirm } = useModals();
  const hasDocument = !!st2v1Doc?.urlDocument;

  const readInput = !roles?.isLeader
    && !roles?.isExtra
    && !roles?.isDoh
    && !roles?.isApproverLeaders
    && !roles?.isApproverDoh;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files);
      setSelectedFiles(filesArray);

      // No llamamos a onFilesChange inmediatamente, esperamos a que el usuario haga clic en "Subir"
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  //SUBIR
  const handleUpload = async () => {
    modalConfirm("¿Deseas subir este archivo?", async () => {
      if (selectedFiles.length === 0) return;

      try {
        setFeedback("loading");
        setFeedbackMsg("Subiendo documento...");
        const formData = new FormData();

        // Agregar cada archivo al FormData
        selectedFiles.forEach((file) => {
          formData.append("files", file);
        });

        const res = await uploadST({
          formData,
          idDoc,
          version: "sT7FillingDocumentv1",
        });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo subir");
          setFeedback("error");
          return;
        }

        setFeedbackMsg("Archivo cargado correctamente");
        setFeedback("success");

        // Opcional: resetear el estado después de subir
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        await getData?.(); // ← refresca los datos del padre
      } catch {
        setFeedbackMsg("Error inesperado, intenta de nuevo");
        setFeedback("error");
      }
    });
  };

  //VISUALIZAR
  const handleGetDocument = async () => {
    setFeedback("loading");
    setFeedbackMsg("Cargando...");

    const res = await getViewSTDocument({
      idDoc,
      version: "sT7FillingDocumentv1",
    });

    if (!res.success) {
      setFeedbackMsg(res.message || "No se pudo cargar el documento");
      setFeedback("error");
    }
    setPdfUrl(res.data || "");
    setShowPdfModal(true);
    setFeedback(null)
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <ConditionalRender cond={feedback === "loading"}>
        <Loading message={feedbackMsg} />
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

      <Col xs={12} sm={6} md={4} xl={3}>
        <Card className="rounded shadow-sm bg-body-tertiary h-100">
          <Card.Header className="d-flex justify-content-between align-items-end">
            <Card.Title
              className="text-center text-uppercase mb-0"
              style={{ fontSize: "0.9rem" }}
            >
              ST7 V1
            </Card.Title>

            <ConditionalRender cond={!readInput}>
              <DropdownButton
                size="sm"
                variant="secondary"
                title={<i className="bi bi-gear-fill"></i>}
              >
                <Dropdown.Item onClick={() => setShowUpdateDateModal(true)}>
                  <i className="bi bi-calendar-minus me-1" />
                  Fecha de expiración
                </Dropdown.Item>
              </DropdownButton>
            </ConditionalRender>
          </Card.Header>

          <Card.Body className="d-flex flex-column justify-content-center">
            <ConditionalRender cond={loading}>
              <div
                className="text-center h-100 align-content-center"
                style={{ height: "200px" }}
              >
                <ProgressBar variant="primary" striped now={100} animated />
              </div>
            </ConditionalRender>

            <ConditionalRender cond={!loading}>
              <div>
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
                {selectedFiles.length > 0 && (
                  <div className="mb-2">
                    <small className="text-muted">
                      {selectedFiles.length} archivo(s) seleccionado(s)
                    </small>
                    {selectedFiles.slice(0, 2).map((file, index) => (
                      <div key={index} className="small text-truncate">
                        {file.name}
                      </div>
                    ))}
                    {selectedFiles.length > 2 && (
                      <div className="small text-muted">
                        +{selectedFiles.length - 2} más
                      </div>
                    )}
                  </div>
                )}

                <ConditionalRender cond={readInput && !hasDocument}>
                  <div className="d-flex flex-column align-items-center text-center py-4">
                    <i className="bi bi-file-earmark-x fs-3 text-danger" />
                    <p className="mt-2 mb-0 text-danger fw-bold">No hay documentos cargados aún</p>
                  </div>
                </ConditionalRender>


                {/* Botones condicionales */}
                <div className="d-flex flex-column justify-content-center gap-1">
                  <ConditionalRender cond={selectedFiles.length === 0}>
                    <div className="d-flex flex-column align-items-center gap-2">

                      <ConditionalRender cond={!readInput}>
                        <Button
                          onClick={handleButtonClick}
                          variant={hasDocument ? "primary" : "success"}
                          style={{ width: "80%" }}
                        >
                          {hasDocument ? "Reemplazar" : "Cargar"}
                        </Button>
                      </ConditionalRender>

                      <ConditionalRender cond={hasDocument}>
                        <Button
                          variant="secondary"
                          onClick={handleGetDocument}
                          style={{ width: "80%" }}
                        >
                          Visualizar
                        </Button>
                      </ConditionalRender>

                    </div>
                  </ConditionalRender>


                  <ConditionalRender cond={selectedFiles.length !== 0}>
                    <Button variant="success" onClick={handleUpload}>
                      Subir
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={handleCancel}
                    >
                      Cancelar
                    </Button>
                  </ConditionalRender>

                </div>
              </div>
            </ConditionalRender>

          </Card.Body>

          <ConditionalRender cond={st2v1Doc?.expirationDateDocument !== undefined}>
            <Card.Footer>
              <h6 className="text-center">Fecha de expiración:</h6>
              <p className="text-center">
                {formatCreatedAt(st2v1Doc?.expirationDateDocument) || "Sin fecha de expiración"}
              </p>
            </Card.Footer>
          </ConditionalRender> 
        </Card>
        
        <PDFViewerModal
          show={showPdfModal}
          onHide={() => {
            setShowPdfModal(false);
            setPdfUrl("");
          }}
          pdfBase64Url={pdfUrl}
        />
      </Col>

      <ConditionalRender cond={showUpdateDateModal}>
        <ModalBlur onClose={() => setShowUpdateDateModal(false)}>
          <FormUpdateDateV1
            key={st2v1Doc?.expirationDateDocument}
            show={showUpdateDateModal}
            onHide={() => setShowUpdateDateModal(false)}
            getData={getData}
            id={Number(idDoc)}
            doc={st2v1Doc}
          />
        </ModalBlur>
      </ConditionalRender>
    </>
  );
}

export default ST7V1Card;
