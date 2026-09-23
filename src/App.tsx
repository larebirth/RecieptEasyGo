import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Scanner } from './components/Scanner';
import { ReceiptTable } from './components/ReceiptTable';
import { ReceiptModal } from './components/ReceiptModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { AnalyticsView } from './components/AnalyticsView';
import { Receipt, GoogleSheetsConfig } from './types';
import { SAMPLE_RECEIPTS_DATA } from './data/sampleReceipts';
import { scanReceiptWithGemini } from './services/geminiService';
import { exportToCSV, exportToExcel, appendToGoogleSheetsWebhook } from './services/exportService';
import { getAccessToken } from './services/googleAuthService';
import {
  appendReceiptsToSpreadsheet,
  findOrCreateFolder,
  getYearMonth,
  syncReceiptsToMonthlySpreadsheet,
  exportAllReceiptsToGoogleSheet,
} from './services/googleDriveSheetsService';

const STORAGE_KEY = 'hk_receipt_scanner_data_v1';
const SHEETS_CONFIG_KEY = 'hk_receipt_scanner_sheets_cfg_v1';

export default function App() {
  // Load initial receipts from localStorage or fallback to realistic HK samples
  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load receipts from localStorage:', e);
    }
    return SAMPLE_RECEIPTS_DATA.map((s) => s.receiptData);
  });

  // Google Sheets integration configuration
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() => {
    try {
      const saved = localStorage.getItem(SHEETS_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          generationMode: 'monthly',
          userName: '手帳使用者',
          ...parsed,
        };
      }
    } catch (e) {
      console.error('Failed to load sheets config from localStorage:', e);
    }
    return {
      folderName: '香港收據手帳',
      spreadsheetName: '香港收據手帳 · 記帳總表',
      autoSync: false,
      generationMode: 'monthly', // default: monthly generation as requested
      userName: '手帳使用者',
      monthlySheets: {},
    };
  });

  const [activeTab, setActiveTab] = useState<'table' | 'analytics'>('table');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgressText, setScanProgressText] = useState('');

  // Modals state
  const [activeModalReceipt, setActiveModalReceipt] = useState<Receipt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewScanModal, setIsNewScanModal] = useState(false);

  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [selectedReceiptsForSheets, setSelectedReceiptsForSheets] = useState<Receipt[] | undefined>(undefined);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
    } catch (e) {
      console.error('Error saving receipts to localStorage:', e);
    }
  }, [receipts]);

  useEffect(() => {
    try {
      localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(sheetsConfig));
    } catch (e) {
      console.error('Error saving sheets config:', e);
    }
  }, [sheetsConfig]);

  // Handle scanning an image via Gemini API
  const handleScanImage = async (dataUrl: string, hint?: string) => {
    setIsScanning(true);
    setScanProgressText('正在上傳圖片，辨識香港單據的繁體字及版面佈局...');

    try {
      const timer1 = setTimeout(() => {
        setScanProgressText('正在辨識香港的士車牌、跳錶車資、隧道費及手寫總額...');
      }, 1500);

      const extractedReceipt = await scanReceiptWithGemini(dataUrl, hint);
      clearTimeout(timer1);

      setActiveModalReceipt(extractedReceipt);
      setIsNewScanModal(true);
      setIsModalOpen(true);
      showToast('已成功辨識收據！請核對內容並貼入手帳。');
    } catch (err: any) {
      console.error('Scan error:', err);
      showToast(`掃描失敗：${err?.message || '未能辨識收據內容'}`);
      throw err;
    } finally {
      setIsScanning(false);
      setScanProgressText('');
    }
  };

  // Handle loading one of the pre-built realistic Hong Kong samples
  const handleLoadSample = (sample: typeof SAMPLE_RECEIPTS_DATA[0]) => {
    const sampleReceipt: Receipt = {
      ...sample.receiptData,
      id: 'rcpt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      imageUrl: sample.imageDataUrl,
      createdAt: new Date().toISOString(),
    };

    setActiveModalReceipt(sampleReceipt);
    setIsNewScanModal(true);
    setIsModalOpen(true);
    showToast(`已載入樣本：${sample.title}`);
  };

  // Save new or updated receipt from modal
  const handleSaveReceiptFromModal = async (savedReceipt: Receipt) => {
    setReceipts((prev) => {
      const exists = prev.some((r) => r.id === savedReceipt.id);
      if (exists) {
        return prev.map((r) => (r.id === savedReceipt.id ? savedReceipt : r));
      } else {
        return [savedReceipt, ...prev];
      }
    });

    showToast('已貼入手帳記帳 (已入帳)');

    // Automatic Sync to Google Sheets if enabled
    if (sheetsConfig.autoSync) {
      try {
        const token = await getAccessToken();
        if (token) {
          const targetFolder = sheetsConfig.folderName?.trim() || '香港收據手帳';
          let currentFolderId = sheetsConfig.folderId;
          if (!currentFolderId) {
            const folderRes = await findOrCreateFolder(token, targetFolder);
            currentFolderId = folderRes.id;
            setSheetsConfig((prev) => ({
              ...prev,
              folderId: folderRes.id,
              folderUrl: folderRes.webViewLink,
            }));
          }

          if (sheetsConfig.generationMode === 'single' && sheetsConfig.spreadsheetId) {
            await appendReceiptsToSpreadsheet(token, sheetsConfig.spreadsheetId, [savedReceipt]);
            const now = new Date().toISOString();
            setSheetsConfig((prev) => ({ ...prev, lastSyncedAt: now }));
            showToast('✓ 已自動同步至 Google 試算表！');
          } else {
            // Default: Monthly generation mode!
            const ym = getYearMonth(savedReceipt.date);
            const res = await syncReceiptsToMonthlySpreadsheet(
              token,
              currentFolderId,
              ym,
              [savedReceipt],
              sheetsConfig.userName
            );
            const now = new Date().toISOString();
            setSheetsConfig((prev) => ({
              ...prev,
              lastSyncedAt: now,
              monthlySheets: {
                ...(prev.monthlySheets || {}),
                [ym]: {
                  spreadsheetId: res.spreadsheetId,
                  spreadsheetUrl: res.url,
                  name: res.name,
                  lastSyncedAt: now,
                },
              },
            }));
            showToast(`✓ 已自動同步至「${res.name}」！`);
          }
        } else if (sheetsConfig.webhookUrl) {
          await appendToGoogleSheetsWebhook(sheetsConfig.webhookUrl, [savedReceipt]);
          showToast('✓ 已自動透過 Webhook 同步至 Google 試算表！');
        }
      } catch (err: any) {
        console.error('Auto sync to Google Sheet error:', err);
        showToast(`自動同步 Google 試算表時發生錯誤：${err?.message || '請檢查授權'}`);
      }
    }
  };

  // Export all receipts to Google Sheet
  const handleExportAllToGoogleSheets = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setSelectedReceiptsForSheets(undefined);
        setIsSheetsModalOpen(true);
        showToast('請先登入 Google 帳戶以進行全部匯出。');
        return;
      }

      showToast('正在全部匯出所有收據至 Google 試算表...');
      const targetFolder = sheetsConfig.folderName?.trim() || '香港收據手帳';
      let currentFolderId = sheetsConfig.folderId;
      if (!currentFolderId) {
        const folderRes = await findOrCreateFolder(token, targetFolder);
        currentFolderId = folderRes.id;
        setSheetsConfig((prev) => ({
          ...prev,
          folderId: folderRes.id,
          folderUrl: folderRes.webViewLink,
        }));
      }

      const res = await exportAllReceiptsToGoogleSheet(
        token,
        currentFolderId,
        receipts,
        sheetsConfig.userName
      );

      const now = new Date().toISOString();
      setSheetsConfig((prev) => ({
        ...prev,
        consolidatedSheetId: res.spreadsheetId,
        consolidatedSheetUrl: res.url,
        lastSyncedAt: now,
      }));

      showToast(`✓ 已成功將全數 ${receipts.length} 筆收據匯出至「${res.name}」！`);
    } catch (err: any) {
      console.error('Export all error:', err);
      showToast(`全部匯出失敗：${err?.message || '請檢查 Google 授權'}`);
    }
  };

  const handleUpdateReceipt = (updated: Receipt) => {
    setReceipts((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    showToast('已更新手帳記帳記錄。');
  };

  const handleDeleteReceipt = (id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
    showToast('已從手帳刪除記錄。');
  };

  const handleBatchDelete = (ids: string[]) => {
    const idSet = new Set(ids);
    setReceipts((prev) => prev.filter((r) => !idSet.has(r.id)));
    showToast(`已刪除 ${ids.length} 筆記錄。`);
  };

  const handleAddNewManual = () => {
    const newManual: Receipt = {
      id: 'manual_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      merchantName: '',
      category: 'Meals & Dining',
      totalAmount: 0,
      currency: 'HKD',
      notes: '',
      createdAt: new Date().toISOString(),
    };
    setActiveModalReceipt(newManual);
    setIsNewScanModal(true);
    setIsModalOpen(true);
  };

  const handleReExtract = async (currentReceipt: Receipt, hint: string) => {
    if (!currentReceipt.imageUrl) {
      showToast('缺少原圖以進行重新辨識。');
      return;
    }
    setIsScanning(true);
    try {
      const refreshed = await scanReceiptWithGemini(currentReceipt.imageUrl, hint);
      setActiveModalReceipt({
        ...refreshed,
        id: currentReceipt.id,
        imageUrl: currentReceipt.imageUrl,
      });
      showToast('已結合手帳備忘重新解析完成！');
    } catch (err: any) {
      showToast(`重新辨識失敗：${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-techo-grid text-[#34322D] flex flex-col font-['Zen_Maru_Gothic','Noto_Sans_TC',sans-serif] antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#352F28] text-[#FAF7F0] px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-2 fade-in border border-[#4D453B]">
          <span className="w-2 h-2 rounded-full bg-[#BA3C2A] shadow-xs"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        receipts={receipts}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenGoogleSheets={() => {
          setSelectedReceiptsForSheets(undefined);
          setIsSheetsModalOpen(true);
        }}
        onExportAllToGoogleSheets={handleExportAllToGoogleSheets}
        onExportCSV={() => exportToCSV(receipts)}
        onExportExcel={() => exportToExcel(receipts)}
        isSheetsConfigured={Boolean(sheetsConfig.spreadsheetId || sheetsConfig.webhookUrl || sheetsConfig.folderId)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Scanner Component */}
        <Scanner
          onScanComplete={(rcpt) => {
            setActiveModalReceipt(rcpt);
            setIsNewScanModal(true);
            setIsModalOpen(true);
          }}
          isScanning={isScanning}
          scanProgressText={scanProgressText}
          onScanImage={handleScanImage}
          onLoadSample={handleLoadSample}
        />

        {/* Tab Content: Kakeibo Ledger Table vs Techo Analytics */}
        {activeTab === 'table' ? (
          <ReceiptTable
            receipts={receipts}
            onUpdateReceipt={handleUpdateReceipt}
            onDeleteReceipt={handleDeleteReceipt}
            onBatchDelete={handleBatchDelete}
            onSelectReceiptForView={(rcpt: Receipt) => {
              setActiveModalReceipt(rcpt);
              setIsNewScanModal(false);
              setIsModalOpen(true);
            }}
            onOpenGoogleSheetsSync={(selected?: Receipt[]) => {
              setSelectedReceiptsForSheets(selected);
              setIsSheetsModalOpen(true);
            }}
            onExportCSV={(selected?: Receipt[]) => exportToCSV(selected || receipts)}
            onAddNewManual={handleAddNewManual}
          />
        ) : (
          <AnalyticsView
            receipts={receipts}
            sheetsConfig={sheetsConfig}
            onOpenGoogleSheets={() => {
              setSelectedReceiptsForSheets(undefined);
              setIsSheetsModalOpen(true);
            }}
            onExportAllToGoogleSheets={handleExportAllToGoogleSheets}
            onSelectReceipt={(rcpt) => {
              setActiveModalReceipt(rcpt);
              setIsNewScanModal(false);
              setIsModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Receipt Inspection & Edit Modal */}
      <ReceiptModal
        receipt={activeModalReceipt}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveModalReceipt(null);
        }}
        onSave={handleSaveReceiptFromModal}
        onDelete={handleDeleteReceipt}
        onReExtract={handleReExtract}
        isNewScan={isNewScanModal}
      />

      {/* Google Sheets Sync & Export Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        receipts={receipts}
        selectedReceipts={selectedReceiptsForSheets}
        config={sheetsConfig}
        onSaveConfig={(newCfg) => {
          setSheetsConfig(newCfg);
          showToast('已更新 Google 試算表設定。');
        }}
        onShowToast={showToast}
      />

      {/* Techo Footer */}
      <footer className="border-t border-[#E5DECF] bg-[#FAF7F0] py-4 mt-12 text-center text-xs text-[#7A7061]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-bold text-[#554C3E]">
            <span>📔 收據手帳 · 日式手帳風香港收據與手寫的士單智慧記帳</span>
          </span>
          <span className="font-mono text-[11px] text-[#8C8070]">
            Hobonichi &amp; Traveler&apos;s Notebook Inspired · Gemini 3.8 Flash
          </span>
        </div>
      </footer>
    </div>
  );
}
