import { IChecks } from "../absences/interface";
import { ISubManagerRef } from "../leaderSignature";

export interface IPenaltyForOffeses {
    _id?: string;
    id: number;
    // Subgerente que hoy puede firmar la casilla "Líder" (null si no aplica o en registros viejos)
    idSubManager?: number | null;
    subManager?: ISubManagerRef | null;
    idEmployee: number;
    createFor: number;
    idsAbsencesAndAttendances: number[];
    type: string;
    dateOfAbsence: string[];
    motive?: string;
    signatures: ISignaturesPenalties[];
    createdAt: string;
    updatedAt: string;
    PenaltyForOffensesType?: string;
    notes?: string;

    createForPerson?: {
        _id?: string;
        id: number;
        name: string;
        lastName: string;
    }

    employee?: {
        _id?: string;
        id: number;
        name: string;
        lastName: string;
    }

    absencesAndAttendances: IAbsencesAndAttendances[];
    status?: string;

    delete?: {
        delete: boolean;
        whoDeleteIdEmployee: number;
        reaseonDelete: string;
        dateDelete: string;
    }
}

export interface IPenalty {
    idEmployee: number,
    idsAbsencesAndAttendances: number[];
    PenaltyForOffensesType: string;
    dateOfAbsence: string[];
    motive?: string;
    notes: string | null;
}

export interface ISignaturesPenalties {
    _id?: string;
    id: number;
    idSignatory: number;
    name: string;
    key: string;
    url: string;
    status: string;
    label: string;
    sendNotify: boolean;
    // Solo en la firma "Líder": quién subió la imagen
    signedBy?: number | null;
    signedByRole?: "LEADER" | "SUBMANAGER" | null;
}

interface IAbsencesAndAttendances {
    _id?: string;
    id: number;
    idEmployee: number;
    idChecadors: number[];
    category: string;
    subCategory: string;
    type: string;
    dateOfAbsence: string;
    createdAt: string;
    checks: IChecks[];
}

export interface IPenaltyAxios {
    _id?: string;
    id: number
}