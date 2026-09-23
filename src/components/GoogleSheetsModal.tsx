import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  FolderSync,
  Folder,
  LogOut,
  RefreshCw,
  Send,
  Code,
  Calendar,
  User as UserIcon,
  DownloadCloud,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Receipt, GoogleSheetsConfig, MonthlySheetRecord } from '../types';
import {
  googleSignIn,
  googleLogout,
  getAccessToken,
  initAuth,
} from '../services/googleAuthService';
import {
  findOrCreateFolder,
  findOrCreateSpreadsheetInFolder,
  appendReceiptsToSpreadsheet,
  getYearMonth,
  formatYearMonthZh,
  getMonthlySpreadsheetName,
  getAllReceiptsSpreadsheetName,
  syncReceiptsToMonthlySpreadsheet,
  exportAllReceiptsToGoogleSheet,
  batchSyncAllMonthsToDrive,
} from '../services/googleDriveSheetsService';
import {
  copyForGoogleSheets,
  appendToGoogleSheetsWebhook,
  exportToCSV,
  exportToExcel,
} from '../services/exportService';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipts: Receipt[];
  selectedReceipts?: Receipt[];
  config: GoogleSheetsConfig;
  onSaveConfig: (cfg: GoogleSheetsConfig) => void;
  onShowToast?: (msg: string) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  receipts,
  selectedReceipts,
  config,
  onSaveConfig,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'instant' | 'webhook'>('oauth');

  // Google Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Folder & User settings
  const [folderName, setFolderName] = useState(config.folderName || '香港收據手帳');
  const [folderId, setFolderId] = useState(config.folderId || '');
  const [folderUrl, setFolderUrl] = useState(config.folderUrl || '');
  const [userName, setUserName] = useState(
    config.userName || '手帳使用者'
  );

  // Mode: monthly (default) or single
  const [generationMode, setGenerationMode] = useState<'monthly' | 'single'>(
    config.generationMode || 'monthly'
  );

  // Single spreadsheet settings (if single mode chosen)
  const [spreadsheetName, setSpreadsheetName] = useState(
    config.spreadsheetName || '香港收據手帳 · 記帳總表'
  );
  const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheetId || '');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(config.spreadsheetUrl || '');

  // Consolidated sheet
  const [consolidatedUrl, setConsolidatedUrl] = useState(config.consolidatedSheetUrl || '');

  // Auto-sync setting
  const [autoSync, setAutoSync] = useState(config.autoSync || false);
  const [isInitializingDrive, setIsInitializingDrive] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  // Instant Copy state
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Webhook fallback state
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl || '');
  const [webhookStatus, setWebhookStatus] = useState<{
    loading: boolean;
    message: string | null;
    error: boolean;
  }>({ loading: false, message: null, error: false });
  const [showScriptCode, setShowScriptCode] = useState(false);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setCurrentUser(user);
        setAuthError(null);
        // Automatically default user name if available and not custom
        if (user && (!config.userName || config.userName === '手帳使用者')) {
          const defaultName = user.displayName || user.email?.split('@')[0] || '手帳使用者';
          setUserName(defaultName);
        }
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [config.userName]);

  // Update local states when config prop changes
  useEffect(() => {
    setFolderName(config.folderName || '香港收據手帳');
    setSpreadsheetName(config.spreadsheetName || '香港收據手帳 · 記帳總表');
    setFolderId(config.folderId || '');
    setFolderUrl(config.folderUrl || '');
    setSpreadsheetId(config.spreadsheetId || '');
    setSpreadsheetUrl(config.spreadsheetUrl || '');
    setAutoSync(config.autoSync || false);
    setWebhookUrl(config.webhookUrl || '');
    setGenerationMode(config.generationMode || 'monthly');
    setConsolidatedUrl(config.consolidatedSheetUrl || '');
    if (config.userName) {
      setUserName(config.userName);
    }
  }, [config]);

  // Target receipts for operations
  const targetReceipts =
    selectedReceipts && selectedReceipts.length > 0 ? selectedReceipts : receipts;

  // Group receipts by month
  const receiptMonths = useMemo(() => {
    const map: Record<string, Receipt[]> = {};
    for (const r of targetReceipts) {
      const ym = getYearMonth(r.date);
      if (!map[ym]) map[ym] = [];
      map[ym].push(r);
    }
    return Object.keys(map).sort((a, b) => b.localeCompare(a));
  }, [targetReceipts]);

  // Live preview of monthly sheet name
  const currentMonthKey = getYearMonth();
  const previewMonthlyName = getMonthlySpreadsheetName(currentMonthKey, userName);
  const previewConsolidatedName = getAllReceiptsSpreadsheetName(userName);

  if (!isOpen) return null;

  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        const resolvedName =
          userName && userName !== '手帳使用者'
            ? userName
            : result.user.displayName || result.user.email?.split('@')[0] || '手帳使用者';
        setUserName(resolvedName);
        // Automatically setup folder & sheet right after login
        await handleSetupFolderAndSheet(result.accessToken, resolvedName);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError(err?.message || 'Google 帳戶登入失敗，請重試。');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleLogout();
      setCurrentUser(null);
      setSyncFeedback({ success: true, message: '已登出 Google 帳戶。' });
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  // Find or create the Drive folder
  const handleSetupFolderAndSheet = async (providedToken?: string, nameOverride?: string) => {
    const token = providedToken || (await getAccessToken());
    if (!token) {
      setSyncFeedback({
        success: false,
        message: '請先登入 Google 帳戶以連結雲端硬碟。',
      });
      return;
    }

    setIsInitializingDrive(true);
    setSyncFeedback(null);

    try {
      // 1. Find or create designated folder
      const targetFolder = folderName.trim() || '香港收據手帳';
      const folderResult = await findOrCreateFolder(token, targetFolder);
      setFolderId(folderResult.id);
      setFolderUrl(folderResult.webViewLink || '');

      const activeUserName = nameOverride || userName;

      // 2. If single mode, find or create single sheet
      let updatedSheetId = spreadsheetId;
      let updatedSheetUrl = spreadsheetUrl;
      if (generationMode === 'single') {
        const targetSheet = spreadsheetName.trim() || '香港收據手帳 · 記帳總表';
        const sheetResult = await findOrCreateSpreadsheetInFolder(
          token,
          folderResult.id,
          targetSheet
        );
        updatedSheetId = sheetResult.id;
        updatedSheetUrl = sheetResult.webViewLink || '';
        setSpreadsheetId(sheetResult.id);
        setSpreadsheetUrl(sheetResult.webViewLink || '');
      }

      // Update config
      const updatedConfig: GoogleSheetsConfig = {
        ...config,
        folderName: targetFolder,
        folderId: folderResult.id,
        folderUrl: folderResult.webViewLink,
        userName: activeUserName,
        generationMode,
        spreadsheetName,
        spreadsheetId: updatedSheetId,
        spreadsheetUrl: updatedSheetUrl,
        autoSync,
      };
      onSaveConfig(updatedConfig);

      setSyncFeedback({
        success: true,
        message: `已成功在 Google 雲端硬碟「${targetFolder}」建立/連結檔案夾！`,
      });
      if (onShowToast) onShowToast('Google 雲端硬碟專屬檔案夾已就緒！');
    } catch (err: any) {
      console.error('Setup error:', err);
      setSyncFeedback({
        success: false,
        message: err?.message || '建立檔案夾時發生錯誤。',
      });
    } finally {
      setIsInitializingDrive(false);
    }
  };

  // 1. Export ALL receipts to a consolidated Google Sheet (全部匯出所有成為 Google 試算表)
  const handleExportAllToGoogleSheet = async () => {
    let token = await getAccessToken();
    if (!token) {
      setSyncFeedback({
        success: false,
        message: '請先登入 Google 帳戶以進行全部匯出。',
      });
      return;
    }

    setIsExportingAll(true);
    setSyncFeedback(null);

    try {
      // Ensure folder exists
      const targetFolder = folderName.trim() || '香港收據手帳';
      let currentFolderId = folderId;
      if (!currentFolderId) {
        const folderResult = await findOrCreateFolder(token, targetFolder);
        currentFolderId = folderResult.id;
        setFolderId(folderResult.id);
        setFolderUrl(folderResult.webViewLink || '');
      }

      // Export all to consolidated sheet
      const result = await exportAllReceiptsToGoogleSheet(
        token,
        currentFolderId,
        targetReceipts,
        userName
      );

      setConsolidatedUrl(result.url);

      const now = new Date().toISOString();
      const updatedConfig: GoogleSheetsConfig = {
        ...config,
        folderName,
        folderId: currentFolderId,
        folderUrl,
        userName,
        generationMode,
        consolidatedSheetId: result.spreadsheetId,
        consolidatedSheetUrl: result.url,
        lastSyncedAt: now,
      };
      onSaveConfig(updatedConfig);

      setSyncFeedback({
        success: true,
        message: `已成功將全數 ${targetReceipts.length} 筆收據匯出至「${result.name}」！`,
      });
      if (onShowToast) onShowToast(`全數 ${targetReceipts.length} 筆收據已匯出至 Google 試算表！`);
    } catch (err: any) {
      console.error('Export all error:', err);
      setSyncFeedback({
        success: false,
        message: err?.message || '全部匯出至 Google 試算表失敗，請檢查權限。',
      });
    } finally {
      setIsExportingAll(false);
    }
  };

  // 2. Batch generate monthly sheets (按月份分別生成試算表)
  const handleBatchSyncMonthlySheets = async () => {
    let token = await getAccessToken();
    if (!token) {
      setSyncFeedback({
        success: false,
        message: '請先登入 Google 帳戶以生成各月份試算表。',
      });
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const targetFolder = folderName.trim() || '香港收據手帳';
      let currentFolderId = folderId;
      if (!currentFolderId) {
        const folderResult = await findOrCreateFolder(token, targetFolder);
        currentFolderId = folderResult.id;
        setFolderId(folderResult.id);
        setFolderUrl(folderResult.webViewLink || '');
      }

      const results = await batchSyncAllMonthsToDrive(
        token,
        currentFolderId,
        targetReceipts,
        userName
      );

      const newMonthlyMap: Record<string, MonthlySheetRecord> = {
        ...(config.monthlySheets || {}),
      };

      for (const item of results) {
        newMonthlyMap[item.month] = {
          spreadsheetId: item.spreadsheetId,
          spreadsheetUrl: item.url,
          name: item.name,
          lastSyncedAt: new Date().toISOString(),
          count: item.updatedRows,
        };
      }

      const updatedConfig: GoogleSheetsConfig = {
        ...config,
        folderName,
        folderId: currentFolderId,
        folderUrl,
        userName,
        generationMode: 'monthly',
        monthlySheets: newMonthlyMap,
        lastSyncedAt: new Date().toISOString(),
      };
      onSaveConfig(updatedConfig);

      setSyncFeedback({
        success: true,
        message: `已成功按月生成 ${results.length} 個月份的 Google 試算表！`,
      });
      if (onShowToast) onShowToast(`已成功為 ${results.length} 個月份生成獨立 Google 試算表！`);
    } catch (err: any) {
      console.error('Batch monthly sync error:', err);
      setSyncFeedback({
        success: false,
        message: err?.message || '按月份生成 Google 試算表失敗。',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle toggling auto-sync
  const handleToggleAutoSync = (checked: boolean) => {
    setAutoSync(checked);
    onSaveConfig({
      ...config,
      folderName,
      folderId,
      folderUrl,
      userName,
      generationMode,
      spreadsheetName,
      spreadsheetId,
      spreadsheetUrl,
      autoSync: checked,
    });
    if (onShowToast) {
      onShowToast(checked ? '已啟用「自動同步至 Google 試算表」' : '已停用自動同步');
    }
  };

  // Save general name & mode changes
  const handleSavePreferences = () => {
    onSaveConfig({
      ...config,
      folderName,
      folderId,
      folderUrl,
      userName,
      generationMode,
      spreadsheetName,
      spreadsheetId,
      spreadsheetUrl,
      autoSync,
    });
    if (onShowToast) onShowToast('設定已儲存！');
  };

  // Instant Copy
  const handleCopyClipboard = async () => {
    const success = await copyForGoogleSheets(targetReceipts);
    if (success) {
      setCopyStatus('已成功複製！請在 Google 試算表按 Ctrl+V（Mac: Cmd+V）直接貼上。');
      setTimeout(() => setCopyStatus(null), 4000);
    } else {
      setCopyStatus('複製到剪貼簿失敗。');
    }
  };

  // Apps Script Webhook
  const handleSaveWebhookConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...config,
      webhookUrl: webhookUrl.trim(),
      autoSync,
    });
    setWebhookStatus({
      loading: false,
      message: '設定已儲存。',
      error: false,
    });
  };

  const handleTestWebhookSync = async () => {
    if (!webhookUrl.trim()) {
      setWebhookStatus({
        loading: false,
        message: '請輸入 Apps Script Webhook 網址。',
        error: true,
      });
      return;
    }

    setWebhookStatus({
      loading: true,
      message: '正在傳送至 Google 試算表...',
      error: false,
    });
    try {
      const res = await appendToGoogleSheetsWebhook(webhookUrl.trim(), targetReceipts);
      setWebhookStatus({ loading: false, message: `完成：${res.message}`, error: false });
      onSaveConfig({
        ...config,
        webhookUrl: webhookUrl.trim(),
        autoSync,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      setWebhookStatus({
        loading: false,
        message: err?.message || '傳送失敗，請檢查網址或權限。',
        error: true,
      });
    }
  };

  const appsScriptTemplate = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  var receipts = data.receipts || [];
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["交易日期", "商戶/車牌", "費目", "金額 (HKD)", "幣別", "付款方式", "手帳備忘", "手寫的士"]);
    sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#fdfbf7");
  }
  
  for (var i = 0; i < receipts.length; i++) {
    var r = receipts[i];
    sheet.appendRow([r.date, r.merchantName, r.category, r.totalAmount, r.currency, r.paymentMethod, r.notes, r.isHandwritten ? "Yes" : "No"]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success", count: receipts.length }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2E2820]/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#FFFDF9] rounded-2xl max-w-2xl w-full shadow-2xl border border-[#DFD6C6] overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-[#E8E1D3] flex items-center justify-between bg-[#FAF6EE]">
          <div className="absolute top-0 left-8 -mt-1 w-20 h-3.5 washi-tape washi-tape-matcha rounded-xs shadow-tape" />

          <div className="flex items-center gap-2.5 pt-1">
            <div className="w-8 h-8 rounded-xl bg-[#E8F0E5] text-[#3B6637] flex items-center justify-center shadow-2xs border border-[#C5D8C1]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2D2A26] font-['Zen_Maru_Gothic'] flex items-center gap-1.5">
                <span>Google 試算表與雲端硬碟同步</span>
                {autoSync && (
                  <span className="text-[10px] font-bold bg-[#E1EEDD] text-[#2C5228] px-2 py-0.5 rounded-full border border-[#BCD4B5]">
                    自動同步中
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#7A7061]">
                依月份自動生成試算表 · 支援一鍵全部匯出至 Google 試算表
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C8070] hover:text-[#2D2A26] hover:bg-[#EFE8DC] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#EAE3D5] px-4 bg-[#FFFDF9] overflow-x-auto">
          <button
            onClick={() => setActiveTab('oauth')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all shrink-0 font-['Zen_Maru_Gothic'] flex items-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'border-[#3B6637] text-[#3B6637]'
                : 'border-transparent text-[#7A7061] hover:text-[#2D2A26]'
            }`}
          >
            <FolderSync className="w-3.5 h-3.5" />
            Google 帳戶自動同步 (每月生成)
          </button>
          <button
            onClick={() => setActiveTab('instant')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all shrink-0 font-['Zen_Maru_Gothic'] flex items-center gap-1.5 ${
              activeTab === 'instant'
                ? 'border-[#3B6637] text-[#3B6637]'
                : 'border-transparent text-[#7A7061] hover:text-[#2D2A26]'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            一鍵複製貼入
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all shrink-0 font-['Zen_Maru_Gothic'] flex items-center gap-1.5 ${
              activeTab === 'webhook'
                ? 'border-[#3B6637] text-[#3B6637]'
                : 'border-transparent text-[#7A7061] hover:text-[#2D2A26]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Apps Script Webhook
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-[#FAF7F0]/40">
          {activeTab === 'oauth' && (
            <div className="space-y-4">
              {/* 1. Google Account Login Status */}
              <div className="p-4 bg-[#FFFDF9] border border-[#E3DAC8] rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#554C3E] flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                    <span>1. Google 帳戶連線狀態</span>
                  </div>
                  {currentUser && (
                    <span className="text-[11px] font-bold text-[#2C5228] bg-[#E8F3E5] px-2 py-0.5 rounded-full border border-[#BCD4B5] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#3B6637]" />
                      已登入連線
                    </span>
                  )}
                </div>

                {!currentUser ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <div className="text-xs text-[#7A7061] leading-relaxed">
                      登入 Google 帳戶後，系統會自動在雲端硬碟專屬檔案夾按月份建立試算表，並支援一鍵全部匯出。
                    </div>

                    <button
                      type="button"
                      disabled={isLoggingIn}
                      onClick={handleGoogleSignIn}
                      className="shrink-0 flex items-center gap-2.5 px-4 py-2 bg-white border border-[#DDD4C5] rounded-xl text-xs font-bold text-[#3C4043] shadow-xs hover:bg-[#F8F9FA] hover:border-[#C5BBAA] transition-all disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                      </svg>
                      <span>{isLoggingIn ? '正在登入...' : '使用 Google 帳戶登入'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAF6EE] p-3 rounded-xl border border-[#EBE3D3]">
                    <div className="flex items-center gap-2.5">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || 'User'}
                          className="w-8 h-8 rounded-full border border-[#D5CABB]"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#5C4D3C] text-white font-bold flex items-center justify-center text-xs">
                          {currentUser.displayName?.[0] || 'G'}
                        </div>
                      )}
                      <div className="text-left">
                        <div className="text-xs font-bold text-[#2D2A26]">
                          {currentUser.displayName || 'Google 使用者'}
                        </div>
                        <div className="text-[11px] text-[#7A7061] font-mono">
                          {currentUser.email}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogout}
                      className="px-2.5 py-1 text-xs font-bold text-[#BA3C2A] hover:bg-[#FCEEEB] rounded-lg transition-colors flex items-center gap-1"
                    >
                      <LogOut className="w-3 h-3" />
                      登出
                    </button>
                  </div>
                )}

                {authError && (
                  <div className="p-2.5 bg-[#FDF2F0] border border-[#F5C6C0] text-[#9E2B1E] rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#BA3C2A] shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}
              </div>

              {/* 2. Generation Mode, User Name, and Naming Rule */}
              <div className="p-4 bg-[#FFFDF9] border border-[#E3DAC8] rounded-2xl shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#554C3E] flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                    <span>2. 每月生成設定與名稱規則 (預設)</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#3B6637] bg-[#E8F0E5] px-2 py-0.5 rounded-full border border-[#C5D8C1]">
                    預設：按月自動生成
                  </span>
                </div>

                {/* Mode Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      generationMode === 'monthly'
                        ? 'bg-[#F2F7F0] border-[#3B6637] text-[#2D2A26]'
                        : 'bg-[#FAF7F0] border-[#DDD4C5] text-[#6B5F4E] hover:bg-[#F5EFE3]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="generationMode"
                      checked={generationMode === 'monthly'}
                      onChange={() => {
                        setGenerationMode('monthly');
                        handleSavePreferences();
                      }}
                      className="mt-0.5 text-[#3B6637] focus:ring-[#3B6637]"
                    />
                    <div>
                      <span className="text-xs font-bold block font-['Zen_Maru_Gothic']">
                        建立每月生成（預設推薦）
                      </span>
                      <span className="text-[11px] text-[#7A7061] block mt-0.5 leading-relaxed">
                        以每個月為單位自動生成專屬試算表，自動帶入月份及使用者名稱。
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      generationMode === 'single'
                        ? 'bg-[#F2F7F0] border-[#3B6637] text-[#2D2A26]'
                        : 'bg-[#FAF7F0] border-[#DDD4C5] text-[#6B5F4E] hover:bg-[#F5EFE3]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="generationMode"
                      checked={generationMode === 'single'}
                      onChange={() => {
                        setGenerationMode('single');
                        handleSavePreferences();
                      }}
                      className="mt-0.5 text-[#3B6637] focus:ring-[#3B6637]"
                    />
                    <div>
                      <span className="text-xs font-bold block font-['Zen_Maru_Gothic']">
                        單一總表記帳模式
                      </span>
                      <span className="text-[11px] text-[#7A7061] block mt-0.5 leading-relaxed">
                        所有月份的收據持續寫入同一份指定試算表中。
                      </span>
                    </div>
                  </label>
                </div>

                {/* User Name & Drive Folder settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B5F4E] mb-1 font-['Zen_Maru_Gothic']">
                      使用者名稱 (用於試算表名稱):
                    </label>
                    <div className="relative">
                      <UserIcon className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="陳大文 或 lifeafterrebirth"
                        className="w-full pl-8 pr-2.5 py-1.5 bg-[#FAF7F0] border border-[#DDD4C5] rounded-xl text-xs font-bold text-[#2D2A26] focus:bg-white focus:ring-2 focus:ring-[#3B6637]/25 focus:border-[#3B6637]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#6B5F4E] mb-1 font-['Zen_Maru_Gothic']">
                      雲端硬碟檔案夾名稱:
                    </label>
                    <div className="relative">
                      <Folder className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        placeholder="香港收據手帳"
                        className="w-full pl-8 pr-2.5 py-1.5 bg-[#FAF7F0] border border-[#DDD4C5] rounded-xl text-xs font-bold text-[#2D2A26] focus:bg-white focus:ring-2 focus:ring-[#3B6637]/25 focus:border-[#3B6637]"
                      />
                    </div>
                  </div>
                </div>

                {/* Dynamic Spreadsheet Name Live Preview */}
                <div className="p-3 bg-[#FAF6EE] rounded-xl border border-[#E8DEC8] space-y-1.5">
                  <div className="text-[11px] font-bold text-[#554C3E] font-['Zen_Maru_Gothic'] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#3B6637]" />
                    <span>依要求規則自動命名的 Google 試算表：</span>
                  </div>
                  <div className="text-xs font-mono text-[#2D2A26] flex items-center justify-between">
                    <span>當月試算表：<strong>{previewMonthlyName}</strong></span>
                  </div>
                  <div className="text-[11px] font-mono text-[#7A7061]">
                    全期總表：<strong>{previewConsolidatedName}</strong>
                  </div>
                </div>
              </div>

              {/* 3. CORE ACTION: 全部匯出所有成為 Google 試算表 (NEW BUTTON) */}
              <div className="p-4 bg-[#F2F7F0] border border-[#CCDDC8] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#2A5227] flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                    <DownloadCloud className="w-4 h-4 text-[#3B6637]" />
                    <span>3. 全部匯出至 Google 試算表 (Export All)</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#3B6637] font-mono">
                    共 {targetReceipts.length} 筆收據
                  </span>
                </div>

                <p className="text-xs text-[#4A6B44] leading-relaxed">
                  點擊下方按鈕，系統會將所有收據一次性匯出成完整 Google 試算表（命名為「{previewConsolidatedName}」），並自動儲存於專屬檔案夾。
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  {/* The requested Export All button */}
                  <button
                    type="button"
                    disabled={isExportingAll || !currentUser}
                    onClick={handleExportAllToGoogleSheet}
                    className="w-full sm:flex-1 py-2 px-4 bg-[#2E5E2A] hover:bg-[#234B20] text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 font-['Zen_Maru_Gothic']"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>
                      {isExportingAll
                        ? '正在全部匯出至 Google 試算表...'
                        : `全部匯出所有收據 (${targetReceipts.length} 筆) 成為 Google 試算表`}
                    </span>
                  </button>

                  {/* Batch Generate Monthly Sheets */}
                  <button
                    type="button"
                    disabled={isSyncing || !currentUser}
                    onClick={handleBatchSyncMonthlySheets}
                    className="w-full sm:w-auto py-2 px-3.5 bg-white hover:bg-[#FAF7F0] text-[#3B6637] border border-[#3B6637] rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 font-['Zen_Maru_Gothic']"
                    title="為每個月份各自生成一份獨立的試算表"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>按月批次生成各月試算表 ({receiptMonths.length} 個月)</span>
                  </button>
                </div>

                {consolidatedUrl && (
                  <div className="p-2.5 bg-white rounded-xl border border-[#BCD4B5] flex items-center justify-between text-xs">
                    <span className="text-[#2C4F29] font-bold">
                      ✓ 已建立全期試算表：{previewConsolidatedName}
                    </span>
                    <a
                      href={consolidatedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3B6637] hover:underline font-bold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      立即打開 ↗
                    </a>
                  </div>
                )}
              </div>

              {/* 4. Auto-Sync Checkbox */}
              <div className="p-4 bg-[#FAF7F0] border border-[#E3DAC8] rounded-2xl space-y-3">
                <div className="text-xs font-bold text-[#554C3E] flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                  <Sparkles className="w-4 h-4 text-[#3B6637]" />
                  <span>4. 自動同步開關 (Auto-Sync)</span>
                </div>

                <label className="flex items-start gap-3 p-3 bg-white border border-[#DDD4C5] rounded-xl cursor-pointer hover:bg-[#FAF8F5] transition-all">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => handleToggleAutoSync(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-[#A5BE9E] text-[#3B6637] focus:ring-[#3B6637]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#2D2A26] block font-['Zen_Maru_Gothic']">
                      勾選開啟：每次掃描或儲存收據後，自動同步至該月份 Google 試算表
                    </span>
                    <span className="text-[11px] text-[#7A7061] block mt-0.5 leading-relaxed">
                      開啟後，每次完成拍照掃描或新增記帳，系統會自動在 Google 雲端硬碟建立或更新當月專屬的試算表（如：{previewMonthlyName}），自動歸檔免手動！
                    </span>
                  </div>
                </label>

                {/* Feedback Message */}
                {syncFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 font-bold animate-in fade-in ${
                      syncFeedback.success
                        ? 'bg-white text-[#2C4F29] border border-[#BCD4B5]'
                        : 'bg-[#FDF2F0] text-[#9E2B1E] border border-[#F5C6C0]'
                    }`}
                  >
                    {syncFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-[#3B6637] shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#BA3C2A] shrink-0" />
                    )}
                    <span>{syncFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* 5. Existing Monthly Sheets in Folder */}
              {config.monthlySheets && Object.keys(config.monthlySheets).length > 0 && (
                <div className="p-4 bg-[#FFFDF9] border border-[#E3DAC8] rounded-2xl shadow-xs space-y-2.5">
                  <div className="text-xs font-bold text-[#554C3E] font-['Zen_Maru_Gothic'] flex items-center justify-between">
                    <span>已生成的各月 Google 試算表：</span>
                    <span className="text-[11px] text-[#7A7061]">
                      共 {Object.keys(config.monthlySheets).length} 份
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {Object.entries(config.monthlySheets).map(([ym, record]) => (
                      <div
                        key={ym}
                        className="flex items-center justify-between p-2 bg-[#FAF6EE] rounded-xl text-xs border border-[#EAE1D2]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#3B6637] font-['Zen_Maru_Gothic']">
                            {formatYearMonthZh(ym)}
                          </span>
                          <span className="text-[11px] text-[#7A7061] font-mono">
                            {record.name}
                          </span>
                        </div>
                        <a
                          href={record.spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#3B6637] hover:underline font-bold text-[11px] flex items-center gap-1 shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                          打開 ↗
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instant Copy Tab */}
          {activeTab === 'instant' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F2F7F0] border border-[#CCDDC8] rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-[#2A5227] font-bold text-sm font-['Zen_Maru_Gothic']">
                  <Sparkles className="w-4 h-4 text-[#3B6637]" />
                  極速貼入（無須登入）
                </div>
                <p className="text-xs text-[#3E633A] leading-relaxed">
                  將日期、商戶、費目、金額及備忘複製成能與 Google 試算表格線完全對齊的格式。
                </p>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <button
                    onClick={handleCopyClipboard}
                    className="flex-1 py-2 px-3.5 bg-[#3B6637] hover:bg-[#2C4F29] text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-all font-['Zen_Maru_Gothic']"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    複製 {targetReceipts.length} 筆資料
                  </button>

                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3.5 bg-white hover:bg-[#FAF7F0] text-[#3B6637] border border-[#3B6637] rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-all font-['Zen_Maru_Gothic']"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    開新 Google 試算表 (sheets.new)
                  </a>
                </div>

                {copyStatus && (
                  <div className="p-2.5 bg-white border border-[#BCD4B5] text-[#2C4F29] rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-[#3B6637] shrink-0" />
                    {copyStatus}
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#FAF6EE] border border-[#E5DAC6] rounded-2xl text-xs space-y-2">
                <div className="font-bold text-[#554C3E] font-['Zen_Maru_Gothic']">
                  使用教學步驟：
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[#695E50]">
                  <li>點擊上方<strong>「複製 {targetReceipts.length} 筆資料」</strong>按鈕。</li>
                  <li>開啟 Google 試算表（或點擊右邊 <strong>sheets.new</strong>）。</li>
                  <li>點選試算表的 <strong>A1 格</strong>。</li>
                  <li>按下 <strong>Ctrl + V</strong> (Mac 用 <strong>Cmd + V</strong>) 直接貼上，全部欄位便會自動排好！</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-[#EAE3D5] flex flex-col sm:flex-row items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#7A7061]">或者直接下載檔案：</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportToCSV(targetReceipts)}
                    className="px-3 py-1.5 bg-[#FFFDF9] border border-[#DDD4C5] hover:bg-[#F5EFE3] rounded-xl text-xs font-bold text-[#554C3E] transition-colors"
                  >
                    下載 CSV
                  </button>
                  <button
                    onClick={() => exportToExcel(targetReceipts)}
                    className="px-3 py-1.5 bg-[#FFFDF9] border border-[#BCD4B5] text-[#3B6637] hover:bg-[#F2F7F0] rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    下載 Excel (.xlsx)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Webhook Fallback Tab */}
          {activeTab === 'webhook' && (
            <div className="space-y-4">
              <form onSubmit={handleSaveWebhookConfig} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#554C3E] mb-1 font-['Zen_Maru_Gothic']">
                    Google Apps Script 網頁應用程式網址 (Web App URL):
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#DDD4C5] rounded-xl text-xs font-mono text-[#2D2A26] focus:bg-white focus:ring-2 focus:ring-[#3B6637]/25 focus:border-[#3B6637]"
                  />
                  <p className="text-[11px] text-[#7A7061] mt-1">
                    （備用選項）若不想透過 Google 帳戶 OAuth 授權，可繼續使用 Google Apps Script Webhook 網址。
                  </p>
                </div>

                {webhookStatus.message && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 font-bold ${
                      webhookStatus.error
                        ? 'bg-[#FDF2F0] text-[#9E2B1E] border border-[#F5C6C0]'
                        : 'bg-[#F2F7F0] text-[#2C4F29] border border-[#BCD4B5]'
                    }`}
                  >
                    {webhookStatus.error ? (
                      <AlertCircle className="w-4 h-4 text-[#BA3C2A] shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#3B6637] shrink-0" />
                    )}
                    <span>{webhookStatus.message}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={webhookStatus.loading || !webhookUrl}
                    onClick={handleTestWebhookSync}
                    className="py-1.5 px-3 bg-[#3B6637] hover:bg-[#2C4F29] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs disabled:opacity-50 font-['Zen_Maru_Gothic']"
                  >
                    <Send className="w-3 h-3" />
                    {webhookStatus.loading ? '正在寫入...' : '以 Webhook 寫入'}
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-3 bg-[#5C4D3C] hover:bg-[#4A3D2E] text-white rounded-xl text-xs font-bold font-['Zen_Maru_Gothic']"
                  >
                    儲存 Webhook 設定
                  </button>
                </div>
              </form>

              <div className="p-3.5 bg-[#FAF6EE] border border-[#E5DAC6] rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#554C3E] font-['Zen_Maru_Gothic']">
                    Apps Script 代碼：
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowScriptCode(!showScriptCode)}
                    className="text-[#3B6637] hover:underline font-bold text-[11px] flex items-center gap-1"
                  >
                    <Code className="w-3 h-3" />
                    {showScriptCode ? '隱藏代碼' : '查看代碼'}
                  </button>
                </div>

                {showScriptCode && (
                  <div className="mt-2 relative">
                    <pre className="p-3 bg-[#2D2A26] text-[#FAF7F0] rounded-xl text-[10px] font-mono overflow-x-auto max-h-48">
                      {appsScriptTemplate}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(appsScriptTemplate);
                        alert('Apps Script 代碼已成功複製！');
                      }}
                      className="absolute top-2 right-2 px-2 py-1 bg-[#5C4D3C] hover:bg-[#4A3D2E] text-white rounded text-[10px] font-bold"
                    >
                      複製代碼
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E8E1D3] bg-[#FAF6EE] flex items-center justify-between">
          <div className="text-[11px] text-[#7A7061] flex items-center gap-3">
            {folderUrl && (
              <a
                href={folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#3B6637] hover:underline font-bold flex items-center gap-1"
              >
                <Folder className="w-3.5 h-3.5 text-[#8C7A6B]" />
                在雲端硬碟打開檔案夾 ↗
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#EFE8DC] hover:bg-[#E5DAC6] text-[#554C3E] rounded-xl text-xs font-bold transition-colors font-['Zen_Maru_Gothic']"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
