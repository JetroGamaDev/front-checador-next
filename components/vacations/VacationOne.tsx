"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Container,
  Row,
} from "react-bootstrap";
import { formatDate } from "date-fns";

import SignaturesVacationView from "@/components/vacations/SignaturesVacationView";
import { FormBook, FormPage } from "../templates/FormView";

import ApproveVacationLeaderModal from "@/components/vacations/ApproveVacationLeaderModal";
import SignatureVacationDohModal from "@/components/vacations/SignatureDohModal";
import VacationPDFownload from "@/components/vacations/VacationPDFownload";

import { useSessionSnapshot } from "@/hooks/useSessionStore";
import { fetchPeriods } from "@/app/actions/vacations-actions";
import ConditionalRender from "../ConditionalRender";
import OverLay from "../templates/OverLay";
import Loading from "../LoadingSpinner";
import { useRouter } from "next/navigation";
import { ISignatures } from "@/lib/overTime/interface";
import SignatureEmployeeModal from "./SignatureVacationEmployeeModal";
import VacationsOneError from "./vacationsMessageError";
import { formatCreatedAt, formatCreatedAtOnlyHours, formatDateMx } from "@/lib/helpers";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import { PeriodVacation, Vacations } from "@/lib/vactions/interface";
import ModalBlur from "../ModalBlur";
import DeleteVacationModal from "./DeleteVactionsModal";

type FeedbackState = "loading" | "success" | "error" | null;


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

function safeDate(date?: string | Date | null, fmt = "dd/MM/yyyy") {
  if (!date) return "—";
  try {
    return formatDate(new Date(date), fmt);
  } catch {
    return "—";
  }
}

type DayBreakdown = {
  id: number;
  day?: string | Date | null;
  fortnightlyPeriod?: string | number | null;
};

