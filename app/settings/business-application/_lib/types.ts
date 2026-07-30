/** Backend `SellerDocumentStatus` + UI'a özgü "eksik" durumu. */
export type SellerDocumentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'appealed';

export type SellerDocument = {
  id: string;
  documentType: string;
  fileName: string;
  status: SellerDocumentStatus;
  uploadedAt: string;
  version?: number;
  reviewNote?: string | null;
  stakeholderId?: string | null;
  url?: string | null;
};

export type CorporateStakeholder = {
  id: string;
  fullName: string;
  identityType: 'tckn' | 'passport';
  identityNumber?: string | null;
};

export type CorporateApplication = {
  id: string;
  status: 'draft' | 'under_review' | 'approved' | 'rejected' | string;
  companyType?: string | null;
  taxId?: string | null;
  taxOffice?: string | null;
  companyCity?: string | null;
  companyDistrict?: string | null;
  bankAccountHolder?: string | null;
  iban?: string | null;
  stakeholders?: CorporateStakeholder[];
};

export type CorporateApplicationInput = {
  companyType?: string;
  taxId?: string;
  taxOffice?: string;
  companyCity?: string;
  companyDistrict?: string;
  bankAccountHolder?: string;
  iban?: string;
};

export type StakeholderInput = {
  fullName: string;
  identityType: 'tckn' | 'passport';
  identityNumber?: string;
};
