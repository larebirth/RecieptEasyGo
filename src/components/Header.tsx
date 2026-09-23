import React from 'react';
import {
  BookOpen,
  FileSpreadsheet,
  Download,
  BarChart3,
  ListOrdered,
  Layers,
} from 'lucide-react';
import { Receipt } from '../types';

interface HeaderProps {
  receipts: Receipt[];
  activeTab: 'table' | 'analytics';
  setActiveTab: (tab: 'table' | 'analytics') => void;
  onOpenGoogleSheets: () => void;
  onExportAllToGoogleSheets?: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  isSheetsConfigured: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  receipts,
  activeTab,
  setActiveTab,
  onOpenGoogleSheets,
  onExportAllToGoogleSheets,
  onExportCSV,
  onExportExcel,
  isSheetsConfigured,
}) => {
  const totalAmount = receipts.reduce((sum, r) => sum + r.totalAmount, 0);
  const handwrittenCount = receipts.filter((r) => r.isHandwritten).length;

  return (
    <header className="sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E6E0D2] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          {/* Logo and Techo Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Techo Book Icon */}
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-[#5C4D3C] text-[#FAF7F0] flex items-center justify-center shadow-md border border-[#483B2D] transform -rotate-1">
                  <BookOpen className="w-5 h-5" />
                </div>
                {/* Cute red hanko stamp icon */}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#BA3C2A] text-white text-[9px] font-bold flex items-center justify-center font-serif shadow-xs">
                  済
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#2D2A26] flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                    <span>收據手帳</span>
                    <span className="text-xs font-normal text-[#8C8273] hidden sm:inline">
                      / HK Receipt Techo
                    </span>
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4EDE2] text-[#7A5B3E] border border-[#DFCFC0]">
                    <span>香港收據 · 的士手帳</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#787265] font-medium hidden sm:block">
                  日式手帳風香港收據與手寫的士單智慧記帳 · Gemini AI 繁體中文自動解析
                </p>
              </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex items-center gap-1 sm:hidden bg-[#F0EAE1] p-1 rounded-xl border border-[#DFD7CB]">
              <button
                onClick={() => setActiveTab('table')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'table'
                    ? 'bg-[#FFFDF9] text-[#2D2A26] shadow-xs font-bold'
                    : 'text-[#6C665A]'
                }`}
                title="支出家計簿"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-[#FFFDF9] text-[#2D2A26] shadow-xs font-bold'
                    : 'text-[#6C665A]'
                }`}
                title="手帳統計"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center / Right controls */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
            {/* Total Expense Techo Label */}
            <div className="flex items-center gap-3 bg-[#FAF6EE] px-3.5 py-1.5 rounded-xl border border-[#E6DEC8] text-xs shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[#8C8070] font-medium text-[11px]">支出合計:</span>
                <span className="font-bold text-[#2D2A26] font-mono text-sm">
                  HK$ {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-3.5 w-px bg-[#D9CFBA]" />
              <div className="text-[11px] text-[#6E6454]">
                <span className="font-bold text-[#2D2A26]">{receipts.length}</span> 筆
                {handwrittenCount > 0 && (
                  <span className="ml-1 text-[#BA3C2A] font-semibold">
                    (的士 {handwrittenCount} 筆)
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Tab Switcher */}
            <div className="hidden sm:flex items-center bg-[#F2ECE1] p-1 rounded-xl border border-[#DFD6C7]">
              <button
                onClick={() => setActiveTab('table')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'table'
                    ? 'bg-[#FFFDF9] text-[#2D2A26] shadow-xs'
                    : 'text-[#6E6454] hover:text-[#2D2A26]'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5 text-[#8C7A6B]" />
                支出家計簿 ({receipts.length})
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-[#FFFDF9] text-[#2D2A26] shadow-xs'
                    : 'text-[#6E6454] hover:text-[#2D2A26]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#8C7A6B]" />
                手帳統計報表
              </button>
            </div>

            {/* Actions: Google Sheets & Export */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenGoogleSheets}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isSheetsConfigured
                    ? 'bg-[#EBF2E8] text-[#3B6637] border-[#BCD4B5] hover:bg-[#E2EDDE]'
                    : 'bg-[#FFFDF9] text-[#4A6B44] border-[#D4DFCE] hover:bg-[#F3F7F0] shadow-xs'
                }`}
                title="Google 試算表同步與設定"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#4A6B44]" />
                <span>Google 試算表</span>
                {isSheetsConfigured && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B44] animate-pulse"></span>
                )}
              </button>

              {/* 全部匯出至 Google 試算表 Dedicated Button */}
              {onExportAllToGoogleSheets && (
                <button
                  onClick={onExportAllToGoogleSheets}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-[#2E5E2A] hover:bg-[#234B20] text-white shadow-xs font-['Zen_Maru_Gothic']"
                  title="全部匯出所有成為 Google 試算表"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">全部匯出試算表</span>
                  <span className="sm:hidden">全部匯出</span>
                </button>
              )}

              {/* Export Dropdown */}
              <div className="relative group">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FFFDF9] text-[#554E42] border border-[#DDD6C8] hover:bg-[#F7F2E7] shadow-xs"
                  title="匯出資料 / Export"
                >
                  <Download className="w-3.5 h-3.5 text-[#8A7E6C]" />
                  <span className="hidden sm:inline">匯出</span>
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-[#FFFDF9] rounded-xl shadow-lg border border-[#DDD6C8] py-1 hidden group-hover:block z-40">
                  {onExportAllToGoogleSheets && (
                    <button
                      onClick={onExportAllToGoogleSheets}
                      className="w-full text-left px-3.5 py-2 text-xs text-[#2E5E2A] hover:bg-[#F2F7F0] flex items-center gap-2 font-bold border-b border-[#EFE8DC]"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#2E5E2A]" />
                      全部匯出至 Google 試算表
                    </button>
                  )}
                  <button
                    onClick={onExportCSV}
                    className="w-full text-left px-3.5 py-2 text-xs text-[#4A4439] hover:bg-[#F7F2E7] flex items-center gap-2 font-medium"
                  >
                    <Download className="w-3.5 h-3.5 text-[#8A7E6C]" />
                    匯出 CSV 檔
                  </button>
                  <button
                    onClick={onExportExcel}
                    className="w-full text-left px-3.5 py-2 text-xs text-[#3B6637] hover:bg-[#F7F2E7] flex items-center gap-2 font-medium"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#3B6637]" />
                    匯出 Excel (.xlsx) 檔
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
