import { ModalBasicProps } from "@/lib/definitions";
import { IUpdateCurrentUser } from "@/lib/devices/interface";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import ConditionalRender from "../ConditionalRender";
import SuccessOverlay from "../SuccessOverlay";
import Loading from "../LoadingSpinner";
import ErrorOverlay from "../ErrorOverlay";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import { useModals } from "@/context/ModalContext";
import { updateCurrentUser } from "@/app/actions/devices-actions";
import { Entry } from "../fields";
import { EMPTY_EXTERNAL_PERSON, ExternalPersonFields } from "./ExternalPerson";

type FeedbackState = "loading" | "success" | "error" | null;

type ModalAction = {
    device: IUpdateCurrentUser;
    idDevice: number;
    type: string;
}

function getDefaultValues(device?: IUpdateCurrentUser | null): IUpdateCurrentUser {
    return {
        phoneNumber: device?.phoneNumber ?? null,
        extentionNumber: device?.extentionNumber ?? "",
        emailCompany: device?.emailCompany ?? "",
        emailGmail: device?.emailGmail ?? "",
        passwordEmail: device?.passwordEmail ?? "",
        pinPhone: device?.pinPhone ?? "",
        location: device?.location ?? "",
        ...(device?.externalPerson
            ? {
                externalPerson: {
                    ...EMPTY_EXTERNAL_PERSON,
                    ...Object.fromEntries(
                        Object.entries(device.externalPerson).map(([k, v]) => [k, v ?? ""])
                    ),
                },
            }
            : {}),
    }
}

