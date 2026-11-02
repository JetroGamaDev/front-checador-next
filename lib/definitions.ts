import { ISignatures } from "./overTime/interface";
import { PhoneNumberFormat } from "./sinitizePhone";

export interface ActionResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ApiResponse<T> {
  message: string;
  status: number;
  data: T;
}

export interface IDepartmentLeaderValues {
  id: number,
  name: string
}
export interface IRolesMe {
  isLeader: true,
  isDoh: false,
  isExtra: false,
  isApproverLeaders: false,
  isApproverDoh: false,
  departmentLeader: IDepartmentLeaderValues;
}

export interface User {
  _id: string;
  id: number;
  name: string;
  lastName: string;
  email: string;
  gender: string;
  status: 1 | 2 | 3;
  role: UserRole;
  permissions: Permission[];
  phone: PhoneNumberFormat;
  createdAt: string;
  idEmployee: number | null;
  isDoh: boolean;
  isLeader?: boolean;
  roles: IRolesMe;
  twoFactorEnabled?: boolean;
  twoFactorPending?: boolean;
  // "Mostrar tutoriales" del perfil (si el back no lo manda se considera true)
  enableTutorials?: boolean;
  sessionType?: 'user' | 'employee';
  idCheck?: number | null;
  // Empleado que aún entra con su NIP: se le ofrece crear su contraseña del sistema
  passwordSystemPending?: boolean;
}

export interface ITwoFactorSetup {
  otpauthUrl: string;
  secret: string;
  issuer: string;
  accountName: string;
}

export type DisplayType = {
  admin: string;
  employee: string;
};

export type Permission = {
  id: number | null;
  text: string;
};

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "LEADER"
  | "EMPLOYEE"
  | "CHECADOR";

export interface Department {
  _id?: string;
  id?: number;
  nameDepartment: string;
  description: string;
  idLeader: number | null;
  leader?: Employee | null;
  idSubManager?: number | null;
  subManager?: {
    id: number;
    idCheck: number;
    name: string;
    lastName: string;
    picture?: string;
    idPosition?: number;
  } | null;
  positions: Position[];
  cretedAt?: string;
}

export interface Position {
  _id?: string;
  id: number;
  namePosition: string;
  idDepartment: number;
  cretedAt?: string;
}

export interface Branch {
  _id?: string;
  id?: number;
  name: string;
  idManager?: number | null;
  address?: BranchAddress;
  coordinates?: {
    lat: number | null;
    lng: number | null;
  };
  lat?: number | null;
  lng?: number | null;
  country?: string;
  municipality?: string;
  state?: string;
  street?: string;
  numberOut?: string;
  numberIn?: string | null;
  zipCode?: number | null;
  neighborhood?: string;
}

type BranchAddress = {
  country: string;
  municipality: string;
  state: string;
  street: string;
  numberOut: string;
  numberIn: string | null;
  zipCode: number;
  neighborhood: string;
  coordinates?: {
    lat: number | null;
    lng: number | null;
  };
};

export interface IFoodBaucher {
  uiid: string;
  cardNumber: string;
}

export interface biometricPhotos {
  key: string;
  type: string;
  createdAt: string;
  active: boolean;
}

export interface Employee {
  _id?: string;
  id?: number;
  name: string;
  lastName: string;
  phonePersonal: PhoneNumberFormat | null;
  emailPersonal: string;
  idCheck: number | null;
  passwordCheck: number | null;
  /** @deprecated el back ya no lo regresa (era el hash); no se debe mostrar */
  passwordSystem?: string;
  entryOffice: string;
  entrySaturdayOffice: string | null;
  exitOffice: string | null;
  exitSaturdayOffice: string | null;
  entryLunch: string | null;
  exitLunch: string | null;
  idDepartment: number | null;
  department?: Department;
  idPosition: number | null;
  position?: Position;
  branch: Branch | null;
  gender: "MASCULINO" | "FEMENINO";
  scheduleOffice?: {
    entry: string;
    exit: string;
  };
  scheduleLunch?: {
    entry: string;
    exit: string;
  };
  scheduleSaturday?: {
    entry: string | null;
    exit: string | null;
  };
  status?: 1 | 2 | 3;
  role?: UserRole[];
  leader?: Employee | null;
  phoneCompany: PhoneNumberFormat | null;
  phoneExtCompany: number | 0;
  address: BranchAddress;
  emailCompany: string;
  scheduleDescription: string;
  policies: string;
  group: string;
  homePhone: PhoneNumberFormat;
  sons: number | 0;
  daughters: number | 0;
  birthDate: string;
  nationality: string;
  socialSecurityNumber: string;
  rfc: string;
  curp: string;
  /** @deprecated ya no se captura (Aviso de privacidad) */
  weight?: number | null;
  /** @deprecated ya no se captura (Aviso de privacidad) */
  height?: number | null;
  bloodType: string;
  /** @deprecated ya no se captura (Aviso de privacidad) */
  constitution?: string;
  healthStatus: string;
  education: string;
  skills: string;
  comments: string;
  emergencyContacts: EmergencyContact[];
  keyAspelNOI: string;
  keyCONTPAQi: string;
  admissionDate: string;
  anniversaryLetter: string;
  visibleRecords: boolean;
  dischargeDate: string | null;
  dischargeReason: string;
  typeOfDischarge: string;
  reEntry?: {
    _id: string;
    reEntryDate: string;
    dischargeDate: string;
    dischargeReason: string;
    typeOfDischarge: string;
  }[];
  dailyWage: number;
  isDoh: boolean;
  isLeader?: boolean;
  foodBaucher?: IFoodBaucher | undefined;
  biometricPhotos?: biometricPhotos[];
}

