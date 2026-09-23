import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Car,
  FileSpreadsheet,
  Trash2,
  Eye,
  Check,
  FileDown,
  Plus,
} from 'lucide-react';
import { Receipt, ExpenseCategory, FilterState } from '../types';

// Hong Kong Traditional Chinese Category Metadata & Styles
const TECHO_CATEGORY_STYLES: Record<
  ExpenseCategory,
  { label: string; bg: string; text: string; border: string }
> = {
  'Meals & Dining': {
    label: '餐飲食肆',
    bg: 'bg-[#F9ECEE]',
    text: 'text-[#963745]',
    border: 'border-[#EBC2C8]',
  },
  'Transportation': {
    label: '交通出行',
    bg: 'bg-[#FCEEEB]',
    text: 'text-[#BA3C2A]',
    border: 'border-[#F2CBC4]',
  },
  'Groceries': {
    label: '超市雜貨',
    bg: 'bg-[#EDF5EB]',
    text: 'text-[#3E6836]',
    border: 'border-[#CCE0C7]',
  },
  'Shopping & Retail': {
    label: '購物消費',
    bg: 'bg-[#FAF3E3]',
    text: 'text-[#876221]',
    border: 'border-[#EDDBB7]',
  },
  'Utilities & Telecom': {
    label: '水電通訊',
    bg: 'bg-[#ECF2F7]',
    text: 'text-[#2D5672]',
    border: 'border-[#CADAE7]',
  },
  'Office Supplies': {
    label: '辦公文具',
    bg: 'bg-[#F4EFE9]',
    text: 'text-[#615243]',
    border: 'border-[#DFD4C5]',
  },
  'Entertainment': {
    label: '休閒娛樂',
    bg: 'bg-[#F6EEF7]',
    text: 'text-[#683679]',
    border: 'border-[#E0CCE4]',
  },
  'Health & Medical': {
    label: '醫療健康',
    bg: 'bg-[#FAECEF]',
    text: 'text-[#9C3851]',
    border: 'border-[#EFC7D1]',
  },
  'Travel & Lodging': {
    label: '差旅住宿',
    bg: 'bg-[#ECF6F5]',
    text: 'text-[#29686C]',
    border: 'border-[#C6E6E4]',
  },
  'Other': {
    label: '其他雜項',
    bg: 'bg-[#F3EFE9]',
    text: 'text-[#5E5549]',
    border: 'border-[#DDD4C7]',
  },
};

interface ReceiptTableProps {
  receipts: Receipt[];
  onUpdateReceipt: (updated: Receipt) => void;
  onDeleteReceipt: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onSelectReceiptForView: (receipt: Receipt) => void;
  onOpenGoogleSheetsSync: (selectedReceipts?: Receipt[]) => void;
  onExportCSV: (receiptsToExport?: Receipt[]) => void;
  onAddNewManual: () => void;
}