export default function UpdateCurrentUser({
    onHide,
    device,
    idDevice,
    type,
}: ModalBasicProps & ModalAction) {
    const isExternal = !!device?.externalPerson;
    const {
        register,
        handleSubmit,
        formState: { isSubmitting, errors },
    } = useForm<IUpdateCurrentUser>({
        defaultValues: getDefaultValues(device),
    });

    //CONST
    const router = useRouter();
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const { modalConfirm } = useModals();
    const [showPasswordGmail, setShowPasswordGmail] = useState(false);
    const [showPin, setShowPin] = useState(false);

    const onSubmit: SubmitHandler<IUpdateCurrentUser> = async (data) => {

        modalConfirm("¿Seguro que quieres guardar los cambios?", async () => {

            try {
                setFeedback("loading");

                setFeedbackMsg("Actualizando...");

                const res = await updateCurrentUser({
                    idDevice: Number(idDevice),
                    data: {
                        phoneNumber: data.phoneNumber,
                        extentionNumber: data.extentionNumber,
                        emailCompany: data.emailCompany,
                        emailGmail: data.emailGmail,
                        passwordEmail: data.passwordEmail,
                        pinPhone: data.pinPhone,
                        location: data.location,
                        ...(isExternal ? { externalPerson: data.externalPerson } : {}),
                    }
                });

                if (!res.success) {
                    setFeedbackMsg(res.message || "No se pudo actualizar");
                    setFeedback("error");
                    return;
                }
                setFeedbackMsg(res.message || "Actualizado correctamente");
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
                        <h4 className="mb-1 fw-bold">Empleado asignado</h4>
                        <p className="text-muted mb-0">
                            Actualiza los datos del empleado asignado.
                        </p>
                    </div>

                    <span className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle">
                        Actualizar
                    </span>
                </div>
            </div>

            <Form onSubmit={handleSubmit(onSubmit)}>
                {/* DATOS BASICOS */}



                <Row className="g-3">

                    <ConditionalRender cond={isExternal}>
                        <Col md={12}>
                            <Card className="border rounded-4">
                                <Card.Body>
                                    <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                                        <label className="d-flex align-items-center gap-2 fw-bold mb-0">
                                            <i className="bi bi-person-plus text-primary" />
                                            Persona externa
                                        </label>
                                        <span className="badge rounded-pill px-3 py-2 fw-semibold bg-orange-subtle text-orange-emphasis border border-orange-subtle">
                                            Externo
                                        </span>
                                    </div>
                                    <ExternalPersonFields
                                        reg={(field, rules) => register(`externalPerson.${field}`, rules)}
                                        errorOf={(field) => errors.externalPerson?.[field]?.message}
                                    />
                                </Card.Body>
                            </Card>
                        </Col>
                    </ConditionalRender>

                    <ConditionalRender cond={type === "celular"}>
                        <Col md={12}>
                            <Card className="border rounded-4">
                                <Card.Body>
                                    <label className="d-flex align-items-center gap-2 fw-bold">
                                        <i className="bi bi-phone text-primary" />
                                        Celular
                                    </label>
                                    <Entry
                                        register={register("phoneNumber")}
                                        label=""
                                        type="string"
                                        className="border text-uppercase"
                                        prefix="+52"
                                    />
                                </Card.Body>
                            </Card>
                        </Col>
                    </ConditionalRender>

                    <ConditionalRender cond={type === "telefono_ip"}>
                        <Col md={12}>
                            <Card className="border rounded-4">
                                <Card.Body>
                                    <label className="d-flex align-items-center gap-2 fw-bold">
                                        <i className="bi bi-telephone-plus text-secondary" />
                                        Extensión
                                    </label>
                                    <Entry
                                        register={register("extentionNumber")}
                                        label=""
                                        type="string"
                                        className="border text-uppercase"
                                    />
                                </Card.Body>
                            </Card>
                        </Col>
                    </ConditionalRender>

                    <ConditionalRender cond={["computadora", "laptop", "celular", "tablet"].includes(String(type))}>
                        <Col md={12}>
                            <Card className="border rounded-4">
                                <Card.Body>
                                    <label className="d-flex align-items-center gap-2 fw-bold">
                                        <i className="bi bi-envelope-at-fill text-secondary" />
                                        Correo Corporativo
                                    </label>
                                    <Entry
                                        register={register("emailCompany")}
                                        label=""
                                        type="string"
                                        className="border"
                                    />
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col md={12}>
                            <Card className="border rounded-4">
                                <Card.Body>
                                    <label className="d-flex align-items-center gap-2 fw-bold">
                                        <i className="bi bi-envelope-fill text-warning" />
                                        Correo Gmail
                                    </label>
                                    <Entry
                                        register={register("emailGmail")}
                                        label=""
                                        type="string"
                                        className="border"
                                    />
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col md={12}>
                            <Card className="border rounded-4">
                                <Card.Body>
                                    <label className="d-flex align-items-center gap-2 mb-2 fw-bold">
                                        <i className="bi bi-shield-lock text-info" />
                                        Contraseña Correo Gmail
                                    </label>
                                    <Entry
                                        register={register("passwordEmail")}
                                        label=""
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
                                </Card.Body>
                            </Card>
                        </Col>
                    </ConditionalRender>

                    <ConditionalRender cond={["tablet", "celular"].includes(String(type))}>
                        <Col md={12}>
                            <Card className="border rounded-4">
                                <Card.Body>
                                    <label className="d-flex align-items-center gap-2 mb-2 fw-bold">
                                        <i className="bi bi-key text-primary" />
                                        Pin
                                    </label>
                                    <Entry
                                        register={register("pinPhone")}
                                        label=""
                                        type={showPin ? "text" : "password"}
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
                                </Card.Body>
                            </Card>
                        </Col>
                    </ConditionalRender>

                    <Col md={12}>
                        <Card className="border rounded-4">
                            <Card.Body>
                                <label className="d-flex align-items-center gap-2 mb-2 fw-bold">
                                    <i className="bi bi-geo-alt-fill text-danger" />
                                    Locación
                                </label>
                                <Entry
                                    register={register("location")}
                                    label=""
                                    type="string"
                                    className="border text-uppercase"
                                />
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

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

            </Form>
        </>
    )
}