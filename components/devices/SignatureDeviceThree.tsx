"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Card, Col } from "react-bootstrap";
import { fetchSignatureDevice } from "@/app/actions/devices-actions";
import { formatDateMx } from "@/lib/helpers";

const BADGE_BASE = "badge rounded-pill px-3 py-2 fw-semibold border";

const BADGE_VARIANTS = {
    success: `${BADGE_BASE} bg-success-subtle text-success-emphasis border-success-subtle`,
    warning: `${BADGE_BASE} bg-warning-subtle text-warning-emphasis border-warning-subtle`,
    danger: `${BADGE_BASE} bg-danger-subtle text-danger-emphasis border-danger-subtle`,
    info: `${BADGE_BASE} bg-info-subtle text-info-emphasis border-info-subtle`,
    secondary: `${BADGE_BASE} bg-secondary-subtle text-secondary-emphasis border-secondary-subtle`,
};

function SignatureDeviceThree({
    idDevice,
    idEmployee,
    idSignature,
    external = false,
    status,
    label,
    dateSigner,
}: {
    idDevice: number;
    idEmployee: number;
    idSignature: number;
    // Persona externa: su firma se consulta con idSignatory = 0
    external?: boolean;
    dateSigner: string;
    status: string;
    label?: string;
}) {
    const [imgUrl, setImgUrl] = useState<string | null>(null);
    const [loadingSignature, setLoadingSignature] = useState(true);

    useEffect(() => {
        const handleFetchSignature = async () => {
            if (!idDevice || (!idEmployee && !external)) {
                setLoadingSignature(false);
                return;
            }

            try {
                setLoadingSignature(true);

                const res = await fetchSignatureDevice({
                    idDevice: idDevice,
                    idSignature: idSignature,
                    idEmployee: idEmployee
                });

                if (res.success && res.data) {
                    setImgUrl(res.data);
                } else {
                    setImgUrl(null);
                }
            } finally {
                setLoadingSignature(false);
            }
        };

        handleFetchSignature();
    }, [idDevice, idSignature, idEmployee, external]);


    const hasSigned = Boolean(imgUrl);

    const getBadge = () => {
        const normalizedLabel = label
            ?.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        const normalizedStatus = status?.toUpperCase();

        if (normalizedLabel === "Empleado - Entregado") {

            if (normalizedStatus === "COMPLETE") return { text: "Firmado", className: BADGE_VARIANTS.success };
            if (normalizedStatus === "PENDING") return { text: "Pendiente de firma", className: BADGE_VARIANTS.warning };
        }


        return hasSigned
            ? { text: "Firmado", className: BADGE_VARIANTS.success }
            : { text: "Pendiente", className: BADGE_VARIANTS.warning };
    };

    const badge = getBadge();

    return (
        <Col md={12}>
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
                            alt={`Firma de ${label}`}
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

                <Card.Footer>
                    <div className="text-center fw-semibold small text-break"> A fecha:</div>
                    <div>{formatDateMx(dateSigner)}</div>
                </Card.Footer>
            </Card>
        </Col >
    );
}

export default SignatureDeviceThree;
