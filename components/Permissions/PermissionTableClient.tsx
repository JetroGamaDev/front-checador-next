"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Col, Container, InputGroup, Overlay, Pagination, Row } from "react-bootstrap";
import ListView from "../templates/ListView";
import { TableTemplateColumn } from "../templates/TableTemplate";

import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import AlertSignaturesP from "./AlertSignatures";
import { ISignatures } from "@/lib/overTime/interface";
import { useSessionSnapshot } from "@/hooks/useSessionStore";
import { formatDateMx } from "@/lib/helpers";
import { IPermissionRequest } from "@/lib/permissions/interface";
import ModalBlur from "../ModalBlur";
import DeletePermissionModal from "./DeleteModal";
import DatePicker from "react-datepicker";
import GenericSearchInput from "../employee/GenericSearchInput";
import moment from "moment";
import WithPayBadge from "./WithPayBadge";

type FeedbackState = "loading" | "success" | "error" | null;

export const leaderApproval = {
  APPROVED: "APROBADO",
  REFUSED: "RECHAZADO",
  PENDING: "PENDIENTE",
  EMPLOYEE: "EMPLEADO",
};

export default function PermissionsTableClient({
  permissions,
  total,
  page,
  search,
  limit,
  dateInit,
  dateEnd,
}: {
  id: string;
  permissions: IPermissionRequest[];
  total: number;
  page: number;
  limit: number;
  search?: string;
  dateInit?: string;
  dateEnd?: string;
}) {
  const session = useSessionSnapshot();
  const router = useRouter();
  const sp = useSearchParams();
  const searchParamsString = sp.toString();
  const currentSearch = sp.get("search") ?? "";
  const isClearingSelectionRef = useRef(false);
  const tableRef = useRef<{ clearSelection: () => void } | null>(null);
  const [, setTableResetKey] = useState(0);
  const [, setSelectedIdsSearch] = useState<Array<string | number>>([]);

  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [hideSignatures, setHideSignatures] = useState(false);
  const idEmployee = Number(session?.uid?.idEmployee);
  const [showdeletePermissionModal, setShowDeletePermissionModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number | null>(null);
  const [motive, setMotive] = useState<string | null>(null);
  const [status, setStatus] = useState<boolean | null>(null);
  const totalPages = Math.ceil(total / limit);
  const MAX_VISIBLE = 5;

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
  //Calendario
  const [dateInitValue, setDateInitValue] = useState(dateInit ?? "");
  const [dateEndValue, setDateEndValue] = useState(dateEnd ?? "");
  const [dateError, setDateError] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const dateButtonRef = useRef(null);
  const parsedStart = dateInitValue ? moment(dateInitValue, "YYYY-MM-DD").toDate() : null;
  const parsedEnd = dateEndValue ? moment(dateEndValue, "YYYY-MM-DD").toDate() : null;

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


  const pendingPermissions = useMemo(() => {
    return (permissions ?? []).filter((o: IPermissionRequest) => {
      const signatures: ISignatures[] = o.signatures ?? [];
      const mySignature = signatures.find((i: ISignatures) => Number(i.idSignatory) === idEmployee && o.delete?.delete !== true);
      if (!mySignature) return false;
      return mySignature.url === '';
    });
  }, [permissions, idEmployee]);

  const hasPendingSignature = pendingPermissions.length > 0;

  useEffect(() => {
    setHideSignatures(hasPendingSignature);
  }, [hasPendingSignature]);

  useEffect(() => {
    setFeedback(null);
    setFeedbackMsg('');

  }, [searchParamsString]);

  const goToPage = (nextPage: number) => {
    setFeedback("loading");
    setFeedbackMsg('Cargando...');
    const params = new URLSearchParams(searchParamsString);
    params.set("view_type", "list");
    params.set("id", "null");
    params.set("page", String(nextPage));
    params.set("limit", String(limit));
    router.push(`/app/permissions?${params.toString()}`);
  };

  const handleDelete = (idPermission: number, motive: string, status: boolean) => {
    setSelectedIds(idPermission);
    setMotive(motive);
    setStatus(status)
    setShowDeletePermissionModal(true);
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
      router.push(`/app/permissions?${params.toString()}`);
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
    router.push(`/app/permissions?${params.toString()}`);
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

    router.push(`/app/permissions?${params.toString()}`);
  }, [router, searchParamsString, dateInit, dateEnd, clearSelectedIds, limit]);

  const columns: TableTemplateColumn<IPermissionRequest>[] = [
    {
      key: "id",
      label: "ID",
      accessor: (e) => e.id,
      filterable: true,
      type: "string",
      render: (e) => (
        <div className="text-uppercase">
          {`${e.id}` || "-"}
        </div>
      )
    },
    {
      key: "employeeName",
      label: "Nombre",
      accessor: (row) => `${row.employee.lastName} ${row.employee.name}`,
      filterable: true,
      type: "string",
      render: (row) => (
        <div className="text-uppercase">
          {row.employee ? `${row.employee.lastName} ${row.employee.name}` : "—"}
        </div>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      accessor: (row) => row.type,
    },
    {
      key: "motive",
      label: "Motivo",
      accessor: (row) => row.motive,
      filterable: true,
      type: "string",
      render: (row) => <div className="text-uppercase">{row.motive}</div>,
    },
    {
      key: "createdAt",
      label: "Fecha de creación",
      accessor: (row) => row.createdAt,
      filterable: true,
      render: (row) => (
        <div className="text-start">
          {row.createdAt
            ? formatDateMx(row.createdAt)
            : "No Definido"}
        </div>
      ),
    },
    {
      key: "signatures",
      label: "Firmado",
      accessor: (row) => row.signatures,
      filterable: true,
      render: (row) => {
        const mySignature = (row.signatures ?? []).find(
          (s) => Number(s.idSignatory) === idEmployee
        );
        const cancelado = row.delete?.delete === true;


        if (!mySignature) {
          return (
            <>
              <span className="text-muted">Este permiso no corresponde a este perfil</span>
            </>
          );
        } else if (cancelado === true) {
          return (
            <>
              <i className="bi bi-slash-circle ms-4" />
            </>
          )
        } else {
          return mySignature.url === "" ? (
            <i className="bi bi-x-lg text-danger ms-4" title="Pendiente de tu firma" />
          ) : (
            <i className="bi bi-check-lg text-success ms-4" title="Firmado" />
          );
        }
      },
    },
    {
      key: "leaderApproval",
      label: "Estatus",
      align: "center",
      accessor: (row) => leaderApproval[row.status],
      render: (e) => {
        const estado = e.status
        const cancelado = e.delete?.delete === true;

        if (cancelado === true) {
          return (
            <div className="text-center">
              <span className="badge rounded-pill px3 py-2 fw-semibold bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle">
                CANCELADO
              </span>
            </div>
          );
        } else {
          switch (estado) {
            case "APPROVED":
              return (
                <div className="text-center">
                  <span className="badge rounded-pill px3 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle">
                    APROBADO
                  </span>
                </div>
              );
            case "PENDING":
              return (
                <div className="text-center">
                  <span className="badge rounded-pill px3 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    PENDIENTE
                  </span>
                </div>
              );
            case "REFUSED":
              return (
                <div className="text-center">
                  <span className="badge rounded-pill px3 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                    RECHAZADO
                  </span>
                </div>
              );
          }
        }
      },
    },
    {
      key: "withPay",
      label: "Goce de sueldo",
      align: "center",
      accessor: (row) => (row.withPay === true ? "Con goce" : row.withPay === false ? "Sin goce" : ""),
      render: (row) => (
        <div className="text-center">
          {row.delete?.delete === true ? null : <WithPayBadge withPay={row.withPay} />}
        </div>
      ),
    },
  ];

  const handleCreate = () => {
    setFeedback("loading");
    setFeedbackMsg('Cargando...');
    router.push("/app/permissions/create");
  };

  return (
    <>
      <ConditionalRender cond={hideSignatures}>
        <AlertSignaturesP
          onClose={() => setHideSignatures(false)}
          pendingIds={pendingPermissions.map((o) => o.id)}
        />
      </ConditionalRender>

      <ConditionalRender cond={feedback === "loading"}>
        <Loading message={feedbackMsg || "Guardando..."} />
      </ConditionalRender>


      <Container className="py-3" style={{ maxWidth: "1600px" }}>
        <Button
          variant="primary"
          className="d-inline-flex align-items-center gap-2 fw-semibold px-3"
          onClick={handleCreate}
        >
          <i className="bi bi-plus-lg" />
          Crear permiso
        </Button>

        <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
          <div>
            <h1 className="mb-0">Permisos</h1>

            <span className="text-muted">
              {total} permiso{total !== 1 ? "s" : ""}
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

                          <ConditionalRender cond={permissions.length === 0}>
                            <tr>
                              <td colSpan={columns.length + 1} className="text-center py-5 text-muted">
                                <i
                                  className={`bi ${search || dateInit ? "bi-clipboard-x" : "bi-inbox"} d-block mb-2`}
                                  style={{ fontSize: "2.5rem" }}
                                />
                                <span className="fw-semibold">
                                  {search || dateInit
                                    ? "No se encontraron permisos con los filtros aplicados"
                                    : "No hay permisos registrados"}
                                </span>
                              </td>
                            </tr>
                          </ConditionalRender>

                          {(permissions ?? []).map((row) => (
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
                                    href={row.delete?.delete === true ? undefined : `/app/permissions?view_type=form&id=${row.id}`}
                                    className={`btn btn-sm btn-outline-info ${row.delete?.delete === true ? "disabled" : ""}`}
                                    aria-disabled={row.delete?.delete === true}
                                    onClick={(e) => {
                                      if (row.delete?.delete === true) e.preventDefault();
                                    }}
                                  >
                                    Ver
                                  </a>

                                  <a
                                    className={row.delete?.delete === true ? "btn btn-sm btn-outline-danger" : "btn btn-sm btn-danger"}
                                    onClick={() => handleDelete(row.id, row.delete?.reaseonDelete ?? "", row.delete?.delete ?? false)}
                                  >
                                    {row.delete?.delete === true ? "Ver motivo" : "Eliminar"}
                                  </a>
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
        </Row >

        <ConditionalRender cond={showdeletePermissionModal}>
          <ModalBlur onClose={() => setShowDeletePermissionModal(false)}>
            <DeletePermissionModal
              show={showdeletePermissionModal}
              onHide={() => { setShowDeletePermissionModal(false); }}
              idPermission={selectedIds}
              motive={motive}
              status={status}
            />
          </ModalBlur>
        </ConditionalRender>
      </Container >
    </>
  );
}
