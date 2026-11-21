"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Card, Form, InputGroup } from "react-bootstrap";
import { fetchEmployees } from "@/app/actions/employee-actions";
import { updateChecadorEmployees } from "@/app/actions/checadores-actions";
import { IChecador, IChecadorEmployee } from "@/lib/checadores/interface";
import { useModals } from "@/context/ModalContext";
import ModalBlur from "../ModalBlur";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import ErrorOverlay from "../ErrorOverlay";
import GenericSearchInput from "../employee/GenericSearchInput";

type FeedbackState = "loading" | "error" | null;

function fullName(e: { name?: string | null; lastName?: string | null }) {
    return `${e.lastName ?? ""} ${e.name ?? ""}`.trim() || "—";
}

// Empleados que pueden usar este checador desde su perfil (modo checador).
// Guardar reemplaza la lista completa; sin nadie seleccionado se guarda [].
export default function ChecadorEmployeesModal({
    checador,
    onHide,
    onSaved,
}: {
    checador: IChecador;
    onHide: () => void;
    onSaved: (message: string, employees: IChecadorEmployee[]) => void;
}) {
    const { modalConfirm } = useModals();
    const [selected, setSelected] = useState<IChecadorEmployee[]>(checador.employees ?? []);
    const [results, setResults] = useState<IChecadorEmployee[]>([]);
    const [searched, setSearched] = useState(false);
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [feedbackMsg, setFeedbackMsg] = useState("");

    const selectedIds = useMemo(() => new Set(selected.map((e) => e.id)), [selected]);
    const checadorName = `${checador.name ?? ""} ${checador.lastName ?? ""}`.trim();

    // Solo empleados activos (status 1) del listado de empleados que ya existe
    const handleSearch = useCallback(async (value: string) => {
        setFeedback("loading");
        setFeedbackMsg("Buscando empleados...");
        try {
            const res = await fetchEmployees({ page: 1, limit: 20, status: "1", search: value });
            setResults(
                (res.data ?? [])
                    .filter((e) => !!e.id)
                    .map((e) => ({ id: Number(e.id), idCheck: e.idCheck ?? null, name: e.name, lastName: e.lastName }))
            );
            setSearched(true);
            setFeedback(null);
        } catch {
            setFeedbackMsg("No se pudo consultar los empleados");
            setFeedback("error");
        }
    }, []);

    const toggle = (employee: IChecadorEmployee) => {
        setSelected((prev) => prev.some((e) => e.id === employee.id)
            ? prev.filter((e) => e.id !== employee.id)
            : [...prev, employee]);
    };

    const handleSave = () => {
        modalConfirm(`¿Seguro que quieres guardar los empleados de ${checadorName || "este checador"}?`, async () => {
            try {
                setFeedback("loading");
                setFeedbackMsg("Guardando empleados...");

                const res = await updateChecadorEmployees(checador.id, selected.map((e) => e.id));

                if (!res.success) {
                    // Los que el back marcó como inexistentes o inactivos se quitan de la selección
                    if (res.invalid?.length) {
                        const invalid = new Set(res.invalid);
                        setSelected((prev) => prev.filter((e) => !invalid.has(e.id)));
                    }
                    setFeedbackMsg(res.message || "No se pudieron guardar los empleados");
                    setFeedback("error");
                    return;
                }

                setFeedback(null);
                onSaved(res.message || "Empleados actualizados", res.data?.employees ?? selected);
            } catch {
                setFeedbackMsg("Error inesperado, intenta de nuevo");
                setFeedback("error");
            }
        });
    };

    return (
        <>
            <ModalBlur onClose={onHide} locked={feedback === "loading"}>
                <Card className="border rounded-4 shadow" style={{ width: "min(640px, calc(100vw - 32px))" }}>
                    <Card.Body className="p-3 p-md-4">
                        <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                            <div style={{ minWidth: 0 }}>
                                <h5 className="mb-1 fw-bold">Empleados del checador</h5>
                                <div className="text-muted small text-uppercase text-break">{checadorName || "—"}</div>
                            </div>
                            <span className="badge rounded-pill px-3 py-2 fw-semibold bg-primary-subtle text-primary-emphasis border border-primary-subtle flex-shrink-0">
                                {selected.length} seleccionado{selected.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        <p className="text-muted small mb-3">
                            Estos empleados podrán checar con este checador desde su perfil (modo checador).
                        </p>

                        {/* Seleccionados */}
                        <div className="d-flex flex-wrap gap-2 mb-3">
                            <ConditionalRender cond={selected.length === 0}>
                                <span className="text-muted small">
                                    <i className="bi bi-people me-1" />
                                    Sin empleados asignados
                                </span>
                            </ConditionalRender>
                            {selected.map((e) => (
                                <span
                                    key={e.id}
                                    className="badge rounded-pill px-3 py-2 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle d-inline-flex align-items-center gap-2 text-uppercase text-wrap text-start"
                                >
                                    {e.idCheck != null ? `${e.idCheck} · ` : ""}{fullName(e)}
                                    <button
                                        type="button"
                                        className="btn btn-link p-0 text-info-emphasis lh-1"
                                        aria-label={`Quitar a ${fullName(e)}`}
                                        onClick={() => toggle(e)}
                                    >
                                        <i className="bi bi-x-lg" />
                                    </button>
                                </span>
                            ))}
                        </div>

                        {/* Buscador */}
                        <InputGroup className="mb-2">
                            <InputGroup.Text>
                                <i className="bi bi-search" />
                            </InputGroup.Text>
                            <GenericSearchInput onSearch={handleSearch} placeholder="Buscar empleado activo por nombre o número" />
                        </InputGroup>

                        <div className="border rounded-3 overflow-auto" style={{ maxHeight: 280 }}>
                            <ConditionalRender cond={searched && results.length === 0}>
                                <div className="text-center text-muted py-4 small">
                                    <i className="bi bi-person-x d-block mb-1" style={{ fontSize: "1.5rem" }} />
                                    No se encontraron empleados activos
                                </div>
                            </ConditionalRender>
                            {results.map((e) => (
                                <label
                                    key={e.id}
                                    className="d-flex align-items-center gap-2 px-3 py-2 border-bottom"
                                    style={{ cursor: "pointer" }}
                                >
                                    <Form.Check
                                        type="checkbox"
                                        id={`checador-employee-${e.id}`}
                                        checked={selectedIds.has(e.id)}
                                        onChange={() => toggle(e)}
                                    />
                                    <span className="text-uppercase small text-break">
                                        <span className="fw-semibold">{e.idCheck ?? "—"}</span> · {fullName(e)}
                                    </span>
                                </label>
                            ))}
                        </div>

                        <div className="d-flex justify-content-end gap-2 mt-3">
                            <Button variant="secondary" onClick={onHide} disabled={feedback === "loading"}>
                                Cancelar
                            </Button>
                            <Button variant="success" onClick={handleSave} disabled={feedback === "loading"}>
                                <i className="bi bi-check-lg" />
                                <span className="d-none d-md-inline ms-2">Guardar</span>
                            </Button>
                        </div>
                    </Card.Body>
                </Card>
            </ModalBlur>

            {/* Overlays después del ModalBlur para que queden encima */}
            <ConditionalRender cond={feedback === "loading"}>
                <Loading message={feedbackMsg} />
            </ConditionalRender>
            <ConditionalRender cond={feedback === "error"}>
                <ErrorOverlay message={feedbackMsg} onDone={() => setFeedback(null)} />
            </ConditionalRender>
        </>
    );
}
