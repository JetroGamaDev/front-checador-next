"use client"

import { IBonusKeys, IUpdateBonusKeys } from "@/lib/Bonus/interface";
import { TableTemplateColumn } from "../templates/TableTemplate";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Container, Form, InputGroup, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import ListView from "../templates/ListView";
import ModalBlur from "../ModalBlur";
import CreateBonuskeysModal from "./CreateBonuskeysModal";
import { Employee } from "@/lib/definitions";
import UpdateBonuskeysModal from "./UpdateBonuskeysModal";
import { useModals } from "@/context/ModalContext";
import { deleteBonusKeys, downloadDocBonusKeys } from "@/app/actions/bonusKeys-actions";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";
import GenericSearchInput from "../employee/GenericSearchInput";
import { useRouter, useSearchParams } from "next/navigation";
import { es } from "date-fns/locale";
import { registerLocale } from "react-datepicker";

registerLocale("es", es);

type FeedbackState = "loading" | "success" | "error" | null;

export default function TableBonusKeys({
    bonuskeys,
    employees,
    search,
    total
}: {
    bonuskeys: IBonusKeys[] | undefined;
    employees: Employee[];
    search?: string;
    total?: number;
}) {

    //CONST
    const [feedbackMsg, setFeedbackMsg] = useState("");
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const { modalConfirm } = useModals();


    const sp = useSearchParams();
    const searchParamsString = sp.toString();
    const currentSearch = sp.get("search") ?? "";
    // Bonos marcados para el Excel, por id. Se conservan al filtrar (la búsqueda solo cambia los renglones visibles)
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const router = useRouter();


    const [showModalCreate, setShowModalCreate] = useState(false);
    const [showModalUpdate, setShowModalUpdate] = useState(false);
    const [idRegister, setIdRegister] = useState<number | null>(null);
    const [employeeName, setEmployeeName] = useState<string | null>(null);
    const [employeeLastName, setEmployeeLastName] = useState<string | null>(null);
    const [selectedBonus, setSelectedBonus] = useState<IUpdateBonusKeys | null>(null);


    useEffect(() => {
        setFeedback(null);
        setFeedbackMsg("");
    }, [searchParamsString]);

    const handleUpdate = (idRegister: number, employeeName: string, employeeLastName: string, row: IUpdateBonusKeys) => {
        setSelectedBonus(row);
        setIdRegister(idRegister);
        setEmployeeName(employeeName);
        setEmployeeLastName(employeeLastName);
        setShowModalUpdate(true)
    }

    const handleDelete = (idRegister: number) => {
        modalConfirm("¿Seguro que quieres eliminar el registro?", async () => {
            try {
                setFeedback("loading");
                setFeedbackMsg("Eliminando bono...");

                const res = await deleteBonusKeys({
                    idBonusKeys: String(idRegister),
                });

                if (!res.success) {
                    setFeedbackMsg(res.message || "No se pudo eliminar");
                    setFeedback("error");
                    return;
                }

                setSelectedIds((prev) => prev.filter((id) => id !== idRegister));
                setFeedbackMsg(res.message || "Eliminado correctamente");
                setFeedback("success");

            } catch (error) {
                console.log(error);
                
                setFeedbackMsg("Error inesperado, intenta de nuevo");
                setFeedback("error");
            }
        });
    }

    // ---------- Selección ----------
    const visibleIds = useMemo(
        () => (bonuskeys ?? []).map((b) => Number(b.id)).filter((id) => Number.isInteger(id) && id > 0),
        [bonuskeys]
    );
    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const visibleSelected = visibleIds.filter((id) => selectedSet.has(id)).length;
    const allVisibleSelected = visibleIds.length > 0 && visibleSelected === visibleIds.length;
    const someVisibleSelected = visibleSelected > 0 && !allVisibleSelected;

    const toggleOne = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    // "Seleccionar todos" solo afecta a los renglones visibles; lo marcado en otras búsquedas se respeta
    const toggleAllVisible = () => {
        setSelectedIds((prev) => {
            if (allVisibleSelected) return prev.filter((id) => !visibleIds.includes(id));
            const next = new Set(prev);
            visibleIds.forEach((id) => next.add(id));
            return Array.from(next);
        });
    };

    const handleSearch = useCallback(
        (value: string) => {
            if (value === currentSearch) return;

            setFeedback("loading");
            setFeedbackMsg("Buscando...");

            const params = new URLSearchParams(searchParamsString);
            params.set("id", "null");
            params.set("view_type", "list");

            if (value) {
                params.set("search", value);
            } else {
                params.delete("search");
            }
            router.push(`/app/bonuskeys?${params.toString()}`);
        },
        [currentSearch, searchParamsString, router]
    );

    const columns: TableTemplateColumn<IBonusKeys>[] = [
        {
            // Se muestra el número de empleado (idCheck); la selección para el Excel sigue siendo por id del bono
            key: "idCheck",
            label: "ID empleado",
            accessor: (r) => r.employee?.idCheck ?? "",
            filterable: true,
            type: "string",
            render: (r) => (
                <div className="text-uppercase">
                    {r.employee?.idCheck ?? "—"}
                </div>
            ),
        },
        {
            key: "employee",
            label: "Empleado beneficiado",
            accessor: (r) => r.employee,
            filterable: true,
            type: "string",
            render: (r) => (
                <div className="text-uppercase">
                    {r.employee?.lastName} {r.employee?.name}
                </div>
            ),
        },
        {
            key: "department",
            label: "Departamento",
            accessor: (r) => r.department,
            filterable: true,
            type: "string",
            render: (r) => (
                <div className="text-uppercase">
                    {r.department?.nameDepartment}
                </div>
            ),
        },
        {
            key: "location",
            label: "Locación",
            accessor: (r) => r.location,
            filterable: true,
            type: "string",
            render: (r) => (
                <div className="text-uppercase">
                    {r.location}
                </div>
            ),
        },
        {
            key: "amount",
            label: "Cantidad del bono",
            accessor: (r) => r.amount,
            filterable: true,
            type: "string",
            render: (r) => (
                <div className="text-uppercase">
                    $ {r.amount}
                </div>
            ),
        },

    ];

    //Descargar DOCUMENTO (solo los bonos seleccionados)
    const handleDownloadDocument = () => {
        if (selectedIds.length === 0) return;
        const ids = [...selectedIds];
        const question = ids.length === 1
            ? "¿Seguro que quieres descargar el bono seleccionado?"
            : `¿Seguro que quieres descargar los ${ids.length} bonos seleccionados?`;

        modalConfirm(question, async () => {
            try {
                setFeedback("loading");
                setFeedbackMsg("Generando documento...");

                const res = await downloadDocBonusKeys(ids);

                if (!res.success || !res.data) {
                    setFeedbackMsg(res.message || "Error al obtener el documento");
                    setFeedback("error");
                    // Pudieron eliminarse bonos desde otra sesión (404): se refresca la tabla
                    router.refresh();
                    return;
                }

                const link = document.createElement("a");
                link.href = res.data.base64Url;
                link.download = "bono-llaves.xlsx";
                document.body.appendChild(link);
                link.click();
                link.remove();
                setFeedback(null);
            } catch (error) {
                console.log(error);

                setFeedbackMsg("Error inesperado, intenta de nuevo");
                setFeedback("error");
            }
        });
    };

    return (
        <>
            <ConditionalRender cond={feedback === "loading"}>
                <Loading message={feedbackMsg} />
            </ConditionalRender>

            <ConditionalRender cond={feedback === "success"}>
                <SuccessOverlay
                    message={feedbackMsg}
                    onDone={() =>
                        setFeedback(null)
                    }
                />
            </ConditionalRender>

            <ConditionalRender cond={feedback === "error"}>
                <ErrorOverlay
                    message={feedbackMsg}
                    onDone={() => setFeedback(null)}
                />
            </ConditionalRender>

            <Container className="py-3" style={{ maxWidth: "1600px" }}>

            <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2">
                <Button
                    variant="primary"
                    className="d-inline-flex align-items-center justify-content-center gap-2 fw-semibold px-3"
                    onClick={() => setShowModalCreate(true)}
                >
                    <i className="bi bi-plus-lg" />
                    Crear bono
                </Button>

                {/* Un botón deshabilitado no recibe el mouse: el tooltip va en el contenedor */}
                <OverlayTrigger
                    placement="bottom"
                    show={selectedIds.length === 0 ? undefined : false}
                    overlay={<Tooltip id="bonus-download-tooltip">Selecciona al menos un bono</Tooltip>}
                >
                    <span className="d-inline-flex">
                        <Button
                            variant="dark"
                            className="d-inline-flex align-items-center justify-content-center gap-2 fw-semibold px-3 w-100"
                            onClick={handleDownloadDocument}
                            disabled={selectedIds.length === 0 || feedback === "loading"}
                            style={selectedIds.length === 0 ? { pointerEvents: "none" } : undefined}
                        >
                            <i className="bi bi-file-earmark-excel" />
                            Descargar documento
                        </Button>
                    </span>
                </OverlayTrigger>

                <ConditionalRender cond={selectedIds.length > 0}>
                    <span className="d-inline-flex align-items-center gap-2 small text-muted">
                        <span className="fw-semibold">
                            {selectedIds.length} seleccionado{selectedIds.length !== 1 ? "s" : ""}
                        </span>
                        <Button variant="link" size="sm" className="p-0" onClick={() => setSelectedIds([])}>
                            Limpiar
                        </Button>
                    </span>
                </ConditionalRender>
            </div>

                <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
                    <div>
                        <h1 className="mb-0">Bonos de llaves</h1>

                        <span className="text-muted">
                            {total} bono{total !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                <Row className="justify-content-center">
                    <Col xs={12} xl={12} xxl={12}>
                        <Card className="rounded-4 shadow-sm border">
                            <Card.Body className="p-4 p-md-5">

                                <Row className="justify-content-left mb-3 g-3">
                                    {/* FILTRO POR EMPLEADO */}
                                    <Col xs={12} md={6} lg={6}>
                                        <Card className="border rounded-4 h-100">
                                            <Card.Body className="p-3">
                                                <div className="d-flex align-items-center gap-2 mb-3">
                                                    <i className="bi bi-person text-primary" />
                                                    <span className="fw-semibold small">Filtrar por empleado</span>
                                                </div>

                                                <InputGroup>
                                                    <InputGroup.Text
                                                        className="bg-gray"
                                                        style={{ color: "#6c757d" }}
                                                    >
                                                        <i className="bi bi-search" />
                                                    </InputGroup.Text>
                                                    <GenericSearchInput
                                                        initialValue={search}
                                                        onSearch={handleSearch}
                                                        placeholder="Buscar por nombre o apellido..."
                                                    />
                                                </InputGroup>
                                            </Card.Body>
                                        </Card>
                                    </Col>

                                </Row>

                                <ListView>
                                    <ListView.Body>
                                        <div className="table-responsive rounded-3 border overflow-auto">
                                            <table className="table table-hover align-middle mb-0">
                                                <thead className="table-dark border-secondary">
                                                    <tr>
                                                        <th className="text-center" style={{ width: 48 }}>
                                                            <Form.Check
                                                                type="checkbox"
                                                                id="bonus-select-all"
                                                                aria-label="Seleccionar todos los bonos visibles"
                                                                checked={allVisibleSelected}
                                                                disabled={visibleIds.length === 0}
                                                                ref={(el: HTMLInputElement | null) => {
                                                                    if (el) el.indeterminate = someVisibleSelected;
                                                                }}
                                                                onChange={toggleAllVisible}
                                                            />
                                                        </th>
                                                        {columns.map((column) => (
                                                            <th
                                                                key={String(column.key)}
                                                                className="fw-bold text-left"
                                                            >
                                                                {column.label}
                                                            </th>
                                                        ))}

                                                        <th className="fw-bold text-center">Acciones</th>
                                                    </tr>
                                                </thead>

                                                <tbody>

                                                    <ConditionalRender cond={bonuskeys?.length === 0}>
                                                        <tr>
                                                            <td colSpan={columns.length + 2} className="text-center py-5 text-muted">
                                                                <i
                                                                    className={`bi ${search ? "bi-clipboard-x" : "bi-inbox"} d-block mb-2`}
                                                                    style={{ fontSize: "2.5rem" }}
                                                                />
                                                                <span className="fw-semibold">
                                                                    {search
                                                                        ? "No se encontró ningún bono con los filtros aplicados"
                                                                        : "No hay bonos registrados"}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    </ConditionalRender>

                                                    {(bonuskeys ?? []).map((row) => (
                                                        <tr key={row.id} className={selectedSet.has(Number(row.id)) ? "table-active" : undefined}>
                                                            <td className="text-center">
                                                                <Form.Check
                                                                    type="checkbox"
                                                                    id={`bonus-select-${row.id}`}
                                                                    aria-label={`Seleccionar bono ${row.id}`}
                                                                    checked={selectedSet.has(Number(row.id))}
                                                                    onChange={() => toggleOne(Number(row.id))}
                                                                />
                                                            </td>
                                                            {columns.map((column) => (
                                                                <td key={String(column.key)}>
                                                                    {column.render
                                                                        ? column.render(row)
                                                                        : column.accessor(row)}
                                                                </td>
                                                            ))}

                                                            <td className="align-middle">
                                                                <div className="d-flex justify-content-center align-items-center gap-2">


                                                                    <Button
                                                                        variant="outline-info"
                                                                        className="btn-sm"
                                                                        onClick={() => handleUpdate(Number(row.id), String(row.employee?.name), String(row.employee?.lastName), row)}
                                                                    >
                                                                        Actualizar
                                                                    </Button>

                                                                    <Button
                                                                        variant="danger"
                                                                        className="btn-sm"
                                                                        onClick={() => handleDelete(Number(row.id))}
                                                                    >
                                                                        Eliminar
                                                                    </Button>



                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </ListView.Body>
                                </ListView>

                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <ConditionalRender cond={showModalCreate}>
                    <ModalBlur onClose={() => setShowModalCreate(false)}>
                        <CreateBonuskeysModal
                            show={showModalCreate}
                            onHide={() =>
                                setShowModalCreate(false)
                            }
                            employees={employees}
                        />
                    </ModalBlur>
                </ConditionalRender>

                <ConditionalRender cond={showModalUpdate}>
                    <ModalBlur onClose={() => setShowModalUpdate(false)}>
                        <UpdateBonuskeysModal
                            show={showModalUpdate}
                            onHide={() =>
                                setShowModalUpdate(false)
                            }
                            idRegister={idRegister}
                            employeeName={employeeName}
                            employeeLastName={employeeLastName}
                            Register={selectedBonus!}

                        />
                    </ModalBlur>
                </ConditionalRender>
            </Container>
        </>
    )
}