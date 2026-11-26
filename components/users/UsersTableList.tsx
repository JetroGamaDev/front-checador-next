"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import ListView from "../templates/ListView";
import { TableTemplateColumn } from "../templates/TableTemplate";
import { Button, Card, Col, Container, Form, InputGroup, Pagination, Row } from "react-bootstrap";

import ConditionalRender from "@/components/ConditionalRender";
import Loading from "@/components/LoadingSpinner";
import {
  Employee,
  Permission,
  User,
} from "@/lib/definitions";
import { PhoneNumberFormat } from "@/lib/sinitizePhone";
import GenericSearchInput from "../employee/GenericSearchInput";

type FeedbackState = "loading" | "success" | "error" | null;

const userStatus = {
  1: "activo",
  2: "suspendido",
  3: "eliminado",
};


export type TInputsUser = {
  name: string;
  lastName: string;
  email: string;
  password: string;
  gender: "MASCULINO" | "FEMENINO" | null;
  role: "SUPER_ADMIN" | "ADMIN" | "CHECADOR" | null;
  permissions: Permission[];
  phone: PhoneNumberFormat | string | null;
  status: 1 | 2 | 3;
  imageUrl?: string | null;
  idEmployee: number | null;
};

export default function UserTableClient({
  users,
  total,
  page,
  limit,
  search = "",
}: {
  users: User[];
  total: number;
  page: number;
  limit: number;
  perms?: Permission[];
  employees?: Employee[];
  search?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const searchParamsString = sp.toString();
  const currentSearch = sp.get("search") ?? "";

  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const tableRef = useRef<{ clearSelection: () => void } | null>(null);
  const isClearingSelectionRef = useRef(false);
  const [, setTableResetKey] = useState(0);
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


  const goToPage = (nextPage: number) => {
    setFeedback("loading");
    setFeedbackMsg("Cargando...");
    const params = new URLSearchParams(searchParamsString);
    params.set("id", "null");
    params.set("view_type", "list");
    params.set("page", String(nextPage));
    params.set("limit", String(limit));

    if (currentSearch.trim()) {
      params.set("search", currentSearch.trim());
    } else {
      params.delete("search");
    }

    router.push(`/app/users?${params.toString()}`);
  };

  const clearSelectedIds = useCallback(() => {
    isClearingSelectionRef.current = true;

    tableRef.current?.clearSelection();
    setTableResetKey((k) => k + 1);

    setTimeout(() => {
      isClearingSelectionRef.current = false;
    }, 0);
  }, []);


  const handleCreate = () => {
    setFeedback("loading");
    setFeedbackMsg("Cargando...");
    router.push("/app/users/create");
  };

  const handleSearch = useCallback(
    (value: string) => {
      const cleanValue = value.trim();

      if (cleanValue === currentSearch.trim()) return;

      setFeedback("loading");
      setFeedbackMsg("Buscando...");

      const params = new URLSearchParams(searchParamsString);
      params.set("id", "null");
      params.set("view_type", "list");
      params.set("page", "1");
      params.set("limit", String(limit));

      if (cleanValue) {
        params.set("search", cleanValue);
      } else {
        params.delete("search");
      }

      clearSelectedIds();
      router.push(`/app/users?${params.toString()}`);
    },
    [currentSearch, searchParamsString, limit, router, clearSelectedIds]
  );

  const columns: TableTemplateColumn<User>[] = [
    {
      key: "name",
      label: "Nombre",
      accessor: (u) => u.name,
      filterable: true,
      type: "string",
      render: (u) => <div className="text-uppercase">{u.name}</div>,
    },
    {
      key: "lastName",
      label: "Apellidos",
      accessor: (u) => u.lastName,
      filterable: true,
      type: "string",
      render: (u) => <div className="text-uppercase">{u.lastName}</div>,
    },
    {
      key: "status",
      label: "Estado",
      accessor: (u) => userStatus[u.status as keyof typeof userStatus] ?? "",
      filterable: true,
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
                <span className="badge rounded-pill px3 py-2 fw-semibold bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                  SUSPENDIDO
                </span>
              </div>
            );
          case 3:
            return (
              <div className="text-center">
                <span className="badge rounded-pill px3 py-2 fw-semibold bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                  ELIMINADO
                </span>
              </div>
            );
        }
      },
    },
    {
      key: "email",
      label: "Correo",
      accessor: (u) => u.email,
      filterable: true,
      type: "string",
      render: (u) => <div>{u.email}</div>,
    },
    {
      key: "gender",
      label: "Género",
      align: "center",
      accessor: (u) => <div className="text-center">{u.gender}</div>,
      filterable: true,
      type: "string",
    },
    {
      key: "permissions",
      label: "Permisos",
      align: "center",
      accessor: (u) => u.permissions.length,
      filterable: false,
      type: "number",
      render: (u) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Form className="text-uppercase shadow-none border-0 text-center">
            <option>{u.permissions.length}</option>
            {/* {u.permissions.map((p) => (
              <option key={`${p.id}-${p.text}`}>
                {p.text.replaceAll("_", " ").replaceAll("-", " ")}
              </option>
            ))} */}
          </Form>
        </div>
      ),
    },
  ];


  return (
    <>
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
          Crear usuario
        </Button>

        <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
          <div>
            <h1 className="mb-0">Usuarios</h1>

            <span className="text-muted">
              {total} usuario{total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <Row className="justify-content-center" style={{ height: "100%" }}>
          <Col xs={12} sm={12} md={12} lg={12} xl={12} xxl={12}>
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
                          {(users ?? []).map((row) => (
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
                                  href={`/app/users?view_type=form&id=${row.id}`}
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