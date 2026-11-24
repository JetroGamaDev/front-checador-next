import { fetchEmployees, findEmployeeById } from "@/app/actions/employee-actions";
import { fetchDepartments } from "@/app/actions/departments-actions";
import { fetchBranches } from "@/app/actions/branches-actionst";
import EmployeeTableClient from "@/components/employee/EmployeeTableList";
import { fetchEmployeeDocuments } from "@/app/actions/documents-actions";
import { fetchVacationByEmployee } from "@/app/actions/vacations-actions";
import EmployeeDetailsView from "@/components/employee/EmployeeOneInfo";

export default async function ListAllEmployees({
  id,
  page = "1",
  limit = "20",
  search = "",
  idDepartment,
  idPosition,
  branch,
}: {
  id: string;
  page?: string;
  limit?: string;
  search?: string;
  idDepartment?: string;
  idPosition?: string;
  branch?: string;
}) {
  const pageParse = Math.max(Number(page || "1") || 1, 1);
  const limitParse = Math.min(Math.max(Number(limit || "20") || 20, 1), 100);

  const [employees, departments, branches] = await Promise.all([

    fetchEmployees({
      page: pageParse,
      limit: limitParse,
      search,
      idDepartment,
      idPosition,
      branch
    }),
    fetchDepartments(),
    fetchBranches(),
  ]);


  if (id && id !== "null") {
    const [employee, documents, vacations] = await Promise.all([
      findEmployeeById({ id: Number(id) }),
      fetchEmployeeDocuments({ idEmployee: Number(id) }),
      fetchVacationByEmployee({ idEmployee: Number(id) }),
    ]);    

    return (
      <EmployeeDetailsView
        branches={branches}
        departments={departments}
        employees={employees.data}
        documents={documents.data ?? []}
        documentsError={documents.success ? "" : documents.message}
        employee={employee!}
        id={id}
        vacations={vacations}
      />
    );
  }

  return (
    <EmployeeTableClient
      total={employees.total}
      page={pageParse}
      limit={limitParse}
      employees={employees.data ?? []}
      search={search}
      departments={departments}
      branches={branches}
      idDepartment={idDepartment}
      idPosition={idPosition}
      branch={branch}
    />
  );
}