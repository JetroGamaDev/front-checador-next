"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Col, Container, InputGroup, Overlay, Pagination, Row } from "react-bootstrap";
import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import ListView from "@/components/templates/ListView";
import { TableTemplateColumn } from "@/components/templates/TablePage";
import { IInability } from "@/lib/inhability/interface";
import { formatParse } from "@/lib/helpers";
import ModalBlur from "../ModalBlur";
import DeleteInhabilityModal from "./DeleteInhabilityModal";
import moment from "moment";
import DatePicker from "react-datepicker";
import GenericSearchInput from "../employee/GenericSearchInput";
import { useSessionSnapshot } from "@/hooks/useSessionStore";

type FeedbackState = "loading" | "success" | "error" | null;

function statusVariant(status: string | null) {
  switch ((status ?? "").toLowerCase()) {
    case "aviso_de_incapacidad":
      return (
        <span className="badge rounded-pill px-2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
          Aviso de incapacidad
        </span>
      );
    case "posesion_de_hoja":
      return (
        <span className="badge rounded-pill px-2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
          Posesión de hoja
        </span>
      );
    case "entrega_a_contabilidad":
      return (
        <span className="badge rounded-pill px-2 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
          Entrega a contabilidad
        </span>
      );
    case "alta":
      return (
        <span className="badge rounded-pill px-2 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle">
          Alta
        </span>
      );
    default:
      return (
        <span className="badge rounded-pill px2 py-2 fw-semibold bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle" />
      );
  }
}