export const ReceiptTable: React.FC<ReceiptTableProps> = ({
  receipts,
  onUpdateReceipt,
  onDeleteReceipt,
  onBatchDelete,
  onSelectReceiptForView,
  onOpenGoogleSheetsSync,
  onExportCSV,
  onAddNewManual,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    category: 'all',
    dateRange: 'all',
    handwrittenOnly: false,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [tempValue, setTempValue] = useState<any>('');

  // Filter and sort receipts
  const filteredReceipts = useMemo(() => {
    return receipts
      .filter((r) => {
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          const matches =
            r.merchantName.toLowerCase().includes(query) ||
            r.notes.toLowerCase().includes(query) ||
            r.date.includes(query) ||
            r.category.toLowerCase().includes(query) ||
            (r.paymentMethod && r.paymentMethod.toLowerCase().includes(query)) ||
            r.totalAmount.toString().includes(query);
          if (!matches) return false;
        }

        if (filters.category !== 'all' && r.category !== filters.category) {
          return false;
        }

        if (filters.handwrittenOnly && !r.isHandwritten) {
          return false;
        }

        if (filters.dateRange === 'this_month') {
          const now = new Date();
          const rDate = new Date(r.date);
          if (
            rDate.getFullYear() !== now.getFullYear() ||
            rDate.getMonth() !== now.getMonth()
          ) {
            return false;
          }
        } else if (filters.dateRange === 'last_30_days') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (new Date(r.date) < thirtyDaysAgo) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (filters.sortBy === 'date') {
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (filters.sortBy === 'totalAmount') {
          comparison = a.totalAmount - b.totalAmount;
        } else if (filters.sortBy === 'merchantName') {
          comparison = a.merchantName.localeCompare(b.merchantName);
        } else {
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [receipts, filters]);

  const startEdit = (id: string, field: string, currentValue: any) => {
    setEditingCell({ id, field });
    setTempValue(currentValue);
  };

  const saveEdit = (receipt: Receipt) => {
    if (!editingCell) return;
    const { field } = editingCell;
    let updatedVal = tempValue;
    if (field === 'totalAmount') {
      updatedVal = parseFloat(tempValue) || 0;
    }
    onUpdateReceipt({
      ...receipt,
      [field]: updatedVal,
    });
    setEditingCell(null);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredReceipts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReceipts.map((r) => r.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectedReceiptsList = useMemo(() => {
    return receipts.filter((r) => selectedIds.has(r.id));
  }, [receipts, selectedIds]);

  return (
    <div className="bg-[#FFFDF9] rounded-2xl border border-[#E5DECF] shadow-techo overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-[#EBE4D5] space-y-3 bg-[#FAF7F0]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#9C8F7C] absolute left-3 top-2.5" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              placeholder="搜尋商戶、車牌、手帳備忘、金額..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#FFFDF9] border border-[#DDD4C3] rounded-xl text-xs text-[#2D2A26] placeholder:text-[#9E9484] focus:outline-hidden focus:ring-2 focus:ring-[#8C6D4C]/25 focus:border-[#8C6D4C]"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters({ ...filters, searchQuery: '' })}
                className="absolute right-2.5 top-2 text-[#9C8F7C] hover:text-[#554C3E] text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Filters & Add Manual */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Handwritten Taxi Filter Pill */}
            <button
              onClick={() =>
                setFilters({ ...filters, handwrittenOnly: !filters.handwrittenOnly })
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                filters.handwrittenOnly
                  ? 'bg-[#BA3C2A] text-white border-[#BA3C2A] shadow-xs'
                  : 'bg-[#FFFDF9] text-[#554C3E] border-[#DDD5C5] hover:bg-[#F7F2E6]'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>只睇手寫的士</span>
            </button>

            {/* Date Range Selector */}
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
              className="px-2.5 py-1.5 bg-[#FFFDF9] border border-[#DDD5C5] rounded-xl text-xs font-bold text-[#554C3E] hover:bg-[#F7F2E6] focus:outline-hidden"
            >
              <option value="all">全部日期</option>
              <option value="this_month">今個月支出</option>
              <option value="last_30_days">過去30日</option>
            </select>

            {/* Add Manual Receipt */}
            <button
              onClick={onAddNewManual}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#5C4D3C] text-[#FAF7F0] hover:bg-[#4A3D2E] transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>手動記帳</span>
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setFilters({ ...filters, category: 'all' })}
            className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
              filters.category === 'all'
                ? 'bg-[#5C4D3C] text-[#FAF7F0] shadow-2xs'
                : 'bg-[#F2ECE1] text-[#695E50] hover:bg-[#EAE2D3]'
            }`}
          >
            全部類別 ({receipts.length})
          </button>
          {Object.entries(TECHO_CATEGORY_STYLES).map(([catKey, catMeta]) => {
            const count = receipts.filter((r) => r.category === catKey).length;
            if (count === 0) return null;
            return (
              <button
                key={catKey}
                onClick={() => setFilters({ ...filters, category: catKey })}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  filters.category === catKey
                    ? 'bg-[#5C4D3C] text-[#FAF7F0] shadow-2xs'
                    : `${catMeta.bg} ${catMeta.text} border ${catMeta.border} hover:opacity-90`
                }`}
              >
                <span>{catMeta.label}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Batch Action Bar */}
        {selectedIds.size > 0 && (
          <div className="p-2.5 washi-tape washi-tape-mustard rounded-xl flex items-center justify-between gap-2 text-xs shadow-tape animate-in fade-in">
            <span className="font-bold text-[#553E1B] flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
              <span className="w-2 h-2 rounded-full bg-[#BA3C2A]" />
              <span>已選取 {selectedIds.size} 筆收據</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenGoogleSheetsSync(selectedReceiptsList)}
                className="px-2.5 py-1 bg-[#FFFDF9] border border-[#3E6836] text-[#3E6836] hover:bg-[#F3F8F2] rounded-lg font-bold flex items-center gap-1 shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                寫入 Google 試算表
              </button>
              <button
                onClick={() => onExportCSV(selectedReceiptsList)}
                className="px-2.5 py-1 bg-[#FFFDF9] border border-[#C5BBAA] text-[#554C3E] hover:bg-[#F5EFE3] rounded-lg font-bold flex items-center gap-1"
              >
                <FileDown className="w-3.5 h-3.5" />
                匯出 CSV
              </button>
              <button
                onClick={() => {
                  if (confirm(`確定要從手帳中刪除選取的 ${selectedIds.size} 筆記錄嗎？`)) {
                    onBatchDelete(Array.from(selectedIds));
                    setSelectedIds(new Set());
                  }
                }}
                className="px-2.5 py-1 bg-[#BA3C2A] text-white hover:bg-[#9E2B1E] rounded-lg font-bold flex items-center gap-1 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                刪除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Kakeibo (家計簿) Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#4A443A]">
          <thead className="bg-[#FAF6EE] text-[#695E50] uppercase font-bold text-[10px] tracking-wider border-b border-[#E5DECF]">
            <tr>
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    filteredReceipts.length > 0 &&
                    selectedIds.size === filteredReceipts.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-[#C5BBAA] text-[#BA3C2A] focus:ring-[#BA3C2A]"
                />
              </th>
              <th className="py-3 px-3 w-28">
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      sortBy: 'date',
                      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
                    })
                  }
                  className="flex items-center gap-1 hover:text-[#2D2A26]"
                >
                  日期
                  <ArrowUpDown className="w-3 h-3 text-[#A89C8B]" />
                </button>
              </th>
              <th className="py-3 px-3 min-w-[190px]">
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      sortBy: 'merchantName',
                      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
                    })
                  }
                  className="flex items-center gap-1 hover:text-[#2D2A26]"
                >
                  商戶名稱 / 的士車牌
                  <ArrowUpDown className="w-3 h-3 text-[#A89C8B]" />
                </button>
              </th>
              <th className="py-3 px-3 w-36">費目類別</th>
              <th className="py-3 px-3 w-28 text-right">
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      sortBy: 'totalAmount',
                      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
                    })
                  }
                  className="flex items-center gap-1 justify-end w-full hover:text-[#2D2A26]"
                >
                  金額 (HKD)
                  <ArrowUpDown className="w-3 h-3 text-[#A89C8B]" />
                </button>
              </th>
              <th className="py-3 px-3 w-28">付款方式</th>
              <th className="py-3 px-3 min-w-[200px]">手帳備忘 · 行車路線</th>
              <th className="py-3 px-3 w-20 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFEAE0] font-normal">
            {filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#8C8273]">
                  <div className="max-w-xs mx-auto space-y-2">
                    <p className="font-bold text-[#554C3E] text-sm font-['Zen_Maru_Gothic']">
                      搵唔到符合條件的收據
                    </p>
                    <p className="text-xs text-[#8C8273]">
                      請在上方拍攝香港收據，或點擊試用樣本單據貼入手帳。
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredReceipts.map((r) => {
                const isSelected = selectedIds.has(r.id);
                const catMeta =
                  TECHO_CATEGORY_STYLES[r.category] || TECHO_CATEGORY_STYLES['Other'];

                return (
                  <tr
                    key={r.id}
                    className={`ledger-row transition-colors group ${
                      isSelected ? 'bg-[#FBF4E8]' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(r.id)}
                        className="rounded border-[#C5BBAA] text-[#BA3C2A] focus:ring-[#BA3C2A]"
                      />
                    </td>

                    {/* Date (Editable) */}
                    <td className="py-2.5 px-3 font-mono font-medium text-[#4A4235]">
                      {editingCell?.id === r.id && editingCell?.field === 'date' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="px-1.5 py-0.5 border border-[#BA3C2A] rounded text-xs bg-white"
                          />
                          <button
                            onClick={() => saveEdit(r)}
                            className="text-[#3E6836] hover:text-[#284922]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEdit(r.id, 'date', r.date)}
                          className="cursor-pointer hover:underline decoration-[#A89C8B] underline-offset-2 flex items-center gap-1.5"
                          title="點擊編輯日期"
                        >
                          <span>{r.date}</span>
                        </div>
                      )}
                    </td>

                    {/* Merchant / Vehicle (Editable) */}
                    <td className="py-2.5 px-3">
                      {editingCell?.id === r.id && editingCell?.field === 'merchantName' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="w-full px-1.5 py-0.5 border border-[#BA3C2A] rounded text-xs bg-white"
                          />
                          <button
                            onClick={() => saveEdit(r)}
                            className="text-[#3E6836] hover:text-[#284922]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {r.imageUrl && (
                            <button
                              type="button"
                              onClick={() => onSelectReceiptForView(r)}
                              className="w-6 h-6 rounded-md bg-[#F2ECE1] overflow-hidden shrink-0 border border-[#D9CFBE] hover:ring-2 hover:ring-[#8C6D4C] transition-all"
                              title="檢視單據原圖"
                            >
                              <img
                                src={r.imageUrl}
                                alt="thumb"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          )}
                          <div
                            onClick={() => startEdit(r.id, 'merchantName', r.merchantName)}
                            className="cursor-pointer font-bold text-[#2D2A26] hover:text-[#BA3C2A] transition-colors truncate max-w-[200px] font-['Zen_Maru_Gothic']"
                            title="點擊編輯商戶名稱"
                          >
                            {r.merchantName}
                          </div>
                          {r.isHandwritten && (
                            <span
                              className="hanko-square px-1 py-0 text-[10px] shrink-0"
                              title="香港手寫的士單 (Handwritten Taxi Chit)"
                            >
                              的士
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Category (Editable dropdown) */}
                    <td className="py-2.5 px-3">
                      {editingCell?.id === r.id && editingCell?.field === 'category' ? (
                        <select
                          value={tempValue}
                          onChange={(e) => {
                            setTempValue(e.target.value);
                            onUpdateReceipt({ ...r, category: e.target.value as ExpenseCategory });
                            setEditingCell(null);
                          }}
                          className="px-1 py-0.5 border border-[#BA3C2A] rounded text-xs bg-white"
                        >
                          {Object.keys(TECHO_CATEGORY_STYLES).map((c) => (
                            <option key={c} value={c}>
                              {TECHO_CATEGORY_STYLES[c as ExpenseCategory]?.label || c}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => startEdit(r.id, 'category', r.category)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${catMeta.bg} ${catMeta.text} ${catMeta.border} hover:opacity-80 transition-opacity`}
                          title="點擊切換費目"
                        >
                          {catMeta.label}
                        </button>
                      )}
                    </td>

                    {/* Amount (Editable) */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#2D2A26] text-xs">
                      {editingCell?.id === r.id && editingCell?.field === 'totalAmount' ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="w-20 px-1 py-0.5 border border-[#BA3C2A] rounded text-right font-mono text-xs bg-white"
                          />
                          <button
                            onClick={() => saveEdit(r)}
                            className="text-[#3E6836] hover:text-[#284922]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEdit(r.id, 'totalAmount', r.totalAmount)}
                          className="cursor-pointer hover:underline decoration-[#BA3C2A] underline-offset-2"
                          title="點擊編輯金額"
                        >
                          ${r.totalAmount.toFixed(2)}
                        </div>
                      )}
                    </td>

                    {/* Payment Method */}
                    <td className="py-2.5 px-3 text-[#5A5143]">
                      <span className="px-2 py-0.5 rounded bg-[#F2EDE3] font-medium text-[11px] border border-[#E2D8C7]">
                        {r.paymentMethod || '未指定'}
                      </span>
                    </td>

                    {/* Notes & Route (Editable) */}
                    <td className="py-2.5 px-3">
                      {editingCell?.id === r.id && editingCell?.field === 'notes' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="w-full px-1.5 py-0.5 border border-[#BA3C2A] rounded text-xs bg-white"
                          />
                          <button
                            onClick={() => saveEdit(r)}
                            className="text-[#3E6836] hover:text-[#284922]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEdit(r.id, 'notes', r.notes)}
                          className="cursor-pointer text-[#6B6152] text-[11px] truncate max-w-[280px] hover:text-[#2D2A26]"
                          title={`${r.notes} (點擊編輯)`}
                        >
                          {r.notes || '—'}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => onSelectReceiptForView(r)}
                          className="p-1 rounded-md text-[#786D5D] hover:text-[#2D2A26] hover:bg-[#F2EDE3]"
                          title="檢視原圖與明細"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('確定要從手帳中刪除這筆收據嗎？')) {
                              onDeleteReceipt(r.id);
                            }
                          }}
                          className="p-1 rounded-md text-[#8C8070] hover:text-[#BA3C2A] hover:bg-[#FDF2F0]"
                          title="刪除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Summary */}
      <div className="p-3.5 bg-[#FAF6EE] border-t border-[#E5DECF] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#695E50]">
        <div>
          <span>顯示中：</span>
          <span className="font-bold text-[#2D2A26]">{filteredReceipts.length}</span> / 全{' '}
          <span className="font-bold text-[#2D2A26]">{receipts.length}</span> 筆收據
        </div>
        <div className="flex items-center gap-2">
          <span>篩選合計：</span>
          <span className="font-bold text-[#2D2A26] font-mono text-sm bg-[#FFFDF9] px-2.5 py-0.5 rounded-md border border-[#E0D7C6]">
            HK${' '}
            {filteredReceipts
              .reduce((sum, r) => sum + r.totalAmount, 0)
              .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};
