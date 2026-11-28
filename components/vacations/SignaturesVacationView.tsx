"use client";

import Image from "next/image";
import { ReactNode, useEffect, useState } from "react";
import { Card, Col } from "react-bootstrap";
import { fetchVacationSignature } from "@/app/actions/vacations-actions";
import { VacationRequestStatus } from "@/lib/vactions/interface";

const BADGE_BASE = "badge rounded-pill px-3 py-2 fw-semibold border";

const BADGE_VARIANTS = {
  success: `${BADGE_BASE} bg-success-subtle text-success-emphasis border-success-subtle`,
  warning: `${BADGE_BASE} bg-warning-subtle text-warning-emphasis border-warning-subtle`,
  danger: `${BADGE_BASE} bg-danger-subtle text-danger-emphasis border-danger-subtle`,
  info: `${BADGE_BASE} bg-info-subtle text-info-emphasis border-info-subtle`,
  secondary: `${BADGE_BASE} bg-secondary-subtle text-secondary-emphasis border-secondary-subtle`,
};


function SignaturesVacationView({
  idSolicitud,
  idPeriod,
  idEmployee,
  name,
  status,
  label,
  footerExtra,
}: {
  // Texto extra bajo el nombre (casilla "Líder": subgerente)
  footerExtra?: ReactNode;
  idSolicitud: number | null;
  idPeriod: number | null;
  idEmployee: number | null;
  name: string;
  status: VacationRequestStatus;
  label?: string;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loadingSignature, setLoadingSignature] = useState(true);



  useEffect(() => {
    const handleFetchSignature = async () => {
      if (!idSolicitud || !idEmployee) {
        setLoadingSignature(false);
        return;
      }

      try {
        setLoadingSignature(true);

        const res = await fetchVacationSignature({
          data: { idSolicitud, idPeriod, idEmployee },
        });

        if (res.success && res.data && res.data !== '') {
          setImgUrl(res.data);
        } else {
          setImgUrl(null);
        }
      } finally {
        setLoadingSignature(false);
      }
    };

    handleFetchSignature();
  }, [idSolicitud, idEmployee, idPeriod]);

  const hasSigned = Boolean(imgUrl);

  const getBadge = (): { text: string; className: string } => {
    const normalizedLabel = label
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const normalizedStatus = status?.toUpperCase();

    if (normalizedLabel === "empleado") {
      return hasSigned
        ? { text: "Firmado", className: BADGE_VARIANTS.success }
        : { text: "Pendiente de firma", className: BADGE_VARIANTS.warning };
    }

    if (normalizedLabel === "lider" || normalizedLabel === "direccion") {
      if (normalizedStatus === "APPROVED") return { text: "Aprobado", className: BADGE_VARIANTS.success };
      if (normalizedStatus === "REFUSED") return { text: "Rechazado", className: BADGE_VARIANTS.danger };
      return { text: "Pendiente de aprobar", className: BADGE_VARIANTS.warning };
    }

    if (normalizedLabel === "doh") {
      return hasSigned
        ? { text: "Enterado", className: BADGE_VARIANTS.info }
        : { text: "Pendiente", className: BADGE_VARIANTS.warning };
    }

    return hasSigned
      ? { text: "Firmado", className: BADGE_VARIANTS.success }
      : { text: "Pendiente", className: BADGE_VARIANTS.warning };
  };

  const badge = getBadge();

  return (
    <Col md={4}>
      <Card className="mt-2 w-100 shadow-sm rounded-4 overflow-hidden">
        {/* Header: label y badge en flujo normal, se acomodan solos */}
        <Card.Header className="bg-dark text-white d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
          <span className="fw-bold text-uppercase text-truncate">{label}</span>

          <span className={loadingSignature ? BADGE_VARIANTS.secondary : badge.className} style={{ fontSize: "0.7rem" }}>
            {loadingSignature ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                Cargando...
              </>
            ) : (
              badge.text
            )}
          </span>
        </Card.Header>

        <Card.Body className="p-2 d-flex justify-content-center align-items-center bg-white" style={{ minHeight: "150px" }}>
          {loadingSignature ? (
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          ) : (
            <Image
              unoptimized
              src={imgUrl ?? "/image/avatar_default.svg"}
              alt={`Firma de ${name}`}
              width={300}
              height={150}
              style={{
                width: "100%",
                maxWidth: "300px",
                height: "auto",
                maxHeight: "150px",
                objectFit: "contain",
              }}
            />
          )}
        </Card.Body>

        <Card.Footer className="text-center fw-semibold text-uppercase small text-break">
          {name}
          {footerExtra}
        </Card.Footer>
      </Card>
    </Col >
  );
}

export default SignaturesVacationView;
