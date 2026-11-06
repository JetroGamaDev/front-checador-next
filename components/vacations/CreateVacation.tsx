"use client";

import { createVacation, fetchPeriods } from "@/app/actions/vacations-actions";
import { findEmployeeById } from "@/app/actions/employee-actions";
import { EmployeeRef, IConfigSystem } from "@/app/actions/configSystem-actions";
import {
  Entry,
  FieldSelect,
  RelationField,
  SignatureInput,
} from "@/components/fields";
import { useModals } from "@/context/ModalContext";
import { Employee } from "@/lib/definitions";
import { useSessionSnapshot } from "@/hooks/useSessionStore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button, Card, Col, Container, Form, Overlay, Row } from "react-bootstrap";
import useSWR from "swr";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import { formatDate } from "date-fns";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import DatePicker, { registerLocale } from "react-datepicker";
import moment from "moment";
import { es } from "date-fns/locale";
import Link from "next/link";
import { PeriodVacation, Vacations } from "@/lib/vactions/interface";
import { formatCreatedAt } from "@/lib/helpers";
import TestAnimationComponent from "../helpers/testAnimations";

registerLocale("es", es);

type FeedbackState = "loading" | "success" | "error" | null;

type TInputs = Pick<
  Vacations,
  | "idEmployee"
  | "idLeader"
  | "idPersonDoh"
  | "idPeriod"
  | "periodDescription"
  | "dateInit"
  | "dateEnd"
  | "notes"
> & {
  incidence: string;
  signature: string;
};

