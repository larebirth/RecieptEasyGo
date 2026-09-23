import { Receipt } from '../types';

export const SHEET_HEADERS = [
  '交易日期 (Date)',
  '商戶名稱 / 車牌 (Merchant / Taxi)',
  '費目類別 (Category)',
  '總金額 (HKD)',
  '幣別 (Currency)',
  '付款方式 (Payment Method)',
  '服務費 / 加一 (Service Charge)',
  '手寫收據 (Handwritten)',
  '商品分項明細 (Item Breakdown)',
  '手帳備忘與行車路線 (Notes & Route)',
  '貼入手帳時間 (Created At)',
];

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface DriveSpreadsheetInfo {
  id: string;
  name: string;
  webViewLink?: string;
}

/**
 * Format yearMonth key (e.g., "2026-09" from "2026-09-20")
 */
export function getYearMonth(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  const clean = dateStr.trim();
  if (clean.length >= 7) {
    return clean.substring(0, 7);
  }
  return clean;
}

/**
 * Convert "2026-09" to "2026年09月"
 */
export function formatYearMonthZh(yearMonth: string): string {
  const parts = yearMonth.split('-');
  if (parts.length >= 2) {
    return `${parts[0]}年${parts[1]}月`;
  }
  return yearMonth;
}

/**
 * Generate monthly spreadsheet name according to requirements:
 * "而 Google 試算表的名稱就會放當日的月份以及使用者的名稱"
 * E.g.: "2026年09月支出手帳 · 陳大文" or "2026年09月支出手帳 · lifeafterrebirth"
 */
export function getMonthlySpreadsheetName(yearMonth: string, userName?: string): string {
  const ymZh = formatYearMonthZh(yearMonth);
  const cleanUser = userName?.trim() || '使用者';
  return `${ymZh}支出手帳 · ${cleanUser}`;
}

/**
 * Generate consolidated all-receipts spreadsheet name
 * E.g.: "全部支出總表 · 陳大文"
 */
export function getAllReceiptsSpreadsheetName(userName?: string): string {
  const cleanUser = userName?.trim() || '使用者';
  return `全部支出總表 · ${cleanUser}`;
}

/**
 * Find or create a specific folder in Google Drive
 */
export async function findOrCreateFolder(
  accessToken: string,
  folderName: string
): Promise<DriveFolderInfo> {
  const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,webViewLink)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const err = await searchRes.text();
    throw new Error(`搜尋 Google 雲端硬碟檔案夾失敗 (${searchRes.status}): ${err}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existing = searchData.files[0];
    return {
      id: existing.id,
      name: existing.name,
      webViewLink: existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
    };
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`建立 Google 雲端硬碟檔案夾失敗: ${err}`);
  }

  const created = await createRes.json();
  return {
    id: created.id,
    name: created.name,
    webViewLink: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
  };
}

/**
 * Find or create a Google Spreadsheet inside a specific folder
 */
export async function findOrCreateSpreadsheetInFolder(
  accessToken: string,
  folderId: string,
  spreadsheetName: string
): Promise<DriveSpreadsheetInfo> {
  const query = `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and name = '${spreadsheetName.replace(/'/g, "\\'")}' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,webViewLink)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const err = await searchRes.text();
    throw new Error(`搜尋 Google 試算表失敗 (${searchRes.status}): ${err}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existing = searchData.files[0];
    return {
      id: existing.id,
      name: existing.name,
      webViewLink: existing.webViewLink || `https://docs.google.com/spreadsheets/d/${existing.id}/edit`,
    };
  }

  // Create new spreadsheet directly inside the target folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: spreadsheetName,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [folderId],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`建立 Google 試算表失敗: ${err}`);
  }

  const created = await createRes.json();
  const spreadsheetId = created.id;

  // Initialize sheet with header row
  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: 'A1',
          majorDimension: 'ROWS',
          values: [SHEET_HEADERS],
        }),
      }
    );
  } catch (err) {
    console.warn('Could not initialize headers:', err);
  }

  return {
    id: spreadsheetId,
    name: created.name,
    webViewLink: created.webViewLink || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/**
 * Find or create a monthly Google Spreadsheet
 */
export async function findOrCreateMonthlySpreadsheet(
  accessToken: string,
  folderId: string,
  yearMonth: string,
  userName?: string
): Promise<DriveSpreadsheetInfo> {
  const name = getMonthlySpreadsheetName(yearMonth, userName);
  return findOrCreateSpreadsheetInFolder(accessToken, folderId, name);
}

/**
 * Format receipt data into row array for Google Sheets
 */
export function receiptToSheetRow(r: Receipt): (string | number)[] {
  const itemsText =
    r.items && r.items.length > 0
      ? r.items.map((i) => `${i.name} x${i.quantity || 1} ($${i.price})`).join('; ')
      : '';

  return [
    r.date,
    r.merchantName,
    r.category,
    r.totalAmount,
    r.currency || 'HKD',
    r.paymentMethod || '未指定',
    r.taxOrServiceCharge || 0,
    r.isHandwritten ? '是 (Yes)' : '否 (No)',
    itemsText,
    r.notes || '',
    r.createdAt ? new Date(r.createdAt).toLocaleString('zh-HK') : '',
  ];
}

/**
 * Check if the spreadsheet already has headers, and append receipts
 */
export async function appendReceiptsToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  receipts: Receipt[]
): Promise<{ updatedRows: number }> {
  if (receipts.length === 0) return { updatedRows: 0 };

  // Check if first cell has header
  let needsHeader = false;
  try {
    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:A1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (!checkData.values || checkData.values.length === 0 || !checkData.values[0][0]) {
        needsHeader = true;
      }
    } else {
      needsHeader = true;
    }
  } catch {
    needsHeader = false;
  }

  const rows: (string | number)[][] = receipts.map(receiptToSheetRow);
  const valuesToAppend = needsHeader ? [SHEET_HEADERS, ...rows] : rows;

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'A1',
        majorDimension: 'ROWS',
        values: valuesToAppend,
      }),
    }
  );

  if (!appendRes.ok) {
    const err = await appendRes.text();
    throw new Error(`寫入 Google 試算表失敗 (${appendRes.status}): ${err}`);
  }

  const data = await appendRes.json();
  const updatedRows = data.updates?.updatedRows || receipts.length;
  return { updatedRows };
}

