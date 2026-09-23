import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware for parsing large base64 image payloads from camera / receipts
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Helper to obtain GoogleGenAI client with runtime API key
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Response Schema for structured receipt extraction
const receiptExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    date: {
      type: Type.STRING,
      description: 'Receipt transaction date strictly formatted as YYYY-MM-DD. If year is missing, assume 2026 or 2025. If unreadable, use today’s date.',
    },
    merchantName: {
      type: Type.STRING,
      description: 'The primary store, merchant, vendor, or taxi name. For Hong Kong taxis, include vehicle registration plate if visible, e.g., "HK Taxi (TF 8821)" or "的士 (UF 3218)". For dining, use bilingual or original name, e.g., "翠華餐廳 Tsui Wah" or "澳牛 Australia Dairy Co."',
    },
    category: {
      type: Type.STRING,
      description: 'Expense category: one of "Meals & Dining", "Transportation", "Groceries", "Shopping & Retail", "Utilities & Telecom", "Office Supplies", "Entertainment", "Health & Medical", "Travel & Lodging", or "Other".',
    },
    totalAmount: {
      type: Type.NUMBER,
      description: 'The final total payable amount as a pure number without currency symbols (e.g. 185.50).',
    },
    currency: {
      type: Type.STRING,
      description: 'Standard 3-letter currency code. For Hong Kong receipts, default to "HKD" unless explicitly in USD, CNY, or MOP.',
    },
    notes: {
      type: Type.STRING,
      description: 'Summary of receipt details. For Hong Kong taxi receipts, state pickup location, drop-off location, tunnel fee (e.g., "Western Harbour Tunnel $75"), luggage fee, and vehicle plate. For restaurants, mention key items or service charges.',
    },
    taxOrServiceCharge: {
      type: Type.NUMBER,
      description: '10% service charge (加一服務費) or tax if applicable, otherwise 0.',
    },
    paymentMethod: {
      type: Type.STRING,
      description: 'Payment method detected: "Octopus", "Cash", "Credit Card", "FPS", "PayMe", "AlipayHK", "WeChat Pay", or "Unknown".',
    },
    items: {
      type: Type.ARRAY,
      description: 'List of line items if visible on the receipt.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Item name or description' },
          quantity: { type: Type.NUMBER, description: 'Quantity purchased' },
          price: { type: Type.NUMBER, description: 'Total price for this item' },
        },
        required: ['name', 'price'],
      },
    },
    isHandwritten: {
      type: Type.BOOLEAN,
      description: 'True if receipt is handwritten (e.g. typical HK taxi driver hand-filled carbon receipt or cha chaan teng order slip), false for printed machine thermal paper.',
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: 'Confidence score from 0.0 to 1.0 on handwriting legibility and overall data extraction accuracy.',
    },
  },
  required: ['date', 'merchantName', 'category', 'totalAmount', 'currency', 'notes'],
};

