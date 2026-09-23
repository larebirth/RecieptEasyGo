export type ExpenseCategory =
  | 'Meals & Dining'
  | 'Transportation'
  | 'Groceries'
  | 'Shopping & Retail'
  | 'Utilities & Telecom'
  | 'Office Supplies'
  | 'Entertainment'
  | 'Health & Medical'
  | 'Travel & Lodging'
  | 'Other';

export interface ReceiptItem {
  name: string;
  quantity?: number;
  price: number;
}

export interface Receipt {
  id: string;
  date: string; // YYYY-MM-DD
  merchantName: string;
  category: ExpenseCategory;
  totalAmount: number;
  currency: string; // Default: 'HKD'
  notes: string;
  taxOrServiceCharge?: number;
  paymentMethod?: string;
  items?: ReceiptItem[];
  isHandwritten?: boolean;
  confidenceScore?: number;
  createdAt: string;
  imageUrl?: string;
  syncedToSheets?: boolean;
}

export interface MonthlySheetRecord {
  spreadsheetId: string;
  spreadsheetUrl: string;
  name: string;
  lastSyncedAt?: string;
  count?: number;
}

export interface GoogleSheetsConfig {
  folderName: string;
  folderId?: string;
  folderUrl?: string;
  spreadsheetName: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  webhookUrl?: string;
  generationMode: 'monthly' | 'single'; // Default: 'monthly'
  userName: string; // e.g. "lifeafterrebirth"
  monthlySheets?: Record<string, MonthlySheetRecord>;
  consolidatedSheetId?: string;
  consolidatedSheetUrl?: string;
}

export interface FilterState {
  searchQuery: string;
  category: string; // 'all' | ExpenseCategory
  dateRange: 'all' | 'this_month' | 'last_30_days' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  handwrittenOnly: boolean;
  sortBy: 'date' | 'totalAmount' | 'merchantName' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}
