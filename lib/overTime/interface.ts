import { ILeaderSlotFields } from "../leaderSignature";

export interface OverTime extends ILeaderSlotFields {
    _id?: string;
    id: number
    idEmployee: number;
    motive: string;
    date: string;
    hourInit: string;
    hourEnd: string;
    status: OvertimeRequestStatus;
    informationDate?: informationDate;
    createdAt?: string;
    incidence?: string;
    signatures?: ISignatures[];
    notes: string | null;

    createForPerson?: {
        _id: string;
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

    leader?: {
        _id: string;
        id: number;
        name: string;
        lastName: string;
    };
    personDoh?: {
        _id: string;
        id: number;
        name: string;
        lastName: string;
    };

    leaderApproval: OvertimeRequestStatus;
    dohApproval: OvertimeRequestStatus;

    delete?: {
        delete: boolean;
        whoDeleteIdEmployee: number;
        reaseonDelete: string;
        dateDelete: string;
    }
}

export interface OverTimeAxios {
    _id?: string;
    id: number
}

export type OvertimeRequestStatus =
    | "APPROVED"
    | "REFUSED"
    | "PENDING"


export type TInputsOvertime = {
    motive: string;
    idEmployee: number | null;
    idLeader?: number | null;
    idPersonDoh?: number | null;
    date: string;
    hourInit: string;
    hourEnd: string;
    signature?: string;
    status?: OvertimeRequestStatus;
    notes: string | null;
};

type informationDate = {
    _id: string;
    id: number;
    totalHours: number;
    dateInit: string;
    dateEnd: string;
    hourInit: string;
    hourEnd: string;
}

export interface ISignatures {
    id: number;
    _id: string;
    idSignatory: number;
    name: string;
    url: string;
    label: string;
    sendNotify: boolean;
    status: "APPROVED" | "REFUSED" | "PENDING";
    key: string;
    signature?: string;
    dateApproved?: string;
    dateSigner?: string;
    // Solo en la firma "Líder": quién subió la imagen (el idSignatory sigue siendo el del líder)
    signedBy?: number | null;
    signedByRole?: "LEADER" | "SUBMANAGER" | null;
}
