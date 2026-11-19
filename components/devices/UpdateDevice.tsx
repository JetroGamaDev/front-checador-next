import { ModalBasicProps } from "@/lib/definitions";
import { IDevices } from "@/lib/devices/interface";
import { SubmitHandler, useFieldArray, useForm } from "react-hook-form";
import ConditionalRender from "../ConditionalRender";
import ErrorOverlay from "../ErrorOverlay";
import SuccessOverlay from "../SuccessOverlay";
import Loading from "../LoadingSpinner";
import { useRef, useState } from "react";
import { Button, Card, Col, Form, Overlay, Row } from "react-bootstrap";
import { Entry, FieldSelect } from "../fields";
import DatePicker from "react-datepicker";
import moment from "moment";
import DnsBadgeInput from "./DnsBadgeInput";
import { useModals } from "@/context/ModalContext";
import { updateDevice } from "@/app/actions/devices-actions";
import { useRouter } from "next/navigation";
import { formatCreatedAt, formatDateMx } from "@/lib/helpers";

type FeedbackState = "loading" | "success" | "error" | null;

type ModalAction = {
    device: IDevices;
    idDevice: number;
}

function getDefaultValues(device?: IDevices | null): IDevices {
    return {
        id: device?.id ?? 0,
        _id: device?._id,
        name: device?.name || "",
        type: device?.type || null,
        status: device?.status || "",
        networkInfo: Array.isArray(device?.networkInfo) ? device.networkInfo : [],
        specs: {
            brand: device?.specs?.brand || "",
            model: device?.specs?.model || "",
            serialNumber: device?.specs?.serialNumber || "",
            processor: device?.specs?.processor || "",
            ram: device?.specs?.ram || "",
            storage: device?.specs?.storage || "",
            os: device?.specs?.os || null,
            osVersion: device?.specs?.osVersion || "",
            purchaseDate: (device?.specs?.purchaseDate) || "",
            warrantyExpiration: (device?.specs?.warrantyExpiration) || "",
            idDevice: device?.specs?.idDevice || null,
            idProduct: device?.specs?.idProduct || null,
            architecture: device?.specs?.architecture || null,
            graphicCard: device?.specs?.graphicCard || null,
            userAdmin: device?.specs?.userAdmin || null,
            passwordAdmin: device?.specs?.passwordAdmin || null,
            user: device?.specs?.user || null,
            userPassword: device?.specs?.userPassword || null,
            currentStatus: device?.specs?.currentStatus || null,
            imei: device?.specs?.imei ?? "",
            value: device?.specs?.value ?? null,
        },
        createdAt: formatDateMx(device?.createdAt) || "",
        updatedAt: formatDateMx(device?.updatedAt) || "",
        employee: device?.employee,
        department: device?.department,
        branch: device?.branch,
        idIt: device?.idIt ?? null,
        notes: device?.notes || "",
    };
}

