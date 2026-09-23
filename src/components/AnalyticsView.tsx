import React, { useState, useMemo } from 'react';
import {
  Car,
  TrendingUp,
  CreditCard,
  PieChart,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  BarChart3,
  CalendarDays,
  Receipt as ReceiptIcon,
} from 'lucide-react';
import { Receipt, GoogleSheetsConfig } from '../types';
import {
  getYearMonth,
  formatYearMonthZh,
  getMonthlySpreadsheetName,
} from '../services/googleDriveSheetsService';

interface AnalyticsViewProps {
  receipts: Receipt[];
  sheetsConfig?: GoogleSheetsConfig;
  onOpenGoogleSheets?: () => void;
  onExportAllToGoogleSheets?: () => void;
  onSelectReceipt?: (receipt: Receipt) => void;
}

const CATEGORY_NAMES_ZH_HK: Record<string, string> = {
  'Meals & Dining': '餐飲食肆 (Meals & Dining)',
  'Transportation': '交通出行 (Transportation)',
  'Groceries': '超市雜貨 (Groceries)',
  'Shopping & Retail': '購物消費 (Shopping & Retail)',
  'Utilities & Telecom': '水電通訊 (Utilities & Telecom)',
  'Office Supplies': '辦公文具 (Office Supplies)',
  'Entertainment': '休閒娛樂 (Entertainment)',
  'Health & Medical': '醫療健康 (Health & Medical)',
  'Travel & Lodging': '差旅住宿 (Travel & Lodging)',
  'Other': '其他雜項 (Other)',
};

