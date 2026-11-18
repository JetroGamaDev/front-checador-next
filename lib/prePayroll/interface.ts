export interface IPrePayroll {
    _id?: string;
    idPrePayRoll: number;
    idUnique: number;
    idPeriod: number;
    idIncidence: number;
    idEmployee: number;
    incidenceRef: string;
    claveNomipaq: string;
    duracion: number;
    fechaNomina: string | null;
    data: Idata;
    fechaIncidencia: string;
    day: string | null;
    notes?: string;
    complete?: boolean;
    // VACACIONES que el líder aún no autoriza: no se puede asignar fecha nómina ni cuentan en los Excel
    pendingApproval?: boolean;
}

interface Idata {
    _id?: string;
    id: number;
    idRaiz: number;
    idEmployee: number;
    category: string | null;
    type: string;
    dateOfAbsence: string;
    createdAt: string;
    updatedAt: string;
    notes: string;
    incidenceRef: string;
    employee: {
        id: number;
        name: string;
        lastName: string;
    }
    department: {
        id: number;
        nameDepartment: string;
    }
    position: {
        id: number;
        namePosition: string;
    }
}

export interface IUpdatePrepayroll {
    idPeriod: number;
    idUnique: number;
    fechaNomina: string | null;
}

export interface IGenerateDoc {
    idPrePayRoll: number;
    base64Url: string;
}

export interface IComplete {
    complete?: boolean;
}

