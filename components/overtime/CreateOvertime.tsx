"use client"

import { createOverTime, sendSignatureOverTime } from "@/app/actions/overtime-actions";
import { useModals } from "@/context/ModalContext";
import { ActionResponse, Employee } from "@/lib/definitions"
import { OverTimeAxios, TInputsOvertime } from "@/lib/overTime/interface";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Container, Form, Overlay, Row } from "react-bootstrap";
import { Entry, FieldSelect, RelationField, SignatureInput } from "../fields";
import { useSessionSnapshot } from "@/hooks/useSessionStore";
import { SubmitHandler, useForm } from "react-hook-form";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";

import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import useSWR from "swr";
import { EmployeeRef, IConfigSystem } from "@/app/actions/configSystem-actions";
import { findEmployeeById } from "@/app/actions/employee-actions";
import DatePicker from "react-datepicker";
import moment from "moment";
import { formatCreatedAt } from "@/lib/helpers";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DEFAULT_VALUES: TInputsOvertime = {
    idEmployee: null,
    idLeader: null,
    idPersonDoh: null,
    motive: "",
    date: "",
    hourInit: "",
    hourEnd: "",
    notes: ""
};

type FeedbackState = "loading" | "success" | "error" | null;

export default function CreateOvertimeComponent({
    employees = []
}: {
    employees?: Employee[];
}) {
    const {
        register,
        reset,
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<TInputsOvertime>({
        defaultValues: DEFAULT_VALUES,
    });

    const session = useSessionSnapshot();
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const { modalError, modalConfirm } = useModals();
    const router = useRouter();
    const [showCalendar, setShowCalendar] = useState(false);
    const currentDoh = watch("idPersonDoh");
    const { data } = useSWR("/api/configsystem", fetcher);
    const config: IConfigSystem | null = useMemo(() => {
        const maybe = data?.data?.[0];
        return maybe ?? null;
    }, [data]);

    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>(employees);
    const idEmployeeSelected = watch("idEmployee");
    const roles = session?.uid?.roles;
    const dohMap = config?.permissions.approvalDoh;
    const idEmployee = Number(session?.uid?.idEmployee);

    //Calendario inicio
    const [dateError] = useState("");
    const dateButtonRef = useRef(null);

    const selectedDate = watch("date");
    const parsedDate = selectedDate
        ? moment(selectedDate, "YYYY-MM-DD").toDate()
        : null;

    const handleDateChange = (date: Date | null) => {
        setValue("date", date ? moment(date).format("YYYY-MM-DD") : "", { shouldDirty: true });
    };

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


    useEffect(() => {
        if (roles?.isLeader) {
            const filtrados = employees.filter(
                (el: Employee) => Number(el.department?.idLeader) === idEmployee
            );
            setFilteredEmployees(filtrados);
        } else {
            setFilteredEmployees(employees);
        }
    }, [roles, idEmployee, employees]);


    const directionList: EmployeeRef[] | undefined = config?.permissions.extra?.employees;


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
        if (session?.uid?.role === "EMPLOYEE") setValue("idEmployee", session?.uid?.idEmployee);

    }, [session, setValue]);

    // Este sirve para filtrar las opciones de idLeader
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
            value: Number(e.id!),
            label: `${e.lastName?.toUpperCase()} ${e.name?.toUpperCase()}` || "",
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
        const dohFromConfig = config?.permissions?.approvalDoh?.idPerson;
        if (!dohFromConfig) return;
        if (currentDoh) return;

        setValue("idPersonDoh", Number(dohFromConfig), {
            shouldDirty: false,
            shouldValidate: false,
        });
    }, [config, currentDoh, setValue]);

    useEffect(() => {
        if (!idEmployeeSelected) return;

        let cancelled = false;

        const run = async () => {
            try {
                const employeeId = Number(idEmployeeSelected);
                if (!employeeId || Number.isNaN(employeeId)) return;

                const emp = await findEmployeeById({ id: employeeId });

                if (cancelled || !emp) return;

                const leaderFromConfig = config?.permissions?.approvalLeaders?.idPerson;

                if (emp.isLeader) {
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
    }, [idEmployeeSelected, config, setValue]);

    useEffect(() => {
        const employeeId = Number(session?.uid?.id);
        if (!employeeId) return;


        if (roles?.isLeader && !roles?.isExtra) {
            const values: TInputsOvertime = {
                ...DEFAULT_VALUES,
                idEmployee: employeeId,
                idLeader: Number(directionList?.[0]?.id)
            };

            reset(values);
            return
        }

        if (roles?.isExtra || roles?.isDoh && !roles?.isLeader) {
            const values: TInputsOvertime = {
                ...DEFAULT_VALUES,
                idEmployee: null,
                idLeader: null
            };
            reset(values);
            return
        }

        const values: TInputsOvertime = {
            ...DEFAULT_VALUES,
            idEmployee: employeeId,
            idLeader: employees.find((e) => Number(e.id) === Number(employeeId))?.leader?.id || null,
        };

        reset(values);
    }, [reset, employees, session, directionList, roles]);

    useEffect(() => {
        const dohFromConfig = config?.permissions?.approvalDoh?.idPerson;
        if (!dohFromConfig) return;
        if (currentDoh) return;

        setValue("idPersonDoh", Number(dohFromConfig), {
            shouldDirty: false,
            shouldValidate: false,
        });
    }, [config, currentDoh, setValue]);

    const handleBack = () => {
        setFeedback("loading");
        setFeedbackMsg("Cargando...");
        router.push("/app/overtime");
    };


    const onSubmit: SubmitHandler<TInputsOvertime> = async (data) => {
        if (!data.signature || data.signature === "") {
            modalError("La firma es obligatoria");
            return;
        }

        modalConfirm("¿Seguro que quieres guardar el registro?", async () => {

            try {
                setFeedback("loading");
                setFeedbackMsg("Guardando registro...");

                const rescrate: ActionResponse<OverTimeAxios> = await createOverTime({ data });

                if (!rescrate.success || !rescrate.data?.id) {
                    setFeedbackMsg(rescrate.message || "No se pudo crear el registro");
                    setFeedback("error");
                    return;
                }

                await sendSignatureOverTime({
                    id: Number(rescrate.data.id),
                    signature: String(data.signature),
                });

                setFeedbackMsg(rescrate.message || "Registro creado correctamente");
                setFeedback("success");

            } catch (err: unknown) {
                const error = err as Error;
                console.log("err:", error);
                setFeedbackMsg(error?.message || "Error al crear el registro");
                setFeedback("error");
            }
        });
    };

    return (
        <>
            {/* Loading */}
            <ConditionalRender cond={feedback === "loading" || isSubmitting}>
                <Loading message={feedbackMsg || "Guardando..."} />
            </ConditionalRender>

            {/* Éxito — redirige al terminar la animación */}
            <ConditionalRender cond={feedback === "success"}>
                <SuccessOverlay
                    message={feedbackMsg}
                    onDone={() => {
                        setFeedback(null);
                        router.push("/app/overtime");
                    }}
                />
            </ConditionalRender>

            {/* Error — solo cierra el overlay */}
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
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                                    <div>
                                        <h1 className="mb-1">Horas extra</h1>
                                        <p className="text-muted mb-0">
                                            Registra la información de la solicitud.
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
                                            disabled={isSubmitting || feedback === "loading" || !isDirty}
                                            onClick={() => reset(DEFAULT_VALUES)}
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
                                                Captura empleado, motivo, fecha, horario y firma de la solicitud.
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

                                                        <Col md={6}>
                                                            <FieldSelect
                                                                readonly={readInput}
                                                                register={register("idLeader", {
                                                                    required: true,
                                                                    setValueAs: (v) => (v === "" ? null : Number(v)),
                                                                })}
                                                                options={leaderOptions}
                                                                label="Líder:"
                                                                className="text-uppercase border"
                                                            />
                                                        </Col>

                                                        <Col md={6}>
                                                            <FieldSelect
                                                                register={register("idPersonDoh", { required: true })}
                                                                options={
                                                                    dohMap?.employee
                                                                        ? [{
                                                                            value: dohMap.employee.id,
                                                                            label: `${dohMap.employee.lastName} ${dohMap.employee.name} `,
                                                                        }]
                                                                        : []
                                                                }
                                                                label="D.O.H.:"
                                                                className="text-uppercase border"
                                                                readonly={!readInput || !readOnlyDoh}
                                                            />
                                                        </Col>

                                                        <Col md={12}>
                                                            <Entry
                                                                register={register("motive", { required: "El motivo es requerido" })}
                                                                label="Motivo:"
                                                                type="text"
                                                                invalid={!!errors.motive}
                                                                feedBack={errors.motive?.message}
                                                                className="text-uppercase border"
                                                            />
                                                        </Col>
                                                    </Row>
                                                </Card.Body>
                                            </Card>

                                            <Card className="border rounded-4 mb-3">
                                                <Card.Body>
                                                    <div className="d-flex align-items-center gap-2 mb-4">
                                                        <i className="bi bi-calendar-range text-success" />
                                                        <h6 className="mb-0 fw-bold">Fecha y horario</h6>
                                                    </div>

                                                    <Row className="g-3">
                                                        <Col md={4}>
                                                            <Form.Group>
                                                                <Form.Label className="fw-semibold">Fecha del evento:</Form.Label>
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

                                                        <Col md={4}>
                                                            <Entry
                                                                register={register("hourInit", {
                                                                    required: "La hora de inicio es requerida",
                                                                })}
                                                                type="time"
                                                                label="Hora de inicio:"
                                                                invalid={!!errors.hourInit}
                                                                feedBack={errors.hourInit?.message}
                                                                className="border"
                                                            />
                                                        </Col>

                                                        <Col md={4}>
                                                            <Entry
                                                                register={register("hourEnd", {
                                                                    required: "La hora de fin es requerida",
                                                                })}
                                                                type="time"
                                                                label="Hora de fin:"
                                                                invalid={!!errors.hourEnd}
                                                                feedBack={errors.hourEnd?.message}
                                                                className="border"
                                                            />
                                                        </Col>
                                                    </Row>
                                                </Card.Body>
                                            </Card>

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
