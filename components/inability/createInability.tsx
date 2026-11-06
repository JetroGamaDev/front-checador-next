"use client";

import { createInability, uploadFirstInhabilityDocument } from "@/app/actions/inability-actions";
import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import { Entry, FieldSelect, RelationField } from "@/components/fields";
import { useModals } from "@/context/ModalContext";
import { Employee } from "@/lib/definitions";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Col, Container, Form, InputGroup, Overlay, Row } from "react-bootstrap";
import { SubmitHandler, useForm } from "react-hook-form";
import { useSessionSnapshot } from "@/hooks/useSessionStore";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import { es } from "date-fns/locale";
import DatePicker, { registerLocale } from "react-datepicker";
import moment from "moment";
import { formatCreatedAt } from "@/lib/helpers";
import { compressPdf } from "@/lib/compressPdf";

registerLocale("es", es);

type FeedbackState = "loading" | "success" | "error" | null;

type TInputs = {
  idEmployee: number | null;
  disabilityCategory: string;
  folio: string;
  typeOfDisability: string;
  dateInit: string;
  dateEnd: string;
  firstDoc: FileList | null;
  notes: string | null;
};

const DEFAULT_VALUES: TInputs = {
  idEmployee: null,
  disabilityCategory: "",
  folio: "",
  typeOfDisability: "inicial",
  dateInit: "",
  dateEnd: "",
  firstDoc: null,
  notes: ""
};

const MAX_UPLOAD = 9 * 1024 * 1024; 

