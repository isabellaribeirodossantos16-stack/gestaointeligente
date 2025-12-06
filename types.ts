
export enum PaymentStatus {
  PAID = 'PAGO',
  PENDING = 'A PAGAR',
  OVERDUE = 'VENCIDO'
}

export enum TransactionType {
  INCOME = 'RECEITA',
  EXPENSE = 'DESPESA'
}

export interface Plan {
  id: string;
  name: string;
  value: number;
  description: string;
}

export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  birthDate: string;
  planId: string;
  status: PaymentStatus;
  paymentDueDate: string; // YYYY-MM-DD
  paymentDueTime: string; // HH:mm
  planExpiryDate: string; // YYYY-MM-DD
  planExpiryTime: string; // HH:mm
  alertEnabled: boolean;
  balance?: number; // Remaining amount to pay
}

export interface Payable {
  id: string;
  description: string;
  value: number;
  dueDate: string;
  status: PaymentStatus; // PAID or PENDING (which implies overdue if date passed)
  alertEnabled: boolean;
  balance?: number; // Remaining amount to pay
}

export interface MessageTemplate {
  id: string;
  title: string;
  category: string;
  content: string;
  color: string;
}

export interface AppSettings {
  companyName: string;
  logo?: string; // Base64 image string
  cpfCnpj: string;
  email: string;
  phone: string;
  pixKeyType: string;
  pixKey: string;
  dashboardCards: {
    sales: boolean;
    expenses: boolean;
    salesCount: boolean;
    receivables: boolean;
    payables: boolean;
    birthdays: boolean;
  };
  alertsEnabled: boolean;
  autoBackup: boolean;
}

export type LicensePlan = 'TRIAL' | 'MENSAL' | 'ANUAL' | 'VITALICIO';

export interface LicenseState {
  trialStartDate: number;
  licenseKey: string;
  isActive: boolean;
  isTrial: boolean;
  planType: LicensePlan;
  activationDate?: number;
  keyHistory: Record<string, number>; // Map key -> year used
}

export interface Transaction {
  id: string;
  clientId?: string; // If linked to a client payment
  payableId?: string; // If linked to a manual payable
  description: string;
  value: number;
  date: string; // YYYY-MM-DD
  type: TransactionType;
}