export default function TableInabilityComponent({
  total,
  page,
  limit,
  inhabilities = [],
  search,
  dateInit,
  dateEnd
}: {
  total: number;
  page: number;
  limit: number;
  inhabilities?: IInability[];
  search?: string;
  dateInit?: string;
  dateEnd?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const searchParamsString = sp.toString();
  const session = useSessionSnapshot();
  const roles = session?.uid?.roles;

  const [showdeleteInhabilityModal, setShowDeleteInhabilityModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number | null>(null);
  const [motive, setMotive] = useState<string | null>(null);
  const [status, setStatus] = useState<boolean | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const totalPages = Math.ceil(total / limit);

  const currentSearch = sp.get("search") ?? "";
  const isClearingSelectionRef = useRef(false);
  const tableRef = useRef<{ clearSelection: () => void } | null>(null);
  const [, setTableResetKey] = useState(0);
  const [, setSelectedIdsSearch] = useState<Array<string | number>>([]);


  //Calendario
  const [dateInitValue, setDateInitValue] = useState(dateInit ?? "");
  const [dateEndValue, setDateEndValue] = useState(dateEnd ?? "");
  const [dateError, setDateError] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const dateButtonRef = useRef(null);
  const parsedStart = dateInitValue ? moment(dateInitValue, "YYYY-MM-DD").toDate() : null;
  const parsedEnd = dateEndValue ? moment(dateEndValue, "YYYY-MM-DD").toDate() : null;

  const MAX_VISIBLE = 5;

  const readInput = !roles?.isLeader
    && !roles?.isExtra
    && !roles?.isDoh
    && !roles?.isApproverLeaders
    && !roles?.isApproverDoh;

  const visiblePages = useMemo(() => {
    if (totalPages <= MAX_VISIBLE) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let start = Math.max(1, page - Math.floor(MAX_VISIBLE / 2));
    let end = start + MAX_VISIBLE - 1;

    if (end > totalPages) {
      end = totalPages;
      start = end - MAX_VISIBLE + 1;
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  useEffect(() => {
    setFeedback(null);
    setFeedbackMsg("");
  }, [searchParamsString]);


  const rangeLabel =
    parsedStart && parsedEnd
      ? `${moment(parsedStart).format("DD/MM/YYYY")} - ${moment(parsedEnd).format("DD/MM/YYYY")}`
      : "Selecciona un rango de fechas";

  const handleRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setDateInitValue(start ? moment(start).format("YYYY-MM-DD") : "");
    setDateEndValue(end ? moment(end).format("YYYY-MM-DD") : "");
    if (start && end) setShowCalendar(true);
  };

  const handleCreate = () => {
    setFeedback("loading");
    setFeedbackMsg("Cargando...");
    router.push("/app/inability/create");
  };

  const goToPage = (nextPage: number) => {
    setFeedback("loading");
    setFeedbackMsg("Cargando...");

    const params = new URLSearchParams(searchParamsString);
    params.set("id", "null");
    params.set("view_type", "list");
    params.set("page", String(nextPage));
    params.set("limit", String(limit));

    router.push(`/app/inability?${params.toString()}`);
  };

  const handleDelete = (idInhability: number, motive: string, status: boolean) => {
    setSelectedIds(idInhability);
    setMotive(motive);
    setStatus(status)
    setShowDeleteInhabilityModal(true);
  };


  const clearSelectedIds = useCallback(() => {
    isClearingSelectionRef.current = true;

    tableRef.current?.clearSelection();
    setSelectedIdsSearch([]);
    setTableResetKey((k) => k + 1);

    setTimeout(() => {
      isClearingSelectionRef.current = false;
    }, 0);
  }, []);

  const handleSearch = useCallback(
    (value: string) => {
      if (value === currentSearch) return;

      setFeedback("loading");
      setFeedbackMsg("Buscando...");

      const params = new URLSearchParams(searchParamsString);
      params.set("id", "null");
      params.set("view_type", "list");
      params.set("page", "1");
      params.set("limit", String(limit));

      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      clearSelectedIds();
      router.push(`/app/inability?${params.toString()}`);
    },
    [currentSearch, searchParamsString, limit, router, clearSelectedIds]
  );

  const handleDateFilter = useCallback(() => {
    if (!dateInitValue || !dateEndValue) {
      setDateError("Ambas fechas son requeridas");
      return;
    }
    if (dateEndValue < dateInitValue) {
      setDateError("'Hasta' debe ser posterior a 'Desde'");
      return;
    }
    setDateError("");

    if (dateInitValue === (dateInit ?? "") && dateEndValue === (dateEnd ?? "")) return;

    setFeedback("loading");
    setFeedbackMsg("Filtrando...");


    const params = new URLSearchParams(searchParamsString);
    params.set("id", "null");
    params.set("view_type", "list");
    params.set("page", "1");
    params.set("limit", String(limit));
    params.set("dateInit", dateInitValue);
    params.set("dateEnd", dateEndValue);

    clearSelectedIds();
    router.push(`/app/inability?${params.toString()}`);
  }, [dateInitValue, dateEndValue, dateInit, dateEnd, searchParamsString, limit, router, clearSelectedIds]);

  const handleClear = useCallback(() => {
    setDateInitValue("");
    setDateEndValue("");
    setDateError("");
    clearSelectedIds();

    if (!dateInit && !dateEnd) return;

    setFeedback("loading");
    setFeedbackMsg("Cargando...");

    const params = new URLSearchParams(searchParamsString);
    params.set("id", "null");
    params.set("view_type", "list");
    params.set("page", "1");
    params.set("limit", String(limit));
    params.delete("dateInit");
    params.delete("dateEnd");

    router.push(`/app/inability?${params.toString()}`);

  }, [router, searchParamsString, dateInit, dateEnd, clearSelectedIds, limit]);


  const columns: TableTemplateColumn<IInability>[] = [
    {
      key: "id",
      label: "ID",
      accessor: (r) => r.id,
      filterable: true,
      type: "string",
      render: (r) => (
        <div className="text-uppercase">
          {r.id}
        </div>
      ),
    },
    {
      key: "employee",
      label: "Empleado",
      accessor: (r) =>
        `${r.employee?.name ?? ""} ${r.employee?.lastName ?? ""}`.trim(),
      filterable: true,
      type: "string",
      render: (r) => (
        <div className="text-uppercase">
          {r.employee?.name ?? ""} {r.employee?.lastName ?? ""}
        </div>
      ),
    },
    {
      key: "disabilityCategory",
      label: "Categoría",
      accessor: (r) => r.disabilityCategory,
      filterable: true,
      type: "string",
      render: (r) => (
        <div className="text-uppercase">{r.disabilityCategory}</div>
      ),
    },
    {
      key: "typeOfDisability",
      label: "Tipo",
      accessor: (r) => r.typeOfDisability,
      filterable: true,
      type: "string",
      render: (r) => (
        <div className="text-uppercase">{r.typeOfDisability}</div>
      ),
    },
    {
      key: "whoCreate",
      label: "Creado por",
      accessor: (r) =>
        `${r.whoCreate?.name ?? ""} ${r.whoCreate?.lastName ?? ""}`.trim(),
      filterable: true,
      type: "string",
      render: (r) => (
        <div className="text-uppercase">
          {r.whoCreate?.lastName ?? ""} {r.whoCreate?.name ?? ""}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Creación",
      accessor: (r) => r.createdAt,
      filterable: true,
      type: "date",
      render: (r) => (
        <div className="text-start">
          {r.createdAt
            ? formatParse(r.createdAt)
            : ""}
        </div>
      ),
    },
    {
      key: "status",
      label: "Estatus",
      align: "center",
      accessor: (r) => r.status,
      filterable: true,
      type: "string",
      render: (r) => {
        const isDelete = r.delete?.delete === true;

        if (isDelete === true) {
          return (
            <div className="text-center">
              <span className="badge rounded-pill px3 py-2 fw-semibold bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle">
                CANCELADO
              </span>
            </div>
          );
        } else {
          return (
            <div className="text-uppercase text-center"> {statusVariant(r.status)} </div>
          )
        }
      }
    },
  ];

  return (
    <>
      <ConditionalRender cond={feedback === "loading"}>
        <Loading message={feedbackMsg || "Guardando..."} />
      </ConditionalRender>

      <Container className="py-3" style={{ maxWidth: "1600px" }}>

        <ConditionalRender cond={!readInput}>
          <Button
            variant="primary"
            className="d-inline-flex align-items-center gap-2 fw-semibold px-3"
            onClick={handleCreate}
          >
            <i className="bi bi-plus-lg" />
            Crear incapacidad
          </Button>
        </ConditionalRender>

        <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
          <div>
            <h1 className="mb-0">Incapacidades</h1>

            <span className="text-muted">
              {total} incapacidad{total !== 1 ? "es" : ""}
            </span>
          </div>
        </div>

        <Row className="justify-content-center">
          <Col xs={12} xl={12} xxl={12}>
            <Card className="rounded-4 shadow-sm border">
              <Card.Body className="p-4 p-md-5">
                <Row className="justify-content-center mb-3 g-3">
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

                  {/* FILTRO POR FECHA */}
                  <Col xs={12} md={6} lg={6}>
                    <Card className="rounded-4 border h-100">
                      <Card.Body className="p-3">
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <i className="bi bi-calendar-range text-primary" />
                          <span className="fw-semibold small">Filtrar por fechas</span>
                        </div>

                        <Button
                          ref={dateButtonRef}
                          variant="outline-secondary"
                          className={`w-100 d-flex align-items-center justify-content-between ${dateError ? "border-danger text-danger" : ""}`}
                          onClick={() => setShowCalendar((s) => !s)}
                        >
                          <span>{rangeLabel}</span>
                          <i className="bi bi-calendar3" />
                        </Button>

                        {dateError && (
                          <small className="text-danger d-block mt-1">{dateError}</small>
                        )}

                        <Overlay
                          target={dateButtonRef.current}
                          show={showCalendar}
                          placement="bottom-start"
                          rootClose
                          onHide={() => setShowCalendar(false)}
                        >
                          {({ ref, style }) => (
                            <div ref={ref} style={style} className="mt-2 shadow-lg rounded-4 overflow-hidden bg-light text-capitalize">
                              <DatePicker
                                selectsRange
                                inline
                                startDate={parsedStart}
                                endDate={parsedEnd}
                                onChange={handleRangeChange}
                                monthsShown={1}
                                locale="es"
                              />
                              <Row className="g-2 m-2">

                                <Col xs={12} md={6} lg={6}>
                                  <Button
                                    variant="primary"
                                    className="w-100"
                                    onClick={() => {
                                      handleDateFilter();
                                      setShowCalendar(false);
                                    }}
                                  >
                                    Filtrar fechas
                                  </Button>
                                </Col>

                                <Col xs={12} md={6} lg={6}>
                                  <Button
                                    variant="secondary"
                                    className="w-100"
                                    onClick={() => {
                                      handleClear();
                                      setShowCalendar(false);
                                    }}
                                  >
                                    <i className="bi bi-arrow-counterclockwise" />
                                  </Button>
                                </Col>
                              </Row>
                            </div>
                          )}
                        </Overlay>
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
                            {columns.map((column) => (
                              <th
                                key={String(column.key)}
                                className={`fw-bold ${column.align === "center" ? "text-center" : "text-left"}`}
                              >
                                {column.label}
                              </th>
                            ))}

                            <th className="fw-bold text-center">Acciones</th>
                          </tr>
                        </thead>

                        <tbody>
                          <ConditionalRender cond={inhabilities.length === 0}>
                            <tr>
                              <td colSpan={columns.length + 1} className="text-center py-5 text-muted">
                                <i
                                  className={`bi ${search || dateInit ? "bi-clipboard-x" : "bi-inbox"} d-block mb-2`}
                                  style={{ fontSize: "2.5rem" }}
                                />
                                <span className="fw-semibold">
                                  {search || dateInit
                                    ? "No se encontraron incapacidades con los filtros aplicados"
                                    : "No hay incapacidades registradas"}
                                </span>
                              </td>
                            </tr>
                          </ConditionalRender>

                          {(inhabilities ?? []).map((row) => (
                            <tr key={row.id}>
                              {columns.map((column) => (
                                <td key={String(column.key)}>
                                  {column.render
                                    ? column.render(row)
                                    : column.accessor(row)}
                                </td>
                              ))}

                              <td>
                                <div className="d-flex align-items-center justify-content-center gap-2">

                                  <a
                                    href={row.delete?.delete === true ? undefined : `/app/inability?view_type=form&id=${row.id}`}
                                    className={`btn btn-sm btn-outline-info ${row.delete?.delete === true ? "disabled" : ""}`}
                                    aria-disabled={row.delete?.delete === true}
                                    onClick={(e) => {
                                      if (row.delete?.delete === true) e.preventDefault();
                                    }}
                                  >
                                    Ver
                                  </a>

                                  <ConditionalRender cond={!readInput}>
                                    <a
                                      className={row.delete?.delete === true ? "btn btn-sm btn-outline-danger" : "btn btn-sm btn-danger"}
                                      onClick={() => handleDelete(row.id, row.delete?.reaseonDelete ?? "", row.delete?.delete ?? false)}
                                    >
                                      {row.delete?.delete === true ? "Ver motivo" : "Eliminar"}
                                    </a>
                                  </ConditionalRender>

                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-4">
                      <small className="text-muted">
                        Página {page} de {totalPages}
                      </small>

                      <ConditionalRender cond={totalPages > 1}>
                        <Pagination size="sm" className="m-0">
                          <Pagination.Prev
                            disabled={page <= 1}
                            onClick={() => goToPage(page - 1)}
                          >
                            Anterior
                          </Pagination.Prev>

                          {/* Primera página + … si la ventana no empieza en 1 */}
                          <ConditionalRender cond={visiblePages[0] > 1}>
                            <Pagination.Item onClick={() => goToPage(1)}>1</Pagination.Item>
                            <ConditionalRender cond={visiblePages[0] > 2}>
                              <Pagination.Ellipsis disabled />
                            </ConditionalRender>
                          </ConditionalRender>

                          {visiblePages.map((num) => (
                            <Pagination.Item
                              key={num}
                              active={num === page}
                              onClick={() => goToPage(num)}
                            >
                              {num}
                            </Pagination.Item>
                          ))}

                          {/* … + última página si la ventana no termina en totalPages */}
                          <ConditionalRender cond={visiblePages[visiblePages.length - 1] < totalPages}>
                            <ConditionalRender cond={visiblePages[visiblePages.length - 1] < totalPages - 1}>
                              <Pagination.Ellipsis disabled />
                            </ConditionalRender>
                            <Pagination.Item onClick={() => goToPage(totalPages)}>{totalPages}</Pagination.Item>
                          </ConditionalRender>

                          <Pagination.Next
                            disabled={page >= totalPages}
                            onClick={() => goToPage(page + 1)}
                          >
                            Siguiente
                          </Pagination.Next>
                        </Pagination>
                      </ConditionalRender>
                    </div>
                  </ListView.Body>
                </ListView>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <ConditionalRender cond={showdeleteInhabilityModal}>
          <ModalBlur onClose={() => setShowDeleteInhabilityModal(false)}>
            <DeleteInhabilityModal
              show={showdeleteInhabilityModal}
              onHide={() => { setShowDeleteInhabilityModal(false); }}
              idInhability={selectedIds}
              motive={motive}
              status={status}
            />
          </ModalBlur>
        </ConditionalRender>
      </Container >
    </>
  );
}