export default function CreateInabilityComponent({
  employees = [],
}: {
  employees?: Employee[];
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { isDirty, isSubmitting, errors },
  } = useForm<TInputs>({
    defaultValues: DEFAULT_VALUES,
  });

  const session = useSessionSnapshot();
  const roles = session?.uid?.roles;
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // const dohMap = config?.permissions.approvalDoh;
  const sessionEmployeeId = Number(session?.uid?.idEmployee);
  const idEmployee = Number(session?.uid?.idEmployee);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>(employees);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCalendarEnd, setShowCalendarEnd] = useState(false);
  const { modalConfirm } = useModals();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [, setMessageLoading] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { ref: firstDocRef, ...firstDocField } = register("firstDoc");

  const firstDoc = watch("firstDoc");
  const selectedFile = firstDoc?.[0];

  const clearFirstDoc = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";   // limpia el input visualmente
    setValue("firstDoc", null, { shouldValidate: true });        // limpia el valor en el form
  };

  //Calendario inicio
  const [dateError] = useState("");
  const dateButtonRef = useRef(null);

  const selectedDate = watch("dateInit");
  const parsedDate = selectedDate
    ? moment(selectedDate, "YYYY-MM-DD").toDate()
    : null;

  const handleDateChange = (date: Date | null) => {
    setValue("dateInit", date ? moment(date).format("YYYY-MM-DD") : "", { shouldDirty: true });
  };


  //Calendario fin
  const [dateErrorEnd] = useState("");
  const dateButtonRefEnd = useRef(null);

  const selectedDateEnd = watch("dateEnd");
  const parsedDateEnd = selectedDateEnd
    ? moment(selectedDateEnd, "YYYY-MM-DD").toDate()
    : null;

  const handleDateChangeEnd = (date: Date | null) => {
    setValue("dateEnd", date ? moment(date).format("YYYY-MM-DD") : "", { shouldDirty: true });
  };

  const readInput = !roles?.isLeader
    && !roles?.isExtra
    && !roles?.isDoh
    && !roles?.isApproverLeaders
    && !roles?.isApproverDoh;

  const isPlainEmployee = readInput; // ya calculado: sin roles elevados 

  useEffect(() => {
    const values: TInputs = {
      ...DEFAULT_VALUES,
      idEmployee: isPlainEmployee ? sessionEmployeeId || null : null,
    };
    reset(values);
  }, [reset, isPlainEmployee, sessionEmployeeId]);


  const handleClean = () => {
    const values: TInputs = {
      ...DEFAULT_VALUES,
      idEmployee:
        session?.uid?.role === "EMPLOYEE" ? sessionEmployeeId || null : null,
    };

    reset(values);
  };

  // Este sirve para filtrar el empleado al que se le asignara el registro
  useEffect(() => {
    if (roles?.isLeader && !roles?.isExtra) {

      const filtrados = employees.filter(
        (el: Employee) => Number(el.department?.idLeader) === Number(session?.uid?.idEmployee)
      );
      setFilteredEmployees(filtrados);
    } else {
      setFilteredEmployees(employees);
    }
  }, [session, roles, idEmployee, employees]);

  useEffect(() => {
    if (isPlainEmployee) setValue("idEmployee", sessionEmployeeId);
  }, [isPlainEmployee, sessionEmployeeId, setValue]);


  const handleBack = () => {
    setLoading(true);
    setMessageLoading("Cargando...");
    router.push("/app/inability");
  };


  const onSubmit: SubmitHandler<TInputs> = async (data) => {
    modalConfirm("¿Seguro que quieres guardar esta incapacidad?", async () => {
      // let createdId: string | null = null;
  
      try {
        setFeedback("loading");
        setFeedbackMsg("Guardando incapacidad...");
  
        let file = data.firstDoc?.[0] ?? null;
  
        // 0. Si el PDF pasa de 9 MB, se comprime ANTES de crear el registro
        if (file && file.size > MAX_UPLOAD) {
          setFeedbackMsg("Optimizando documento...");
          file = await compressPdf(file);
  
          if (file.size > MAX_UPLOAD) {
            setFeedbackMsg(
              "El documento sigue siendo muy pesado. Escanéalo con menor resolución."
            );
            setFeedback("error");
            return;
          }
        }
  
        // 1. Registro sin archivo
        const res = await createInability({ ...data, firstDoc: null });
  
        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo crear");
          setFeedback("error");
          return;
        }
        // createdId = res.data?.id ?? null;
  
        // 2. Archivo (ya comprimido si hacía falta)
        if (file) {
          setFeedbackMsg("Subiendo documento...");
  
          const formData = new FormData();
          formData.append("document", file);
  
          const upload = await uploadFirstInhabilityDocument({
            id: String(res.data?.id),
            idDoc: String(res.data?.idDocument),
            formData,
            folio: data.folio,
          });
  
          if (!upload.success) {
            throw new Error(upload.message || "No se pudo subir el documento");
          }
        }
  
        setFeedbackMsg(res.message || "Creada correctamente");
        setFeedback("success");
        router.push("/app/inability?view_type=list&id=null");
      } catch (err) {
        console.error("createInability falló:", err);
        // if (createdId) await deleteInability(createdId).catch(() => {});
        setFeedbackMsg((err as Error).message || "No se pudo guardar.");
        setFeedback("error");
      }
    });
  };

  return (
    <>
      <ConditionalRender cond={feedback === "loading" || isSubmitting}>
        <Loading message={feedbackMsg || "Cargando..."} />
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

      <Container className="justify-content-between" style={{ maxWidth: "1200px" }}>
        <Row className="m-2">
          <Col xs={12}>
            <Form onSubmit={handleSubmit(onSubmit)}>
              <fieldset disabled={isSubmitting || loading}>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
                  <div>
                    <h1 className="mb-1">Crear incapacidad</h1>
                    <p className="text-muted mb-0">
                      Registra la información de la incapacidad del empleado.
                    </p>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      variant="outline-secondary"
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleBack}
                    >
                      Cancelar
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isSubmitting || loading || !isDirty}
                      onClick={handleClean}
                    >
                      Limpiar
                    </Button>

                    <Button
                      className="bg-success border-success"
                      type="submit"
                      disabled={isSubmitting || loading}
                    >
                      {isSubmitting || loading ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>

                <Card className="rounded-4 shadow-sm mb-3">
                  <Card.Body className="p-3 p-md-5">
                    <div className="mb-4">
                      <h5 className="fw-semibold mb-1">Datos generales</h5>
                      <p className="text-muted mb-3">
                        Captura empleado, periodo y documento de la incapacidad.
                      </p>

                      <Card className="border rounded-4 mb-3">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-2 mb-4">
                            <i className="bi bi-person text-primary" />
                            <h6 className="mb-0 fw-bold">Datos del empleado</h6>
                          </div>

                          <Row className="g-3">
                            <Col md={12}>
                              <RelationField
                                readonly={readInput}
                                label="Empleado:"
                                options={filteredEmployees.map((em) => ({
                                  id: Number(em.id),
                                  displayName: `${em.lastName} ${em.name}`.toUpperCase(),
                                  name: `${em.lastName} ${em.name}`.toUpperCase()
                                }))}
                                control={control}
                                callBackMode="id"
                                register={register("idEmployee", {
                                  required: true,
                                  setValueAs: (v) => (v === "" ? null : Number(v)),
                                })}
                                className="text-uppercase border"
                              />
                            </Col>

                            <Col md={6}>
                              <FieldSelect
                                label="Categoría:"
                                options={[
                                  { label: "Enfermedad general", value: "enfermedad general" },
                                  { label: "Riesgo de trabajo", value: "riesgo de trabajo" },
                                  { label: "Maternidad", value: "maternidad" },
                                ]}
                                register={register("disabilityCategory", { required: true })}
                                // readonly={session?.uid?.role === "EMPLOYEE"}
                                invalid={!!errors.disabilityCategory}
                                className="border text-uppercase"
                              />
                            </Col>

                            <Col md={6}>
                              <FieldSelect
                                label="Tipo:"
                                options={[
                                  { label: "Inicial", value: "inicial" },
                                  { label: "Subsecuente", value: "subsecuente" },
                                  { label: "Alta", value: "alta" },
                                ]}
                                register={register("typeOfDisability", { required: true })}
                                // readonly={session?.uid?.role === "EMPLOYEE"}
                                invalid={!!errors.typeOfDisability}
                                className="border text-uppercase"
                              />
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>

                      <Card className="border rounded-4 mb-3">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-2 mb-4">
                            <i className="bi bi-calendar-range text-success" />
                            <h6 className="mb-0 fw-bold">Periodo de incapacidad</h6>
                          </div>

                          <Row className="g-3">
                            {/* <Col md={6}>
                              <Entry
                                label="Fecha inicio:"
                                type="date"
                                register={register("dateInit", { required: true })}
                                invalid={!!errors.dateInit}
                                // readonly={session?.uid?.role === "EMPLOYEE"}
                                className="border text-uppercase"
                              />
                            </Col>

                            <Col md={6}>
                              <Entry
                                label="Fecha fin:"
                                type="date"
                                min={onChangeDateInit}
                                register={register("dateEnd", { required: true })}
                                invalid={!!errors.dateEnd}
                                // readonly={session?.uid?.role === "EMPLOYEE"}
                                className="border text-uppercase"
                              />
                            </Col> */}

                            <Col md={6}>
                              <Form.Group>
                                <Form.Label className="fw-semibold">Fecha Inicio:</Form.Label>
                              </Form.Group>

                              <Button
                                ref={dateButtonRef}
                                style={{ height: "35px" }}
                                variant="outline-secondary"
                                className={`w-100 d-flex align-items-center justify-content-between text-uppercase ${dateError ? "border-danger text-danger" : ""}`}
                                onClick={() => setShowCalendar((s) => !s)}
                              >
                                <span>{selectedDate ? formatCreatedAt(selectedDate) : "Selecciona una fecha"}</span>
                                <i className="bi bi-calendar3" />
                              </Button>

                              <ConditionalRender cond={!dateError}>
                                <small className="text-danger d-block mt-1">{dateError}</small>
                              </ConditionalRender>

                              <Overlay
                                target={dateButtonRef.current}
                                show={showCalendar}
                                placement="bottom-start"
                                rootClose
                                container={() => document.body}
                                onHide={() => setShowCalendar(false)}
                              >
                                {({ ref, style }) => (
                                  <div
                                    ref={ref}
                                    style={style}
                                    className="date-multi-popover shadow-lg rounded-4 overflow-hidden bg-light text-capitalize"
                                  >
                                    <DatePicker
                                      inline
                                      selected={parsedDate}
                                      onChange={handleDateChange}
                                      shouldCloseOnSelect={false}
                                      disabledKeyboardNavigation
                                      monthsShown={1}
                                      locale="es"
                                      readOnly={session?.uid?.role === "EMPLOYEE"}
                                    />
                                    <Col xs={12}>
                                      <Button variant="primary" className="w-100" onClick={() => setShowCalendar(false)}>
                                        Aplicar
                                      </Button>
                                    </Col>
                                  </div>
                                )}
                              </Overlay>
                            </Col>

                            <Col md={6}>
                              <Form.Group>
                                <Form.Label className="fw-semibold">Fecha Final:</Form.Label>
                              </Form.Group>

                              <Button
                                ref={dateButtonRefEnd}
                                style={{ height: "35px" }}
                                variant="outline-secondary"
                                className={`w-100 d-flex align-items-center justify-content-between text-uppercase ${dateErrorEnd ? "border-danger text-danger" : ""}`}
                                onClick={() => setShowCalendarEnd((s) => !s)}
                              >
                                <span>{selectedDateEnd ? formatCreatedAt(selectedDateEnd) : "Selecciona una fecha"}</span>
                                <i className="bi bi-calendar3" />
                              </Button>

                              <ConditionalRender cond={!dateErrorEnd}>
                                <small className="text-danger d-block mt-1">{dateErrorEnd}</small>
                              </ConditionalRender>

                              <Overlay
                                target={dateButtonRefEnd.current}
                                show={showCalendarEnd}
                                placement="bottom-start"
                                rootClose
                                container={() => document.body}
                                onHide={() => setShowCalendarEnd(false)}
                              >
                                {({ ref, style }) => (
                                  <div
                                    ref={ref}
                                    style={style}
                                    className="date-multi-popover shadow-lg rounded-4 overflow-hidden bg-light text-capitalize"
                                  >
                                    <DatePicker
                                      inline
                                      selected={parsedDateEnd}
                                      onChange={handleDateChangeEnd}
                                      readOnly={!parsedDate || session?.uid?.role === "EMPLOYEE"}
                                      minDate={parsedDate || new Date()}
                                      shouldCloseOnSelect={false}
                                      disabledKeyboardNavigation
                                      monthsShown={1}
                                      locale="es"
                                    />
                                    <Col xs={12}>
                                      <Button variant="primary" className="w-100" onClick={() => setShowCalendarEnd(false)}>
                                        Aplicar
                                      </Button>
                                    </Col>
                                  </div>
                                )}
                              </Overlay>
                            </Col>

                          </Row>
                        </Card.Body>
                      </Card>

                      <Card className="border rounded-4 mb-3">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-2 mb-4">
                            <i className="bi bi-journal-text text-info" />
                            <h6 className="mb-0 fw-bold">Notas</h6>
                          </div>

                          <Row className="g-3">
                            <Col md={12}>
                              <Entry
                                label="Notas adicionales:"
                                register={register("notes")}
                                className="border text-uppercase"
                                as={"textarea"}
                                rows={3}
                              />
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>

                      <Card className="border rounded-4">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-2 mb-4">
                            <i className="bi bi-upc-scan text-warning" />
                            <h6 className="mb-0 fw-bold">Documento CITT</h6>
                          </div>

                          <Row className="g-3">
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label className="fw-semibold">CITT:</Form.Label>

                                <InputGroup>
                                  <Form.Control
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.pdf,.webp"
                                    {...firstDocField}
                                    ref={(el: HTMLInputElement | null) => {
                                      firstDocRef(el);          // ref de RHF
                                      fileInputRef.current = el; // ref propio
                                    }}
                                    isInvalid={!!errors.firstDoc}
                                    className="border"
                                  />

                                  <ConditionalRender cond={!!selectedFile}>
                                    <Button variant="outline-danger" onClick={clearFirstDoc} title="Quitar archivo">
                                      <i className="bi bi-x-lg" />
                                    </Button>
                                  </ConditionalRender>
                                </InputGroup>

                                <ConditionalRender cond={!!selectedFile}>
                                  <small className="text-muted d-block mt-1">
                                    <i className="bi bi-paperclip me-1" />
                                    {selectedFile?.name} ({((selectedFile?.size ?? 0) / 1024).toFixed(0)} KB)
                                  </small>
                                </ConditionalRender>

                                <Form.Control.Feedback type="invalid" className={errors.firstDoc ? "d-block" : ""}>
                                  Este campo es requerido
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>

                            <Col md={6}>
                              <Entry
                                register={register("folio", {
                                  required: true,
                                })}
                                label="Folio CITT:"
                                className="text-uppercase border"
                                invalid={!!errors.folio}
                              />
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </div>
                  </Card.Body>
                </Card>
              </fieldset>
            </Form>
          </Col>
        </Row>
      </Container>
    </>
  );
}