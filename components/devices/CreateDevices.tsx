"use client"

import { IDevices } from "@/lib/devices/interface"
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Col, Container, Form, Overlay, Row } from "react-bootstrap";
import { SubmitHandler, useFieldArray, useForm } from "react-hook-form";
import { Entry, FieldSelect, RelationField } from "../fields";
import { Branch, Department, Employee } from "@/lib/definitions";
import DatePicker, { registerLocale } from "react-datepicker";
import moment from "moment";
import { es } from "date-fns/locale";
import { storeAction } from "@/app/actions/storeActions";
import { useModals } from "@/context/ModalContext";
import { createDevice } from "@/app/actions/devices-actions";
import DnsBadgeInput from "./DnsBadgeInput";
import { formatCreatedAt } from "@/lib/helpers";


registerLocale("es", es);

type FeedbackState = "loading" | "success" | "error" | null;

const DEFAULT_VALUES: Partial<IDevices> = {
    name: "",
    type: "",
    status: "activo",
    networkInfo: [{
        mac: "",
        ip: "",
        description: "",
        hostname: "",
        gateway: "",
        dns: [],
        vlan: "",
        port: "",
    }],
    specs: {
        brand: "",
        model: "",
        serialNumber: "",
        processor: "",
        ram: "",
        storage: "",
        os: null,
        osVersion: "",
        purchaseDate: "",
        warrantyExpiration: "",
        idDevice: null,
        idProduct: null,
        architecture: null,
        graphicCard: null,
        userAdmin: null,
        passwordAdmin: null,
        user: null,
        userPassword: null,
        currentStatus: null,
        imei: null,
        value: null,
    },
    currentAssignment: {
        id: null,
        idEmployee: null,
        idBranch: null,
        phoneNumber: null,
        extentionNumber: null,
        emailCompany: null,
        emailGmail: null,
        passwordEmail: null,
        pinPhone: null,
        idDepartment: null,
        location: "",
        signatures: [],
        assignedAt: "",
    },
    idIt: null,
    notes: ""
};

