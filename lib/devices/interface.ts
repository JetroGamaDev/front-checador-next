import { ISignatures } from "../overTime/interface";

export type DeviceType = "computadora" | "laptop" | "impresora" | "servidor" |
    "switch" | "router" | "telefono_ip" | "camara" |
    "access_point" | "celular" | "television" | "tablet" | "monitor" | "no-break" | "otro" | "";

// type DeviceStatus = "activo" | "inactivo" | "en_reparacion" | "baja";

type OSType = "windows_10" | "windows_11" | "windows_server" |
    "linux" | "macos" | "android" | "ios" | "otro" | null;

export interface IDevices {
    _id?: string;
    id: number;
    name: string;
    type: DeviceType | null;
    status: string | "activo";

    networkInfo: {
        id?: number;
        mac: string;
        ip: string;
        description: string;
        hostname: string;
        gateway: string;
        dns: string[];
        vlan: string;
        port: string;
    }[];

    specs?: {
        brand: string;
        model: string;
        serialNumber: string;
        processor: string;
        ram: string;
        storage: string;
        os: OSType | null;
        osVersion: string;
        purchaseDate: string;
        warrantyExpiration: string;
        idDevice: string | null;
        idProduct: string | null;
        architecture: string | null;
        graphicCard: string | null;
        userAdmin: string | null;
        passwordAdmin: string | null;
        user: string | null;
        userPassword: string | null;
        currentStatus: string | null;
        // Opcionales: salen en la carta responsiva (IMEI de celular/tablet y valor en MXN)
        imei?: string | null;
        value?: number | null;
    }

    currentAssignment?: {
        id?: number | null;
        idEmployee?: number | null;
        idBranch?: number | null;
        phoneNumber?: {
            number: string;
            internationalNumber: string;
            nationalNumber: string;
            e164Number: string;
            countryCode: string;
            dialCode: string;
        } | null,
        extentionNumber?: string | null;
        emailCompany?: string | null;
        emailGmail?: string | null;
        passwordEmail?: string | null;
        pinPhone?: string | null;
        idDepartment?: number | null;
        location?: string;
        signatures?: ISignatures[] | null;
        deliveryDocument?: string | null;
        documentReceived?: string | null;
        assignedAt?: string | null;
        returnedAt?: string | null;
        // Practicante u otra persona fuera del sistema (entonces no viene `employee`)
        externalPerson?: IExternalPerson | null;
    }

    assignmentHistory?: {
        id: number;
        idEmployee: number;
        idBranch: number;
        idDepartment: number;
        location: string;
        phoneNumber: string | null;
        extentionNumber: string | null;
        emailCompany: string | null;
        emailGmail: string | null;
        signatures: ISignatures[] | null;


        deliveryDocument: {
            id: number;
            urlDocument: string;
            whoUploadId: string | null;
            createdAt: string;
        },

        documentReceived: {
            id: number;
            urlDocument: string;
            whoUploadId: string | null;
            createdAt: string;
        },

        assignedAt: string;
        returnedAt: string | null;

        externalPerson?: IExternalPerson | null;

        employee?: {
            id: number;
            name: string;
            lastName: string;
        },
        personIt: {
            id: number;
            name: string;
            lastName: string;
        },
        department: {
            id: number;
            nameDepartment: string;
        },
        branch: {
            id: number;
            name: string;
        }
    }[];

    createdAt: string;
    updatedAt: string;

    employee?: {
        id: number;
        name: string;
        lastName: string;
    };

    personIt?: {
        id: number;
        name: string;
        lastName: string;
    };

    department?: {
        id: number;
        nameDepartment: string;
    };

    branch?: {
        id: number;
        name: string;
    };

    idIt?: number | null;
    notes?: string;
}

// Contenido de la carta responsiva que arma el back (GET /devices-waiverContent/:id)
export interface IWaiverContent {
    title: string;
    placeAndDate: string;
    employeeName?: string | null;
    employeePosition?: string | null;
    itName?: string | null;
    itPosition?: string | null;
    companyName?: string | null;
    intro: string;
    rows: { label: string; value: string | null }[];
    clauses: { title: string; text: string }[];
    hasPhoneLine?: boolean;
    isExternal?: boolean;
}

// Persona externa asignada a un dispositivo (no está en el sistema)
export interface IExternalPerson {
    name: string;
    lastName: string;
    position: string;
    department: string;
    company?: string | null;
    phone?: string | null;
    email?: string | null;
}

export interface IAssignDevice {
    idEmployee: number | null;
    externalPerson?: IExternalPerson | null;
    idIt: number;
    idBranch: number;
    idDepartment: number;
    location: string;
    assignedAt: string;
    phoneNumber: string | null;
    extentionNumber: string | null;
    emailCompany: string | null;
    emailGmail: string | null;
    passwordEmail: string | null;
    pinPhone: string | null;
}

export interface IPhone {
    number: string;
    internationalNumber: string;
    nationalNumber: string;
    e164Number: string;
    countryCode: string;
    dialCode: string;
}

export interface IUpdateCurrentUser {
    // Solo cuando la asignación es de una persona externa (no se manda para empleados)
    externalPerson?: IExternalPerson | null;
    phoneNumber?: string | null;
    extentionNumber?: string | null;
    emailCompany?: string | null;
    emailGmail?: string | null;
    passwordEmail?: string | null;
    pinPhone?: string | null;
    location?: string | null;
}
