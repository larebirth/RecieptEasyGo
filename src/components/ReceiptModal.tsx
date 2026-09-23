import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Trash2,
  Calendar,
  Store,
  Tag,
  DollarSign,
  FileText,
  CreditCard,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sparkles,
  Plus,
  Minus,
  Paperclip,
} from 'lucide-react';
import { Receipt, ExpenseCategory, ReceiptItem } from '../types';

const TECHO_CATEGORIES: { key: ExpenseCategory; label: string }[] = [
  { key: 'Meals & Dining', label: '餐飲食肆 (Meals & Dining)' },
  { key: 'Transportation', label: '交通出行 (Transportation)' },
  { key: 'Groceries', label: '超市雜貨 (Groceries)' },
  { key: 'Shopping & Retail', label: '購物消費 (Shopping & Retail)' },
  { key: 'Utilities & Telecom', label: '水電通訊 (Utilities & Telecom)' },
  { key: 'Office Supplies', label: '辦公文具 (Office Supplies)' },
  { key: 'Entertainment', label: '休閒娛樂 (Entertainment)' },
  { key: 'Health & Medical', label: '醫療健康 (Health & Medical)' },
  { key: 'Travel & Lodging', label: '差旅住宿 (Travel & Lodging)' },
  { key: 'Other', label: '其他雜項 (Other)' },
];

const PAYMENT_METHODS = [
  '八達通 (Octopus)',
  '現金 (Cash)',
  '信用卡 (Credit Card)',
  '轉數快 (FPS)',
  'PayMe',
  'AlipayHK',
  'WeChat Pay HK',
  '其他方式 (Other)',
];