export default function ShowInfoVacation({
  vacation,
}: {
  vacation: Vacations | null;
}) {
  const router = useRouter();
  const session = useSessionSnapshot();
  const roles = session?.uid?.roles;
  const [loading, setLoading] = useState(false);
  const [, setMessageLoading] = useState("");
  const [approveModal, setApproveModal] = useState(false);
  const [signatureDohModal, setSignatureDohModal] = useState(false);
  const [vacationPDFModal, setVacationPDFModal] = useState(false);
  const [employeeSignatureModal, setEmployeeSignatureModal] = useState(false);
  const [, setPeriods] = useState<PeriodVacation[]>([]);
  const [feedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const showPDF = vacation?.signatures?.every((f) => f.url !== "");
  const [showDeleteModal, setShowDeleteModal] = useState(false);


  const readInput = !roles?.isLeader
    && !roles?.isExtra
    && !roles?.isDoh
    && !roles?.isApproverLeaders
    && !roles?.isApproverDoh;

  const signatures = useMemo(() =>
    Array.isArray(vacation?.signatures) ? vacation?.signatures : [],
    [vacation?.signatures]
  );

  // ID del empleado con sesión activa
  const idEmployee = Number(session?.uid?.idEmployee);

  // ID del empleado al que pertenece el registro de overtime
  const overtimeEmployeeId = Number(vacation?.employee?.id);

  // Indica si el registro aún está pendiente de aprobación
  const isPending = vacation?.status === 'PENDING';

  // Busca la firma correspondiente al empleado con sesión activa
  // Solo recalcula si cambia el array de firmas o el id del empleado en sesión
  const currentSignature = useMemo(() => {
    return signatures.find((i: ISignatures) => i.idSignatory === idEmployee) ?? null;
  }, [signatures, idEmployee]);

  // Indica si el firmante actual aún no ha firmado (url vacía = sin firma)
  const hasNotSigned = currentSignature?.url === '';


  // ✅ Estos cálculos quedan ANTES del early return para no romper hooks
  const daysList: DayBreakdown[] = Array.isArray(vacation?.daysdaysBrokenDown)
    ? (vacation?.daysdaysBrokenDown as DayBreakdown[])
    : [];

  const getSignatureEmployee = () => {
    const sign = vacation?.signatures?.filter(
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
    session?.uid?.idEmployee === vacation?.idPersonDoh &&
    vacation?.dohApproval !== "APPROVED";

  const showEmployeeSign =
    session?.uid?.idEmployee === vacation?.employee?.id &&
    !getSignatureEmployee();

  // const showAnyActions = useMemo(() => {
  //   return showLeaderApprove || showDohApprove || showEmployeeSign || true; // Descargar siempre
  // }, [showLeaderApprove, showDohApprove, showEmployeeSign]);

  const getPeriods = useCallback(async () => {
    try {
      const idEmp = vacation?.idEmployee;

      if (!idEmp) {
        setPeriods([]);
        return;
      }

      const res = await fetchPeriods({
        idEmployee: Number(idEmp),
      });

      const nextPeriods = (res ?? []) as PeriodVacation[];
      setPeriods(nextPeriods);
    } catch (error) {
      console.error(error);
      setPeriods([]);
    }
  }, [vacation?.idEmployee]);

  useEffect(() => {
    getPeriods();
  }, [getPeriods]);


  const handleApprove = () => setApproveModal(true);
  const handleSignatureDoh = () => setSignatureDohModal(true);
  const handleDownloadPDF = () => setVacationPDFModal(true);

  // si tienes modal/flujo de firma empleado, aquí lo conectas
  const handleEmployeeSignature = () => setEmployeeSignatureModal(true);

  const handleCreate = () => {
    setLoading(true);
    setMessageLoading('Cargando...');
    router.push("/app/vacationList/create");
  };

  const handleBack = () => {
    setLoading(true);
    setMessageLoading("Cargando datos...");
    router.push("/app/vacationList");
  }



  if (!vacation || !vacation?.id || !vacation?.period) {
    return (
      <VacationsOneError />
    );
  }
  const overallStatus = vacation?.status ?? "PENDING";

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

          {/* Izquierda: acciones */}
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
                  Crear registro
                </span>
              </Button>
            </OverLay>

            {/* <ConditionalRender cond={showAnyActions}> */}
            <OverLay string="Eliminar registro">
              <Button
                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                disabled={loading}
              >
                <i className="bi bi-trash" />

                <span className="d-none d-md-inline ms-2">
                  Eliminar solicitud
                </span>
              </Button>
            </OverLay>
            {/* </ConditionalRender> */}

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
                  <span className="d-none d-md-inline ms-2">Aprobar</span>
                </Button>
              </OverLay>
            </ConditionalRender>

            <ConditionalRender cond={showDohApprove}>
              <OverLay string="Aprobar">
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

            <ConditionalRender cond={showPDF === true}>
              <OverLay string="Descargar PDF">
                <Button
                  className="border-light bg-black text-light d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3 border"
                  variant="black"
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
          <h1 className="mb-1 ms-1 text-uppercase"> {fullName(vacation.employee)}</h1>
          <p className="text-muted mb-0 ms-1">
            Información de la solicitud de vacaciones.
          </p>
        </div>


        {/* Título */}
        <Card className="border shadow-sm rounded-4 mt-2">
          <Card.Body className="p-4">

            <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h5 className="mb-1 fw-bold">
                  Solicitud #{vacation.id}
                </h5>

                <p className="text-muted mb-0 text-uppercase">
                  {vacation.holidayName ?? "Solicitada por el empleado"}
                </p>
              </div>

              {statusVariant(overallStatus)}

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
                        <span className="fw-semibold text-end">{formatDateMx(vacation.createdAt)}</span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-clock" />
                          <span className="text-muted">Hora de creación</span>
                        </div>
                        <span className="fw-semibold text-end">{formatCreatedAtOnlyHours(vacation.createdAt)}</span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-person text-success" />
                          <span className="text-muted">Creada por</span>
                        </div>
                        <span className="fw-semibold text-end">
                          {fullName(vacation.createForPerson)}
                        </span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-person-workspace text-warning" />
                          <span className="text-muted">Líder</span>
                        </div>
                        <span className="fw-semibold text-end">
                          {fullName(vacation.leader)}
                        </span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-person-check text-info" />
                          <span className="text-muted">D.O.H.</span>
                        </div>
                        <span className="fw-semibold text-end">
                          {fullName(vacation.personDoh)}
                        </span>
                      </div>

                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-calendar-range text-info" />
                          <span className="text-muted"> Periodo vacacional </span>
                        </div>
                        <span className="fw-semibold text-end">
                          {`${safeDate(vacation.period.dateInitPeriod)} - ${safeDate(vacation.period.dateEndPeriod)}`}
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
                          { readInput ? "Consulta los días solicitados." : "Consulta los días solicitados y las notas extra registras."}
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
                            {vacation.notes ? vacation.notes : "No hay notas adicionales"}
                          </div>
                        </div>
                      </ConditionalRender>

                      <Row className="g-3">
                        <Col xs={12} md={6} xl={4}>
                          <div className="border rounded-3 p-3 text-center h-100">
                            <i className="bi bi-calendar-event text-success fs-5 mb-2 d-block" />
                            <div className="text-muted small">Inicio</div>
                            <div className="fw-semibold">
                              {formatCreatedAt(vacation.dateInit)}
                            </div>
                          </div>
                        </Col>

                        <Col xs={12} md={6} xl={4}>
                          <div className="border rounded-3 p-3 text-center h-100">
                            <i className="bi bi-calendar-x text-danger fs-5 mb-2 d-block" />
                            <div className="text-muted small">Fin</div>
                            <div className="fw-semibold">
                              {formatCreatedAt(vacation.dateEnd)}
                            </div>
                          </div>
                        </Col>

                        <Col xs={12} md={6} xl={4}>
                          <div className="border rounded-3 p-3 text-center h-100">
                            <i className="bi bi-hourglass-split text-info fs-5 mb-2 d-block" />
                            <div className="text-muted small">Días solicitados</div>
                            <div className="fw-bold fs-5">
                              {vacation.daysRequest ?? 0}
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* DESGLOSE DE DÍAS */}
            <Card className="border rounded-4 mb-4">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <h6 className="mb-0 fw-bold">Días solicitados</h6>
                  <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                    {daysList.length} {daysList.length === 1 ? "día" : "días"}
                  </span>
                </div>

                <ConditionalRender cond={daysList.length === 0}>
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-calendar-minus fs-4 d-block mb-2" />
                    Sin desglose de días solicitados.
                  </div>
                </ConditionalRender>

                <ConditionalRender cond={daysList.length > 0}>
                  <div>
                    <div className="d-flex align-items-center justify-content-between px-1 pb-2 border-bottom">
                      <span className="text-muted small text-uppercase fw-semibold">Día</span>
                      <span className="text-muted small text-uppercase fw-semibold">Periodo catorcenal</span>
                    </div>

                    {daysList.map((d, index) => (
                      <div
                        key={d.id}
                        className={`d-flex align-items-center justify-content-between px-1 py-2 ${index !== daysList.length - 1 ? "border-bottom" : ""
                          }`}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-calendar-event text-warning" />
                          <span className="fw-semibold">{formatCreatedAt(String(d.day))}</span>
                        </div>

                        <span className="fw-semibold">{d.fortnightlyPeriod ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </ConditionalRender>
              </Card.Body>
            </Card>

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
                    <Row className="g-2 py-2">
                      {signatures.map((sign) => (
                        <SignaturesVacationView
                          key={`${sign.id}-${sign.url}`}
                          idSolicitud={vacation.id}
                          idPeriod={vacation.period.id}
                          idEmployee={sign.idSignatory}
                          name={sign.name}
                          status={sign.status}
                          label={sign.label}
                        />
                      ))}
                    </Row>
                  </FormPage>
                </FormBook>
              </Card.Body>
            </Card >

          </Card.Body>
        </Card >
      </Container >

      <SignatureEmployeeModal
        show={employeeSignatureModal}
        idPeriod={Number(vacation?.idPeriod)}
        onHide={() => setEmployeeSignatureModal(false)}
        id={String(vacation.id)}
      />
      <ApproveVacationLeaderModal
        id={String(vacation.id)}
        idPeriod={Number(vacation?.idPeriod)}
        show={approveModal}
        onHide={() => setApproveModal(false)}
      />

      <SignatureVacationDohModal
        show={signatureDohModal}
        onHide={() => setSignatureDohModal(false)}
        id={String(vacation.id)}
        idPeriod={Number(vacation?.idPeriod)}
      />

      <VacationPDFownload
        show={vacationPDFModal}
        onHide={() => setVacationPDFModal(false)}
        id={String(vacation.id)}
      />

      <ConditionalRender cond={showDeleteModal}>
        <ModalBlur onClose={() => setShowDeleteModal(false)}>
          <DeleteVacationModal
            show={showDeleteModal}
            onHide={() => { setShowDeleteModal(false); }}
            idVacation={vacation.id}
            motive={vacation.delete?.reaseonDelete ?? ""}
            status={vacation.delete?.delete ?? false}
            idPeriod={vacation.idPeriod}
          />
        </ModalBlur>
      </ConditionalRender>
    </>
  );
}