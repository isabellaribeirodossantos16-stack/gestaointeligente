
import { Client, Plan, Payable, AppSettings, LicenseState, Transaction, MessageTemplate } from '../types';

const KEYS = {
  CLIENTS: 'gp_clients',
  PLANS: 'gp_plans',
  PAYABLES: 'gp_payables',
  SETTINGS: 'gp_settings',
  LICENSE: 'gp_license',
  TRANSACTIONS: 'gp_transactions',
  MESSAGES: 'gp_messages'
};

// Initial Data Helpers
const defaultSettings: AppSettings = {
  companyName: 'Minha Empresa',
  logo: '',
  cpfCnpj: '',
  email: '',
  phone: '',
  pixKeyType: 'CPF',
  pixKey: '',
  dashboardCards: { sales: true, expenses: true, salesCount: true, receivables: true, payables: true, birthdays: true },
  alertsEnabled: true,
  autoBackup: false
};

const defaultLicense: LicenseState = {
  trialStartDate: Date.now(),
  licenseKey: '',
  isActive: true,
  isTrial: true,
  planType: 'TRIAL',
  keyHistory: {}
};

export const storageService = {
  // Generic Getters/Setters
  getData: <T>(key: string, defaultValue: T): T => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key}`, e);
      return defaultValue;
    }
  },
  setData: <T>(key: string, data: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key}`, e);
    }
  },

  // Specific Entities
  getClients: (): Client[] => storageService.getData(KEYS.CLIENTS, []),
  saveClients: (data: Client[]) => storageService.setData(KEYS.CLIENTS, data),

  getPlans: (): Plan[] => storageService.getData(KEYS.PLANS, []),
  savePlans: (data: Plan[]) => storageService.setData(KEYS.PLANS, data),

  getPayables: (): Payable[] => storageService.getData(KEYS.PAYABLES, []),
  savePayables: (data: Payable[]) => storageService.setData(KEYS.PAYABLES, data),

  getTransactions: (): Transaction[] => storageService.getData(KEYS.TRANSACTIONS, []),
  saveTransactions: (data: Transaction[]) => storageService.setData(KEYS.TRANSACTIONS, data),

  getMessages: (): MessageTemplate[] => storageService.getData(KEYS.MESSAGES, []),
  saveMessages: (data: MessageTemplate[]) => storageService.setData(KEYS.MESSAGES, data),

  getSettings: (): AppSettings => storageService.getData(KEYS.SETTINGS, defaultSettings),
  saveSettings: (data: AppSettings) => {
    storageService.setData(KEYS.SETTINGS, data);
    // Dispatch event so App.tsx can react
    window.dispatchEvent(new Event('settings-updated'));
  },

  getLicense: (): LicenseState => {
    const lic = storageService.getData(KEYS.LICENSE, defaultLicense);
    // Ensure trial start date persists correctly if it was missing
    if (!lic.trialStartDate) lic.trialStartDate = Date.now();
    // Ensure planType exists (migration for old data)
    if (!lic.planType) lic.planType = 'TRIAL';
    // Ensure keyHistory exists
    if (!lic.keyHistory) lic.keyHistory = {};
    return lic;
  },
  saveLicense: (data: LicenseState) => storageService.setData(KEYS.LICENSE, data),

  // Backup Features
  createBackup: () => {
    const backup = {
      clients: storageService.getClients(),
      plans: storageService.getPlans(),
      payables: storageService.getPayables(),
      transactions: storageService.getTransactions(),
      messages: storageService.getMessages(),
      settings: storageService.getSettings(),
      // License is usually NOT backed up to prevent trial resetting via restore, 
      // but requirements say "Restore Data". We'll exclude license to be safe/secure-ish.
      timestamp: Date.now()
    };
    return JSON.stringify(backup);
  },
  restoreBackup: (jsonString: string): boolean => {
    try {
      const backup = JSON.parse(jsonString);
      if (backup.clients) storageService.saveClients(backup.clients);
      if (backup.plans) storageService.savePlans(backup.plans);
      if (backup.payables) storageService.savePayables(backup.payables);
      if (backup.transactions) storageService.saveTransactions(backup.transactions);
      if (backup.messages) storageService.saveMessages(backup.messages);
      if (backup.settings) storageService.saveSettings(backup.settings); // Will trigger event via saveSettings? No, direct save doesn't trigger unless we call helper.
      window.dispatchEvent(new Event('settings-updated'));
      return true;
    } catch (e) {
      console.error("Restore failed", e);
      return false;
    }
  }
};