const CATEGORY_COLORS_TECHO: string[] = [
  'from-[#BA3C2A] to-[#D96B54]', // Akane Vermilion
  'from-[#3E6836] to-[#6E9E65]', // Matcha Green
  'from-[#963745] to-[#C96B7A]', // Sakura / Azuki
  'from-[#876221] to-[#BA8E47]', // Kohaku Amber
  'from-[#2D5672] to-[#5C8BAA]', // Indigo Navy
  'from-[#683679] to-[#9963AB]', // Fuji Wisteria
];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  receipts,
  sheetsConfig,
  onOpenGoogleSheets,
  onExportAllToGoogleSheets,
  onSelectReceipt,
}) => {
  // Mode: 'grand_total' (全期總統計) | 'monthly' (每月支出統計) | 'all_months' (各月並列比較)
  const [activeMode, setActiveMode] = useState<'grand_total' | 'monthly' | 'all_months'>('monthly');

  // 1. Calculate Grand Total Statistics
  const totalSpend = useMemo(() => receipts.reduce((sum, r) => sum + r.totalAmount, 0), [receipts]);
  const avgSpend = receipts.length > 0 ? totalSpend / receipts.length : 0;

  const taxiReceipts = useMemo(
    () => receipts.filter((r) => r.category === 'Transportation' || r.isHandwritten),
    [receipts]
  );
  const totalTaxiSpend = useMemo(() => taxiReceipts.reduce((sum, r) => sum + r.totalAmount, 0), [taxiReceipts]);
  const handwrittenTaxiCount = useMemo(() => receipts.filter((r) => r.isHandwritten).length, [receipts]);

  // Overall categories breakdown
  const categoryMap = useMemo(() => {
    return receipts.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + r.totalAmount;
      return acc;
    }, {} as Record<string, number>);
  }, [receipts]);

  const sortedCategories = useMemo(
    () => Object.entries(categoryMap).sort((a, b) => b[1] - a[1]),
    [categoryMap]
  );

  // Overall payment methods
  const paymentMap = useMemo(() => {
    return receipts.reduce((acc, r) => {
      const method = r.paymentMethod || '未指定';
      acc[method] = (acc[method] || 0) + r.totalAmount;
      return acc;
    }, {} as Record<string, number>);
  }, [receipts]);

  const sortedPayments = useMemo(
    () => Object.entries(paymentMap).sort((a, b) => b[1] - a[1]),
    [paymentMap]
  );

  // 2. Group receipts by Month (YYYY-MM)
  const monthlyData = useMemo(() => {
    const map: Record<string, Receipt[]> = {};
    for (const r of receipts) {
      const ym = getYearMonth(r.date);
      if (!map[ym]) map[ym] = [];
      map[ym].push(r);
    }

    // Sort months descending (e.g., 2026-09, 2026-08)
    const sortedKeys = Object.keys(map).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((ym) => {
      const mReceipts = map[ym];
      const mTotal = mReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
      const mTaxi = mReceipts.filter((r) => r.category === 'Transportation' || r.isHandwritten);
      const mTaxiTotal = mTaxi.reduce((sum, r) => sum + r.totalAmount, 0);
      const mHandwritten = mReceipts.filter((r) => r.isHandwritten).length;
      const mAvg = mReceipts.length > 0 ? mTotal / mReceipts.length : 0;

      // Category breakdown for this month
      const catMap = mReceipts.reduce((acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + r.totalAmount;
        return acc;
      }, {} as Record<string, number>);
      const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

      // Payment breakdown for this month
      const payMap = mReceipts.reduce((acc, r) => {
        const method = r.paymentMethod || '未指定';
        acc[method] = (acc[method] || 0) + r.totalAmount;
        return acc;
      }, {} as Record<string, number>);
      const sortedPays = Object.entries(payMap).sort((a, b) => b[1] - a[1]);

      return {
        yearMonth: ym,
        yearMonthZh: formatYearMonthZh(ym),
        receipts: mReceipts,
        totalSpend: mTotal,
        count: mReceipts.length,
        taxiSpend: mTaxiTotal,
        taxiCount: mTaxi.length,
        handwrittenCount: mHandwritten,
        avgSpend: mAvg,
        sortedCategories: sortedCats,
        sortedPayments: sortedPays,
        topCategory: sortedCats[0]?.[0] || '無',
        topCategoryAmount: sortedCats[0]?.[1] || 0,
        percentOfGrandTotal: totalSpend > 0 ? (mTotal / totalSpend) * 100 : 0,
      };
    });
  }, [receipts, totalSpend]);

  // Selected Month for single month view
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    monthlyData[0]?.yearMonth || getYearMonth()
  );

  // If selectedMonthKey is not found, fallback to first month
  const activeMonthData = useMemo(() => {
    return monthlyData.find((m) => m.yearMonth === selectedMonthKey) || monthlyData[0] || null;
  }, [monthlyData, selectedMonthKey]);

  // Monthly average spending across all recorded months
  const monthlyAverage = monthlyData.length > 0 ? totalSpend / monthlyData.length : 0;

  // Max monthly spend for relative bar chart height
  const maxMonthSpend = useMemo(() => {
    return Math.max(...monthlyData.map((m) => m.totalSpend), 1);
  }, [monthlyData]);

  const userName = sheetsConfig?.userName || '手帳使用者';

  return (
    <div className="space-y-6">
      {/* Top Banner / Mode Switcher */}
      <div className="bg-[#FFFDF9] rounded-2xl border border-[#E5DECF] p-4 sm:p-5 shadow-techo relative overflow-hidden">
        <div className="absolute top-0 left-12 w-24 h-4 washi-tape washi-tape-matcha rounded-xs shadow-tape" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF5E6] text-[#8C6D2C] border border-[#E2D5B5] font-['Zen_Maru_Gothic']">
                手帳收支統計系統
              </span>
              <span className="text-[11px] text-[#7A7061] font-mono">
                涵蓋 {monthlyData.length} 個月份 · 共 {receipts.length} 筆單據
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#2D2A26] font-['Zen_Maru_Gothic'] flex items-center gap-2">
              <span>手帳支出統計報表</span>
              <span className="text-xs font-normal text-[#7A7061] hidden sm:inline">
                （每月支出統計與全期總覽）
              </span>
            </h2>
          </div>

          {/* Quick Actions: Export all & Open modal */}
          <div className="flex flex-wrap items-center gap-2">
            {onExportAllToGoogleSheets && (
              <button
                type="button"
                onClick={onExportAllToGoogleSheets}
                className="px-3.5 py-2 bg-[#2E5E2A] hover:bg-[#234B20] text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all font-['Zen_Maru_Gothic']"
                title="全部匯出所有成為 Google 試算表"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>全部匯出至 Google 試算表</span>
              </button>
            )}

            {onOpenGoogleSheets && (
              <button
                type="button"
                onClick={onOpenGoogleSheets}
                className="px-3 py-2 bg-white hover:bg-[#FAF6EE] text-[#4A6B44] border border-[#CCDDC8] rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all font-['Zen_Maru_Gothic']"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>試算表管理</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="mt-4 pt-4 border-t border-[#EAE3D5] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-[#F2EDE3] p-1 rounded-xl border border-[#DFD6C7]">
            <button
              onClick={() => setActiveMode('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all font-['Zen_Maru_Gothic'] ${
                activeMode === 'monthly'
                  ? 'bg-[#FFFDF9] text-[#2D2A26] shadow-2xs'
                  : 'text-[#6E6454] hover:text-[#2D2A26]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#3B6637]" />
              <span>每月支出統計</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#E8F0E5] text-[#2C5228]">
                {monthlyData.length} 個月
              </span>
            </button>

            <button
              onClick={() => setActiveMode('grand_total')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all font-['Zen_Maru_Gothic'] ${
                activeMode === 'grand_total'
                  ? 'bg-[#FFFDF9] text-[#2D2A26] shadow-2xs'
                  : 'text-[#6E6454] hover:text-[#2D2A26]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#BA3C2A]" />
              <span>全期總統計 (總合)</span>
            </button>

            <button
              onClick={() => setActiveMode('all_months')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all font-['Zen_Maru_Gothic'] ${
                activeMode === 'all_months'
                  ? 'bg-[#FFFDF9] text-[#2D2A26] shadow-2xs'
                  : 'text-[#6E6454] hover:text-[#2D2A26]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#8C6D2C]" />
              <span>各月並列比較表</span>
            </button>
          </div>

          {/* Quick Month Selector if in Monthly mode */}
          {activeMode === 'monthly' && monthlyData.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#6B5F4E] font-['Zen_Maru_Gothic']">
                切換月份：
              </span>
              <select
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                className="px-3 py-1.5 bg-[#FAF7F0] border border-[#DDD4C5] rounded-xl text-xs font-bold text-[#2D2A26] focus:bg-white focus:ring-2 focus:ring-[#3B6637]/25 focus:border-[#3B6637] font-mono cursor-pointer"
              >
                {monthlyData.map((m) => (
                  <option key={m.yearMonth} value={m.yearMonth}>
                    {m.yearMonthZh} (HK$ {m.totalSpend.toFixed(2)} · {m.count}筆)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          MODE 1: 每月支出統計 (MONTHLY ANALYTICS) - The Primary Feature
         ======================================================== */}
      {activeMode === 'monthly' && (
        <div className="space-y-6">
          {/* Horizontal Month Chips Navigation */}
          {monthlyData.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {monthlyData.map((m) => {
                const isSelected = m.yearMonth === selectedMonthKey;
                return (
                  <button
                    key={m.yearMonth}
                    onClick={() => setSelectedMonthKey(m.yearMonth)}
                    className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border font-['Zen_Maru_Gothic'] flex items-center gap-2 ${
                      isSelected
                        ? 'bg-[#3B6637] text-white border-[#2C4F29] shadow-sm'
                        : 'bg-[#FFFDF9] text-[#554C3E] border-[#E3DAC8] hover:bg-[#FAF6EE]'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5 opacity-80" />
                    <span>{m.yearMonthZh}</span>
                    <span
                      className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[#F2EDE3] text-[#2D2A26]'
                      }`}
                    >
                      HK$ {m.totalSpend.toFixed(0)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {activeMonthData ? (
            <div className="space-y-6">
              {/* Month Header Banner */}
              <div className="bg-[#FAF7F0] border border-[#E3DAC8] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E8F0E5] text-[#3B6637] flex items-center justify-center font-bold text-sm shadow-2xs border border-[#C5D8C1]">
                    {activeMonthData.yearMonth.split('-')[1]}月
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#2D2A26] font-['Zen_Maru_Gothic'] flex items-center gap-2">
                      <span>{activeMonthData.yearMonthZh} 支出統計</span>
                      <span className="text-xs font-normal text-[#7A7061]">
                        ({activeMonthData.count} 筆記帳記錄)
                      </span>
                    </h3>
                    <p className="text-xs text-[#7A7061]">
                      佔全期歷史總支出 HK$ {totalSpend.toFixed(2)} 的{' '}
                      <strong className="text-[#3B6637] font-bold">
                        {activeMonthData.percentOfGrandTotal.toFixed(1)}%
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Google Sheet indicator for this month */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B5F4E] font-['Zen_Maru_Gothic']">
                    試算表名稱：
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-[#DDD4C5] rounded-xl text-xs font-bold text-[#2D2A26] font-mono">
                    {getMonthlySpreadsheetName(activeMonthData.yearMonth, userName)}
                  </span>
                </div>
              </div>

              {/* 4 Stat Cards for Selected Month */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Card 1: Month Total */}
                <div className="relative p-4 rounded-2xl bg-[#FFFDF9] border border-[#E5DECF] shadow-techo overflow-hidden">
                  <div className="absolute top-0 right-6 w-12 h-3.5 washi-tape washi-tape-cherry rounded-xs shadow-tape" />
                  <div className="flex items-center justify-between text-[#786F60] mb-2 pt-1">
                    <span className="text-xs font-bold font-['Zen_Maru_Gothic']">本月支出合計</span>
                    <div className="w-7 h-7 rounded-lg bg-[#FAF0EE] text-[#BA3C2A] flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold font-mono text-[#2D2A26]">
                    HK${' '}
                    {activeMonthData.totalSpend.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-[11px] text-[#7A7061] mt-1 font-['Zen_Maru_Gothic']">
                    本月共記帳 <span className="font-bold text-[#2D2A26]">{activeMonthData.count}</span> 筆
                  </p>
                </div>

                {/* Card 2: Taxi & Transport for Month */}
                <div className="relative p-4 rounded-2xl bg-[#FFFDF9] border border-[#E5DECF] shadow-techo overflow-hidden">
                  <div className="absolute top-0 right-6 w-12 h-3.5 washi-tape washi-tape-mustard rounded-xs shadow-tape" />
                  <div className="flex items-center justify-between text-[#786F60] mb-2 pt-1">
                    <span className="text-xs font-bold font-['Zen_Maru_Gothic']">本月的士/交通費</span>
                    <div className="w-7 h-7 rounded-lg bg-[#FAF5E6] text-[#8C6D2C] flex items-center justify-center">
                      <Car className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold font-mono text-[#2D2A26]">
                    HK${' '}
                    {activeMonthData.taxiSpend.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-[11px] text-[#7A7061] mt-1 font-['Zen_Maru_Gothic']">
                    手寫的士收據 <span className="font-bold text-[#BA3C2A]">{activeMonthData.handwrittenCount}</span> 筆
                  </p>
                </div>

                {/* Card 3: Month Average */}
                <div className="relative p-4 rounded-2xl bg-[#FFFDF9] border border-[#E5DECF] shadow-techo overflow-hidden">
                  <div className="absolute top-0 right-6 w-12 h-3.5 washi-tape washi-tape-matcha rounded-xs shadow-tape" />
                  <div className="flex items-center justify-between text-[#786F60] mb-2 pt-1">
                    <span className="text-xs font-bold font-['Zen_Maru_Gothic']">本月單筆平均</span>
                    <div className="w-7 h-7 rounded-lg bg-[#EDF5EB] text-[#3E6836] flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold font-mono text-[#2D2A26]">
                    HK$ {activeMonthData.avgSpend.toFixed(2)}
                  </div>
                  <p className="text-[11px] text-[#7A7061] mt-1 font-['Zen_Maru_Gothic']">
                    平均每筆消費額
                  </p>
                </div>

                {/* Card 4: Month Top Category */}
                <div className="relative p-4 rounded-2xl bg-[#FFFDF9] border border-[#E5DECF] shadow-techo overflow-hidden">
                  <div className="absolute top-0 right-6 w-12 h-3.5 washi-tape washi-tape-indigo rounded-xs shadow-tape" />
                  <div className="flex items-center justify-between text-[#786F60] mb-2 pt-1">
                    <span className="text-xs font-bold font-['Zen_Maru_Gothic']">本月最高支出費目</span>
                    <div className="w-7 h-7 rounded-lg bg-[#EBF2F7] text-[#2D5672] flex items-center justify-center">
                      <PieChart className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-[#2D2A26] truncate font-['Zen_Maru_Gothic']">
                    {CATEGORY_NAMES_ZH_HK[activeMonthData.topCategory] || activeMonthData.topCategory}
                  </div>
                  <p className="text-[11px] text-[#7A7061] mt-1 font-['Zen_Maru_Gothic']">
                    {activeMonthData.topCategoryAmount > 0
                      ? `HK$ ${activeMonthData.topCategoryAmount.toFixed(2)} (${(
                          (activeMonthData.topCategoryAmount / (activeMonthData.totalSpend || 1)) *
                          100
                        ).toFixed(0)}%)`
                      : '無'}
                  </p>
                </div>
              </div>

              {/* Month Category Breakdown & Payment Methods */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category breakdown for this month */}
                <div className="bg-[#FFFDF9] rounded-2xl border border-[#E5DECF] p-5 shadow-techo">
                  <h3 className="text-sm font-bold text-[#2D2A26] mb-4 flex items-center justify-between font-['Zen_Maru_Gothic']">
                    <span className="flex items-center gap-1.5">
                      <span>📖 {activeMonthData.yearMonthZh} 費目分佈比例</span>
                    </span>
                    <span className="text-xs font-normal text-[#7A7061]">
                      共 {activeMonthData.sortedCategories.length} 個費目
                    </span>
                  </h3>

                  {activeMonthData.sortedCategories.length === 0 ? (
                    <p className="text-xs text-[#9C8F7C] py-6 text-center font-['Zen_Maru_Gothic']">
                      本月未有記帳記錄。
                    </p>
                  ) : (
                    <div className="space-y-3.5">
                      {activeMonthData.sortedCategories.map(([cat, amt], idx) => {
                        const percent =
                          activeMonthData.totalSpend > 0
                            ? (amt / activeMonthData.totalSpend) * 100
                            : 0;
                        const gradient =
                          CATEGORY_COLORS_TECHO[idx % CATEGORY_COLORS_TECHO.length];
                        const catZh = CATEGORY_NAMES_ZH_HK[cat] || cat;

                        return (
                          <div key={cat} className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#3D372E] font-['Zen_Maru_Gothic']">
                                {catZh}
                              </span>
                              <div className="font-mono text-[#2D2A26] font-bold">
                                HK$ {amt.toFixed(2)}{' '}
                                <span className="text-[#8C8070] font-normal text-[11px]">
                                  ({percent.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-2.5 bg-[#F2EDE3] rounded-full overflow-hidden p-0.5 border border-[#E5DAC6]">
                              <div
                                className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-300`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Payment Methods for this month */}
                <div className="bg-[#FFFDF9] rounded-2xl border border-[#E5DECF] p-5 shadow-techo">
                  <h3 className="text-sm font-bold text-[#2D2A26] mb-4 flex items-center justify-between font-['Zen_Maru_Gothic']">
                    <span className="flex items-center gap-1.5">
                      <span>💳 {activeMonthData.yearMonthZh} 付款方式分佈</span>
                    </span>
                    <span className="text-xs font-normal text-[#7A7061]">
                      八達通 / 現金 / 轉數快 / 信用卡
                    </span>
                  </h3>

                  {activeMonthData.sortedPayments.length === 0 ? (
                    <p className="text-xs text-[#9C8F7C] py-6 text-center font-['Zen_Maru_Gothic']">
                      暫無付款方式資料。
                    </p>
                  ) : (
                    <div className="space-y-3.5">
                      {activeMonthData.sortedPayments.map(([method, amt]) => {
                        const percent =
                          activeMonthData.totalSpend > 0
                            ? (amt / activeMonthData.totalSpend) * 100
                            : 0;
                        return (
                          <div key={method} className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#3D372E] flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                                <CreditCard className="w-3.5 h-3.5 text-[#8C7A6B]" />
                                {method}
                              </span>
                              <div className="font-mono text-[#2D2A26] font-bold">
                                HK$ {amt.toFixed(2)}{' '}
                                <span className="text-[#8C8070] font-normal text-[11px]">
                                  ({percent.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-2.5 bg-[#F2EDE3] rounded-full overflow-hidden p-0.5 border border-[#E5DAC6]">
                              <div
                                className="h-full bg-gradient-to-r from-[#8C6D4C] to-[#BA9E7B] rounded-full transition-all duration-300"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Month Receipts Ledger (Mini-Table) */}
              <div className="bg-[#FFFDF9] rounded-2xl border border-[#E5DECF] p-5 shadow-techo">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#2D2A26] font-['Zen_Maru_Gothic'] flex items-center gap-2">
                    <ReceiptIcon className="w-4 h-4 text-[#8C7A6B]" />
                    <span>{activeMonthData.yearMonthZh} 單據流水帳 ({activeMonthData.count} 筆)</span>
                  </h3>
                  <span className="text-xs text-[#7A7061] font-mono">
                    合計: HK$ {activeMonthData.totalSpend.toFixed(2)}
                  </span>
                </div>

                <div className="divide-y divide-[#EFE8DC] overflow-hidden rounded-xl border border-[#EFE8DC]">
                  {activeMonthData.receipts.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => onSelectReceipt && onSelectReceipt(r)}
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                        onSelectReceipt ? 'hover:bg-[#FAF6EE] cursor-pointer' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-xs font-mono font-bold text-[#7A7061] shrink-0 pt-0.5">
                          {r.date}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#2D2A26] flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                            <span>{r.merchantName}</span>
                            {r.isHandwritten && (
                              <span className="text-[10px] font-bold bg-[#FDF2F0] text-[#BA3C2A] px-1.5 py-0.2 rounded border border-[#F5C6C0]">
                                手寫的士單
                              </span>
                            )}
                          </div>
                          {r.notes && (
                            <p className="text-[11px] text-[#7A7061] line-clamp-1 mt-0.5">
                              {r.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="text-[11px] px-2 py-0.5 bg-[#FAF5E6] text-[#8C6D2C] rounded-lg border border-[#E8DCB8]">
                          {CATEGORY_NAMES_ZH_HK[r.category]?.split(' ')[0] || r.category}
                        </span>
                        <span className="text-xs font-bold font-mono text-[#2D2A26]">
                          HK$ {r.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#FFFDF9] rounded-2xl border border-[#E5DECF]">
              <p className="text-xs text-[#7A7061]">暫無支出資料，請先新增或掃描單據。</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODE 2: 全期總統計 (GRAND TOTAL OVERVIEW)
         ======================================================== */}
      {activeMode === 'grand_total' && (
        <div className="space-y-6">
          {/* 4 Grand Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Spend */}
            <div className="relative p-4 rounded-2xl bg-[#FFFDF9] border border-[#E5DECF] shadow-techo overflow-hidden">
              <div className="absolute top-0 right-6 w-12 h-3.5 washi-tape washi-tape-cherry rounded-xs shadow-tape" />
              <div className="flex items-center justify-between text-[#786F60] mb-2 pt-1">
                <span className="text-xs font-bold font-['Zen_Maru_Gothic']">歷史累積總支出</span>
                <div className="w-7 h-7 rounded-lg bg-[#FAF0EE] text-[#BA3C2A] flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold font-mono text-[#2D2A26]">
                HK${' '}
                {totalSpend.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-[11px] text-[#7A7061] mt-1 font-['Zen_Maru_Gothic']">
                累計貼入手帳 <span className="font-bold text-[#2D2A26]">{receipts.length}</span> 張單據
              </p>
            </div>

            {/* Card 2: Monthly Average */}
            <div className="relative p-4 rounded-2xl bg-[#FFFDF9] border border-[#E5DECF] shadow-techo overflow-hidden">
              <div className="absolute top-0 right-6 w-12 h-3.5 washi-tape washi-tape-mustard rounded-xs shadow-tape" />
              <div className="flex items-center justify-between text-[#786F60] mb-2 pt-1">
                <span className="text-xs font-bold font-['Zen_Maru_Gothic']">月度平均支出</span>
                <div className="w-7 h-7 rounded-lg bg-[#FAF5E6] text-[#8C6D2C] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold font-mono text-[#2D2A26]">
                HK$ {monthlyAverage.toFixed(2)}
              </div>
              <p className="text-[11px] text-[#7A7061] mt-1 font-['Zen_Maru_Gothic']">
                涵蓋 <span className="font-bold text-[#2D2A26]">{monthlyData.length}</span> 個計費月份
              </p>
            </div>

            {/* Card 3: Taxi & Transportation */}
            <div className="relative p-4 rounded-2xl bg-[#FFFDF9] border border-[#E5DECF] shadow-techo overflow-hidden">
              <div className="absolute top-0 right-6 w-12 h-3.5 washi-tape washi-tape-matcha rounded-xs shadow-tape" />
              <div className="flex items-center justify-between text-[#786F60] mb-2 pt-1">
                <span className="text-xs font-bold font-['Zen_Maru_Gothic']">全期的士/交通總額</span>
                <div className="w-7 h-7 rounded-lg bg-[#EDF5EB] text-[#3E6836] flex items-center justify-center">
                  <Car className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold font-mono text-[#2D2A26]">
                HK${' '}
                {totalTaxiSpend.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-[11px] text-[#7A7061] mt-1 font-['Zen_Maru_Gothic']">
                手寫的士收據 <span className="font-bold text-[#BA3C2A]">{handwrittenTaxiCount}</span> 筆
              </p>
            </div>

            {/* Card 4: Average per Receipt */}
            <div className="relative p-4 rounded-2xl bg-[#FFFDF9] border border-[#E5DECF] shadow-techo overflow-hidden">
              <div className="absolute top-0 right-6 w-12 h-3.5 washi-tape washi-tape-indigo rounded-xs shadow-tape" />
              <div className="flex items-center justify-between text-[#786F60] mb-2 pt-1">
                <span className="text-xs font-bold font-['Zen_Maru_Gothic']">平均單筆消費</span>
                <div className="w-7 h-7 rounded-lg bg-[#EBF2F7] text-[#2D5672] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold font-mono text-[#2D2A26]">
                HK$ {avgSpend.toFixed(2)}
              </div>
              <p className="text-[11px] text-[#7A7061] mt-1 font-['Zen_Maru_Gothic']">
                最高費目：{CATEGORY_NAMES_ZH_HK[sortedCategories[0]?.[0]]?.split(' ')[0] || '無'}
              </p>
            </div>
          </div>

          {/* Month-by-Month Spending Trend Bar Chart */}
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E5DECF] p-5 shadow-techo">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-[#2D2A26] font-['Zen_Maru_Gothic'] flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-[#8C6D2C]" />
                  <span>各月份支出趨勢柱狀圖</span>
                </h3>
                <p className="text-xs text-[#7A7061] mt-0.5">
                  比較每個月的支出起伏，點擊任何月份即可進入該月詳細統計
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#3B6637] bg-[#E8F0E5] px-2.5 py-1 rounded-lg border border-[#C5D8C1]">
                月均: HK$ {monthlyAverage.toFixed(0)}
              </span>
            </div>

            {monthlyData.length === 0 ? (
              <p className="text-xs text-[#7A7061] text-center py-6">暫無月份數據。</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end justify-around gap-2 sm:gap-4 h-44 pt-6 pb-2 border-b border-[#EAE3D5] px-2">
                  {monthlyData.slice().reverse().map((m) => {
                    const heightPercent = Math.max(12, (m.totalSpend / maxMonthSpend) * 100);
                    const isSelected = m.yearMonth === selectedMonthKey;

                    return (
                      <div
                        key={m.yearMonth}
                        onClick={() => {
                          setSelectedMonthKey(m.yearMonth);
                          setActiveMode('monthly');
                        }}
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                        title={`${m.yearMonthZh}: HK$ ${m.totalSpend.toFixed(2)} (${m.count} 筆)`}
                      >
                        {/* Amount tooltip above bar */}
                        <span className="text-[10px] font-bold font-mono text-[#554C3E] opacity-90 group-hover:scale-110 transition-transform mb-1">
                          HK${m.totalSpend.toFixed(0)}
                        </span>

                        {/* Bar */}
                        <div className="w-full max-w-[42px] bg-[#EFE8DC] rounded-t-xl overflow-hidden relative border border-[#DDD4C5]">
                          <div
                            className={`w-full transition-all duration-500 rounded-t-lg ${
                              isSelected
                                ? 'bg-gradient-to-t from-[#2E5E2A] to-[#4C8F45]'
                                : 'bg-gradient-to-t from-[#5C4D3C] to-[#8C7A6B] group-hover:from-[#3B6637] group-hover:to-[#6E9E65]'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>

                        {/* Month label below bar */}
                        <span className="text-[11px] font-bold text-[#6B5F4E] mt-2 font-['Zen_Maru_Gothic'] group-hover:text-[#2D2A26] transition-colors">
                          {m.yearMonth.split('-')[1]}月
                        </span>
                        <span className="text-[9px] text-[#8C8070] font-mono">
                          {m.count}筆
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Overall Category & Payment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category breakdown */}
            <div className="bg-[#FFFDF9] rounded-2xl border border-[#E5DECF] p-5 shadow-techo">
              <h3 className="text-sm font-bold text-[#2D2A26] mb-4 flex items-center justify-between font-['Zen_Maru_Gothic']">
                <span>📖 全期費目支出總佔比</span>
                <span className="text-xs font-normal text-[#7A7061]">
                  共 {sortedCategories.length} 個費目
                </span>
              </h3>

              <div className="space-y-3.5">
                {sortedCategories.map(([cat, amt], idx) => {
                  const percent = totalSpend > 0 ? (amt / totalSpend) * 100 : 0;
                  const gradient =
                    CATEGORY_COLORS_TECHO[idx % CATEGORY_COLORS_TECHO.length];
                  const catZh = CATEGORY_NAMES_ZH_HK[cat] || cat;

                  return (
                    <div key={cat} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#3D372E] font-['Zen_Maru_Gothic']">
                          {catZh}
                        </span>
                        <div className="font-mono text-[#2D2A26] font-bold">
                          HK$ {amt.toFixed(2)}{' '}
                          <span className="text-[#8C8070] font-normal text-[11px]">
                            ({percent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-[#F2EDE3] rounded-full overflow-hidden p-0.5 border border-[#E5DAC6]">
                        <div
                          className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-300`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-[#FFFDF9] rounded-2xl border border-[#E5DECF] p-5 shadow-techo">
              <h3 className="text-sm font-bold text-[#2D2A26] mb-4 flex items-center justify-between font-['Zen_Maru_Gothic']">
                <span>💳 全期付款方式分佈</span>
                <span className="text-xs font-normal text-[#7A7061]">
                  現金 / 八達通 / 轉數快 / 信用卡
                </span>
              </h3>

              <div className="space-y-3.5">
                {sortedPayments.map(([method, amt]) => {
                  const percent = totalSpend > 0 ? (amt / totalSpend) * 100 : 0;
                  return (
                    <div key={method} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#3D372E] flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                          <CreditCard className="w-3.5 h-3.5 text-[#8C7A6B]" />
                          {method}
                        </span>
                        <div className="font-mono text-[#2D2A26] font-bold">
                          HK$ {amt.toFixed(2)}{' '}
                          <span className="text-[#8C8070] font-normal text-[11px]">
                            ({percent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-[#F2EDE3] rounded-full overflow-hidden p-0.5 border border-[#E5DAC6]">
                        <div
                          className="h-full bg-gradient-to-r from-[#8C6D4C] to-[#BA9E7B] rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODE 3: 各月並列比較表 (ALL MONTHS BREAKDOWN)
         ======================================================== */}
      {activeMode === 'all_months' && (
        <div className="space-y-4">
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E5DECF] p-5 shadow-techo">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#2D2A26] font-['Zen_Maru_Gothic'] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#3B6637]" />
                  <span>各月份支出統計一覽表</span>
                </h3>
                <p className="text-xs text-[#7A7061] mt-0.5">
                  所有記錄月份的支出合計、單據數與主要費目對照
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthlyData.map((m) => {
                const sheetName = getMonthlySpreadsheetName(m.yearMonth, userName);
                return (
                  <div
                    key={m.yearMonth}
                    className="p-4 bg-[#FAF7F0] border border-[#E3DAC8] rounded-2xl hover:border-[#3B6637] transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#3B6637] bg-[#E8F0E5] px-2.5 py-0.5 rounded-full border border-[#C5D8C1] font-['Zen_Maru_Gothic']">
                          {m.yearMonthZh}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#6B5F4E]">
                          {m.count} 筆單據
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="text-xl font-bold font-mono text-[#2D2A26]">
                          HK$ {m.totalSpend.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-[#7A7061] mt-0.5">
                          佔全期總支出：{m.percentOfGrandTotal.toFixed(1)}%
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-[#EAE3D5] text-xs space-y-1 text-[#554C3E]">
                        <div className="flex justify-between">
                          <span className="text-[#7A7061]">的士交通:</span>
                          <span className="font-mono font-bold">HK$ {m.taxiSpend.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7A7061]">主要消費:</span>
                          <span className="font-bold text-[#2D2A26] truncate max-w-[130px]">
                            {CATEGORY_NAMES_ZH_HK[m.topCategory]?.split(' ')[0] || m.topCategory}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7A7061]">單筆平均:</span>
                          <span className="font-mono">HK$ {m.avgSpend.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#EAE3D5] flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[#8C8070] font-mono truncate max-w-[150px]">
                        {sheetName}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedMonthKey(m.yearMonth);
                          setActiveMode('monthly');
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-[#EFE8DC] border border-[#DDD4C5] rounded-lg text-xs font-bold text-[#2D2A26] flex items-center gap-1 transition-colors font-['Zen_Maru_Gothic']"
                      >
                        <span>查看統計</span>
                        <ChevronRight className="w-3 h-3 text-[#8C7A6B]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
