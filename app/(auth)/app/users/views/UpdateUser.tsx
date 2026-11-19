"use client";

import { updateUser } from "@/app/actions/user-actions";
import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import SuccessOverlay from "@/components/SuccessOverlay";
import ErrorOverlay from "@/components/ErrorOverlay";
import { Entry, FieldSelect, RelationField } from "@/components/fields";
import { TInputsUser } from "@/components/users/UsersTableList";
import { useModals } from "@/context/ModalContext";
import {
  ModalBasicProps,
  Permission,
  User,
  Employee,
} from "@/lib/definitions";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Form, Button, Row, Col, Card, Badge } from "react-bootstrap";
import { useForm, SubmitHandler, Controller } from "react-hook-form";

type FeedbackState = "loading" | "success" | "error" | null;

type ModalAction = {
  user: User;
  id: number;
  /** Si faltan, se usan [] para evitar errores en runtime */
  perms?: Permission[];
  employees?: Employee[];
};

function formatPermission(text?: string | null) {
  if (!text) return "—";

  return text
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function sanitizeRole(role?: User["role"] | null): TInputsUser["role"] {
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "CHECADOR") {
    return role;
  }
  return null;
}

export default function FormUpdateUser({
  onHide,
  user,
  id,
  perms = [],
  employees = [],
}: ModalBasicProps & ModalAction) {
  const {
    reset,
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TInputsUser>({
    defaultValues: {
      name: "",
      lastName: "",
      email: "",
      password: "",
      gender: null,
      role: null,
      permissions: [],
      phone: null,
      status: 1,
      imageUrl: null,
      idEmployee: null,
    },
  });
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { modalError, modalConfirm } = useModals();
  const permisosSeleccionados = watch("permissions") || [];
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const isPermSelected = (id: number) =>
    permisosSeleccionados.some((perm: Permission) => perm.id === id);

  const toggleSelectAll = () => {
    const allSelected =
      perms.length > 0 && perms.every((perm) => isPermSelected(perm.id || 0));

    if (allSelected) {
      setValue("permissions", []);
    } else {
      setValue("permissions", [...perms]);
    }
  };

  const handleFetchResources = useCallback(async () => {
    setLoading(true);

    try {
      reset({
        name: user?.name ?? "",
        lastName: user?.lastName ?? "",
        email: user?.email ?? "",
        password: "",
        gender: (user?.gender as "MASCULINO" | "FEMENINO") ?? null,
        role: sanitizeRole(user?.role),
        permissions: user?.permissions ?? [],
        phone: user?.phone?.internationalNumber ?? null,
        status: user?.status ?? 1,
        imageUrl: null,
        // 0 o vacío significa "sin empleado"
        idEmployee: Number(user?.idEmployee) > 0 ? Number(user?.idEmployee) : null,
      });
    } catch {
      modalError("No se pudo cargar la información del usuario");
    } finally {
      setLoading(false);
    }
  }, [reset, user, modalError]);

  useEffect(() => {
    handleFetchResources();
  }, [handleFetchResources]);

  const onSubmit: SubmitHandler<TInputsUser> = async (data) => {
    modalConfirm("¿Seguro que quieres guardar el usuario?", async () => {
      try {
        setFeedback("loading");
        setFeedbackMsg("Actualizando usuario...");

        const res = await updateUser({ ...data, id });

        if (!res.success) {
          setFeedbackMsg(res.message || "No se pudo actualizar el usuario");
          setFeedback("error");
          return;
        }

        setFeedbackMsg(res.message || "Usuario actualizado correctamente");
        setFeedback("success");
        setTimeout(() => {
          router.push("/app/users?view_type=list&id=null");
        }, 1200);
      } catch {
        setFeedbackMsg("Error inesperado, intenta de nuevo");
        setFeedback("error");
      }
    });
  };

  return (
    <>
      <ConditionalRender cond={loading || isSubmitting}>
        <Loading message={isSubmitting ? "Guardando..." : "Cargando..."} />
      </ConditionalRender>

      <ConditionalRender cond={feedback === "loading"}>
        <Loading message={feedbackMsg || "Guardando..."} />
      </ConditionalRender>

      <ConditionalRender cond={feedback === "success"}>
        <SuccessOverlay
          message={feedbackMsg}
          onDone={() => setFeedback(null)}
        />
      </ConditionalRender>

      <ConditionalRender cond={feedback === "error"}>
        <ErrorOverlay
          message={feedbackMsg}
          onDone={() => setFeedback(null)}
        />
      </ConditionalRender>

      <div className="p-2 mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h4 className="mb-1 fw-bold">Usuario</h4>
            <p className="text-muted mb-0">
              Edita la información y permisos del usuario.
            </p>
          </div>

          <Badge
            bg="info-subtle"
            text="info-emphasis"
            className="rounded-pill px-3 py-2 fw-semibold border border-info-subtle"
          >
            Actualizar
          </Badge>
        </div>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <fieldset disabled={isSubmitting || loading}>

            <Card className="border rounded-4 mb-3">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <i className="bi bi-person text-primary" />
                  <h6 className="mb-0 fw-bold">Datos personales</h6>
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <Entry
                      register={register("name", { required: "Nombre requerido" })}
                      label="Nombre:"
                      invalid={!!errors.name}
                      feedBack={errors.name?.message}
                      className="text-uppercase border"
                    />
                  </Col>

                  <Col md={6}>
                    <Entry
                      register={register("lastName", { required: "Apellidos requeridos" })}
                      label="Apellidos:"
                      invalid={!!errors.lastName}
                      feedBack={errors.lastName?.message}
                      className="text-uppercase border"
                    />
                  </Col>

                  <Col md={6}>
                    <Entry
                      register={register("email", {
                        required: "Correo requerido",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Correo electrónico inválido",
                        },
                      })}
                      label="Correo:"
                      invalid={!!errors.email}
                      feedBack={errors.email?.message}
                      type="email"
                      className="border"
                    />
                  </Col>

                  <Col md={6}>
                    <Entry
                      register={register("phone", { required: "Teléfono requerido" })}
                      label="Teléfono:"
                      invalid={!!errors.phone}
                      feedBack={errors.phone?.message as string}
                      className="border"
                    />
                  </Col>

                  <Col md={6}>
                    <FieldSelect
                      register={register("gender", { required: "Este campo es requerido" })}
                      options={[
                        { value: "MASCULINO", label: "Masculino" },
                        { value: "FEMENINO", label: "Femenino" },
                      ]}
                      label="Género:"
                      invalid={!!errors.gender}
                      feedBack={errors.gender?.message}
                      className="border text-uppercase"
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border rounded-4 mb-3">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <i className="bi bi-shield-lock text-warning" />
                  <h6 className="mb-0 fw-bold">Cuenta y acceso</h6>
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <FieldSelect
                      register={register("role", { required: "Este campo es requerido" })}
                      options={[
                        { value: "SUPER_ADMIN", label: "SUPER ADMIN" },
                        { value: "ADMIN", label: "ADMIN" },
                        { value: "CHECADOR", label: "CHECADOR" },
                      ]}
                      label="Rol:"
                      invalid={!!errors.role}
                      feedBack={errors.role?.message}
                      className="border"
                    />
                  </Col>

                  <Col md={6}>
                    <FieldSelect
                      register={register("status", { required: "Este campo es requerido" })}
                      options={[
                        { value: 1, label: "Activo" },
                        { value: 2, label: "Suspendido" },
                        { value: 3, label: "Eliminado" },
                      ]}
                      label="Status:"
                      invalid={!!errors.status}
                      feedBack={errors.status?.message as string}
                      className="border text-uppercase"
                    />
                  </Col>

                  {/*
                    OJO: con user tipado como requerido, !user nunca es true —
                    este campo nunca se muestra en este form.
                    Confirma si aquí se debe poder cambiar la contraseña
                    (como campo opcional) o si intencionalmente no se permite.
                  */}
                </Row>
              </Card.Body>
            </Card>

            <Card className="border rounded-4 mb-3">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <i className="bi bi-person-badge text-success" />
                  <h6 className="mb-0 fw-bold">Empleado relacionado</h6>
                </div>

                <Row className="g-3">
                  <Col md={12}>
                    <RelationField
                      options={employees.map((e) => ({
                        id: e.id || 0,
                        displayName: `${e.lastName?.toUpperCase()} ${e.name?.toUpperCase()}` || "",
                        name: `${e.lastName?.toUpperCase()} ${e.name?.toUpperCase()}`,
                      }))}
                      register={register("idEmployee")}
                      control={control}
                      callBackMode="id"
                      label="Empleado relacionado:"
                      placeholder="Sin empleado"
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border rounded-4">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-key text-info" />
                    <h6 className="mb-0 fw-bold">Permisos</h6>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline-primary"
                    onClick={toggleSelectAll}
                    disabled={perms.length === 0}
                  >
                    {perms.length > 0 && perms.every((perm) => isPermSelected(perm.id ?? 0))
                      ? "Deseleccionar todos"
                      : "Seleccionar todos"}
                  </Button>
                </div>

                <Row className="g-2">
                  {perms.map((permiso) => (
                    <Col xs={12} md={6} key={permiso.id}>
                      <div className="p-2 rounded-3 table-active h-100">
                        <Controller
                          name="permissions"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => {
                            const selectedPermissions = field.value || [];
                            const isChecked = selectedPermissions.some(
                              (p: Permission) => p.id === permiso.id
                            );

                            const handleChange = () => {
                              if (isChecked) {
                                field.onChange(
                                  selectedPermissions.filter(
                                    (p: Permission) => p.id !== permiso.id
                                  )
                                );
                              } else {
                                field.onChange([...selectedPermissions, permiso]);
                              }
                            };

                            return (
                              <Form.Check
                                type="checkbox"
                                label={formatPermission(permiso.text)}
                                checked={isChecked}
                                onChange={handleChange}
                              />
                            );
                          }}
                        />
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onHide}
                disabled={loading || isSubmitting}
              >
                Cancelar
              </Button>

              <Button type="submit" variant="success" disabled={loading || isSubmitting}>
                {isSubmitting ? "Actualizando..." : "Actualizar"}
              </Button>
            </div>

          </fieldset>
        </Form>
      </div>
    </>
  );
}