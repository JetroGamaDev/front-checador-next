import { Employee } from "../definitions";
import { ISignatures } from "../overTime/interface";

export interface IPermissionRequest {
  _id: string;
  id: number;
  leaderApproval: PermissionRequestStatus;
  dohApproval: PermissionRequestStatus;
  motive: string;
  notes: string;
  incidence: string;
  type: string;
  forHours: boolean;
  forDays: boolean;
  signatures: ISignatures[];
  informationDate: TInformationDate;
  createdAt?: string;
  updatedAt?: string;
  createForPerson: Pick<Employee, "_id" | "id" | "name" | "lastName">;
  employee: Pick<Employee, "_id" | "id" | "name" | "lastName">;
  dateEnd: string;
  dateInit: string;
  hourInt: string;
  hourEnd: string;
  leader: Pick<Employee, "_id" | "id" | "name" | "lastName">;
  personDoh: Pick<Employee, "_id" | "id" | "name" | "lastName">;
  status: PermissionRequestStatus;
  dateApprove?: string;
  dateApproveDoh?: string;
  // Con goce de sueldo: lo define DOH al aprobar (null en pendientes, rechazados o permisos anteriores)
  withPay?: boolean | null;

  delete?: {
    delete: boolean;
    whoDeleteIdEmployee: number;
    reaseonDelete: string;
    dateDelete: string;
  }
}

export type PermissionRequestStatus =
  | "APPROVED"
  | "REFUSED"
  | "PENDING"
  | "EMPLOYEE";

export type TInformationDate = {
  _id: string;
  id: number;
  totalHours: number;
  totalDay: number;
  dateInit: string;
  dateEnd: string;
  hourInit: string;
  hourEnd: string;
};