export interface reEntryEmployee{
   _id?: string;
    reEntryDate?: string;
    dischargeDate?: string;
    dischargeReason?: string;
    typeOfDischarge?: string;
}

type EmergencyContact = {
  name: string;
  kinship: string;
  phone: PhoneNumberFormat;
};

export interface ModalBasicProps {
  show: boolean;
  onHide: () => void;
  action?: () => void;
  string?: string;
  title?: string;
}

export interface ICheckInFeedback {
  _id: string;
  id: number;
  checks: {
    id: number;
    timestamp: string;
    type: string;
    status: string | null;
    minutesDifference: number;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  user: User;
  employee: Employee;
  departmentEmployee: Department;
  positionEmployee: Position;
  branchEmployee: Branch;
}

export interface IPeriod {
  idPeriod: number;
  documents: IPeriodDocument[];
}

export interface IPeriodDocument {
  id: number;
  url: string;
  idPeriod: number;
  exist: boolean;
  title: string;
  titleView: string;
  createdAt: string;
  dateExpiration?: string;
}



export interface INewsletter {
  _id: string;
  id: number;
  title: string;
  text: string;
  img: string;
  programing: boolean;
  dateInitiPublish: string;
  dateEndPublish: string;
  hourEndPublish: string;
  hourInitiPublish: string;
  createAt?: string;
  updateAt?: string;
};



export interface ConfigSystemUpdate {
  permissions: {
    idPersonApproveDoh: number;
    idPersonApproveLeaders: number;
  };
  vacations: {
    idPersonApproveDoh: number;
    idPersonApproveLeaders: number;
  };
}


export interface IOvertime {
  _id: string;
  id: number;
  leaderApproval: "APPROVED" | "REFUSED" | "PENDING";
  dohApproval: "APPROVED" | "REFUSED" | "PENDING";
  motive: string;
  incidence: string;
  signatures: ISignatures[];
  informationDate: {
    _id: string;
    id: number;
    totalHours: number;
    totalDays: number;
    dateInit: string;
    dateEnd: string;
    hourInit: string;
    hourEnd: string;
  };
  daysdaysBrokenDown: {
    id: number;
    fortnightlyPeriod: number;
    day: string;
  }[];
  createForPerson: {
    _id: string;
    id: number;
    name: string;
    lastName: string;
  };
  employee: {
    _id: string;
    id: number;
    name: string;
    lastName: string;
  };
  leader: {
    _id: string;
    id: number;
    name: string;
    lastName: string;
  };
  personDoh: {
    _id: string;
    id: number;
    name: string;
    lastName: string;
  };
  status: "APPROVED" | "REFUSED" | "PENDING";
  createdAt: string;
}

export interface ICurrentPeriod {
  _id: string;
  id: number;
  year: string;
  numberPeriod: number;
  description: string;
  dateInit: string;
  dateEnd: string;
  payrollReport: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeStats {
  id: number;
  name: string;
  lastName: string;
  idDepartment: number;
  branch: number;
  status: number;
}

export interface FaultStatsByStatus {
  [status: string]: number; // ej: { ausencia: 4 }
}

export interface AttendanceReportItem {
  totalChecks: number;
  lunchExcessMinutes: number;
  lunchExcessTimes: number;
  statsByStatus: FaultStatsByStatus;
  faultsDays: string[]; // "YYYY-MM-DD"
  totalFaults: number;
  employee: EmployeeStats;
  idEmployee: number;
  totalRecords: number;
  usersCount: number;
}

export interface IDeleteIncidenece{
  deletePermission: boolean;
  reaseonDelete: string;
}

