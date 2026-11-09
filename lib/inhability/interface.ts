export interface IInability {
  _id: string;
  id: number;
  idEmployee: number;
  whoCreateId: number;
  accountingConfirmation: boolean;
  disabilityCategory: string;
  typeOfDisability: string;
  folio: string;
  documentsInability: IdocumentsInability[];
  notes: string | null;

  sT2DischargeDocument: IsT2DischargeDocument;

  sT7FillingDocumentv1: IsT7FillingDocumentv1;

  sT7FillingDocumentv2: IsT7FillingDocumentv2;

  documetCitt: {
    id: number;
    whoUploadId: number;
    urlDocument: string;
    createdAt: string; // ISO
    updatedAt: string; // ISO
  };

  status: string; // si tienes enum/union lo cambiamos
  createdAt: string; // ISO
  updatedAt: string; // ISO

  employee: {
    _id: string;
    id: number;
    name: string;
    lastName: string;
  };

  whoCreate: {
    _id: string;
    id: number;
    name: string;
    lastName: string;
  };

  createForPerson: {
    _id: string;
    id: number;
    name: string;
    lastName: string;
  };

  delete?: {
    delete: boolean;
    whoDeleteIdEmployee: number;
    reaseonDelete: string;
    dateDelete: string;
  }
}

export interface IsT7FillingDocumentv1 {
  id: number;
  whoUploadId: number;
  urlDocument: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  expirationDateDocument?: string;
};

export interface IsT7FillingDocumentv2 {
  id: number;
  whoUploadId: number;
  urlDocument: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  expirationDateDocument?: string;
};

export interface IsT2DischargeDocument {
  id: number;
  whoUploadId: number;
  urlDocument: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  expirationDateDocument?: string;
};

export type InabilityPayload = {
  idEmployee: number | null;
  disabilityCategory: string;
  folio: string;
  typeOfDisability: string;
  dateInit: string; // yyyy-MM-dd
  dateEnd: string; // yyyy-MM-dd
  notes: string | null;
  expirationDate?: string;
};

export interface IdocumentsInability {
  id: number;
  whoUploadId: number;
  dateInit: string; // ISO
  dateEnd: string; // ISO
  folio: string;
  daysdaysBrokenDown: IdaysdaysBrokenDown[];
  inProgress: boolean;
  urlDocument: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  expirationDateDocument?: string;
}

interface IdaysdaysBrokenDown {
  id: number;
  year: string;
  fortnightlyPeriod: number;
  day: string;
}

export interface IDeleteInhability {
  deletePermission: boolean;
  reaseonDelete: string;
}