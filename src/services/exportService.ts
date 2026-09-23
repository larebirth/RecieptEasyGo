import * as XLSX from 'xlsx';
import { Receipt } from '../types';

/**
 * Download receipts as standard UTF-8 encoded CSV with BOM
 * so Chinese characters (繁體中文) render perfectly in Microsoft Excel and Google Sheets.
 */
export function exportToCSV(receipts: Receipt[], filename = 'HK_收據明細匯出.csv') {
  const headers = [
    '日期 (Date)',
    '商戶名稱/的士 (Merchant)',
    '費目類別 (Category)',
    '金額 (Total Amount)',
    '幣別 (Currency)',
    '付款方式 (Payment Method)',
    '加一/服務費 (Service Charge)',
    '手寫收據 (Handwritten)',
    '分項明細 (Items)',
    '手帳備忘與路線 (Notes)',
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = receipts.map((r) => {
    const itemsStr = r.items && r.items.length > 0
      ? r.items.map((i) => `${i.name} (x${i.quantity || 1} @ $${i.price})`).join('; ')
      : '';

    return [
      escapeCSV(r.date),
      escapeCSV(r.merchantName),
      escapeCSV(r.category),
      r.totalAmount.toFixed(2),
      escapeCSV(r.currency),
      escapeCSV(r.paymentMethod || 'Unknown'),
      r.taxOrServiceCharge ? r.taxOrServiceCharge.toFixed(2) : '0.00',
      r.isHandwritten ? 'Yes' : 'No',
      escapeCSV(itemsStr),
      escapeCSV(r.notes),
    ].join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) for Excel compatibility
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export receipts to Microsoft Excel (.xlsx) file using SheetJS (xlsx)
 */
export function exportToExcel(receipts: Receipt[], filename = 'HK_收據明細匯出.xlsx') {
  const data = receipts.map((r) => {
    const itemsStr = r.items && r.items.length > 0
      ? r.items.map((i) => `${i.name} x${i.quantity || 1} ($${i.price})`).join(', ')
      : '';

    return {
      '日期 (Date)': r.date,
      '商戶名稱 / 的士車牌': r.merchantName,
      '費目類別 (Category)': r.category,
      '總金額 (Amount)': r.totalAmount,
      '幣別': r.currency,
      '付款方式': r.paymentMethod || '未指定',
      '加一 / 服務費': r.taxOrServiceCharge || 0,
      '手寫單據': r.isHandwritten ? '是 (Yes)' : '否 (No)',
      '商品明細': itemsStr,
      '手帳備忘與行車路線': r.notes,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 14 }, // Date
    { wch: 30 }, // Merchant
    { wch: 20 }, // Category
    { wch: 15 }, // Amount
    { wch: 10 }, // Currency
    { wch: 16 }, // Payment
    { wch: 14 }, // Service
    { wch: 16 }, // Handwritten
    { wch: 35 }, // Items
    { wch: 45 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '香港收據記錄');
  XLSX.writeFile(workbook, filename);
}

/**
 * Formats receipts into TSV (Tab Separated Values) and copies to clipboard.
 * Allows users to simply switch to Google Sheets and press Ctrl+V / Cmd+V to paste perfectly!
 */
export async function copyForGoogleSheets(receipts: Receipt[]): Promise<boolean> {
  const headers = [
    '日期',
    '商戶名稱/的士車牌',
    '費目類別',
    '金額 (HKD)',
    '幣別',
    '付款方式',
    '手帳備忘與路線',
  ];

  const rows = receipts.map((r) => [
    r.date,
    r.merchantName.replace(/\t/g, ' '),
    r.category,
    r.totalAmount.toFixed(2),
    r.currency,
    r.paymentMethod || 'Unknown',
    r.notes.replace(/[\t\r\n]/g, ' '),
  ]);

  const tsv = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');

  try {
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch (err) {
    console.error('Clipboard write failed:', err);
    return false;
  }
}

/**
 * Sends receipts to a Google Sheets Apps Script Webhook
 */
export async function appendToGoogleSheetsWebhook(
  webhookUrl: string,
  receipts: Receipt[]
): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/google-sheets/append', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      webhookUrl,
      receipts: receipts.map((r) => ({
        date: r.date,
        merchantName: r.merchantName,
        category: r.category,
        totalAmount: r.totalAmount,
        currency: r.currency,
        paymentMethod: r.paymentMethod,
        notes: r.notes,
        isHandwritten: r.isHandwritten,
      })),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to append to Google Sheets');
  }

  return {
    success: true,
    message: data.message || 'Appended successfully',
  };
}
