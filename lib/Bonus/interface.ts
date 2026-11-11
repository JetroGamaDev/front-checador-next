export interface IBonusKeys {
    id?: number;
    idEmployee: number;
    location: string;
    amount: number;
    createdAt?: string;
    updatedAt?: string;

    employee?: {
        id: number;
        idCheck?: number | null;
        name: string;
        lastName: string;
    },
    department?: {
        nameDepartment: string;
    }
}

export interface IUpdateBonusKeys {
    location?: string;
    amount?: number | null;
}

export interface IBonusHomeOffice {
    id?: number;
    idEmployee: number;
    amount: number;
    createdAt?: string;
    updatedAt?: string;

    employee?: {
        id: number;
        name: string;
        lastName: string;
    },
    department?: {
        nameDepartment: string;
    }
}

export interface IUpdateBonusHO{
    amount?: number | null;
}

export interface IGenerateDocBonusKey {
    base64Url: string;
}
