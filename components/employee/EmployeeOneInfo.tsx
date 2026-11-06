"use client";

import {
  FormBook,
  FormPage,
} from "@/components/templates/FormView";
import {
  Accordion,
  Button,
  Card,
  Col,
  Container,
  Row,
  Table,
} from "react-bootstrap";
import {
  Branch,
  Department,
  Employee,
  IPeriod,
} from "@/lib/definitions";
import DocumentsGrid from "@/app/(auth)/app/employee/views/DocuementsGrid";
import { useSession } from "next-auth/react";
import { useState } from "react";
import ModalBlur from "../ModalBlur";
import FormUpdateEmployee from "@/app/(auth)/app/employee/views/updateEmplyee/update";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import RegisterBiometricModal from "./rekognition";
import UnsubscribeEmployeeComponent from "./Unsubscribe";
import NewDocumentEmployeeComponent from "./NewDocument";
import AlertBiometrics from "../AlertBiometrics";
import { useRouter, useSearchParams } from "next/navigation";
import OverLay from "../templates/OverLay";
import { formatCreatedAt, formatScheduleTime } from "@/lib/helpers";
import moment from "moment";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import EmployeeOneError from "./EmployeeMessageError";
import ReEntryModal from "./reEntryModal";
import { IUpdateVacation, Vacations } from "@/lib/vactions/interface";
import UpdateHolidayModal from "./UpdateHolidayModal";
import { useModals } from "@/context/ModalContext";
import { resetEmployeeTwoFactor } from "@/app/actions/twoFactor-actions";
import { resetPasswordSystem } from "@/app/actions/employeePasswordSystem-actions";
import EmployeePermissionsModal from "../employeePermissions/EmployeePermissionsModal";


type FeedbackState = "loading" | "success" | "error" | null;


