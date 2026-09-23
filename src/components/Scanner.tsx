import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Car,
  Utensils,
  ShoppingBag,
  Loader2,
  AlertCircle,
  Feather,
} from 'lucide-react';
import { Receipt } from '../types';
import { SAMPLE_RECEIPTS_DATA } from '../data/sampleReceipts';

interface ScannerProps {
  onScanComplete: (receipt: Receipt) => void;
  isScanning: boolean;
  scanProgressText: string;
  onScanImage: (dataUrl: string, hint?: string) => Promise<void>;
  onLoadSample: (sample: typeof SAMPLE_RECEIPTS_DATA[0]) => void;
}

export const Scanner: React.FC<ScannerProps> = ({
  onScanComplete,
  isScanning,
  scanProgressText,
  onScanImage,
  onLoadSample,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [userPromptHint, setUserPromptHint] = useState('');
  const [showHintBox, setShowHintBox] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        setErrorMsg('請選擇圖片檔案（支援 JPEG、PNG、WEBP、HEIC 等）。');
        continue;
      }

      try {
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            try {
              await onScanImage(dataUrl, userPromptHint.trim() || undefined);
              resolve();
            } catch (err: any) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('讀取圖片檔案失敗。'));
          reader.readAsDataURL(file);
        });
      } catch (err: any) {
        setErrorMsg(err?.message || '解析收據圖片時發生錯誤。');
        break;
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="relative bg-[#FFFDF9] rounded-2xl border border-[#E5DECF] p-4 sm:p-6 shadow-techo overflow-hidden">
      {/* Decorative Washi Tape on top edge */}
      <div className="absolute top-0 left-12 -mt-1.5 w-24 h-5 washi-tape washi-tape-cherry rounded-xs shadow-tape transform -rotate-2 z-10 opacity-90 pointer-events-none" />
      <div className="absolute top-0 right-14 -mt-1.5 w-20 h-5 washi-tape washi-tape-matcha rounded-xs shadow-tape transform rotate-1 z-10 opacity-90 pointer-events-none" />

      <div className="relative z-10 pt-1">
        {/* Title area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#2D2A26] flex items-center gap-2 font-['Zen_Maru_Gothic']">
                <span>貼入收據 · 掃描記帳</span>
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF3E8] text-[#8C6D4C] border border-[#E8DCBF]">
                ✨ AI 手帳記帳
              </span>
            </div>
            <p className="text-xs text-[#7A7264] mt-0.5">
              專門識別香港紙質收據、手寫的士單（車牌、隧道費、行李費）及茶餐廳單據。
            </p>
          </div>

          {/* Prompt hint toggle */}
          <button
            type="button"
            onClick={() => setShowHintBox(!showHintBox)}
            className="text-xs text-[#6B5F50] hover:text-[#2D2A26] font-medium flex items-center gap-1.5 self-start sm:self-auto py-1 px-2.5 rounded-lg bg-[#F5EFE3] hover:bg-[#EFE8DA] transition-colors"
          >
            <Feather className="w-3.5 h-3.5 text-[#A67C52]" />
            <span>{showHintBox ? '收起備忘' : '新增手帳備忘 / 辨識提示'}</span>
          </button>
        </div>

        {/* Optional prompt hint box */}
        {showHintBox && (
          <div className="mb-4 p-3.5 bg-[#FAF6EE] border border-[#E5DAC4] rounded-xl text-xs space-y-1.5">
            <label className="font-bold text-[#554C3E] block">
              手帳備忘 / 給 AI 的提示（選填）:
            </label>
            <input
              type="text"
              value={userPromptHint}
              onChange={(e) => setUserPromptHint(e.target.value)}
              placeholder="例如：「司機用藍色原子筆寫 $285」、「八達通付款分單」等"
              className="w-full px-3 py-1.5 bg-[#FFFDF9] border border-[#DED4C1] rounded-lg text-xs text-[#2D2A26] focus:outline-hidden focus:ring-2 focus:ring-[#8C6D4C]/20 focus:border-[#8C6D4C]"
            />
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-[#FDF2F0] border border-[#F5C6C0] rounded-xl flex items-start gap-2.5 text-xs text-[#9E2B1E]">
            <AlertCircle className="w-4 h-4 text-[#BA3C2A] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">錯誤提示: </span>
              {errorMsg}
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-[#9E2B1E] hover:text-[#5E160D] font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Action zone: Camera button & Dropzone */}
        {isScanning ? (
          <div className="border-2 border-dashed border-[#D6C4AA] bg-[#FAF5EB] rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <div className="relative mb-3">
              <div className="w-14 h-14 rounded-2xl bg-[#5C4D3C] text-[#FAF7F0] flex items-center justify-center shadow-lg shadow-[#5C4D3C]/20 animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin text-[#E8DFD3]" />
              </div>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#2D2A26] mb-1 font-['Zen_Maru_Gothic']">
              正在手帳上工整記錄中...
            </h3>
            <p className="text-xs text-[#7A7264] max-w-sm">
              {scanProgressText || 'Gemini 3.8 Flash 正在識別繁體字、香港的士錶頭、隧道費及手寫數字...'}
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-[#5A5142] font-medium bg-[#FFFDF9] px-3.5 py-1 rounded-full border border-[#DFD5C2] shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B44] animate-ping" />
              <span>結構化數據解析中（港幣 HKD · 日期 · 店名 · 明細）</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Camera Snap Button */}
            <label
              className="flex flex-col items-center justify-center p-5 rounded-2xl border border-[#DFCFC0] bg-[#FAF5EC] hover:bg-[#F4ECE0] cursor-pointer transition-all active:scale-[0.99] group text-center shadow-2xs relative overflow-hidden"
            >
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="w-12 h-12 rounded-xl bg-[#BA3C2A] text-white flex items-center justify-center shadow-md shadow-[#BA3C2A]/25 group-hover:scale-105 transition-transform mb-2">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-[#2D2A26] group-hover:text-[#BA3C2A] transition-colors font-['Zen_Maru_Gothic']">
                影相 · 拍攝收據
              </span>
              <span className="text-xs text-[#7A7061] mt-0.5">
                直接開啟手機相機拍攝單據
              </span>
            </label>

            {/* Upload File / Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all text-center ${
                isDragOver
                  ? 'border-[#8C6D4C] bg-[#F4EDE1] scale-[1.01]'
                  : 'border-[#D9CFBE] bg-[#FDFCFA] hover:bg-[#F9F5EC] hover:border-[#BFB29C]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="w-12 h-12 rounded-xl bg-[#EBE3D3] text-[#554C3E] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-[#353028] font-['Zen_Maru_Gothic']">
                選擇圖片 · 拖放上傳
              </span>
              <span className="text-xs text-[#7A7061] mt-0.5">
                從相簿選取 (JPEG, PNG, HEIC)
              </span>
            </div>
          </div>
        )}

        {/* Quick Sample Receipts Bar */}
        <div className="mt-4 pt-3.5 border-t border-[#EDE6D8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#5A5142] flex items-center gap-1.5 font-['Zen_Maru_Gothic']">
              <span>📎 試用香港收據樣本（一鍵貼入手帳測試）:</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SAMPLE_RECEIPTS_DATA.map((sample, idx) => (
              <button
                key={sample.title}
                type="button"
                disabled={isScanning}
                onClick={() => onLoadSample(sample)}
                className="relative flex items-center gap-2.5 p-2.5 rounded-xl border border-[#DFD6C6] bg-[#FAF7F0] hover:bg-white text-left transition-all hover:shadow-xs group disabled:opacity-50"
              >
                {/* Mini washi tape strip at corner */}
                <span
                  className={`absolute -top-1.5 right-3 w-8 h-3 rounded-xs opacity-75 ${
                    idx === 0
                      ? 'washi-tape-cherry'
                      : idx === 1
                      ? 'washi-tape-mustard'
                      : 'washi-tape-matcha'
                  }`}
                />

                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                    idx === 0
                      ? 'bg-[#F9E8E6] text-[#BA3C2A]'
                      : idx === 1
                      ? 'bg-[#F9F0DB] text-[#8C6D2C]'
                      : 'bg-[#EAF1E7] text-[#3D6835]'
                  }`}
                >
                  {idx === 0 ? (
                    <Car className="w-4 h-4" />
                  ) : idx === 1 ? (
                    <Utensils className="w-4 h-4" />
                  ) : (
                    <ShoppingBag className="w-4 h-4" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#2D2A26] truncate group-hover:text-[#BA3C2A] font-['Zen_Maru_Gothic']">
                      {idx === 0
                        ? '手寫紅的 (的士單)'
                        : idx === 1
                        ? '翠華餐廳 (茶餐廳)'
                        : '百佳超級市場 (超市單)'}
                    </span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-[#EBE2D3] text-[#554C3E] font-mono">
                      HK${sample.receiptData.totalAmount}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A7061] truncate">
                    {sample.subtitle}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
