"use client";

import { Form } from "react-bootstrap";
import { UseFormRegisterReturn } from "react-hook-form";

type FieldEntryProps = {
  label: string;
  type?: React.HTMLInputTypeAttribute;
  register: UseFormRegisterReturn;
  readonly?: boolean;
  invisible?: boolean;
  required?: boolean;
  invalid?: boolean;
  feedBack?: React.ReactNode;
  className?: string;
  autoFocus?: boolean;
  as?: React.ElementType;
  min?: string;
  max?: string;
  // Paso de los input number (por ejemplo "0.01" para montos con centavos)
  step?: string;
  cols?: number;
  rows?: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
};

export const Entry = ({
  label,
  type = "text",
  register,
  readonly,
  required,
  feedBack,
  className,
  invalid,
  autoFocus,
  invisible,
  as,
  min,
  max,
  step,
  cols,
  rows,
  prefix,
  suffix,
}: FieldEntryProps) => {
  if (invisible) return null;

  const autoCompleteValue = type === "password" ? "new-password" : "off";

  return (
    <Form.Group controlId={label} className="mb-2">
      <Form.Label className="fw-semibold">{label}</Form.Label>
      <div className="d-flex align-items-stretch position-relative">
        {prefix && (
          <span
            className="d-flex align-items-center px-2 bg-body-secondary border border-end-0 rounded-start text-muted fw-semibold"
            style={{ fontSize: "0.875rem", whiteSpace: "nowrap" }}
          >
            {prefix}
          </span>
        )}

        <Form.Control
          className={`w-100 ${prefix ? "rounded-start-0" : ""} ${suffix ? "pe-5 no-validation-icon" : ""} ${className}`}
          size="sm"
          {...register}
          type={type}
          autoComplete={autoCompleteValue}
          disabled={readonly}
          required={required}
          isInvalid={invalid}
          autoFocus={autoFocus}
          as={as}
          cols={cols}
          rows={rows}
          min={min}
          max={max}
          step={step}
        />

        {suffix && (
          <span className="position-absolute top-50 end-0 translate-middle-y me-2" style={{ zIndex: 2 }}>
            {suffix}
          </span>
        )}
      </div>
      {feedBack && (
        <Form.Control.Feedback type="invalid" className={invalid ? "d-block" : ""}>
          {feedBack}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};