const DEFAULT_VALUES: TInputs = {
  idEmployee: null,
  idLeader: null,
  idPersonDoh: null,
  idPeriod: null,
  periodDescription: "",
  dateEnd: "",
  dateInit: "",
  incidence: "",
  signature: "",
  notes: ""
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function CreateVacationComponent({
  employees,
}: {
  employees: Employee[];
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { isDirty, isSubmitting },
  } = useForm<TInputs>();
  const [, setLoading] = useState(false);
  const [, setMessageLoading] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCalendarEnd, setShowCalendarEnd] = useState(false);
  const idEmployeeSelected = watch("idEmployee");
  const idPeriodSelected = watch("idPeriod");
  const session = useSessionSnapshot();
  const { data } = useSWR("/api/configsystem", fetcher);
  const isDOH = session?.uid?.roles.isDoh !== false;
  const isExtra = session?.uid?.roles.isExtra !== false;


  const config: IConfigSystem | null = useMemo(() => {
    const maybe = data?.data?.[0];
    return maybe ?? null;
  }, [data]);

  const { modalError, modalConfirm } = useModals();
  const router = useRouter();

  const [periods, setPeriods] = useState<PeriodVacation[]>([]);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(true);

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


  const originalValuesRef = useRef<TInputs | null>(null);
  const roles = session?.uid?.roles;

  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>(employees);
  const readInput = !roles?.isLeader
    && !roles?.isExtra
    && !roles?.isDoh
    && !roles?.isApproverLeaders
    && !roles?.isApproverDoh;

  const readOnlyDoh = !roles?.isLeader
    && !roles?.isExtra
    && roles?.isDoh
    && !roles?.isApproverLeaders
    && !roles?.isApproverDoh
    && Number(session?.uid?.idEmployee) === Number(config?.permissions.approvalDoh.idPerson);


  const dohMap = config?.vacations.approvalDoh;

  const directionList: EmployeeRef[] | undefined = config?.permissions.extra?.employees;
  const idEmployee = Number(session?.uid?.idEmployee);

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
  }, [idEmployee, employees, roles, session]);

  useEffect(() => {
    if (!idEmployeeSelected) return;

    let cancelled = false;

    const run = async () => {
      try {
        const employeeId = Number(idEmployeeSelected);
        if (!employeeId || Number.isNaN(employeeId)) return;

        const isDohSession = !!roles?.isDoh;
        const ownId = Number(session?.uid?.idEmployee);
        const isLeaderNotExtra = roles?.isLeader && !roles?.isExtra;

        if (isLeaderNotExtra && !isDohSession && employeeId === ownId) {
          setValue("idLeader", Number(directionList?.[0]?.id) || null, {
            shouldDirty: true,
            shouldValidate: true,
          });
          return;
        }

        const emp = await findEmployeeById({ id: employeeId });

        if (cancelled || !emp) return;

        const empIsLeader = !!emp?.role?.includes("LEADER");

        if (empIsLeader) {
          if (isDohSession) {
            setValue("idLeader", Number(directionList?.[0]?.id) || null, {
              shouldDirty: true,
              shouldValidate: true,
            });
            return;
          }

          const leaderFromConfig = config?.permissions?.approvalLeaders?.idPerson;
          if (!leaderFromConfig) return;

          setValue("idLeader", Number(leaderFromConfig), {
            shouldDirty: true,
            shouldValidate: true,
          });
          return;
        }

        const leaderId = emp?.leader?.id ?? null;

        setValue("idLeader", leaderId ? Number(leaderId) : null, {
          shouldDirty: true,
          shouldValidate: true,
        });
      } catch (error) {
        console.log(error);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [idEmployeeSelected, config, setValue, session, directionList, roles]);

  const leaderOptions = useMemo(() => {
    const mapToOption = (e: Employee | EmployeeRef) => ({
      id: Number(e.id!),
      displayName: `${e.lastName?.toUpperCase()} ${e.name?.toUpperCase()}` || "",
      name: `${e.lastName?.toUpperCase()} ${e.name?.toUpperCase()}`
    });

    function hasId<T extends Employee | EmployeeRef>(e: T): e is T & { id: number } {
      return e.id !== undefined;
    }

    const directionOptions = (directionList ?? []).filter(hasId).map(mapToOption);
    const isDohSession = !!roles?.isDoh;
    const selectedId = Number(idEmployeeSelected);


    if (isDohSession) {
      if (!selectedId) return [];

      const selectedEmployee = employees.find((e) => Number(e.id) === selectedId);
      const selectedIsLeader = !!selectedEmployee?.role?.includes("LEADER");

      if (selectedIsLeader) {
        return directionOptions;
      }

      const leaderId = selectedEmployee?.leader?.id;
      if (!leaderId) return [];

      const leaderRecord = employees.find((e) => Number(e.id) === Number(leaderId));
      return leaderRecord && hasId(leaderRecord) ? [mapToOption(leaderRecord)] : [];
    }

    const isLeaderNotExtra = roles?.isLeader && !roles?.isExtra;
    const ownId = Number(session?.uid?.idEmployee);

    if (isLeaderNotExtra) {
      if (selectedId === ownId) {
        return directionOptions;
      }

      if (selectedId) {
        const subordinate = employees.find((e) => Number(e.id) === selectedId);
        const leaderId = subordinate?.leader?.id;

        if (!leaderId) return [];

        const leaderRecord = employees.find((e) => Number(e.id) === Number(leaderId));

        return leaderRecord && hasId(leaderRecord) ? [mapToOption(leaderRecord)] : [];
      }

      return [];
    }

    return employees.filter(hasId).map(mapToOption);
  }, [session, directionList, employees, idEmployeeSelected, roles]);

  useEffect(() => {

    const employeeId = Number(session?.uid?.idEmployee);

    if (!employeeId) return;


    if (roles?.isLeader && !roles?.isExtra) {
      const values: TInputs = {
        ...DEFAULT_VALUES,
        idEmployee: employeeId,
        idLeader: Number(directionList?.[0]?.id)
      };

      reset(values);
      return
    }

    if (roles?.isExtra || roles?.isDoh && !roles?.isLeader) {
      const values: TInputs = {
        ...DEFAULT_VALUES,
        idEmployee: null,
        idLeader: null
      };
      reset(values);
      return
    }

    const values: TInputs = {
      ...DEFAULT_VALUES,
      idEmployee: employeeId,
      idLeader: employees.find((e) => Number(e.id) === Number(employeeId))?.leader?.id || null,
    };

    reset(values);
  }, [reset, employees, session, directionList, roles]);

  // periodo seleccionado para mostrar stats
  const selectedPeriod = useMemo(() => {
    const pid = Number(idPeriodSelected);
    if (!pid || Number.isNaN(pid)) return null;
    return periods.find((p) => Number(p.id) === pid) ?? null;
  }, [idPeriodSelected, periods]);

  const handleReverse = () => {
    if (originalValuesRef.current) {
      reset(originalValuesRef.current);
    }
  };

  const handleBack = () => {
    setLoading(true);
    setMessageLoading("Cargando...");
    router.push("/app/vacationList?view_type=list&id=null");
  };

  useEffect(() => {
    const values: TInputs = {
      idEmployee: Number(session?.uid?.idEmployee),
      idLeader: null,
      idPersonDoh: null,
      idPeriod: null,
      dateEnd: "",
      dateInit: "",
      notes: "",
      incidence: "VACACIONES",
      periodDescription: "",
      signature: "",
    };

    reset(values);
    originalValuesRef.current = values;
  }, [reset, session]);

  useEffect(() => {
    if (!idEmployeeSelected) return;

    let cancelled = false;

    const run = async () => {
      try {
        const res = await findEmployeeById({ id: Number(idEmployeeSelected) });
        if (cancelled) return;

        const emp = res;
        if (!emp) return;

        const leaderFromConfig = config?.permissions?.approvalLeaders?.idPerson;

        if (emp.isLeader) {
          if (!leaderFromConfig) return;
          setValue("idLeader", Number(leaderFromConfig), { shouldDirty: true });
          return;
        }

        const leaderId = emp?.leader?.id ?? null;
        setValue("idLeader", leaderId ? Number(leaderId) : null, {
          shouldDirty: true,
        });
      } catch (e) {
        console.log(e);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [idEmployeeSelected, config, setValue]);

  useEffect(() => {
    const dohFromConfig = config?.permissions?.approvalDoh?.idPerson;
    if (!dohFromConfig) return;

    const currentDoh = watch("idPersonDoh");
    if (currentDoh) return;

    setValue("idPersonDoh", Number(dohFromConfig), { shouldDirty: false });
  }, [config, setValue, watch]);

  const getPeriods = useCallback(async () => {
    setIsLoadingPeriods(true);
    try {
      if (!idEmployeeSelected) {
        setPeriods([]);
        return;
      }

      const res = await fetchPeriods({
        idEmployee: Number(idEmployeeSelected),
      });

      setPeriods(res);

      if (res && res.length >= 1 && Number(res[0].idEmployee) === Number(idEmployeeSelected)) {
        setValue("idPeriod", Number(res[0].id), { shouldDirty: false });
      } else {
        setValue("idPeriod", 0, { shouldDirty: false });
      }

    } catch (error) {
      console.error(error);
      setPeriods([]);
    } finally {
      setIsLoadingPeriods(false);
    }
  }, [idEmployeeSelected, setValue]);

  useEffect(() => {
    getPeriods();
  }, [getPeriods]);



  const onSubmit: SubmitHandler<TInputs> = async (data) => {
    if (!data.signature || data.signature && data.signature === "") {
      modalError("La firma es obligatoria");
      return;
    }

    if (selectedPeriod?.availableDays === 0) {
      modalError("Este empleado no cuenta con días disponibles")
      return;
    }

    modalConfirm("¿Seguro que quieres guardar este permiso?", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg("Guardando permiso...");

        const res = await createVacation({ data });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo actualizar");
          setFeedback("error");
          return;
        }

        setFeedbackMsg(res.message || "Actualizado correctamente");
        setFeedback("success");
        router.push("/app/vacationList");
      } finally {
        setLoading(false);
        setMessageLoading("");
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
              <fieldset disabled={isSubmitting}>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
                  <div>
                    <h1 className="mb-1">Crear vacaciones</h1>
                    <p className="text-muted mb-0">
                      Registra la solicitud de vacaciones del empleado.
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
                      disabled={isSubmitting || !isDirty}
                      onClick={handleReverse}
                    >
                      Limpiar
                    </Button>

                    <Button
                      className="bg-success border-success"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>

                <Card className="rounded-4 shadow-sm mb-3">
                  <Card.Body className="p-3 p-md-5">
                    <div className="mb-4">
                      <h5 className="fw-semibold mb-1">Datos generales</h5>
                      <p className="text-muted mb-3">
                        Captura empleado, fechas, periodo y firma de la solicitud.
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
                                register={register("idEmployee")}
                                options={filteredEmployees.map((e) => ({
                                  id: Number(e.id),
                                  displayName: `${e.lastName} ${e.name}`.toUpperCase(),
                                  name: `${e.lastName} ${e.name}`.toUpperCase()
                                }))}
                                control={control}
                                callBackMode="id"
                                label="Empleado:"
                                className="text-uppercase border"
                              />
                            </Col>
                          </Row>

                          <ConditionalRender cond={idEmployeeSelected !== null}>
                            <Row>
                              <Col md={4}>
                                <ConditionalRender cond={isLoadingPeriods}>
                                  <TestAnimationComponent />
                                </ConditionalRender>

                                <ConditionalRender cond={!isLoadingPeriods && leaderOptions.length > 0}>
                                  <RelationField
                                    readonly={readInput}
                                    register={register("idLeader", { required: true })}
                                    options={leaderOptions}
                                    label="Líder:"
                                    className="text-uppercase border"
                                    control={control}
                                    callBackMode="id"
                                  />
                                </ConditionalRender>

                              </Col>


                              <Col md={4}>
                                <FieldSelect
                                  register={register("idPersonDoh")}
                                  className="text-uppercase border"
                                  options={
                                    dohMap?.employee
                                      ? [{
                                        value: dohMap.employee.id,
                                        label: `${dohMap.employee.lastName} ${dohMap.employee.name} `,
                                      }]
                                      : []
                                  }
                                  label="D.O.H.:"
                                  readonly={!readInput || !readOnlyDoh}
                                />
                              </Col>

                              <Col md={4}>
                                <ConditionalRender cond={isLoadingPeriods}>
                                  <TestAnimationComponent />
                                </ConditionalRender>

                                <ConditionalRender cond={!isLoadingPeriods && periods.length > 0}>
                                  <FieldSelect
                                    label="Periodo vacacional:"
                                    options={periods.map((p) => ({
                                      label: `${formatDate(p.dateInitPeriod, "dd/MM/yyyy")} - ${formatDate(p.dateEndPeriod, "dd/MM/yyyy")}`,
                                      value: Number(p.id),
                                    }))}
                                    register={register("idPeriod", { required: periods.length > 0 })}
                                    className="border"
                                    readonly={readInput || readOnlyDoh}
                                  />
                                </ConditionalRender>

                                <ConditionalRender cond={!isLoadingPeriods && periods.length <= 0}>
                                  <Form.Group>
                                    <Form.Label className="fw-semibold">Periodo vacacional:</Form.Label>
                                  </Form.Group>

                                  <div
                                    className="d-flex align-items-center gap-2 px-3 border border-danger-subtle rounded-3 bg-danger-subtle text-danger-emphasis"
                                    style={{ height: "35px" }}
                                  >
                                    <i className="bi bi-exclamation-circle-fill flex-shrink-0" />
                                    <span className="small text-truncate">
                                      No se encontró un periodo disponible
                                    </span>
                                  </div>
                                </ConditionalRender>
                              </Col>
                            </Row>
                          </ConditionalRender>

                        </Card.Body>
                      </Card>

                      <Card className="border rounded-4 mb-3">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-2 mb-4">
                            <i className="bi bi-calendar-range text-success" />
                            <h6 className="mb-0 fw-bold">Fechas de vacaciones</h6>
                          </div>

                          <Row className="g-3">
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
                                      readOnly={!parsedDate}
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

                      {/* NO VISIBLES PARA EL EMPLEADO */}
                      <ConditionalRender cond={!readInput}>
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
                      </ConditionalRender>

                      {selectedPeriod && (
                        <Card className="border rounded-4 mb-3">
                          <Card.Body>
                            <div className="d-flex align-items-center gap-2 mb-4">
                              <i className="bi bi-bar-chart text-warning" />
                              <h6 className="mb-0 fw-bold">Resumen del periodo</h6>
                            </div>

                            <Row className="g-3">
                              <Col md={4}>
                                <div className="border rounded-3 p-3 text-center h-100">
                                  <i className="bi bi-calendar2-date text-danger fs-5 mb-2 d-block" />
                                  <div className="text-muted small">Días programados por GAMA</div>
                                  <div className="fw-bold fs-5">
                                    {selectedPeriod.daysGeneratedBySystem ?? 0}
                                  </div>
                                </div>
                              </Col>

                              <Col md={4}>
                                <Link
                                  href={`/app/employee?view_type=form&id=${idEmployeeSelected}&tab=vacations`}
                                  className="text-decoration-none text-reset"
                                  style={{ cursor: !isDOH && !isExtra ? "default" : "pointer" }}
                                  target="_blank" //Para abriri en ventana nueva
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    if (!isDOH && !isExtra) e.preventDefault();
                                  }}

                                >
                                  <div
                                    className={!isDOH && !isExtra ? "border rounded-3 p-3 text-center h-100" : "border rounded-3 p-3 text-center h-100 shadow=sm hover-clickable"}
                                  >
                                    <i className="bi bi-check2-circle text-success fs-5 mb-2 d-block" />
                                    <div className="text-muted small">Días aprobados usados</div>
                                    <div className="fw-bold fs-5">
                                      {selectedPeriod.daysRequestedByEmployee ?? 0}
                                    </div>
                                  </div>
                                </Link>

                              </Col>

                              <Col md={4}>
                                <div className="border rounded-3 p-3 text-center h-100">
                                  <i className="bi bi-calendar2-check text-info fs-5 mb-2 d-block" />
                                  <div className="text-muted small">Días disponibles</div>
                                  <div className="fw-bold fs-5">
                                    {selectedPeriod.availableDays ?? 0}
                                  </div>
                                </div>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      )}

                      <Card className="border rounded-4">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-2 mb-4">
                            <i className="bi bi-pen text-info" />
                            <h6 className="mb-0 fw-bold">Firma</h6>
                          </div>

                          <div className="w-100 overflow-hidden">
                            <SignatureInput
                              name="signature"
                              register={register}
                              control={control}
                            />
                          </div>
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

export default CreateVacationComponent;
