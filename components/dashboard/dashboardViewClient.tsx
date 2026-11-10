"use client"

import { Card, Col, Container, Row } from "react-bootstrap"
// import GraphicOne from "../graphics/graphic_1"
// import GraphicTwo from "../graphics/graphic_2"
// import GraphicThree from "../graphics/graphic_3" // Reemplazada por la gráfica de exceso de comida con datos reales
// import GraphicFour from "../graphics/graphic_4" // Reemplazada por la gráfica de incidencias por trimestre con datos reales
import LunchExcessChart from "../graphics/LunchExcessChart"
import IncidencesByQuarterChart from "../graphics/IncidencesByQuarterChart"
import ConditionalRender from "../ConditionalRender"
import Loading from "../LoadingSpinner"
import { useState } from "react"
import CardsFiles, { StatCardData } from "./filesView"
import { ICurrentPeriod } from "@/lib/definitions"


export default function DashboardViewClient({
    periods,
    periodoActual,
}: {
    periods: ICurrentPeriod[];
    periodoActual: ICurrentPeriod | null;
}) {

    const [loading] = useState(false);
    const [messageLoading] = useState('Cargando datos...');


    const baseItems: StatCardData[] = [
        { idCard: 1, value: "Asistencia Y Puntualidad Perfecta", icon: "cash-coin", view: "permissions" },
        { idCard: 2, value: "Prima anual", icon: "award", accent: "pink" },
        { idCard: 3, value: "Ingresos y salidas", icon: "arrow-left-right", accent: "orange" },
        { idCard: 4, value: "Vales", icon: "ticket-perforated", accent: "purple" },
        { idCard: 5, value: "Excedentes de comida", icon: "fork-knife", accent: "success", label: "Empleados que se pasaron de su tiempo de comida: resumen por empleado y detalle por día." },
    ];

    return (
        <>

            <ConditionalRender cond={loading}>
                <Loading message={messageLoading} />
            </ConditionalRender>

            <Container fluid className="py-3 px-4">
                <div className="mb-4">
                    <h1 className="mb-1 ms-1">Administración</h1>
                    <p className="text-muted mb-0 ms-1">
                        Panel de indicadores y estadísticas del sistema.
                    </p>
                </div>

                <Card
                    className="border shadow-sm rounded-4"
                    style={{ minHeight: "calc(100vh - 220px)" }}
                >
                    <Card.Body className="p-3">
                        <Row className="g-2">
                            <Col xs={12} md={12} className="h-50">
                                <div className="border rounded-3" style={{ height: "auto" }}>
                                    {/* <GraphicOne /> */}
                                    <CardsFiles
                                        items={baseItems}
                                        periods={periods}
                                        periodoActual={periodoActual}
                                    />
                                </div>
                            </Col>

                            {/* <Col xs={12} md={6} className="h-50">
                                <div className="border rounded-3" style={{ height: "350px" }}>
                                    <GraphicTwo />
                                </div>
                            </Col> */}

                            {/* Reemplazadas por las gráficas con datos reales (LunchExcessChart e IncidencesByQuarterChart)
                            <Col xs={12} md={6} className="h-50">
                                <div className="border rounded-3" style={{ height: "350px" }}>
                                    <GraphicThree />
                                </div>
                            </Col>

                            <Col xs={12} md={6} className="h-50">
                                <div className="border rounded-3" style={{ height: "350px" }}>
                                    <GraphicFour />
                                </div>
                            </Col>
                            */}

                            <LunchExcessChart />

                            <IncidencesByQuarterChart />
                        </Row>
                    </Card.Body>
                </Card>
            </Container>
        </>
    )
}