/**
 * Sync receipts to a specific month's Google Spreadsheet
 */
export async function syncReceiptsToMonthlySpreadsheet(
  accessToken: string,
  folderId: string,
  yearMonth: string,
  receipts: Receipt[],
  userName?: string
): Promise<{ spreadsheetId: string; url: string; name: string; updatedRows: number }> {
  const sheetInfo = await findOrCreateMonthlySpreadsheet(accessToken, folderId, yearMonth, userName);
  const appendResult = await appendReceiptsToSpreadsheet(accessToken, sheetInfo.id, receipts);
  return {
    spreadsheetId: sheetInfo.id,
    url: sheetInfo.webViewLink || `https://docs.google.com/spreadsheets/d/${sheetInfo.id}/edit`,
    name: sheetInfo.name,
    updatedRows: appendResult.updatedRows,
  };
}

/**
 * Export ALL receipts into a consolidated Google Spreadsheet:
 * "全部支出總表 · ${userName}"
 */
export async function exportAllReceiptsToGoogleSheet(
  accessToken: string,
  folderId: string,
  receipts: Receipt[],
  userName?: string
): Promise<{ spreadsheetId: string; url: string; name: string; updatedRows: number }> {
  const name = getAllReceiptsSpreadsheetName(userName);
  const sheetInfo = await findOrCreateSpreadsheetInFolder(accessToken, folderId, name);
  const appendResult = await appendReceiptsToSpreadsheet(accessToken, sheetInfo.id, receipts);
  return {
    spreadsheetId: sheetInfo.id,
    url: sheetInfo.webViewLink || `https://docs.google.com/spreadsheets/d/${sheetInfo.id}/edit`,
    name: sheetInfo.name,
    updatedRows: appendResult.updatedRows,
  };
}

/**
 * Batch generate/sync all receipts grouped by month into each month's separate spreadsheet
 */
export async function batchSyncAllMonthsToDrive(
  accessToken: string,
  folderId: string,
  receipts: Receipt[],
  userName?: string
): Promise<Array<{ month: string; spreadsheetId: string; url: string; name: string; updatedRows: number }>> {
  // Group receipts by YYYY-MM
  const groups: Record<string, Receipt[]> = {};
  for (const r of receipts) {
    const ym = getYearMonth(r.date);
    if (!groups[ym]) groups[ym] = [];
    groups[ym].push(r);
  }

  const results: Array<{ month: string; spreadsheetId: string; url: string; name: string; updatedRows: number }> = [];

  for (const [ym, monthReceipts] of Object.entries(groups)) {
    const res = await syncReceiptsToMonthlySpreadsheet(accessToken, folderId, ym, monthReceipts, userName);
    results.push({
      month: ym,
      spreadsheetId: res.spreadsheetId,
      url: res.url,
      name: res.name,
      updatedRows: res.updatedRows,
    });
  }

  return results;
}