function formatText(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatPhone(
  value?:
    | string
    | {
      internationalNumber?: string | null;
    }
    | null
) {
  if (!value) return "-";
  if (typeof value === "string") return value || "-";
  return value.internationalNumber || "-";
}

function anniversaryLetterVariant(type: string | null) {
  switch ((type ?? "").toLowerCase()) {
    case "pending":
      return (
        <span className="badge rounded-pill px2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
          PENDIENTE
        </span>
      )
    case "entregada":
      return (
        <span className="badge rounded-pill px2 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle" >
          ENTREGADA
        </span >
      )
    default:
      return (
        <span> --- </span>
      )
  }
}

function statusVariant(type: number | null) {
  switch ((type ?? 0)) {
    case 1:
      return (
        <span className="badge rounded-pill px2 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle">
          ACTIVO
        </span>
      )

    case 2:
      return (
        <span className="badge rounded-pill px2 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
          BAJA
        </span>
      )
    default:
      return (
        <span className="badge rounded-pill px2 py-2 fw-semibold bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle" />
      )
  }
}

function getApprovalBadge(status: string) {
  const normalized = status?.toUpperCase();

  const map: Record<string, { text: string; className: string }> = {
    APPROVED: { text: "Aprobado", className: "bg-success-subtle text-success-emphasis border-success-subtle" },
    REFUSED: { text: "Rechazado", className: "bg-danger-subtle text-danger-emphasis border-danger-subtle" },
    PENDING: { text: "Pendiente", className: "bg-warning-subtle text-warning-emphasis border-warning-subtle" },
  };

  const badge = map[normalized] ?? { text: status, className: "bg-secondary-subtle text-secondary-emphasis border-secondary-subtle" };

  return (
    <span className={`badge rounded-pill px-2 py-1 fw-semibold border ${badge.className}`}>
      {badge.text}
    </span>
  );
}

type Props = {
  employee: Employee;
  id: string;
  departments: Department[];
  branches: Branch[];
  employees: Employee[];
  documents: IPeriod[];
  vacations: Vacations[];
};

export default function EmployeeDetailsView({
  employee,
  id,
  departments,
  branches,
  employees,
  documents,
  vacations,
}: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [showRegisterBiometricModal, setShowRegisterBiometricModal] = useState(false);
  const [showUpdateEmployeeModal, setShowUpdateEmployeeModal] = useState(false);
  const [loading] = useState(false);
  const [showUnsubscribeEmployeeModal, setShowUnsubscribeEmployeeModal] = useState(false);
  const [showNewDocumentEmployeeModal, setShowNewDocumentEmployeeModal] = useState(false);
  const statusOne = employee?.status === 1;
  const statusTwo = employee?.status === 2;
  const [hideBiometricAlert, setHideBiometricAlert] = useState(false);
  const hasBiometricPhotos = (employee?.biometricPhotos?.length ?? 0) > 0;
  const hasVacations = vacations?.length > 0;
  const aniversaryLetterStatus = employee?.anniversaryLetter ?? "";
  const statusEmployee = employee?.status ?? 0;
  const saturdatEntry = moment(employee?.scheduleSaturday?.entry, "HH:mm").format("hh:mm A");
  const saturdayExit = moment(employee?.scheduleSaturday?.exit, "HH:mm").format("hh:mm A");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [showReEntryModal, setShowReEntryModal] = useState(false);
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const [showUpdateHoliday, setShowUpdateHoliday] = useState(false);
  const [sendIdRequest, setSendIdRequest] = useState<number | null>(null);
  const [sendIdPeriod, setSendIdPeriod] = useState<number | null>(null);
  const [sendHolidayName, setSendHolidayName] = useState<string | null>(null);
  const { modalConfirm } = useModals();
  // Reiniciar contraseña del sistema: con actualizar_empleados; si el back lo niega por permisos se oculta
  const [passwordResetDenied, setPasswordResetDenied] = useState(false);
  // Permisos individuales del empleado: se ven con listar_permisos_empleados y se editan con actualizar_permisos_empleados
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);


  const department =
    departments.find((d) => d.id === employee?.department?.id) ||
    employee?.department ||
    null;

  const branch =
    branches.find((b) => b.id === employee?.branch?.id) || employee?.branch;


  const upperCase = (text?: string) => {
    return text?.toUpperCase() || "";
  };

  const getEmployeeName = (u: Employee | null) => {
    if (!u) return "No se puede dejar vacío este campo"


    return u.id
      ? `${upperCase(u.name)} ${upperCase(u.lastName)}`
      : `EMPLEADO #${u.id}`;
  };

  const handleBack = () => {
    setFeedback("loading");
    setFeedbackMsg("Cargando...");
    setTimeout(() => {
      router.push("/app/employee");
    }, 1200);
  }

  const handleCreate = () => {
    setFeedback("loading");
    setFeedbackMsg("Cargando...");
    router.push("/app/employee/create");
  };

  const handleHoliday = (idRequest: number, idPeriod: number, data: IUpdateVacation, holidayName: string) => {
    
    setSendIdRequest(idRequest);
    setSendIdPeriod(idPeriod);
    setSendHolidayName(holidayName);
    setShowUpdateHoliday(true);
  }

  const handleResetTwoFactor = () => {
    modalConfirm("¿Seguro que quieres reiniciar la verificación en dos pasos del empleado?", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg("Reiniciando verificación en dos pasos...");

        const res = await resetEmployeeTwoFactor({ id: Number(id) });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo reiniciar la verificación en dos pasos");
          setFeedback("error");
          return;
        }

        setFeedbackMsg(res.message || "Verificación en dos pasos reiniciada");
        setFeedback("success");
      } catch (error) {
        console.log(error);

        setFeedbackMsg("Error inesperado, intenta de nuevo");
        setFeedback("error");
      }
    });
  }


  const handleResetPasswordSystem = () => {
    modalConfirm("El empleado volverá a entrar con su NIP del checador y se le pedirá crear una contraseña nueva.", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg("Reiniciando contraseña...");

        const res = await resetPasswordSystem(Number(employee?.id));

        if (!res.success) {
          if (/permiso/i.test(res.message)) setPasswordResetDenied(true);
          setFeedbackMsg(res.message || "No se pudo reiniciar la contraseña");
          setFeedback("error");
          return;
        }

        setFeedbackMsg(res.message || "Contraseña reiniciada");
        setFeedback("success");
      } catch {
        setFeedbackMsg("Error inesperado, intenta de nuevo");
        setFeedback("error");
      }
    });
  }

  const canListEmployeePermissions = !!session?.user?.permissions?.some((p) => p.text === "listar_permisos_empleados");
  const canUpdateEmployeePermissions = !!session?.user?.permissions?.some((p) => p.text === "actualizar_permisos_empleados");

  const canResetPasswordSystem = !passwordResetDenied &&
    !!session?.user?.permissions?.some((p) => p.text === "actualizar_empleados");

  if (!employee) {
    return (
      <EmployeeOneError />
    );
  }

  return (
    <>
      <ConditionalRender cond={!hasBiometricPhotos && !hideBiometricAlert}>
        <AlertBiometrics onClose={() => setHideBiometricAlert(true)} />
      </ConditionalRender>

      {showPermissionsModal && employee?.id && (
        <EmployeePermissionsModal
          idEmployee={Number(employee.id)}
          canUpdate={canUpdateEmployeePermissions}
          onClose={() => setShowPermissionsModal(false)}
          onResult={(success, message) => {
            setFeedbackMsg(message);
            setFeedback(success ? "success" : "error");
          }}
        />
      )}

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
            <OverLay string="Crear incapacidad">
              <Button
                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                variant="primary"
                onClick={handleCreate}
                disabled={loading}
              >
                <i className="bi bi-plus-lg" />
                <span className="d-none d-md-inline ms-2">
                  Crear Empleado
                </span>
              </Button>
            </OverLay>

            <OverLay string="Actualizar empleado">
              <Button
                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                variant="info"
                onClick={() => setShowUpdateEmployeeModal(true)}
              >
                <i className="bi bi-pencil" />

                <span className="d-none d-md-inline ms-2">
                  Actualizar Empleado
                </span>
              </Button>
            </OverLay>

            <ConditionalRender cond={statusOne}>
              <OverLay string="Dar de baja">
                <Button
                  className="d-inline-flex align-items-center fw-semibold px-2 px-md-3"
                  variant="danger"
                  onClick={() => setShowUnsubscribeEmployeeModal(true)}
                >
                  <i className="bi bi-arrow-down " />
                  <span className="d-none d-md-inline ms-2">
                    Dar de baja
                  </span>
                </Button>
              </OverLay>
            </ConditionalRender>

            <ConditionalRender cond={statusTwo}>
              <Button
                className="d-inline-flex align-items-center fw-semibold px-3"
                variant="success"
                onClick={() => setShowReEntryModal(true)}
              >
                <i className="bi bi-arrow-up me-2" />
                Reingreso
              </Button>
            </ConditionalRender>

            <OverLay string="Registrar biométricos">
              <Button
                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                variant="warning"
                onClick={() => setShowRegisterBiometricModal(true)}
              >
                <i className="bi bi-person-bounding-box" />

                <span className="d-none d-md-inline ms-2">
                  Registrar biométricos
                </span>
              </Button>
            </OverLay>

            <OverLay string="Reiniciar verificación en dos pasos">
              <Button
                className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                variant="outline-danger"
                onClick={handleResetTwoFactor}
              >
                <i className="bi bi-shield-x" />

                <span className="d-none d-md-inline ms-2">
                  Reiniciar verificación
                </span>
              </Button>
            </OverLay>

            <ConditionalRender cond={canListEmployeePermissions}>
              <OverLay string="Permisos del empleado">
                <Button
                  className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                  variant="outline-primary"
                  onClick={() => setShowPermissionsModal(true)}
                >
                  <i className="bi bi-shield-lock" />

                  <span className="d-none d-md-inline ms-2">
                    Permisos
                  </span>
                </Button>
              </OverLay>
            </ConditionalRender>

            <ConditionalRender cond={canResetPasswordSystem}>
              <OverLay string="Reiniciar contraseña del sistema">
                <Button
                  className="d-inline-flex align-items-center justify-content-center fw-semibold px-2 px-md-3"
                  variant="outline-danger"
                  onClick={handleResetPasswordSystem}
                >
                  <i className="bi bi-key" />

                  <span className="d-none d-md-inline ms-2">
                    Reiniciar contraseña del sistema
                  </span>
                </Button>
              </OverLay>
            </ConditionalRender>
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
          <h1 className=" ms-1"> {getEmployeeName(employee)} </h1>
          <p className="text-muted mb-1 ms-1">
            Información del empleado.
          </p>
        </div>

        <Card className="rounded-4 shadow-sm border">
          <Card.Body className="p-3 p-md-5">
            <FormBook dKey={tab || "personalInfo"}>

              {/* =============== Informacion Personal ===================*/}

              <FormPage title="Información Personal" eventKey="personalInfo">
                {/* <PageSheet> */}
                <Row className="g-4 align-items-stretch">
                  <Col xs={12} xl={6} className="d-flex">

                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Información personal</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Empleado
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-3">
                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-person text-primary" />
                              <span className="text-muted">Nombre</span>
                            </div>

                            <span className="fw-semibold text-end text-uppercase">
                              {formatText(employee?.name)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-person-badge text-success" />
                              <span className="text-muted">Apellidos</span>
                            </div>

                            <span className="fw-semibold text-end text-uppercase">
                              {formatText(employee?.lastName)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-envelope text-info" />
                              <span className="text-muted">Correo personal</span>
                            </div>

                            <span className="fw-semibold text-end text-break">
                              {formatText(employee?.emailPersonal)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-phone text-warning" />
                              <span className="text-muted">Celular</span>
                            </div>

                            <span className="fw-semibold">
                              {formatPhone(employee?.phonePersonal)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-telephone text-secondary" />
                              <span className="text-muted">Teléfono fijo</span>
                            </div>

                            <span className="fw-semibold text-end">
                              {formatPhone(employee?.homePhone)}
                            </span>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12} xl={6} className="d-flex">
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Dirección</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Domicilio
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-3">
                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-signpost text-primary" />
                              <span className="text-muted">Calle</span>
                            </div>

                            <span className="fw-semibold text-end text-uppercase">
                              {formatText(employee?.address?.street)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-house-door text-success" />
                              <span className="text-muted">No. Exterior</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {formatText(employee?.address?.numberOut)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-door-open text-info" />
                              <span className="text-muted">No. Interior</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {formatText(employee?.address?.numberIn)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-buildings text-warning" />
                              <span className="text-muted">Colonia</span>
                            </div>

                            <span className="fw-semibold text-end text-uppercase">
                              {formatText(employee?.address?.neighborhood)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-mailbox text-secondary" />
                              <span className="text-muted">C.P.</span>
                            </div>

                            <span className="fw-semibold">
                              {formatText(employee?.address?.zipCode)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-geo-alt text-danger" />
                              <span className="text-muted">Municipio</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {formatText(employee?.address?.municipality)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-map text-primary" />
                              <span className="text-muted">Estado</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {formatText(employee?.address?.state)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-globe-americas text-success" />
                              <span className="text-muted">País</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {formatText(employee?.address?.country)}
                            </span>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12} xl={6} className="d-flex">
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Identificación</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Datos oficiales
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-3">
                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-calendar-event text-primary" />
                              <span className="text-muted">Nacimiento</span>
                            </div>

                            <span className="fw-semibold">
                              {formatCreatedAt(employee.birthDate)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-flag text-success" />
                              <span className="text-muted">Nacionalidad</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {formatText(employee?.nationality)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-shield-check text-info" />
                              <span className="text-muted">NSS</span>
                            </div>

                            <span className="fw-semibold">
                              {formatText(employee?.socialSecurityNumber)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-file-earmark-text text-warning" />
                              <span className="text-muted">R.F.C.</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {formatText(employee?.rfc)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-person-vcard text-secondary" />
                              <span className="text-muted">CURP</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {formatText(employee?.curp)}
                            </span>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12} xl={6} className="d-flex">
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Datos físicos y salud</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Salud
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-3">
                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-gender-ambiguous text-primary" />
                              <span className="text-muted">Género</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {formatText(employee?.gender)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-droplet-fill text-danger" />
                              <span className="text-muted">Grupo sanguíneo</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {formatText(employee?.bloodType)}
                            </span>
                          </div>

                          {/* Aviso de privacidad: ya no se captura
                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-speedometer2 text-warning" />
                              <span className="text-muted">Peso</span>
                            </div>

                            <span className="fw-semibold">
                              {formatText(employee?.weight)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-arrows-vertical text-info" />
                              <span className="text-muted">Altura</span>
                            </div>

                            <span className="fw-semibold">
                              {formatText(employee?.height)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-person-standing text-success" />
                              <span className="text-muted">Constitución</span>
                            </div>

                            <span className="fw-semibold text-end text-uppercase">
                              {formatText(employee?.constitution)}
                            </span>
                          </div>
                          */}

                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-heart-pulse text-danger" />
                              <span className="text-muted">Estado de salud</span>
                            </div>

                            <span className="fw-semibold text-end text-uppercase">
                              {formatText(employee?.healthStatus)}
                            </span>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12} xl={6} className="d-flex">
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Formación y familia</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Perfil
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-3">
                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-mortarboard text-primary" />
                              <span className="text-muted">Formación académica</span>
                            </div>

                            <span className="fw-semibold text-end text-uppercase">
                              {formatText(employee?.education)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-stars text-warning" />
                              <span className="text-muted">Habilidades</span>
                            </div>

                            <span className="fw-semibold text-end text-uppercase">
                              {formatText(employee?.skills)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-person-fill text-info" />
                              <span className="text-muted">Hijos</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {formatText(employee?.sons)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-person-fill text-danger" />
                              <span className="text-muted">Hijas</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {formatText(employee?.daughters)}
                            </span>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12} lg={6} className="d-flex">
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Observaciones generales</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Notas
                          </span>
                        </div>

                        <div className="d-flex align-items-start gap-3">
                          <i
                            className="bi bi-chat-left-text text-primary fs-4"
                          />

                          <div className="flex-grow-1">
                            <div className="text-muted small mb-2">
                              Comentarios registrados
                            </div>

                            <div
                              className="p-3 rounded-3 border text-uppercase"
                              style={{
                                minHeight: "120px",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {formatText(employee?.comments)}
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                {/* </PageSheet> */}
              </FormPage>

              {/* =============== Informacion Laboral ===================*/}

              <FormPage title="Información Laboral" eventKey="jobInfo">
                {/* <PageSheet> */}
                <Row className="g-4 align-items-stretch">
                  <Col xs={12} xl={6} className="d-flex">
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Información laboral</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Empresa
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-3">
                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-telephone text-primary" />
                              <span className="text-muted">Teléfono de oficina</span>
                            </div>

                            <span className="fw-semibold text-end">
                              {formatPhone(employee?.phoneCompany)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-diagram-2 text-success" />
                              <span className="text-muted">Extensión</span>
                            </div>

                            <span className="fw-semibold text-end">
                              {formatText(employee?.phoneExtCompany)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-envelope-at text-info" />
                              <span className="text-muted">Correo corporativo</span>
                            </div>

                            <span className="fw-semibold text-end text-break">
                              {formatText(employee?.emailCompany)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-building text-warning" />
                              <span className="text-muted">Departamento</span>
                            </div>

                            <span className="fw-semibold text-uppercase text-end">
                              {formatText(department?.nameDepartment)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-briefcase text-secondary" />
                              <span className="text-muted">Puesto</span>
                            </div>

                            <span className="fw-semibold text-uppercase text-end">
                              {formatText(employee?.position?.namePosition)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-person-workspace text-primary" />
                              <span className="text-muted">Líder</span>
                            </div>

                            <span className="fw-semibold text-end text-uppercase">
                              {employee?.leader?.name}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-geo-alt text-danger" />
                              <span className="text-muted">Sucursal</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {formatText(branch?.name)}
                            </span>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12} lg={6} className="d-flex">
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Horario y checador</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Asistencia
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-3">
                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-fingerprint text-primary" />
                              <span className="text-muted">ID Checador</span>
                            </div>

                            <span className="fw-semibold">
                              {formatText(employee?.idCheck)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-key text-warning" />
                              <span className="text-muted">Contraseña de checador</span>
                            </div>

                            <span className="fw-semibold">
                              {formatText(employee?.passwordCheck)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-box-arrow-in-right text-success" />
                              <span className="text-muted">Entrada Oficina</span>
                            </div>

                            <span className="fw-semibold">
                              {formatScheduleTime(employee?.scheduleOffice?.entry)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-box-arrow-right text-danger" />
                              <span className="text-muted">Salida Oficina</span>
                            </div>

                            <span className="fw-semibold">
                              {formatScheduleTime(employee?.scheduleOffice?.exit)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-cup-hot text-success" />
                              <span className="text-muted">Entrada comedor</span>
                            </div>

                            <span className="fw-semibold">
                              {formatScheduleTime(employee?.scheduleLunch?.entry)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-cup-straw text-danger" />
                              <span className="text-muted">Salida comedor</span>
                            </div>

                            <span className="fw-semibold">
                              {formatScheduleTime(employee?.scheduleLunch?.exit)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-calendar-week text-primary" />
                              <span className="text-muted">Entrada sabatina</span>
                            </div>

                            <span className="fw-semibold">
                              {saturdatEntry}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-calendar-x text-secondary" />
                              <span className="text-muted">Salida sabatina</span>
                            </div>

                            <span className="fw-semibold">
                              {saturdayExit}
                            </span>
                          </div>

                          <div className="d-flex align-items-start justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-card-text text-info" />
                              <span className="text-muted">Descripción del horario</span>
                            </div>

                            <span className="fw-semibold text-end text-uppercase" style={{ maxWidth: "250px" }}>
                              {formatText(employee?.scheduleDescription)}
                            </span>
                          </div>

                          {session?.user?.permissions?.some(
                            (p) => p.text === "visualizar_salario"
                          ) && (
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-2">
                                  <i className="bi bi-cash-coin text-success" />
                                  <span className="text-muted">Salario diario</span>
                                </div>

                                <span className="fw-semibold">
                                  {formatText(employee?.dailyWage)}
                                </span>
                              </div>
                            )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12} lg={6} className="d-flex">
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Administración laboral</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Recursos Humanos
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-3">
                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-envelope-paper-heart text-primary" />
                              <span className="text-muted">Carta de aniversario</span>
                            </div>

                            <span className="fw-semibold text-uppercase">
                              {anniversaryLetterVariant(aniversaryLetterStatus)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i
                                className={`bi ${employee?.status === 1
                                  ? "bi-check-circle-fill text-success"
                                  : employee?.status === 2
                                    ? "bi-x-circle-fill text-danger"
                                    : "bi-dash-circle text-secondary"
                                  }`}
                              />

                              <span className="text-muted">Estatus</span>
                            </div>


                            <div className="d-flex align-items-center gap-2">
                              {statusVariant(statusEmployee)}
                            </div>

                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-key text-warning" />
                              <span className="text-muted">keyCONTPAQi</span>
                            </div>

                            <span className="fw-semibold">
                              {formatText(employee?.keyCONTPAQi)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-key-fill text-info" />
                              <span className="text-muted">keyAspel NOI</span>
                            </div>

                            <span className="fw-semibold">
                              {formatText(employee?.keyAspelNOI)}
                            </span>
                          </div>

                          <div className="d-flex align-items-start justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-file-earmark-minus text-danger" />
                              <span className="text-muted">Motivo de la baja</span>
                            </div>

                            <span
                              className="fw-semibold text-end text-uppercase"
                              style={{ maxWidth: "250px" }}
                            >
                              {formatText(employee?.dischargeReason)}
                            </span>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12} lg={6} className="d-flex">
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Vales de despensa</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Prestación
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-3">
                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-upc-scan text-primary" />
                              <span className="text-muted">UID</span>
                            </div>

                            <span className="fw-semibold text-end">
                              {formatText(employee?.foodBaucher?.uiid)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-credit-card-2-front text-success" />
                              <span className="text-muted">Número de tarjeta</span>
                            </div>

                            <span className="fw-semibold text-end">
                              {formatText(employee?.foodBaucher?.cardNumber)}
                            </span>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  {/* </PageSheet> */}
                </Row>
              </FormPage>


              {/* =============== Informacion Contactos ===================*/}

              <FormPage title="Contactos" eventKey="contacts">
                <Row className="g-4 align-items-stretch">
                  <Col xs={12} xl={12}>
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Contactos de emergencia</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Emergencia
                          </span>
                        </div>

                        <Table size="sm" hover responsive className="align-middle mb-0">
                          <thead>
                            <tr className="border-bottom">
                              <th className="text-muted fw-semibold">
                                <i className="bi bi-person me-2 text-primary" />
                                Nombre
                              </th>

                              <th className="text-muted fw-semibold">
                                <i className="bi bi-people me-2 text-success" />
                                Parentesco
                              </th>

                              <th className="text-muted fw-semibold">
                                <i className="bi bi-telephone me-2 text-info" />
                                Contacto
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {employee?.emergencyContacts?.length ? (
                              employee.emergencyContacts.map((contact, index) => (
                                <tr key={`${contact.name}-${index}`}>
                                  <td className="border-bottom py-3">
                                    <span className="fw-semibold text-uppercase">
                                      {formatText(contact.name)}
                                    </span>
                                  </td>

                                  <td className="border-bottom py-3 text-uppercase">
                                    {formatText(contact.kinship)}
                                  </td>

                                  <td className="border-bottom py-3 text-uppercase">
                                    {formatPhone(contact.phone)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="text-center py-4 text-muted">
                                  <i className="bi bi-person-x fs-5 d-block mb-2" />
                                  Sin contactos registrados
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </FormPage>

              {/* =============== Informacion Ingresos y bajas ===================*/}

              <FormPage title="Ingresos y Bajas" eventKey="historical">
                <Row className="g-4 align-items-stretch">
                  <Col xs={12} xl={6}>
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Relación laboral</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Vigencia
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-3">
                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-calendar-check text-success" />
                              <span className="text-muted">Inicio de relación</span>
                            </div>

                            <span className="fw-semibold">
                              {formatCreatedAt(employee?.admissionDate)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-calendar-x text-danger" />
                              <span className="text-muted">Fin de relación</span>
                            </div>

                            <span className="fw-semibold">
                              {formatCreatedAt(employee?.dischargeDate ?? "")}
                            </span>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col xs={12} xl={6}>
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Información de baja</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                            Baja
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-3">
                          <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-file-earmark-minus text-danger" />
                              <span className="text-muted">Tipo de baja</span>
                            </div>

                            <span className="fw-semibold text-end text-uppercase">
                              {formatText(employee?.typeOfDischarge)}
                            </span>
                          </div>

                          <div className="d-flex align-items-start gap-3">
                            <i className="bi bi-journal-text text-warning fs-5 mt-1" />

                            <div className="flex-grow-1">
                              <div className="text-muted small mb-2">
                                Motivo de la baja
                              </div>

                              <div
                                className="p-3 rounded-3 border text-uppercase"
                                style={{
                                  minHeight: "100px",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {formatText(employee?.dischargeReason)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md="12">
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Historial de reingresos</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Historial
                          </span>
                        </div>

                        <Table hover responsive className="align-middle mb-0">
                          <thead>
                            <tr className="border-bottom">
                              <th className="text-muted fw-semibold">
                                <i className="bi bi-calendar-check me-2 text-success" />
                                Reingreso
                              </th>

                              <th className="text-muted fw-semibold">
                                <i className="bi bi-calendar-x me-2 text-danger" />
                                Baja
                              </th>

                              <th className="text-muted fw-semibold">
                                <i className="bi bi-chat-left-text me-2 text-warning" />
                                Razón
                              </th>

                              <th className="text-muted fw-semibold">
                                <i className="bi bi-file-earmark-text me-2 text-primary" />
                                Tipo
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {employee?.reEntry?.length ? (
                              employee.reEntry.map((re) => (
                                <tr key={re._id}>
                                  <td className="border-bottom py-3 text-left">
                                    <span className="fw-semibold">
                                      {re.reEntryDate
                                        ? formatCreatedAt(re.reEntryDate)
                                        : "-"}
                                    </span>
                                  </td>

                                  <td className="border-bottom py-3 text-left">
                                    <span className="fw-semibold">
                                      {re.dischargeDate
                                        ? formatCreatedAt(re.dischargeDate)
                                        : "-"}
                                    </span>
                                  </td>

                                  <td className="border-bottom py-3 text-uppercase">
                                    {formatText(re.dischargeReason)}
                                  </td>

                                  <td className="border-bottom py-3 text-uppercase">
                                    {formatText(re.typeOfDischarge)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="text-center py-4 text-muted">
                                  <i className="bi bi-clock-history fs-5 d-block mb-2" />
                                  Sin historial de reingresos
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </FormPage>

              {/* =============== Documentos ===================*/}

              <FormPage title="Documentos" eventKey="documents">
                <Row className="g-4 align-items-stretch">
                  <Col xs={12} xl={12}>
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Documentos del empleado</h6>

                          {session?.user?.permissions?.some(
                            (p) => p.text === "crear_plantilla_de_documento"
                          ) && (
                              <div className="d-flex justify-content-end mb-4">
                                <Button
                                  variant="success"
                                  onClick={() => setShowNewDocumentEmployeeModal(true)}
                                >
                                  <i className="bi bi-file-earmark-plus me-2" />
                                  Nueva plantilla
                                </Button>
                              </div>
                            )}
                        </div>

                        <Accordion flush>
                          {documents.map((period, index) => (
                            <Accordion.Item
                              eventKey={String(period.idPeriod)}
                              key={`${period.idPeriod}-docs-${index}`}
                              className="border rounded-3 mb-3 overflow-hidden"
                            >
                              <Accordion.Header>
                                <div className="d-flex align-items-center gap-2">
                                  <i className="bi bi-folder2-open text-primary" />
                                  <span className="fw-semibold">
                                    Periodo {index + 1}
                                  </span>
                                </div>
                              </Accordion.Header>

                              <Accordion.Body className="">
                                <Row className="g-3">
                                  {period.documents?.length ? (
                                    period.documents.map((doc, docIndex) => (
                                      <DocumentsGrid
                                        key={`${doc.id ?? doc.title}-${docIndex}`}
                                        doc={doc}
                                        idEmployee={Number(id)}
                                      />
                                    ))
                                  ) : (
                                    <Col xs={12}>
                                      <div className="text-center text-muted py-4">
                                        <i className="bi bi-file-earmark-x fs-4 d-block mb-2" />
                                        Sin documentos registrados
                                      </div>
                                    </Col>
                                  )}
                                </Row>
                              </Accordion.Body>
                            </Accordion.Item>
                          ))}
                        </Accordion>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </FormPage>

              {/* Pestaña de vacaciones (A reciclar) */}
              <FormPage title="Vacaciones" eventKey="vacations">
                <Row className="g-4 align-items-stretch">
                  <Col xs={12} xl={12}>
                    <Card className="border shadow-sm rounded-4 m-2 w-100 h-100">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="mb-0 fw-bold">Vacaciones</h6>

                          <span className="badge rounded-pill px3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                            Historial
                          </span>
                        </div>

                        <ConditionalRender cond={hasVacations}>
                          <Accordion flush>
                            {vacations.map((v) => (
                              <Accordion.Item
                                key={v.id}
                                eventKey={v.periodDescription}
                                className="border rounded-3 mb-3 overflow-hidden"
                              >
                                <Accordion.Header>
                                  <div className="d-flex align-items-center gap-2">
                                    <i className="bi bi-calendar2-week text-primary" />

                                    <span className="fw-semibold">
                                      {v.periodDescription}
                                    </span>
                                  </div>
                                </Accordion.Header>

                                <Accordion.Body className="collapse-detail-enter">
                                  <div className="row g-3 mb-4">
                                    <div className="col-md-4">
                                      <div className="border rounded-4 p-3 text-center">
                                        <div className="text-muted small">
                                          Días totales
                                        </div>

                                        <div className="fw-bold">
                                          {v.totalDaysPeriod}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="col-md-4">
                                      <div className="border rounded-4 p-3 text-center">
                                        <div className="text-muted small">
                                          Fecha inicio
                                        </div>

                                        <div className="fw-semibold">
                                          {formatCreatedAt(v.dateInitPeriod)}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="col-md-4">
                                      <div className="border rounded-4 p-3 text-center">
                                        <div className="text-muted small">
                                          Fecha final
                                        </div>

                                        <div className="fw-semibold">
                                          {formatCreatedAt(v.dateEndPeriod)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {v.vacationsRequestsData?.length ? (
                                    <Accordion flush>
                                      {v.vacationsRequestsData.map((vr) => (
                                        <Accordion.Item
                                          key={vr._id}
                                          eventKey={String(vr.id)}
                                          className="border rounded-3 mb-2 overflow-hidden"
                                        >
                                          <Accordion.Header>
                                            <div className="d-flex align-items-center gap-2">
                                              <i className="bi bi-suitcase text-success" />

                                              <span>{vr.holidayName}</span>
                                            </div>
                                          </Accordion.Header>

                                          <Accordion.Body>
                                            <Card className="border rounded-4 overflow-hidden collapse-detail-enter">
                                              <Card.Body>

                                                <div className="h-100 d-flex flex-column justify-content-center p-2">

                                                  <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                    <span className="text-muted small">
                                                      <i className="bi bi-calendar-event me-2 text-warning" />
                                                      Fecha Inicio
                                                    </span>
                                                    <span className="fw-semibold text-uppercase small text-end">
                                                      {formatCreatedAt(vr.dateInit)}
                                                    </span>
                                                  </div>

                                                  <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                    <span className="text-muted small">
                                                      <i className="bi bi-calendar-check me-2 text-danger" />
                                                      Fecha Fin
                                                    </span>
                                                    <span className="fw-semibold text-uppercase small text-end">
                                                      {formatCreatedAt(vr.dateEnd)}
                                                    </span>
                                                  </div>

                                                  <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                    <span className="text-muted small">
                                                      <i className="bi bi-person-check me-2 text-primary" />
                                                      Estatus Líder
                                                    </span>
                                                    {getApprovalBadge(vr.leaderApproval)}
                                                  </div>

                                                  <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                                    <span className="text-muted small">
                                                      <i className="bi bi-shield-check me-2 text-info" />
                                                      Estatus DOH
                                                    </span>
                                                    {getApprovalBadge(vr.dohApproval)}
                                                  </div>

                                                  <ConditionalRender cond={vr.holidayName !== "Solicitada por el empleado"}>
                                                    <div className="d-flex justify-content-end mt-3">
                                                      <Button
                                                        size="sm"
                                                        variant="info"
                                                        onClick={() => handleHoliday(vr.id, Number(vr.idPeriod), vr, vr.holidayName)}
                                                      >
                                                        <i className="bi bi-pencil me-2" />
                                                        Actualizar Fecha
                                                      </Button>
                                                    </div>
                                                  </ConditionalRender>

                                                </div>
                                              </Card.Body>
                                            </Card>
                                          </Accordion.Body>
                                        </Accordion.Item>
                                      ))}
                                    </Accordion>
                                  ) : (
                                    <div className="text-center py-4 text-muted">
                                      <i className="bi bi-calendar-minus fs-4 d-block mb-2" />
                                      Sin solicitudes de vacaciones
                                    </div>
                                  )}
                                </Accordion.Body>
                              </Accordion.Item>
                            ))}
                          </Accordion>
                        </ConditionalRender>

                        <ConditionalRender cond={!hasVacations}>
                          <div className="text-center py-5 text-muted">
                            <i className="bi bi-calendar-x fs-1 d-block mb-3" />

                            <h6 className="mb-2">
                              Sin historial de vacaciones
                            </h6>

                            <small>
                              No existen periodos vacacionales registrados para este empleado.
                            </small>
                          </div>
                        </ConditionalRender>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </FormPage>

              {/* =============== Aqui termina ================  */}
            </FormBook>

            <ConditionalRender cond={showUpdateEmployeeModal}>
              <ModalBlur onClose={() => setShowUpdateEmployeeModal(false)}>
                <FormUpdateEmployee
                  show={showUpdateEmployeeModal}
                  onHide={() => setShowUpdateEmployeeModal(false)}
                  id={Number(employee.id)}
                  employee={employee}
                  departments={departments}
                  branches={branches}
                  employees={employees}
                />
              </ModalBlur>
            </ConditionalRender>

            {showRegisterBiometricModal && employee?.id && (
              <ModalBlur onClose={() => setShowRegisterBiometricModal(false)}>
                <RegisterBiometricModal
                  employee={employee}
                  employeeId={Number(employee.id)}
                  employeeName={`${employee.name || ""} ${employee.lastName || ""}`.trim()}
                  onClose={() => setShowRegisterBiometricModal(false)}
                  onSuccess={() => {
                    setShowRegisterBiometricModal(false);
                  }}
                />
              </ModalBlur>
            )}

            {showUnsubscribeEmployeeModal && employee?.id && (
              <ModalBlur onClose={() => setShowUnsubscribeEmployeeModal(false)}>
                <UnsubscribeEmployeeComponent
                  employeeId={Number(employee.id)}
                  employeeName={`${employee.name || ""} ${employee.lastName || ""}`.trim()}
                  onClose={() => setShowUnsubscribeEmployeeModal(false)}
                  onSuccess={() => {
                    setShowUnsubscribeEmployeeModal(false);
                  }}
                />
              </ModalBlur>
            )}

            <ConditionalRender cond={showNewDocumentEmployeeModal}>
              <ModalBlur onClose={() => setShowNewDocumentEmployeeModal(false)}>
                <NewDocumentEmployeeComponent
                  onClose={() => setShowNewDocumentEmployeeModal(false)}
                  onSuccess={() => {
                    setShowNewDocumentEmployeeModal(false);
                  }}
                />
              </ModalBlur>
            </ConditionalRender>

            <ConditionalRender cond={showReEntryModal}>
              <ModalBlur onClose={() => setShowReEntryModal(false)}>
                <ReEntryModal
                  show={showReEntryModal}
                  onHide={() => { setShowReEntryModal(false); }}
                  employee={{ ...employee, dischargeDate: employee.dischargeDate ?? undefined }}
                  id={Number(employee.id)}
                />
              </ModalBlur>
            </ConditionalRender>

            <ConditionalRender cond={showUpdateHoliday}>
              <ModalBlur onClose={() => setShowUpdateHoliday(false)}>
                <UpdateHolidayModal
                  show={showUpdateHoliday}
                  onHide={() => { setShowUpdateHoliday(false); }}
                  idRequest={sendIdRequest ? Number(sendIdRequest) : null}
                  idPeriod={sendIdPeriod ? Number(sendIdPeriod) : null}
                  holidayName={sendHolidayName? sendHolidayName : null}
                />
              </ModalBlur>
            </ConditionalRender>
          </Card.Body>
        </Card>
        {/* </Col>
        </Row> */}
      </Container >
    </>
  );
}
