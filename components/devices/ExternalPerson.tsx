"use client";

import { Button, Col, Row } from "react-bootstrap";
import { UseFormRegisterReturn } from "react-hook-form";
import { IExternalPerson } from "@/lib/devices/interface";
import { Entry } from "../fields";
import ConditionalRender from "../ConditionalRender";

export type AssigneeType = "employee" | "external";
type ExternalField = keyof IExternalPerson;

// Reglas que usan estos campos (tipo propio para que sirva con cualquier formulario)
type ExternalRules = {
    validate?: (value: unknown) => true | string;
    maxLength?: { value: number; message: string };
    pattern?: { value: RegExp; message: string };
};

export const EMPTY_EXTERNAL_PERSON: IExternalPerson = {
    name: "",
    lastName: "",
    position: "",
    department: "",
    company: "",
    phone: "",
    email: "",
};

export function externalPersonName(person?: IExternalPerson | null) {
    return `${person?.lastName ?? ""} ${person?.name ?? ""}`.trim();
}

// Selector Empleado | Persona externa (practicante u otra persona que no está en el sistema)
export function AssigneeTypeToggle({
    value,
    onChange,
}: {
    value: AssigneeType;
    onChange: (value: AssigneeType) => void;
}) {
    return (
        <div className="btn-group w-100 mb-3" role="group" aria-label="Tipo de asignación">
            <Button
                type="button"
                variant={value === "employee" ? "primary" : "outline-primary"}
                onClick={() => onChange("employee")}
            >
                <i className="bi bi-person-badge me-2" />
                Empleado
            </Button>
            <Button
                type="button"
                variant={value === "external" ? "primary" : "outline-primary"}
                onClick={() => onChange("external")}
            >
                <i className="bi bi-person-plus me-2" />
                Persona externa
            </Button>
        </div>
    );
}

const requiredText = (max: number): ExternalRules => ({
    validate: (value: unknown) => !!String(value ?? "").trim() || "Este campo es requerido",
    maxLength: { value: max, message: `Máximo ${max} caracteres` },
});

// Datos de la persona externa. `reg` y `errorOf` reciben el nombre del campo para que el mismo
// componente sirva en el alta (currentAssignment.externalPerson.*) y en reasignar (externalPerson.*)
export function ExternalPersonFields({
    reg,
    errorOf,
}: {
    reg: (field: ExternalField, rules: ExternalRules) => UseFormRegisterReturn;
    errorOf: (field: ExternalField) => string | undefined;
}) {
    const entry = (field: ExternalField, label: string, rules: ExternalRules, type = "text", uppercase = true) => (
        <Entry
            register={reg(field, rules)}
            label={label}
            type={type}
            invalid={!!errorOf(field)}
            feedBack={errorOf(field)}
            className={`border ${uppercase ? "text-uppercase" : ""}`}
        />
    );

    return (
        <Row className="g-3">
            <Col md={6}>{entry("name", "Nombre:", requiredText(100))}</Col>
            <Col md={6}>{entry("lastName", "Apellidos:", requiredText(100))}</Col>
            <Col md={6}>{entry("position", "Puesto:", requiredText(100))}</Col>
            <Col md={6}>{entry("department", "Departamento:", requiredText(100))}</Col>
            <Col md={6}>{entry("company", "Escuela / empresa de procedencia (opcional):", {})}</Col>
            <Col md={6}>
                {entry("phone", "Teléfono (opcional):", {
                    maxLength: { value: 20, message: "Máximo 20 caracteres" },
                }, "tel")}
            </Col>
            <Col md={6}>
                {entry("email", "Correo (opcional):", {
                    pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Correo electrónico inválido",
                    },
                }, "email", false)}
            </Col>
        </Row>
    );
}

// Datos extra de la persona externa en el detalle y el historial (sin `employee`)
export function ExternalPersonSummary({ person }: { person: IExternalPerson }) {
    const extra = [person.company, person.phone, person.email].filter((v) => !!v && String(v).trim());

    return (
        <div className="d-flex flex-column align-items-center gap-1 mt-1">
            <span className="badge rounded-pill px-3 py-2 fw-semibold bg-orange-subtle text-orange-emphasis border border-orange-subtle">
                Externo
            </span>
            <div className="small text-uppercase">
                {[person.position, person.department].filter(Boolean).join(" · ")}
            </div>
            <ConditionalRender cond={extra.length > 0}>
                <div className="small text-muted text-break">{extra.join(" · ")}</div>
            </ConditionalRender>
        </div>
    );
}