export default function FormUpdateDevice({
    onHide,
    device,
    idDevice,
}: ModalBasicProps & ModalAction) {
    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<IDevices>({
        defaultValues: getDefaultValues(device),
    });

    //CONST
    const router = useRouter();
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const { fields, append, remove } = useFieldArray({
        control,
        name: "networkInfo",
    });
    const { modalConfirm } = useModals();
    const selectedType = watch("type");
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordAdmin, setShowPasswordAdmin] = useState(false);


    //PARA CALENDARIO
    const datePurchaseRef = useRef(null);
    const dateExpirationRef = useRef(null);

    const [dateError] = useState("");

    const [showCalendarPurchase, setShowCalendarPurchase] = useState(false);
    const [showCalendarExpiration, setShowCalendarExpiration] = useState(false);


    //CAPTURAR LA FECHA ==============/
    const selectedDatePurchase = watch("specs.purchaseDate");
    const selectedDateExpiration = watch("specs.warrantyExpiration");

    //----------------

    const parseDatePurchase = selectedDatePurchase
        ? moment(selectedDatePurchase, "YYYY-MM-DD").toDate()
        : null;

    const parseDateExpiration = selectedDateExpiration
        ? moment(selectedDateExpiration, "YYYY-MM-DD").toDate()
        : null;

    //-----------------

    const handleDatePurchase = (date: Date | null) => {
        setValue("specs.purchaseDate", date ? moment(date).format("YYYY-MM-DD") : "", { shouldDirty: true });
    };

    const handleDateExpiration = (date: Date | null) => {
        setValue("specs.warrantyExpiration", date ? moment(date).format("YYYY-MM-DD") : "", { shouldDirty: true });
    };
    //=================/


    const onSubmit: SubmitHandler<IDevices> = async (data) => {

        modalConfirm("¿Seguro que quieres guardar los cambios?", async () => {

            try {
                setFeedback("loading");
                setFeedbackMsg("Actualizando dispositivo...");
                const res = await updateDevice({
                    data: data,
                    idDevice: Number(idDevice)
                });

                if (!res.success) {
                    setFeedbackMsg(res.message || "No se pudo actualizar el departamento");
                    setFeedback("error");
                    return;
                }
                setFeedbackMsg(res.message || "Departamento actualizado correctamente");
                setFeedback("success");
                router.refresh();
            } catch {
                setFeedbackMsg("Error inesperado, intenta de nuevo");
                setFeedback("error");
            }
        })
    };


    return (
        <>
            <ConditionalRender cond={feedback === "loading"}>
                <Loading message={feedbackMsg || "Cargando..."} />
            </ConditionalRender>

            <ConditionalRender cond={feedback === "success"}>
                <SuccessOverlay
                    message={feedbackMsg}
                    onDone={() => {
                        setFeedback(null);
                        onHide();
                    }}
                />
            </ConditionalRender>

            <ConditionalRender cond={feedback === "error"}>
                <ErrorOverlay
                    message={feedbackMsg}
                    onDone={() => setFeedback(null)}
                />
            </ConditionalRender>

            <div className="p-2 mt-4">
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                        <h4 className="mb-1 fw-bold">Dispositivo</h4>
                        <p className="text-muted mb-0">
                            Actualiza los datos básicos y específicos del dispositivo.
                        </p>
                    </div>

                    <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                        Nuevo
                    </span>
                </div>
            </div>

            <Form onSubmit={handleSubmit(onSubmit)}>
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
                                    label="Nombre del dispositivo:"
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
                                    className="text-uppercase border overflow-auto"
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
                                    invalid={!!errors.type}
                                    feedBack={errors.type?.message}
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
                                    invalid={!!errors.type}
                                    feedBack={errors.type?.message}
                                    className="text-uppercase border"
                                />
                            </Col>

                            <Col md={6}>
                                <Entry
                                    register={register("specs.model", {
                                        required: "Campo requerido"
                                    })}
                                    label="Modelo:"
                                    invalid={!!errors.type}
                                    feedBack={errors.type?.message}
                                    className="text-uppercase border"
                                />
                            </Col>


                            <Col md={6}>
                                <Entry
                                    register={register("specs.serialNumber", {
                                        required: "Campo requerido"
                                    })}
                                    label="Número de serie:"
                                    invalid={!!errors.type}
                                    feedBack={errors.type?.message}
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
                                    invalid={!!errors.type}
                                    feedBack={errors.type?.message}
                                    className="text-uppercase border"
                                />
                            </Col>

                            <Col md={6}>
                                <Entry
                                    register={register("specs.ram", {
                                        required: "Campo requerido"
                                    })}
                                    label="Ram:"
                                    invalid={!!errors.type}
                                    feedBack={errors.type?.message}
                                    className="text-uppercase border"
                                />
                            </Col>

                            <Col md={6}>
                                <Entry
                                    register={register("specs.storage", {
                                        required: "Campo requerido"
                                    })}
                                    label="Almacenamiento:"
                                    invalid={!!errors.type}
                                    feedBack={errors.type?.message}
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
                                    invalid={!!errors.type}
                                    feedBack={errors.type?.message}
                                    className="text-uppercase border"
                                />
                            </Col>

                            <Col md={6}>
                                <Entry
                                    register={register("specs.osVersion", {
                                        required: "Campo requerido"
                                    })}
                                    label="Versión os:"
                                    invalid={!!errors.type}
                                    feedBack={errors.type?.message}
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
                                        label="Id. del producto:"
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
                                        label="Contraseña:"

                                        className="border"
                                        suffix={
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswordAdmin((prev) => !prev)}
                                                className="btn btn-link p-0 text-info"
                                                tabIndex={10}
                                            >
                                                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} style={{ fontSize: "1.3rem" }} />
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

                            <Row>
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

                <div className="d-flex justify-content-end gap-2 mt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onHide}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>

                    <Button type="submit" variant="success" disabled={isSubmitting}>
                        {isSubmitting ? "Actualizando..." : "Actualizar"}
                    </Button>
                </div>
            </Form >
        </>
    );
}