"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Branch, Department, Employee, Position } from "@/lib/definitions";
import ListView from "../templates/ListView";
import { TableTemplateColumn } from "../templates/TablePage";
import { Button, Card, Col, Container, Dropdown, InputGroup, OverlayTrigger, Pagination, Row, Tooltip } from "react-bootstrap";
import ConditionalRender from "../ConditionalRender";
import Loading from "../LoadingSpinner";
import GenericSearchInput from "./GenericSearchInput";
import SuccessOverlay from "../SuccessOverlay";
import ErrorOverlay from "../ErrorOverlay";

type FeedbackState = "loading" | "success" | "error" | null;

const employeeStatus = {
  1: "activo",
  2: "baja",
};

export default function EmployeeTableClient({
  total,
  page,
  limit,
  employees = [],
  search = "",
  branches = [],
  departments = [],
}: {
  total: number;
  page: number;
  limit: number;
  employees?: Employee[];
  search?: string;
  departments?: Department[];
  branches?: Branch[];
  idDepartment?: string;
  idPosition?: string;
  branch?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const searchParamsString = sp.toString();
  const currentSearch = sp.get("search") ?? "";

  const tableRef = useRef<{ clearSelection: () => void } | null>(null);
  const [, setTableResetKey] = useState(0);
  const isClearingSelectionRef = useRef(false);
  const [, setSelectedIds] = useState<Array<string | number>>([]);
  const currentBranch = sp.get("branch") ?? "";
  const currentIdDepartment = sp.get("idDepartment") ?? "";
  const currentPosition = sp.get("idPosition") ?? "";
  const [positions, setPositions] = useState<Array<Position>>([]);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);

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


  useEffect(() => {
    setFeedback(null);
    setFeedbackMsg("");
  }, [searchParamsString]);

  const handleCreate = () => {
    setFeedback("loading");
    setFeedbackMsg("Cargando...");
    router.push("/app/employee/create");
  };

  const clearSelectedIds = useCallback(() => {
    isClearingSelectionRef.current = true;

    tableRef.current?.clearSelection();
    setSelectedIds([]);
    setTableResetKey((k) => k + 1);

    setTimeout(() => {
      isClearingSelectionRef.current = false;
    }, 0);
  }, []);

  const goToPage = (nextPage: number) => {
    setFeedback("loading");
    setFeedbackMsg("Cargando...");
    const params = new URLSearchParams(searchParamsString);
    params.set("id", "null");
    params.set("view_type", "list");
    params.set("page", String(nextPage));
    params.set("limit", String(limit));

    if (search?.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }

    router.push(`/app/employee?${params.toString()}`);
  };

  // const handleSelectionChange = (ids: Array<string | number>) => {
  //   if (isClearingSelectionRef.current) return;
  //   setSelectedIds(ids);
  // };

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
      router.push(`/app/employee?${params.toString()}`);
    },
    [currentSearch, searchParamsString, limit, router, clearSelectedIds]
  );

  // Filtro por sucursal
  const handleBranchFilter = useCallback((value: string) => {
    const trimedSuc = value.trim();
    const normalizedCurrent = currentBranch ? String(currentBranch) : "";

    if (trimedSuc === normalizedCurrent) return;

    setFeedback("loading");
    setFeedbackMsg("Filtrando...");

    const params = new URLSearchParams(searchParamsString);
    params.delete("id");
    params.set("view_type", "list");
    params.set("page", "1");
    params.set("limit", String(limit));

    if (trimedSuc !== "") {
      params.set("branch", value.trim());
      params.delete("idDepartment")
      params.delete("idPosition")
    } else {
      params.delete("branch");
      params.delete("idDepartment")
      params.delete("idPosition")

    }

    clearSelectedIds();
    router.push(`/app/employee?${params.toString()}`);
  }, [searchParamsString, limit, router, clearSelectedIds, currentBranch]);

  const selectedBranchName = useMemo(() => {
    if (!currentBranch) return "Sucursales";
    const found = branches.find(
      (br) => String(br.id) === currentBranch
    );
    return found ? found.name : "Sucursales";
  }, [currentBranch, branches]);


  // Filtro por departamento
  const handleDepartmentFilter = useCallback((value: string, positions?: Position[]) => {
    const trimmedValue = value.trim();
    const normalizedCurrent = currentIdDepartment ? String(currentIdDepartment) : "";

    if (trimmedValue === normalizedCurrent) return;

    if (positions) {
      setPositions(positions);
    }
    setFeedback('loading');
    setFeedbackMsg("Filtrando...");

    const params = new URLSearchParams(searchParamsString);
    params.delete("id");
    params.delete("branch");
    params.set("view_type", "list");
    params.set("page", "1");
    params.set("limit", String(limit));

    if (trimmedValue !== "") {
      params.set("idDepartment", trimmedValue);
      params.delete("idPosition");
      params.delete("branch");
    } else {
      params.delete("branch");
      params.delete("idDepartment");
      params.delete("idPosition");
      setPositions([]);
    }

    clearSelectedIds();
    router.push(`/app/employee?${params.toString()}`);
  }, [searchParamsString, limit, router, clearSelectedIds, currentIdDepartment]);

  const selectedDepartmentName = useMemo(() => {
    if (!currentIdDepartment) return "Departamentos";
    const found = departments.find(
      (dep) => String(dep.id) === currentIdDepartment
    );
    return found ? found.nameDepartment : "Departamentos";
  }, [currentIdDepartment, departments]);

  // Filtro por puesto
  const handlePositionFilter = useCallback((id: string) => {
    const trimmedId = id.trim();
    const normalizedCurrent = currentPosition ? String(currentPosition) : "";

    if (trimmedId === normalizedCurrent) return;

    setFeedback("loading");
    setFeedbackMsg("Filtrando...");

    const params = new URLSearchParams(searchParamsString);
    params.delete("id");
    params.set("view_type", "list");
    params.set("page", "1");
    params.set("limit", String(limit));

    if (trimmedId !== "") {
      params.set("idPosition", trimmedId);
    } else {
      params.delete("idPosition");
    }

    clearSelectedIds();
    router.push(`/app/employee?${params.toString()}`);
  }, [searchParamsString, limit, router, clearSelectedIds, currentPosition]);

  const selectedPositionName = useMemo(() => {
    if (!currentIdDepartment) return "inhabilitado"
    if (!currentPosition) return "Puestos";
    const found = positions.find(
      (pos) => String(pos.id) === currentPosition
    );
    return found ? found.namePosition : "Puestos";
  }, [currentPosition, currentIdDepartment, positions]);

  const columns: TableTemplateColumn<Employee>[] = [
    {
      key: "employeeName",
      label: "Empleado",
      accessor: (u) => `${u.lastName} ${u.name}`,
      filterable: false,
      type: "string",
      render: (u) => <div className="text-uppercase">{u.lastName} {u.name}</div>,
    },
    {
      key: "branch",
      label: "Sucursal",
      accessor: (u) => u.branch?.name,
      filterable: false,
      type: "string",
      render: (u) => (
        <div className="text-uppercase">{u.branch?.name}</div>
      ),
    },
    {
      key: "department.nameDepartment",
      label: "Departamento",
      accessor: (u) => u.department?.nameDepartment,
      filterable: false,
      type: "string",
      render: (u) => (
        <div className="text-uppercase">{u.department?.nameDepartment}</div>
      ),
    },
    {
      key: "position.namePosition",
      label: "Puesto",
      accessor: (u) => u.position?.namePosition,
      filterable: false,
      type: "string",
      render: (u) => (
        <div className="text-uppercase">{u.position?.namePosition}</div>
      ),
    },
    {
      key: "leader.name",
      label: "Líder",
      accessor: (u) => u.leader?.name,
      filterable: false,
      type: "string",
      render: (u) => (
        <div className="text-uppercase">
          {`${u.leader?.name ?? ""} ${u.leader?.lastName ?? ""}`}
        </div>
      ),
    },
    {
      key: "status",
      label: "Estatus",
      accessor: (u) => employeeStatus[u.status as keyof typeof employeeStatus] ?? "",
      filterable: false,
      type: "string",
      align: "center",
      render: (u) => {
        const estado = u.status
        switch (estado) {
          case 1:
            return (
              <div className="text-center">
                <span className="badge rounded-pill px3 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle">
                  ACTIVO
                </span>
              </div>
            );
          case 2:
            return (
              <div className="text-center">
                <span className="badge rounded-pill px3 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                  BAJA
                </span>
              </div>
            );
        }
      }
    },
  ];

  return (
    <>
      <ConditionalRender cond={feedback === "loading"}>
        <Loading message={feedbackMsg || "Guardando..."} />
      </ConditionalRender>

      <ConditionalRender cond={feedback === "success"}>
        <SuccessOverlay
          message={feedbackMsg}
          onDone={() => {
            setFeedback(null);
          }}
        />
      </ConditionalRender>

      <ConditionalRender cond={feedback === "error"}>
        <ErrorOverlay
          message={feedbackMsg}
          onDone={() => setFeedback(null)}
        />
      </ConditionalRender>

      <Container className="py-3" style={{ maxWidth: "1600px" }}>
        <Button
          variant="primary"
          className="d-inline-flex align-items-center gap-2 fw-semibold px-3"
          onClick={handleCreate}
        >
          <i className="bi bi-plus-lg" />
          Crear empleado
        </Button>

        <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
          <div>
            <h1 className="mb-0">Empleados</h1>

            <span className="text-muted">
              {total} empleado{total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <Row className="justify-content-center">
          <Col xs={12} xl={12} xxl={12}>
            <Card className="rounded-4 shadow-sm border">
              <Card.Body className="p-4 p-md-5">
                <div className="mb-4">
                  <Row className="mb-4 g-3 align-items-between">

                    {/* FILTRO DE EMPLEADOS */}
                    <Col xs={12} sm={6} md={6} lg={3} style={{ minWidth: 0 }}>
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

                    {/* FILTRO DE SUCURSALES */}
                    <Col xs={12} sm={6} md={6} lg={3} style={{ minWidth: 0 }}>
                      <Card className="rounded-4 border h-100">
                        <Card.Body className="p-3">
                          <div className="d-flex align-items-center gap-2 mb-3">
                            <i className="bi bi-building text-primary" />
                            <span className="fw-semibold small">Filtrar por sucursal</span>
                          </div>

                          <Dropdown className="w-100">
                            <Dropdown.Toggle
                                id="employee-filter-1"
                              as={Button}
                              variant="outline-secondary"
                              className="w-100 d-flex align-items-center justify-content-between text-uppercase"
                              style={{ minWidth: 0 }}
                            >
                              <span
                                style={{
                                  whiteSpace: "normal",
                                  overflowWrap: "break-word",
                                  wordBreak: "break-word",
                                  textAlign: "left",
                                }}
                              >
                                {selectedBranchName}
                              </span>
                            </Dropdown.Toggle>

                            <Dropdown.Menu>
                              <Dropdown.Item
                                active={!currentBranch}
                                onClick={() => handleBranchFilter("")}
                              >
                                <span className="text-uppercase text-muted">TODOS</span>
                              </Dropdown.Item>

                              {branches.map((br) => (
                                <Dropdown.Item
                                  key={br.id}
                                  active={String(br.id) === currentBranch}
                                  onClick={() => handleBranchFilter(String(br.id))}>
                                  <span className="text-uppercase">
                                    {br.name}
                                  </span>
                                </Dropdown.Item>
                              ))}
                            </Dropdown.Menu>
                          </Dropdown>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* FILTRO DE DEPARTAMENTOS */}
                    <Col xs={12} sm={6} md={6} lg={3} style={{ minWidth: 0 }}>
                      <Card className="rounded-4 border h-100">
                        <Card.Body className="p-3">
                          <div className="d-flex align-items-center gap-2 mb-3">
                            <i className="bi bi-columns-gap text-primary" />
                            <span className="fw-semibold small">Filtrar por departamento</span>
                          </div>

                          <Dropdown className="w-100">
                            <Dropdown.Toggle
                                id="employee-filter-2"
                              as={Button}
                              variant="outline-secondary"
                              className="w-100 d-flex align-items-center justify-content-between text-uppercase"
                              style={{ minWidth: 0 }}
                            >
                              <span
                                style={{
                                  whiteSpace: "normal",
                                  overflowWrap: "break-word",
                                  wordBreak: "break-word",
                                  textAlign: "left",
                                }}
                              >
                                {selectedDepartmentName}
                              </span>
                            </Dropdown.Toggle>

                            <Dropdown.Menu className="w-100" style={{ maxHeight: "300px", overflowY: "auto" }}>
                              <Dropdown.Item
                                active={!currentIdDepartment}
                                onClick={() => handleDepartmentFilter("")}
                              >
                                <span className="text-uppercase text-muted">TODOS</span>
                              </Dropdown.Item>

                              {departments.map((dep) => (
                                <Dropdown.Item
                                  key={dep.id}
                                  active={String(dep.id) === currentIdDepartment}
                                  onClick={() => handleDepartmentFilter(String(dep.id), dep.positions)}>
                                  <span className="text-uppercase">
                                    {dep.nameDepartment}
                                  </span>
                                </Dropdown.Item>
                              ))}
                            </Dropdown.Menu>
                          </Dropdown>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* FILTRO POR PUESTOS */}
                    <Col xs={12} sm={6} md={6} lg={3} style={{ minWidth: 0 }}>
                      <Card className="rounded-4 border h-100">
                        <Card.Body className="p-3">
                          <div className="d-flex align-items-center gap-2 mb-3">
                            <i className="bi bi-briefcase text-primary" />
                            <span className="fw-semibold small">Filtrar por puesto</span>

                            <OverlayTrigger
                              placement="top"
                              overlay={
                                <Tooltip id="tooltip-info">
                                  Para filtrar por puesto, primero debes elegir un departamento.
                                </Tooltip>
                              }
                            >
                              <span style={{ cursor: "pointer" }}>
                                <i className="bi bi-info-circle-fill text-primary" />
                              </span>
                            </OverlayTrigger>
                          </div>

                          <Dropdown className="w-100">
                            <Dropdown.Toggle
                                id="employee-filter-3"
                              as={Button}
                              variant="outline-secondary"
                              className="w-100 d-flex align-items-center justify-content-between text-uppercase"
                              disabled={!currentIdDepartment}
                              style={{ minWidth: 0 }}
                            >
                              <span
                                style={{
                                  whiteSpace: "normal",
                                  overflowWrap: "break-word",
                                  wordBreak: "break-word",
                                  textAlign: "left",
                                }}
                              >
                                {selectedPositionName}
                              </span>
                            </Dropdown.Toggle>

                            <Dropdown.Menu className="w-100">
                              <Dropdown.Item
                                active={!currentPosition}
                                onClick={() => handlePositionFilter("")}
                              >
                                <span className="text-uppercase text-muted">TODOS</span>
                              </Dropdown.Item>

                              {positions.map((pos) => (
                                <Dropdown.Item
                                  key={pos.id}
                                  active={String(pos.id) === String(currentPosition)}
                                  onClick={() => handlePositionFilter(String(pos.id))}
                                >
                                  <span
                                    className="text-uppercase"
                                    style={{ whiteSpace: "normal", wordBreak: "break-word" }}
                                  >
                                    {pos.namePosition}
                                  </span>
                                </Dropdown.Item>
                              ))}
                            </Dropdown.Menu>
                          </Dropdown>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </div>

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

                            <th className="fw-bold">Acciones</th>
                          </tr>
                        </thead>

                        <tbody>
                          {(employees ?? []).map((row) => (
                            <tr key={row.id}>
                              {columns.map((column) => (
                                <td key={String(column.key)}>
                                  {column.render
                                    ? column.render(row)
                                    : column.accessor(row)}
                                </td>
                              ))}

                              <td>
                                <a
                                  href={`/app/employee?view_type=form&id=${row.id}`}
                                  className="btn btn-sm btn-outline-info ms-3"
                                >
                                  Ver
                                </a>
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
      </Container>
    </>
  );
}