const SYSTEM_INSTRUCTION = `You are an expert Hong Kong receipt auditor and OCR specialist with native understanding of Hong Kong receipts, Traditional Chinese (繁體中文), Cantonese terminology, and handwritten taxi chits (的士收據).

Guidelines for Hong Kong Receipts:
1. Handwritten Hong Kong Taxi Receipts (的士手寫收據):
   - Often hand-filled by drivers in blue or red ballpoint pen on pre-printed carbon forms.
   - Fields commonly include:
     - 車號 / 車牌 (Vehicle Registration / Plate Number, e.g. "TF 1234", "UF 8899")
     - 上車地點 (From / Pickup) e.g., 機場 (Airport), 中環 (Central), 尖沙咀 (TST), 灣仔 (Wan Chai), 觀塘 (Kwun Tong)
     - 下車地點 (To / Destination)
     - 車資 / 總收費 (Fare / Total charge)
     - 附加費 / 隧道費 (Tunnel surcharge, e.g. 西隧, 紅隧, 東隧, 大欖, 青嶼幹線, 行李)
   - Extract the full fare amount into 'totalAmount'.
   - In 'merchantName', output "HK Taxi (Plate No)" or "香港的士" if plate is illegible.
   - In 'category', strictly classify as "Transportation".
   - In 'notes', specify the route, plate number, and any tunnel/luggage toll breakdown.
   - Set 'isHandwritten' to true.

2. Printed Hong Kong Receipts (Dining, Supermarkets, Convenience, Retail):
   - Recognise stores like ParknShop (百佳), Wellcome (惠康), 7-Eleven, Circle K (OK便利店), Mannings (萬寧), Watsons (屈臣氏), Uniqlo, Fortress (豐澤), Broadway (百老匯).
   - Cha Chaan Teng (茶餐廳), Dai Pai Dong, Fast food (Fairwood 大快活, Café de Coral 大家樂, Maxim's MX 美心): look for "加一" (10% service charge), sets, Octopus payment.
   - Payment method: Look for 八達通 (Octopus), 現金 (Cash), 信用卡 / VISA / Mastercard, 轉數快 (FPS), PayMe, AlipayHK, WeChat Pay.
   - Currency: Unless another currency is explicitly shown, default to "HKD".

3. Date Formatting:
   - Always output date as strictly YYYY-MM-DD.
   - Common HK formats include DD/MM/YYYY (e.g., 22/09/2026 -> 2026-09-22) or DD-MM-YY. Convert correctly! If the year is omitted or unclear, default to 2026.

4. Amount:
   - Output 'totalAmount' as a pure positive number (e.g. 185.00). Ensure decimal places are accurate. Do not confuse change due (找贖) with total amount paid (實收/總額).`;

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Endpoint: Scan and extract receipt data
app.post('/api/scan-receipt', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', userPromptHint } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        error: 'Missing imageBase64 in request body.',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please ensure the key is provided in Settings > Secrets.',
      });
    }

    // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,")
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const promptText = userPromptHint
      ? `Please extract this receipt carefully with structured output. Extra user hint: "${userPromptHint}". Default currency is HKD.`
      : 'Please extract all details from this receipt (especially Hong Kong specific details, handwritten taxi notes, line items, and totals) with structured JSON output. Default currency is HKD.';

    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: receiptExtractionSchema,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error('Gemini returned an empty response.');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(rawText.trim());
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', rawText);
      return res.status(500).json({
        error: 'Model output was not valid JSON.',
        rawText,
      });
    }

    // Assign fallback values if needed
    const receipt = {
      id: 'rcpt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      date: parsedData.date || new Date().toISOString().split('T')[0],
      merchantName: parsedData.merchantName || 'Unknown Merchant',
      category: parsedData.category || 'Other',
      totalAmount: typeof parsedData.totalAmount === 'number' ? parsedData.totalAmount : parseFloat(parsedData.totalAmount) || 0,
      currency: parsedData.currency || 'HKD',
      notes: parsedData.notes || '',
      taxOrServiceCharge: parsedData.taxOrServiceCharge || 0,
      paymentMethod: parsedData.paymentMethod || 'Unknown',
      items: Array.isArray(parsedData.items) ? parsedData.items : [],
      isHandwritten: Boolean(parsedData.isHandwritten),
      confidenceScore: typeof parsedData.confidenceScore === 'number' ? parsedData.confidenceScore : 0.95,
      createdAt: new Date().toISOString(),
    };

    return res.json({
      success: true,
      receipt,
    });
  } catch (error: any) {
    console.error('Error scanning receipt:', error);
    return res.status(500).json({
      error: error?.message || 'Internal server error while processing receipt.',
    });
  }
});

// Endpoint: Append receipt to Google Sheets (via Google Apps Script Webhook or direct Google API)
app.post('/api/google-sheets/append', async (req: Request, res: Response) => {
  try {
    const { webhookUrl, receipts } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({
        error: 'Missing Google Apps Script / Sheet webhookUrl.',
      });
    }

    if (!receipts || !Array.isArray(receipts) || receipts.length === 0) {
      return res.status(400).json({
        error: 'No receipts provided to append.',
      });
    }

    // Call Google Apps Script Web App endpoint
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'append_receipts',
        source: 'HK Receipt Scanner',
        receipts,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: `Google Sheets Webhook failed (${response.status}): ${errText}`,
      });
    }

    const data = await response.json().catch(() => ({ status: 'success' }));
    return res.json({
      success: true,
      message: 'Receipts appended to Google Sheet successfully.',
      data,
    });
  } catch (error: any) {
    console.error('Google Sheets sync error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to communicate with Google Sheets endpoint.',
    });
  }
});

// Server-side Vite mounting in dev mode or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Receipt Scanner app running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