export default function CreateDeviceComponent({
    employees,
    branches,
    departments
}: {
    devices: IDevices[];
    employees: Employee[];
    branches: Branch[];
    departments: Department[];
}) {
    const {
        register,
        reset,
        watch,
        control,
        setValue,
        getValues,
        handleSubmit,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<IDevices>({
        defaultValues: DEFAULT_VALUES,
    });

    //CONST
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const [addEmployee, setAddEmployee] = useState(false);
    const [dataSystem, setDataSystem] = useState<Employee[] | []>([]);
    const { modalConfirm } = useModals();
    const router = useRouter();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "networkInfo",
    });
    const selectedType = watch("type");
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordAdmin, setShowPasswordAdmin] = useState(false);
    const [showPasswordGmail, setShowPasswordGmail] = useState(false);
    const [showPin, setShowPin] = useState(false);

    //PARA CALENDARIO
    const dateButtonRef = useRef(null);
    const datePurchaseRef = useRef(null);
    const dateExpirationRef = useRef(null);

    const [dateError] = useState("");

    const [showCalendar, setShowCalendar] = useState(false);
    const [showCalendarPurchase, setShowCalendarPurchase] = useState(false);
    const [showCalendarExpiration, setShowCalendarExpiration] = useState(false);


    //CAPTURAR LA FECHA ==============/
    const selectedDate = watch("currentAssignment.assignedAt"); // lee el valor actual del form state
    const selectedDatePurchase = watch("specs.purchaseDate");
    const selectedDateExpiration = watch("specs.warrantyExpiration");
    //----------------
    const parsedDate = selectedDate
        ? moment(selectedDate, "YYYY-MM-DD").toDate()
        : null;

    const parseDatePurchase = selectedDatePurchase
        ? moment(selectedDatePurchase, "YYYY-MM-DD").toDate()
        : null;

    const parseDateExpiration = selectedDateExpiration
        ? moment(selectedDateExpiration, "YYYY-MM-DD").toDate()
        : null;

    //-----------------
    const handleDateChange = (date: Date | null) => {
        setValue("currentAssignment.assignedAt", date ? moment(date).format("YYYY-MM-DD") : "", { shouldDirty: true });
    };

    const handleDatePurchase = (date: Date | null) => {
        setValue("specs.purchaseDate", date ? moment(date).format("YYYY-MM-DD") : "", { shouldDirty: true });
    };

    const handleDateExpiration = (date: Date | null) => {
        setValue("specs.warrantyExpiration", date ? moment(date).format("YYYY-MM-DD") : "", { shouldDirty: true });
    };
    //=================/

    useEffect(() => {
        const current = getValues();

        reset(
            {
                ...current,
                specs: {
                    ...current.specs,
                    idDevice: null,
                    idProduct: null,
                    architecture: null,
                    graphicCard: null,
                    userAdmin: null,
                    passwordAdmin: null,
                    user: null,
                    userPassword: null,
                    imei: null,
                },
                currentAssignment: {
                    ...current.currentAssignment,
                    phoneNumber: null,
                    pinPhone: null,
                    extentionNumber: null,
                    emailCompany: null,
                    passwordEmail: null,
                    emailGmail: null,
                },
            },
            {
                keepDefaultValues: true,
                keepErrors: false,
                keepDirty: false,
            }
        );
    }, [selectedType, getValues, reset]);

    //HELPERS
    const handleBack = () => {
        setFeedback("loading");
        setFeedbackMsg("Cargando...");
        router.push("/app/devices");
    };

    const handleOpen = () => {
        setAddEmployee(true);
    }

    const handleCancel = () => {
        setAddEmployee(false);
    }


    const handleStaging = useCallback(async () => {
        const { ENVIROMENT, ID_DEV_SISTEM_STAGING, ID_DEV_SISTEM_PRODUCTION } = await storeAction();
        let idDevSistem = 0;

        if (ENVIROMENT === "staging") {
            idDevSistem = Number(ID_DEV_SISTEM_STAGING);
        } else if (ENVIROMENT === "production") {
            idDevSistem = Number(ID_DEV_SISTEM_PRODUCTION);
        }

        const dataFilter: Employee[] = employees.filter(
            (e: Employee) => e?.department?.id === idDevSistem
        );
        setDataSystem(dataFilter);
    }, [employees]);

    useEffect(() => {
        handleStaging();
    }, [handleStaging]);

    const onSubmit: SubmitHandler<IDevices> = async (data) => {


        modalConfirm("¿Seguro que quieres guardar el dispositivo?", async () => {
            try {
                setFeedback("loading");
                setFeedbackMsg("Creando dispositivo...");

                const res = await createDevice({ data });

                if (!res.success) {
                    setFeedbackMsg(res.message || "No se pudo crear");
                    setFeedback("error");
                    return;
                }

                setFeedbackMsg(res.message || "Creado correctamente");
                setFeedback("success");
                router.push("/app/devices");
            } catch {
                setFeedbackMsg("Error inesperado, intenta de nuevo");
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

            <ConditionalRender cond={feedback === "success"}>
                <SuccessOverlay
                    message={feedbackMsg}
                    onDone={() => {
                        setFeedback(null);
                        router.push("/app/devices");
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
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                                    <div>
                                        <h1 className="mb-1">Dispositivos</h1>
                                        <p className="text-muted mb-0">
                                            Registra la información del nuevo dispositivo.
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


                                {/* CUERPO */}
                                <Card className="rounded-4 shadow-sm mb-3">
                                    <Card.Body className="p-3 p-md-5">
                                        <div className="mb-4">
                                            <h5 className="fw-semibold mb-1">Datos generales</h5>
                                            <p className="text-muted mb-3">
                                                Captura los datos generales y específicos del dispositivo.
                                            </p>
                                        </div>

                                        {/* DATOS BASICOS */}
                                        <Card className="border rounded-4 mb-3">
                                            <Card.Body>
                                                <div className="d-flex align-items-center gap-2 mb-4">
                                                    <i className="bi bi-laptop text-primary" />
                                                    <h6 className="mb-0 fw-bold">Datos básicos</h6>
                                                </div>

                                                <Row className="g-3">
                                                    <Col md={12}>
                                                        <Entry
                                                            register={register("name", { required: "El nombre es requerido" })}
                                                            label={"Nombre del dispositivo:"}
                                                            type="string"
                                                            invalid={!!errors.name}
                                                            feedBack={errors.name?.message}
                                                            className="border text-uppercase"
                                                        />
                                                    </Col>

                                                    <Col md={6}>
                                                        <FieldSelect
                                                            register={register("type", {
                                                                required: "Este campo es requerido",
                                                            })}
                                                            options={[
                                                                { value: "computadora", label: "COMPUTADORA" },
                                                                { value: "laptop", label: "LAPTOP" },
                                                                { value: "impresora", label: "IMPRESORA" },
                                                                { value: "servidor", label: "SERVIDOR" },
                                                                { value: "switch", label: "SWITCH" },
                                                                { value: "router", label: "ROUTER" },
                                                                { value: "telefono_ip", label: "TELÉFONO IP" },
                                                                { value: "camara", label: "CÁMARA" },
                                                                { value: "access_point", label: "ACCESS POINT" },
                                                                { value: "celular", label: "CELULAR" },
                                                                { value: "television", label: "TELEVISIÓN" },
                                                                { value: "tablet", label: "TABLET" },
                                                                { value: "monitor", label: "MONITOR" },
                                                                { value: "no-break", label: "NO-BREAK" },
                                                                { value: "otro", label: "OTRO" },
                                                            ]}
                                                            label="Tipo:"
                                                            invalid={!!errors.type}
                                                            feedBack={errors.type?.message}
                                                            className="text-uppercase border"
                                                        />
                                                    </Col>

                                                    <Col md={6}>
                                                        <FieldSelect
                                                            register={register("status", {
                                                                required: "El status es requerido",
                                                            })}
                                                            options={[
                                                                { value: "activo", label: "ACTIVO" },
                                                                { value: "inactivo", label: "INACTIVO" },
                                                                { value: "en_reparacion", label: "EN REPARACIÓN" },
                                                                { value: "baja", label: "BAJA" },
                                                            ]}
                                                            label="Estatus"
                                                            invalid={!!errors.status}
                                                            feedBack={errors.status?.message}
                                                            className="text-uppercase border"
                                                        />
                                                    </Col>
                                                </Row>
                                            </Card.Body>
                                        </Card>

                                        {/* DATOS ESPECIFICOS */}
                                        <Card className="border rounded-4 mb-3">
                                            <Card.Body>
                                                <div className="d-flex align-items-center gap-2 mb-4">
                                                    <i className="bi bi-cpu text-primary" />
                                                    <h6 className="mb-0 fw-bold">Datos específicos</h6>
                                                </div>

                                                <Row className="g-3">
                                                    <Col md={6}>
                                                        <Entry
                                                            register={register("specs.brand", {
                                                                required: "Campo requerido"
                                                            })}
                                                            label="Marca:"
                                                            invalid={!!errors.specs?.brand}
                                                            feedBack={errors.specs?.brand?.message}
                                                            className="text-uppercase border"
                                                        />
                                                    </Col>

                                                    <Col md={6}>
                                                        <Entry
                                                            register={register("specs.model", {
                                                                required: "Campo requerido"
                                                            })}
                                                            label="Modelo:"
                                                            invalid={!!errors.specs?.model}
                                                            feedBack={errors.specs?.model?.message}
                                                            className="text-uppercase border"
                                                        />
                                                    </Col>


                                                    <Col md={6}>
                                                        <Entry
                                                            register={register("specs.serialNumber", {
                                                                required: "Campo requerido"
                                                            })}
                                                            label="Número de serie:"
                                                            invalid={!!errors.specs?.serialNumber}
                                                            feedBack={errors.specs?.serialNumber?.message}
                                                            className="text-uppercase border"
                                                        />
                                                    </Col>

                                                    <ConditionalRender cond={["celular", "tablet"].includes(String(selectedType))}>
                                                        <Col md={6}>
                                                            <Entry
                                                                register={register("specs.imei")}
                                                                label="IMEI:"
                                                                className="text-uppercase border"
                                                            />
                                                        </Col>
                                                    </ConditionalRender>

                                                    <Col md={6}>
                                                        <Entry
                                                            register={register("specs.value", {
                                                                // Vacío = null; si no, número (sale en la carta responsiva)
                                                                setValueAs: (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
                                                                validate: {
                                                                    isNumber: (v) => v == null || !Number.isNaN(v) || "El valor del equipo debe ser un número",
                                                                    notNegative: (v) => v == null || Number.isNaN(v) || v >= 0 || "El valor del equipo no puede ser negativo",
                                                                },
                                                            })}
                                                            label="Valor del equipo (MXN):"
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            prefix="$"
                                                            invalid={!!errors.specs?.value}
                                                            feedBack={errors.specs?.value?.message}
                                                            className="border"
                                                        />
                                                    </Col>

                                                    <Col md={6}>
                                                        <Entry
                                                            register={register("specs.processor", {
                                                                required: "Campo requerido"
                                                            })}
                                                            label="Procesador:"
                                                            invalid={!!errors.specs?.processor}
                                                            feedBack={errors.specs?.processor?.message}
                                                            className="text-uppercase border"
                                                        />
                                                    </Col>

                                                    <Col md={6}>
                                                        <Entry
                                                            register={register("specs.ram", {
                                                                required: "Campo requerido"
                                                            })}
                                                            label="Ram:"
                                                            invalid={!!errors.specs?.ram}
                                                            feedBack={errors.specs?.ram?.message}
                                                            className="text-uppercase border"
                                                        />
                                                    </Col>

                                                    <Col md={6}>
                                                        <Entry
                                                            register={register("specs.storage", {
                                                                required: "Campo requerido"
                                                            })}
                                                            label="Almacenamiento:"
                                                            invalid={!!errors.specs?.storage}
                                                            feedBack={errors.specs?.storage?.message}
                                                            className="text-uppercase border"
                                                        />
                                                    </Col>

                                                    <Col md={6}>
                                                        <FieldSelect
                                                            register={register("specs.os", {
                                                                required: "Campo requerido"
                                                            })}
                                                            options={[
                                                                { value: "windows_10", label: "WINDOWS 10" },
                                                                { value: "windows_11", label: "WINDOWS 11" },
                                                                { value: "windows_server", label: "WINDOWS SERVER" },
                                                                { value: "linux", label: "LINUX" },
                                                                { value: "macos", label: "MACOS" },
                                                                { value: "android", label: "ANDROID" },
                                                                { value: "ios", label: "IOS" },
                                                                { value: "otro", label: "OTRO" },
                                                            ]}
                                                            label="Os:"
                                                            invalid={!!errors.specs?.os}
                                                            feedBack={errors.specs?.os?.message}
                                                            className="text-uppercase border"
                                                        />
                                                    </Col>

                                                    <Col md={6}>
                                                        <Entry
                                                            register={register("specs.osVersion", {
                                                                required: "Campo requerido"
                                                            })}
                                                            label="Versión os:"
                                                            invalid={!!errors.specs?.osVersion}
                                                            feedBack={errors.specs?.osVersion?.message}
                                                            className="text-uppercase border"
                                                        />
                                                    </Col>

                                                    <ConditionalRender cond={["computadora", "laptop"].includes(String(selectedType))}>

                                                        <Col md={6}>
                                                            <Entry
                                                                register={register("specs.idDevice")}
                                                                label="Identificador de dispositivo:"
                                                                className="text-uppercase border"
                                                            />
                                                        </Col>

                                                        <Col md={6}>
                                                            <Entry
                                                                register={register("specs.idProduct")}
                                                                label="Id del producto:"
                                                                className="text-uppercase border"
                                                            />
                                                        </Col>

                                                        <Col md={6}>
                                                            <Entry
                                                                register={register("specs.architecture")}
                                                                label="Tipo de sistema:"
                                                                className="text-uppercase border"
                                                            />
                                                        </Col>

                                                        <Col md={6}>
                                                            <Entry
                                                                register={register("specs.graphicCard")}
                                                                label="Tarjeta gráfica:"
                                                                className="text-uppercase border"
                                                            />
                                                        </Col>
                                                    </ConditionalRender>
                                                    <ConditionalRender cond={["computadora", "laptop", "telefono_ip"].includes(String(selectedType))}>

                                                        <Col md={6}>
                                                            <Entry
                                                                register={register("specs.userAdmin")}
                                                                label="Usuario administrador:"
                                                                className="border"
                                                            />
                                                        </Col>


                                                        <Col md={6}>
                                                            <Entry
                                                                register={register("specs.passwordAdmin")}
                                                                type={showPasswordAdmin ? "text" : "password"}
                                                                label="Contraseña administrador:"

                                                                className="border"
                                                                suffix={
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowPasswordAdmin((prev) => !prev)}
                                                                        className="btn btn-link p-0 text-info"
                                                                        tabIndex={10}
                                                                    >
                                                                        <i className={`bi ${showPasswordAdmin ? "bi-eye-slash" : "bi-eye"}`} style={{ fontSize: "1.3rem" }} />
                                                                    </button>
                                                                }
                                                            />
                                                        </Col>
                                                    </ConditionalRender>

                                                    <ConditionalRender cond={["computadora", "laptop"].includes(String(selectedType))}>
                                                        <Col md={6}>
                                                            <Entry
                                                                register={register("specs.user")}
                                                                label="Nombre de usuario"
                                                                className="border"
                                                            />
                                                        </Col>
                                                    </ConditionalRender>

                                                    <ConditionalRender cond={["computadora", "laptop", "telefono_ip"].includes(String(selectedType))}>
                                                        <Col md={6}>
                                                            <Entry
                                                                register={register("specs.userPassword")}
                                                                type={showPassword ? "text" : "password"}
                                                                label={selectedType === "telefono_ip" ? "Contraseña Issabel:" : "Contraseña de usuario:"}

                                                                className="border"
                                                                suffix={
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowPassword((prev) => !prev)}
                                                                        className="btn btn-link p-0 text-info"
                                                                        tabIndex={10}
                                                                    >
                                                                        <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} style={{ fontSize: "1.3rem" }} />
                                                                    </button>
                                                                }
                                                            />
                                                        </Col>
                                                    </ConditionalRender>

                                                    <Col md={6}>
                                                        <FieldSelect
                                                            register={register("specs.currentStatus", {
                                                                required: "Este campo es requerido",
                                                            })}
                                                            options={[
                                                                { value: "nuevo", label: "NUEVO" },
                                                                { value: "seminuevo", label: "SEMINUEVO" },
                                                            ]}
                                                            label="Estatus actual:"
                                                            invalid={!!errors.specs?.currentStatus}
                                                            feedBack={errors.specs?.currentStatus?.message}
                                                            className="text-uppercase border"
                                                        />
                                                    </Col>

                                                    <Row className="g-3">
                                                        <Col md={6}>
                                                            <Form.Group>
                                                                <Form.Label className="fw-semibold mt-2">Fecha de compra</Form.Label>
                                                            </Form.Group>

                                                            <Button
                                                                ref={datePurchaseRef}
                                                                variant="outline-secondary"
                                                                className={`w-100 d-flex align-items-center justify-content-between text-uppercase ${dateError ? "border-danger text-danger" : ""}`}
                                                                onClick={() => setShowCalendarPurchase((s) => !s)}
                                                            >
                                                                <span>{selectedDatePurchase ? formatCreatedAt(selectedDatePurchase) : "Selecciona una fecha"}</span>
                                                                <i className="bi bi-calendar3" />
                                                            </Button>

                                                            <ConditionalRender cond={!dateError}>
                                                                <small className="text-danger d-block mt-1">{dateError}</small>
                                                            </ConditionalRender>

                                                            <Overlay
                                                                target={datePurchaseRef.current}
                                                                show={showCalendarPurchase}
                                                                placement="bottom-start"
                                                                rootClose
                                                                container={() => document.body}
                                                                onHide={() => setShowCalendarPurchase(false)}
                                                            >
                                                                {({ ref, style }) => (
                                                                    <div
                                                                        ref={ref}
                                                                        style={style}
                                                                        className="date-multi-popover mt-2 shadow-lg rounded-4 overflow-hidden bg-light text-capitalize"
                                                                    >
                                                                        <DatePicker
                                                                            inline
                                                                            selected={parseDatePurchase}
                                                                            onChange={handleDatePurchase}
                                                                            shouldCloseOnSelect={false}
                                                                            disabledKeyboardNavigation
                                                                            monthsShown={1}
                                                                            locale="es"
                                                                        />
                                                                        <Col xs={12}>
                                                                            <Button variant="primary" className="w-100" onClick={() => setShowCalendarPurchase(false)}>
                                                                                Aplicar
                                                                            </Button>
                                                                        </Col>
                                                                    </div>
                                                                )}
                                                            </Overlay>
                                                        </Col>

                                                        <Col md={6}>
                                                            <Form.Group>
                                                                <Form.Label className="fw-semibold mt-2">Fecha de expiración de la garantía</Form.Label>
                                                            </Form.Group>

                                                            <Button
                                                                ref={dateExpirationRef}
                                                                variant="outline-secondary"
                                                                className={`w-100 d-flex align-items-center justify-content-between text-uppercase ${dateError ? "border-danger text-danger" : ""}`}
                                                                onClick={() => setShowCalendarExpiration((s) => !s)}
                                                            >
                                                                <span>{selectedDateExpiration ? formatCreatedAt(selectedDateExpiration) : "Selecciona una fecha"}</span>
                                                                <i className="bi bi-calendar3" />
                                                            </Button>

                                                            <ConditionalRender cond={!dateError}>
                                                                <small className="text-danger d-block mt-1">{dateError}</small>
                                                            </ConditionalRender>

                                                            <Overlay
                                                                target={dateExpirationRef.current}
                                                                show={showCalendarExpiration}
                                                                placement="bottom-start"
                                                                rootClose
                                                                container={() => document.body}
                                                                onHide={() => setShowCalendarExpiration(false)}
                                                            >
                                                                {({ ref, style }) => (
                                                                    <div
                                                                        ref={ref}
                                                                        style={style}
                                                                        className="date-multi-popover mt-2 shadow-lg rounded-4 overflow-hidden bg-light text-capitalize"
                                                                    >
                                                                        <DatePicker
                                                                            inline
                                                                            selected={parseDateExpiration}
                                                                            onChange={handleDateExpiration}
                                                                            shouldCloseOnSelect={false}
                                                                            disabledKeyboardNavigation
                                                                            monthsShown={1}
                                                                            locale="es"
                                                                        />
                                                                        <Col xs={12}>
                                                                            <Button variant="primary" className="w-100" onClick={() => setShowCalendarExpiration(false)}>
                                                                                Aplicar
                                                                            </Button>
                                                                        </Col>
                                                                    </div>
                                                                )}
                                                            </Overlay>
                                                        </Col>
                                                    </Row>
                                                </Row>
                                            </Card.Body>
                                        </Card>

                                        {/* NETWORK INFO */}
                                        <Card className="border rounded-4 mb-3">
                                            <Card.Body>
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <i className="bi bi-wifi text-primary" />
                                                        <h6 className="mb-0 fw-bold">Información de la red</h6>
                                                    </div>

                                                    <ConditionalRender cond={fields.length < 2}>
                                                        <Button
                                                            variant="outline-primary"
                                                            type="button"
                                                            onClick={() =>
                                                                append({
                                                                    mac: "",
                                                                    ip: "",
                                                                    description: "",
                                                                    hostname: "",
                                                                    gateway: "",
                                                                    dns: [],
                                                                    vlan: "",
                                                                    port: "",
                                                                })
                                                            }
                                                        >
                                                            <i className="bi bi-plus-circle me-1" />
                                                            Agregar red
                                                        </Button>
                                                    </ConditionalRender>
                                                </div>

                                                <ConditionalRender cond={fields.length === 0}>
                                                    <div className="text-center">
                                                        <i className="bi bi-wifi-off text-danger"
                                                            style={{ fontSize: "3rem" }}
                                                        />
                                                    </div>

                                                    <p className="text-muted small mb-0 text-center">
                                                        No hay redes agregadas. Usa el botón de arriba para agregar una.
                                                    </p>

                                                </ConditionalRender>

                                                {fields.map((field, index) => (
                                                    <div key={field.id} className={index > 0 ? "border-top pt-3 mt-3" : ""}>
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <span className="fw-semibold small text-muted">Red #{index + 1}</span>
                                                            <Button
                                                                variant="outline-danger"
                                                                type="button"
                                                                onClick={() => remove(index)}
                                                            >
                                                                <i className="bi bi-trash" />
                                                            </Button>
                                                        </div>

                                                        <Row className="g-3">
                                                            <Col md={6}>
                                                                <Entry
                                                                    register={register(`networkInfo.${index}.mac`, { required: true })}
                                                                    invalid={!!errors.type}
                                                                    feedBack={errors.type?.message}
                                                                    label="Mac:"
                                                                    className="text-uppercase border"
                                                                />
                                                            </Col>

                                                            <Col md={6}>
                                                                <Entry
                                                                    register={register(`networkInfo.${index}.ip`, { required: true })}
                                                                    invalid={!!errors.type}
                                                                    feedBack={errors.type?.message}
                                                                    label="Ip:"
                                                                    className="text-uppercase border"
                                                                />
                                                            </Col>

                                                            <Col md={6}>
                                                                <Entry
                                                                    register={register(`networkInfo.${index}.description`, { required: true })}
                                                                    invalid={!!errors.type}
                                                                    feedBack={errors.type?.message}
                                                                    label="Descripción:"
                                                                    className="text-uppercase border"
                                                                />
                                                            </Col>

                                                            <Col md={6}>
                                                                <Entry
                                                                    register={register(`networkInfo.${index}.hostname`, { required: true })}
                                                                    invalid={!!errors.type}
                                                                    feedBack={errors.type?.message}
                                                                    label="Nombre de usuario (hostname):"
                                                                    className="border"
                                                                />
                                                            </Col>

                                                            <Col md={6}>
                                                                <Entry
                                                                    register={register(`networkInfo.${index}.gateway`, { required: true })}
                                                                    invalid={!!errors.type}
                                                                    feedBack={errors.type?.message}
                                                                    label="Gateway:"
                                                                    className="text-uppercase border"
                                                                />
                                                            </Col>

                                                            <Col md={6}>
                                                                <FieldSelect
                                                                    register={register(`networkInfo.${index}.vlan`, { required: true })}
                                                                    options={[
                                                                        { value: "1", label: "1" },
                                                                        { value: "20", label: "20" },
                                                                    ]}
                                                                    label="Vlan:"
                                                                    className="text-uppercase border"
                                                                    invalid={!!errors.type}
                                                                    feedBack={errors.type?.message}
                                                                />
                                                            </Col>

                                                            <Col md={6}>
                                                                <Entry
                                                                    register={register(`networkInfo.${index}.port`, { required: true })}
                                                                    label="Puerto:"
                                                                    className="text-uppercase border"
                                                                    invalid={!!errors.type}
                                                                    feedBack={errors.type?.message}
                                                                />
                                                            </Col>
                                                        </Row>

                                                        <Card className="border rounded-4 mt-3">
                                                            <Card.Body>
                                                                <Row>
                                                                    <DnsBadgeInput
                                                                        networkIndex={index}
                                                                        control={control}
                                                                        errors={errors}
                                                                    />
                                                                </Row>
                                                            </Card.Body>
                                                        </Card>
                                                    </div>
                                                ))}
                                            </Card.Body>
                                        </Card>

                                        {/* EMPLEADO ASIGNADO */}
                                        <Card className="border rounded-4 mb-3">
                                            <Card.Body>
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <div className="d-flex align-items-center gap-2 mb-4">
                                                        <i className="bi bi-person-check text-primary" />
                                                        <h6 className="mb-0 fw-bold">Empleado asignado</h6>
                                                    </div>

                                                    <ConditionalRender cond={addEmployee === false}>
                                                        <Button
                                                            variant="outline-primary"
                                                            type="button"
                                                            onClick={handleOpen}
                                                        >
                                                            <i className="bi bi-plus-circle me-1" />
                                                            Agregar empleado asignado
                                                        </Button>
                                                    </ConditionalRender>

                                                    <ConditionalRender cond={addEmployee === true}>
                                                        <Button
                                                            variant="outline-danger"
                                                            type="button"
                                                            onClick={handleCancel}
                                                        >
                                                            <i className="bi bi-slash-circle me-1" />
                                                            Cancelar
                                                        </Button>
                                                    </ConditionalRender>
                                                </div>

                                                <ConditionalRender cond={addEmployee === true}>
                                                    <Row className="g-3">
                                                        <Col md={6}>
                                                            <RelationField
                                                                options={employees.map((e) => ({
                                                                    id: Number(e.id) || 0,
                                                                    displayName: `${e.lastName?.toUpperCase()} ${e.name?.toUpperCase()}` || "",
                                                                    name: `${e.lastName?.toUpperCase()} ${e.name?.toUpperCase()}`,
                                                                }))}
                                                                register={register("currentAssignment.idEmployee")}
                                                                control={control}
                                                                callBackMode="id"
                                                                label="Empleado relacionado:"
                                                            />
                                                        </Col>

                                                        <Col md={6}>
                                                            <RelationField
                                                                options={branches.map((e) => ({
                                                                    id: Number(e.id) || 0,
                                                                    displayName: `${e.name?.toUpperCase()}` || "",
                                                                    name: `${e.name?.toUpperCase()}`,
                                                                }))}
                                                                register={register("currentAssignment.idBranch")}
                                                                control={control}
                                                                callBackMode="id"
                                                                label="Sucursal relacionada:"
                                                            />
                                                        </Col>

                                                        <Col md={6}>
                                                            <RelationField
                                                                options={departments.map((e) => ({
                                                                    id: Number(e.id) || 0,
                                                                    displayName: `${e.nameDepartment?.toUpperCase()}` || "",
                                                                    name: `${e.nameDepartment?.toUpperCase()}`,
                                                                }))}
                                                                register={register("currentAssignment.idDepartment")}
                                                                control={control}
                                                                callBackMode="id"
                                                                label="Departamento relacionado:"
                                                            />
                                                        </Col>

                                                        <Col md={6}>
                                                            <Entry
                                                                register={register("currentAssignment.location")}
                                                                label="Locación:"
                                                                className="text-uppercase border"
                                                            />
                                                        </Col>

                                                        <Col md={6}>
                                                            <Form.Group>
                                                                <Form.Label className="fw-semibold mt-2">Fecha de asignación</Form.Label>
                                                            </Form.Group>

                                                            <Button
                                                                ref={dateButtonRef}
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
                                                                        className="date-multi-popover mt-2 shadow-lg rounded-4 overflow-hidden bg-light text-capitalize"
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

                                                        <ConditionalRender cond={selectedType === "celular"}>
                                                            <Col md={6} className="mt-4">
                                                                <Entry
                                                                    register={register("currentAssignment.phoneNumber", { required: false })}
                                                                    label="Celular:"
                                                                    invalid={!!errors.currentAssignment?.phoneNumber}
                                                                    className="border text-uppercase"
                                                                    prefix="+52"
                                                                />
                                                            </Col>
                                                        </ConditionalRender>

                                                        <ConditionalRender cond={["celular", "tablet"].includes(String(selectedType))}>
                                                            <Col md={6} className="mt-4">
                                                                <Entry
                                                                    register={register("currentAssignment.pinPhone", { required: false })}
                                                                    label="Pin:"
                                                                    type={showPin ? "text" : "password"}
                                                                    invalid={!!errors.currentAssignment?.pinPhone}
                                                                    className="border"
                                                                    suffix={
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowPin((prev) => !prev)}
                                                                            className="btn btn-link p-0 text-info"
                                                                            tabIndex={10}
                                                                        >
                                                                            <i className={`bi ${showPin ? "bi-eye-slash" : "bi-eye"}`} style={{ fontSize: "1.3rem" }} />
                                                                        </button>
                                                                    }
                                                                />
                                                            </Col>
                                                        </ConditionalRender>

                                                        <ConditionalRender cond={selectedType === "telefono_ip"}>
                                                            <Col md={6} className="mt-4">
                                                                <Entry
                                                                    register={register("currentAssignment.extentionNumber", { required: false })}
                                                                    label="Número de extensión:"
                                                                    invalid={!!errors.currentAssignment?.extentionNumber}
                                                                    className="border text-uppercase"
                                                                />
                                                            </Col>
                                                        </ConditionalRender>

                                                        <ConditionalRender cond={["computadora", "laptop", "celular", "tablet"].includes(String(selectedType))}>
                                                            <Col md={6} className="mt-4">
                                                                <Entry
                                                                    register={register("currentAssignment.emailCompany", { required: false })}
                                                                    label="Correo Corporativo:"
                                                                    invalid={!!errors.currentAssignment?.emailCompany}
                                                                    className="border"
                                                                />
                                                            </Col>
                                                        </ConditionalRender>


                                                        <ConditionalRender cond={["computadora", "laptop", "celular", "tablet"].includes(String(selectedType))}>
                                                            <Col md={6} className="mt-4">
                                                                <Entry
                                                                    register={register("currentAssignment.emailGmail", { required: false })}
                                                                    label="Correo Gmail:"
                                                                    invalid={!!errors.currentAssignment?.emailGmail}
                                                                    className="border"
                                                                />
                                                            </Col>

                                                            <Col md={6} className="mt-4">
                                                                <Entry
                                                                    register={register("currentAssignment.passwordEmail")}
                                                                    label="Contraseña Correo Gmail:"
                                                                    type={showPasswordGmail ? "text" : "password"}
                                                                    className="border"
                                                                    suffix={
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowPasswordGmail((prev) => !prev)}
                                                                            className="btn btn-link p-0 text-info"
                                                                            tabIndex={10}
                                                                        >
                                                                            <i className={`bi ${showPasswordGmail ? "bi-eye-slash" : "bi-eye"}`} style={{ fontSize: "1.3rem" }} />
                                                                        </button>
                                                                    }
                                                                />
                                                            </Col>
                                                        </ConditionalRender>

                                                    </Row>
                                                </ConditionalRender>

                                                <ConditionalRender cond={addEmployee === false}>
                                                    <div className="text-center">
                                                        <i className="bi bi-person-slash text-danger"
                                                            style={{ fontSize: "3rem" }}
                                                        />
                                                    </div>

                                                    <p className="text-muted small mb-0 text-center">
                                                        La asignación de empleado quedará pendiente.
                                                    </p>
                                                </ConditionalRender>
                                            </Card.Body>
                                        </Card>

                                        <ConditionalRender cond={addEmployee === true}>
                                            <Card className="border rounded-4 mb-3 mt-2">
                                                <Card.Body>
                                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                                        <div className="d-flex align-items-center gap-2 mb-4">
                                                            <i className="bi bi-person-vcard-fill text-primary" />
                                                            <h6 className="mb-0 fw-bold">IT asignante</h6>
                                                        </div>
                                                    </div>

                                                    <RelationField
                                                        options={dataSystem.map((e) => ({
                                                            id: Number(e.id) || 0,
                                                            displayName: `${e.lastName?.toUpperCase()} ${e.name?.toUpperCase()}` || "",
                                                            name: `${e.lastName?.toUpperCase()} ${e.name?.toUpperCase()}`,
                                                        }))}
                                                        register={register("idIt")}
                                                        control={control}
                                                        callBackMode="id"
                                                        label="Empleado relacionado:"
                                                    />
                                                </Card.Body>
                                            </Card>
                                        </ConditionalRender>


                                        <Card className="border rounded-4 mb-3 mt-2">
                                            <Card.Body>
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <div className="d-flex align-items-center gap-2 mb-4">
                                                        <i className="bi bi-journal-text text-primary" />
                                                        <h6 className="mb-0 fw-bold">Notas</h6>
                                                    </div>
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
                                                        <Form.Text className="text-muted">
                                                            Accesorios (ej. cargador, lápiz táctil). En la carta responsiva sale como &quot;Accesorios&quot;.
                                                        </Form.Text>
                                                    </Col>
                                                </Row>
                                            </Card.Body>
                                        </Card>
                                    </Card.Body>
                                </Card>
                            </fieldset>
                        </Form>
                    </Col>
                </Row >
            </Container >

        </>
    )
}