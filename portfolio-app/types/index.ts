// ─── Owners & Properties ────────────────────────────────────────────────────

export interface Owner {
  id: string;
  name: string;
  email: string;
  percentage: number; // 0–100
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  leaseStart: string; // ISO date
  leaseEnd?: string;
  deposit: number;
  rentPcm: number;
}

export interface LettingAgent {
  name: string;
  company: string;
  contact: string;
  email?: string;
  phone?: string;
}

export interface RentHistoryEntry {
  id: string;
  dateFrom: string;
  dateTo?: string;
  amount: number;
  notes?: string;
}

export interface KeyContact {
  id: string;
  category: string; // e.g. "Insurance", "Solicitor"
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface Property {
  id: string;
  address: string;
  reference?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  currentValue?: number;
  owners: Owner[];
  tenant?: Tenant;
  lettingAgent?: LettingAgent;
  rentHistory: RentHistoryEntry[];
  keyContacts: KeyContact[];
  createdAt: string;
  updatedAt: string;
}

// ─── Certificates & Appliances ──────────────────────────────────────────────

export type CertificateType = 'Gas Safety' | 'EPC' | 'EICR' | 'Other';

export interface Certificate {
  id: string;
  propertyId: string;
  type: CertificateType;
  issueDate: string;
  expiryDate: string;
  issuerNotes?: string;
  documentId?: string; // links to Document
}

export interface Appliance {
  id: string;
  propertyId: string;
  name: string;
  make?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyEndDate?: string;
  notes?: string;
  documentId?: string;
}

// ─── Documents ──────────────────────────────────────────────────────────────

export type DocumentCategory =
  | 'Tenancy'
  | 'Rent'
  | 'Certificates'
  | 'Appliances'
  | 'Reference'
  | 'Other';

export interface Document {
  id: string;
  propertyId: string;
  propertyAddress: string;
  category: DocumentCategory;
  documentDate: string;
  description: string;
  driveFileId: string;
  driveFileName: string;
  driveViewLink: string;
  uploadedAt: string;
  // Certificate extras
  certificateType?: CertificateType;
  issueDate?: string;
  expiryDate?: string;
  issuerNotes?: string;
  // Appliance extras
  applianceName?: string;
  applianceMake?: string;
  applianceModel?: string;
  applianceSerial?: string;
  appliancePurchaseDate?: string;
  warrantyEndDate?: string;
  applianceNotes?: string;
}

// ─── Maintenance ─────────────────────────────────────────────────────────────

export type MaintenanceStatus = 'Open' | 'Closed';

export interface MaintenanceIssue {
  id: string;
  propertyId: string;
  propertyAddress: string;
  issue: string;
  dateRaised: string;
  dateResolved?: string;
  status: MaintenanceStatus;
  description?: string;
  resolution?: string;
  costToResolve?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense';

export type IncomeCategory = 'Rental income' | 'Other income';

export type ExpenseCategory =
  | 'Managing Agent fees'
  | 'Legal and other professional fees'
  | 'Rent, rates, insurance and ground rents'
  | 'Property repairs and maintenance'
  | 'Cost of services'
  | 'Cost of replacing domestic items'
  | 'Other allowable property expenses'
  | 'Residential property finance costs';

export type TransactionCategory = IncomeCategory | ExpenseCategory;

export interface Transaction {
  id: string;
  propertyId: string;
  propertyAddress: string;
  type: TransactionType;
  category: TransactionCategory;
  dateStart: string; // ISO date
  dateEnd?: string; // ISO date — if covers a period
  amount: number; // total amount for the period
  description?: string;
  supplier?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Period filters ───────────────────────────────────────────────────────────

export type PeriodFilter = 'ytd' | 'tax-ytd' | 'tax-q' | 'all' | 'custom';

export interface CustomPeriod {
  from: string;
  to: string;
}

// ─── Aggregated finance ───────────────────────────────────────────────────────

export interface PropertyFinanceSummary {
  propertyId: string;
  propertyAddress: string;
  rentPcm: number;
  income: number;
  expenses: number;
  agentFees: number;
  netIncome: number; // income - agentFees
  profit: number; // income - expenses
  ownershipPct: number; // for the viewing user
}

export interface PortfolioSummary {
  income: number;
  expenses: number;
  agentFees: number;
  netIncome: number;
  profit: number;
  rentPcm: number;
  netIncomePct: number;
  profitPct: number;
  averageYield: number;
  properties: PropertyFinanceSummary[];
}

// ─── API response wrappers ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