interface ReceiptModalProps {
  receipt: Receipt | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Receipt) => void;
  onDelete?: (id: string) => void;
  onReExtract?: (receipt: Receipt, hint: string) => Promise<void>;
  isNewScan?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onReExtract,
  isNewScan,
}) => {
  const [formData, setFormData] = useState<Receipt | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [reExtractHint, setReExtractHint] = useState('');
  const [isReExtracting, setIsReExtracting] = useState(false);
  const [showReExtractBox, setShowReExtractBox] = useState(false);

  useEffect(() => {
    if (receipt) {
      setFormData({ ...receipt });
      setZoomLevel(1);
      setRotation(0);
      setReExtractHint('');
      setShowReExtractBox(false);
    }
  }, [receipt]);

  if (!isOpen || !formData) return null;

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: any) => {
    if (!formData.items) return;
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === 'price' || field === 'quantity' ? parseFloat(value) || 0 : value,
    };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    const newItems = formData.items ? [...formData.items] : [];
    newItems.push({ name: '新增項目', quantity: 1, price: 0 });
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    if (!formData.items) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleTriggerReExtract = async () => {
    if (!onReExtract || !receipt) return;
    setIsReExtracting(true);
    try {
      await onReExtract(receipt, reExtractHint);
      setShowReExtractBox(false);
    } catch (err) {
      console.error('Re-extract error:', err);
    } finally {
      setIsReExtracting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2E2820]/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#FFFDF9] rounded-2xl max-w-4xl w-full shadow-2xl border border-[#DFD6C6] overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="relative px-5 py-3.5 border-b border-[#E8E1D3] flex items-center justify-between bg-[#FAF6EE]">
          <div className="absolute top-0 left-8 -mt-1 w-20 h-3.5 washi-tape washi-tape-cherry rounded-xs shadow-tape" />

          <div className="flex items-center gap-2 pt-1">
            <h3 className="text-base font-bold text-[#2D2A26] font-['Zen_Maru_Gothic']">
              {isNewScan ? '核對單據資料並貼入手帳' : '收據明細 · 手帳手記'}
            </h3>
            {formData.isHandwritten && (
              <span className="hanko-square px-1.5 py-0.2 text-[11px] font-bold">
                香港的士 手寫
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C8070] hover:text-[#2D2A26] hover:bg-[#EFE8DC] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#FAF7F0]/40">
          {/* Left Column: Image viewer */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#554C3E] flex items-center gap-1 font-['Zen_Maru_Gothic']">
                <Paperclip className="w-3.5 h-3.5 text-[#8C7A6B]" />
                收據原圖 (Original Receipt)
              </span>
              <div className="flex items-center gap-1 bg-[#F2EDE3] p-1 rounded-lg border border-[#DDD4C5]">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                  className="p-1 text-[#665D4F] hover:text-[#2D2A26]"
                  title="縮小"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold px-1 text-[#554C3E]">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                  className="p-1 text-[#665D4F] hover:text-[#2D2A26]"
                  title="放大"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 text-[#665D4F] hover:text-[#2D2A26]"
                  title="旋轉"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[260px] max-h-[460px] bg-[#2E2822] rounded-xl overflow-hidden relative flex items-center justify-center p-2 border border-[#443D36] shadow-inner">
              {formData.imageUrl ? (
                <img
                  src={formData.imageUrl}
                  alt="Scanned receipt"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="max-h-full max-w-full object-contain rounded shadow-lg"
                />
              ) : (
                <div className="text-center text-[#A69B8D] text-xs p-4">
                  暫無原圖預覽
                </div>
              )}
            </div>

            {/* Re-extract trigger */}
            {onReExtract && (
              <div className="mt-3">
                {!showReExtractBox ? (
                  <button
                    type="button"
                    onClick={() => setShowReExtractBox(true)}
                    className="w-full py-1.5 px-2.5 text-xs text-[#6B5E4F] hover:text-[#2D2A26] bg-[#F4EFE6] hover:bg-[#EAE2D5] border border-[#DDD3C2] rounded-xl flex items-center justify-center gap-1.5 transition-colors font-bold font-['Zen_Maru_Gothic']"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#BA3C2A]" />
                    輸入筆跡提示給 AI 重新解析
                  </button>
                ) : (
                  <div className="p-3 bg-[#FAF3E6] border border-[#E0D0B5] rounded-xl text-xs space-y-2">
                    <div className="font-bold text-[#55432B] flex items-center justify-between">
                      <span>輸入筆跡或車牌備忘：</span>
                      <button
                        type="button"
                        onClick={() => setShowReExtractBox(false)}
                        className="text-[#8C704C] hover:text-[#55432B]"
                      >
                        取消
                      </button>
                    </div>
                    <input
                      type="text"
                      value={reExtractHint}
                      onChange={(e) => setReExtractHint(e.target.value)}
                      placeholder="例如：總額係285唔係235、的士車牌係TF8821"
                      className="w-full px-2.5 py-1.5 bg-white border border-[#D5C29F] rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      disabled={isReExtracting}
                      onClick={handleTriggerReExtract}
                      className="w-full py-1 bg-[#8C6D4C] hover:bg-[#72573B] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                    >
                      {isReExtracting ? '正在解析...' : '以 Gemini 重新解析'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Editable structured fields */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-[#FFFDF9] p-4 rounded-xl border border-[#EAE3D5]">
            <form id="receipt-edit-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-[#554C3E] mb-1 flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                    <Calendar className="w-3.5 h-3.5 text-[#8C7A6B]" />
                    交易日期 (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FAF7F0] border border-[#DDD4C5] rounded-xl text-xs font-mono font-medium text-[#2D2A26] focus:bg-white focus:ring-2 focus:ring-[#8C6D4C]/25 focus:border-[#8C6D4C]"
                  />
                </div>

                {/* Total Amount & Currency */}
                <div>
                  <label className="block text-xs font-bold text-[#554C3E] mb-1 flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                    <DollarSign className="w-3.5 h-3.5 text-[#8C7A6B]" />
                    總額 ({formData.currency})
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-[#8C7A6B]">$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.totalAmount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            totalAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-6 pr-3 py-1.5 bg-[#FAF7F0] border border-[#DDD4C5] rounded-xl text-sm font-bold text-[#2D2A26] font-mono focus:bg-white focus:ring-2 focus:ring-[#BA3C2A]/25 focus:border-[#BA3C2A]"
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                      className="w-16 px-2 py-1.5 bg-[#FAF7F0] border border-[#DDD4C5] rounded-xl text-xs font-bold text-center text-[#554C3E]"
                      title="幣別"
                    />
                  </div>
                </div>
              </div>

              {/* Merchant Name */}
              <div>
                <label className="block text-xs font-bold text-[#554C3E] mb-1 flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                  <Store className="w-3.5 h-3.5 text-[#8C7A6B]" />
                  商戶名稱 / 的士車牌
                </label>
                <input
                  type="text"
                  required
                  value={formData.merchantName}
                  onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                  placeholder="例如：香港的士 (TF 8821)、翠華餐廳 Tsui Wah"
                  className="w-full px-3 py-1.5 bg-[#FAF7F0] border border-[#DDD4C5] rounded-xl text-xs font-bold text-[#2D2A26] focus:bg-white focus:ring-2 focus:ring-[#8C6D4C]/25 focus:border-[#8C6D4C]"
                />
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#554C3E] mb-1 flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                    <Tag className="w-3.5 h-3.5 text-[#8C7A6B]" />
                    費目類別 (Category)
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ExpenseCategory })
                    }
                    className="w-full px-3 py-1.5 bg-[#FAF7F0] border border-[#DDD4C5] rounded-xl text-xs font-bold text-[#2D2A26] focus:bg-white focus:ring-2 focus:ring-[#8C6D4C]/25 focus:border-[#8C6D4C]"
                  >
                    {TECHO_CATEGORIES.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#554C3E] mb-1 flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                    <CreditCard className="w-3.5 h-3.5 text-[#8C7A6B]" />
                    付款方式
                  </label>
                  <select
                    value={formData.paymentMethod || '未指定'}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FAF7F0] border border-[#DDD4C5] rounded-xl text-xs font-bold text-[#2D2A26] focus:bg-white focus:ring-2 focus:ring-[#8C6D4C]/25 focus:border-[#8C6D4C]"
                  >
                    <option value="未指定">未指定 / 未明</option>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes & Taxi Route */}
              <div>
                <label className="block text-xs font-bold text-[#554C3E] mb-1 flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
                  <FileText className="w-3.5 h-3.5 text-[#8C7A6B]" />
                  手帳備忘 · 行車路線 · 隧道附加費
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="例如：香港國際機場往中環天星碼頭。西隧隧道費 $25，行李 2 件。"
                  className="w-full px-3 py-1.5 bg-[#FAF7F0] border border-[#DDD4C5] rounded-xl text-xs text-[#2D2A26] focus:bg-white focus:ring-2 focus:ring-[#8C6D4C]/25 focus:border-[#8C6D4C]"
                />
              </div>

              {/* Itemized Line Items */}
              <div className="pt-2 border-t border-[#EDE6D8]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#554C3E] font-['Zen_Maru_Gothic']">
                    分項商品明細 ({formData.items?.length || 0} 項)
                  </span>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-[11px] font-bold text-[#BA3C2A] hover:text-[#9E2B1E] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> 新增項目
                  </button>
                </div>

                {formData.items && formData.items.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {formData.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          placeholder="項目名稱"
                          className="flex-1 px-2 py-1 bg-[#FAF7F0] border border-[#DDD4C5] rounded-lg text-xs"
                        />
                        <input
                          type="number"
                          value={item.quantity || 1}
                          min="1"
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-12 px-1.5 py-1 bg-[#FAF7F0] border border-[#DDD4C5] rounded-lg text-xs text-center font-mono"
                          title="數量"
                        />
                        <div className="relative w-20">
                          <span className="absolute left-1.5 top-1 text-[#8C7A6B]">$</span>
                          <input
                            type="number"
                            step="0.1"
                            value={item.price}
                            onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                            className="w-full pl-4 pr-1 py-1 bg-[#FAF7F0] border border-[#DDD4C5] rounded-lg text-xs font-mono font-medium"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 text-[#8C7A6B] hover:text-[#BA3C2A]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#A69A8B] italic">
                    無分項商品明細（僅有錶頭車資或總額）。
                  </p>
                )}
              </div>
            </form>

            {/* Modal Actions */}
            <div className="mt-5 pt-3 border-t border-[#EDE6D8] flex items-center justify-between gap-2">
              <div>
                {onDelete && !isNewScan && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('確定要從手帳中刪除這筆收據記錄嗎？')) {
                        onDelete(formData.id);
                        onClose();
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-[#BA3C2A] hover:bg-[#FCEEEB] rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    刪除記錄
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs font-bold text-[#695E50] hover:text-[#2D2A26] bg-[#F2EDE3] hover:bg-[#EAE2D5] rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  form="receipt-edit-form"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#BA3C2A] hover:bg-[#A32F1F] rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors font-['Zen_Maru_Gothic']"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isNewScan ? '貼入手帳記帳 (已入帳)' : '儲存變更'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
