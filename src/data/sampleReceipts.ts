import { Receipt } from '../types';

// Create realistic SVG data URLs for Hong Kong sample receipts
function createTaxiSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="850" viewBox="0 0 600 850" style="background:#fefdf8;font-family:'Courier New', monospace, sans-serif;">
    <rect width="600" height="850" fill="#fdfbf4" stroke="#d5c8a0" stroke-width="3"/>
    <!-- Red Taxi Logo and Header -->
    <rect x="25" y="25" width="550" height="65" fill="#c0262b" rx="6"/>
    <text x="300" y="55" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif">TAXI RECEIPT · 香港的士收據</text>
    <text x="300" y="77" font-size="14" fill="#fecaca" text-anchor="middle">HONG KONG URBAN TAXI (RED)</text>

    <!-- Certificate Border -->
    <rect x="30" y="105" width="540" height="715" fill="none" stroke="#b08b59" stroke-width="1.5" stroke-dasharray="6,3"/>

    <!-- Pre-printed lines and handwritten blue ballpoint text -->
    <text x="50" y="145" font-size="16" fill="#666" font-weight="bold">的士登記號碼 (Car Reg. No.):</text>
    <line x1="280" y1="148" x2="550" y2="148" stroke="#999" stroke-width="1"/>
    <text x="300" y="144" font-size="22" fill="#1e3a8a" font-family="cursive" font-weight="bold">TF 8821</text>

    <text x="50" y="195" font-size="16" fill="#666" font-weight="bold">日期 (Date):</text>
    <line x1="160" y1="198" x2="550" y2="198" stroke="#999" stroke-width="1"/>
    <text x="180" y="194" font-size="22" fill="#1e3a8a" font-family="cursive" font-weight="bold">2026-09-21 (21/09/2026)</text>

    <text x="50" y="245" font-size="16" fill="#666" font-weight="bold">上車地點 (From):</text>
    <line x1="200" y1="248" x2="550" y2="248" stroke="#999" stroke-width="1"/>
    <text x="220" y="244" font-size="22" fill="#1e3a8a" font-family="cursive" font-weight="bold">香港國際機場 (HK Airport T1)</text>

    <text x="50" y="295" font-size="16" fill="#666" font-weight="bold">下車地點 (To):</text>
    <line x1="180" y1="298" x2="550" y2="298" stroke="#999" stroke-width="1"/>
    <text x="200" y="294" font-size="22" fill="#1e3a8a" font-family="cursive" font-weight="bold">中環天星碼頭 (Central Pier)</text>

    <text x="50" y="360" font-size="18" fill="#333" font-weight="bold">車費項目 / FARE BREAKDOWN</text>
    <line x1="50" y1="375" x2="550" y2="375" stroke="#333" stroke-width="1.5"/>

    <text x="60" y="415" font-size="16" fill="#555">咪錶基本收費 (Meter Fare):</text>
    <text x="440" y="415" font-size="20" fill="#1e3a8a" font-family="cursive" font-weight="bold">$ 235.00</text>

    <text x="60" y="465" font-size="16" fill="#555">西區海底隧道附加費 (Western Tunnel Toll):</text>
    <text x="440" y="465" font-size="20" fill="#1e3a8a" font-family="cursive" font-weight="bold">$  25.00</text>

    <text x="60" y="515" font-size="16" fill="#555">行李附加費 2件 (Luggage Toll 2 pcs):</text>
    <text x="440" y="515" font-size="20" fill="#1e3a8a" font-family="cursive" font-weight="bold">$  12.00</text>

    <text x="60" y="565" font-size="16" fill="#555">青嶼幹線/其他附加費 (Other Surcharge):</text>
    <text x="440" y="565" font-size="20" fill="#1e3a8a" font-family="cursive" font-weight="bold">$  13.00</text>

    <line x1="50" y1="600" x2="550" y2="600" stroke="#333" stroke-width="2"/>

    <rect x="50" y="615" width="500" height="70" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5" rx="4"/>
    <text x="70" y="658" font-size="22" font-weight="bold" fill="#1e3a8a">總收費 TOTAL PAID (HKD):</text>
    <text x="410" y="660" font-size="32" font-weight="bold" fill="#b91c1c" font-family="cursive">HK$ 285.00</text>

    <!-- Driver Signature & Stamp -->
    <text x="60" y="730" font-size="15" fill="#777">司機簽署 (Driver Signature):</text>
    <path d="M 270 735 Q 320 700 370 725 T 430 710" fill="none" stroke="#1e3a8a" stroke-width="3" stroke-linecap="round"/>

    <!-- Red HK Taxi Rubber Stamp -->
    <circle cx="480" cy="740" r="45" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="4,2"/>
    <text x="480" y="735" font-size="12" fill="#dc2626" text-anchor="middle" font-weight="bold">香港市區的士</text>
    <text x="480" y="752" font-size="11" fill="#dc2626" text-anchor="middle">車牌 TF8821</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createTsuiWahSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="550" height="800" viewBox="0 0 550 800" style="background:#fff;font-family:'Courier New', monospace, sans-serif;">
    <rect width="550" height="800" fill="#fffdfa" stroke="#e2e8f0" stroke-width="2"/>
    <text x="275" y="45" font-size="24" font-weight="bold" fill="#0f172a" text-anchor="middle">翠華餐廳 TSUI WAH</text>
    <text x="275" y="70" font-size="14" fill="#64748b" text-anchor="middle">中環威靈頓街15-19號地下</text>
    <text x="275" y="90" font-size="13" fill="#64748b" text-anchor="middle">Tel: 2525 6338 · 機號: REG-04</text>
    <line x1="30" y1="105" x2="520" y2="105" stroke="#334155" stroke-dasharray="4,4"/>

    <text x="30" y="130" font-size="14" fill="#334155">發票號: TW-20260920-884</text>
    <text x="350" y="130" font-size="14" fill="#334155">枱號: A12 (2人)</text>
    <text x="30" y="155" font-size="14" fill="#334155">日期: 2026-09-20 13:42</text>
    <text x="350" y="155" font-size="14" fill="#334155">收銀員: 0089</text>
    <line x1="30" y1="170" x2="520" y2="170" stroke="#334155" stroke-dasharray="4,4"/>

    <!-- Items -->
    <text x="30" y="195" font-size="13" fill="#475569" font-weight="bold">項目 (ITEM)</text>
    <text x="360" y="195" font-size="13" fill="#475569" font-weight="bold">數量</text>
    <text x="460" y="195" font-size="13" fill="#475569" font-weight="bold">金額</text>
    <line x1="30" y1="205" x2="520" y2="205" stroke="#cbd5e1"/>

    <text x="30" y="235" font-size="15" fill="#0f172a" font-weight="bold">招牌至潮脆樺奶油豬</text>
    <text x="375" y="235" font-size="15" fill="#0f172a">1</text>
    <text x="470" y="235" font-size="15" fill="#0f172a">28.00</text>

    <text x="30" y="275" font-size="15" fill="#0f172a" font-weight="bold">瑞士汁雞翼撈公仔麵</text>
    <text x="375" y="275" font-size="15" fill="#0f172a">1</text>
    <text x="470" y="275" font-size="15" fill="#0f172a">68.00</text>

    <text x="30" y="315" font-size="15" fill="#0f172a" font-weight="bold">凍香滑奶茶 (少甜少冰)</text>
    <text x="375" y="315" font-size="15" fill="#0f172a">1</text>
    <text x="470" y="315" font-size="15" fill="#0f172a">25.00</text>

    <text x="30" y="355" font-size="15" fill="#0f172a" font-weight="bold">凍檸檬茶 (Iced Lemon Tea)</text>
    <text x="375" y="355" font-size="15" fill="#0f172a">1</text>
    <text x="470" y="355" font-size="15" fill="#0f172a">25.00</text>

    <line x1="30" y1="390" x2="520" y2="390" stroke="#cbd5e1"/>

    <text x="30" y="420" font-size="15" fill="#334155">小計 (Subtotal):</text>
    <text x="460" y="420" font-size="15" fill="#334155">146.00</text>

    <text x="30" y="450" font-size="15" fill="#334155">加一服務費 10% Service Charge:</text>
    <text x="460" y="450" font-size="15" fill="#334155">14.60</text>

    <line x1="30" y1="475" x2="520" y2="475" stroke="#0f172a" stroke-width="1.5"/>

    <text x="30" y="515" font-size="22" font-weight="bold" fill="#0f172a">應收總額 TOTAL (HKD):</text>
    <text x="400" y="515" font-size="26" font-weight="bold" fill="#0f172a">HK$ 160.60</text>

    <line x1="30" y1="535" x2="520" y2="535" stroke="#0f172a" stroke-width="1.5"/>

    <text x="30" y="570" font-size="15" fill="#334155">付款方式 (Payment): 八達通 (Octopus)</text>
    <text x="30" y="595" font-size="14" fill="#64748b">八達通卡號: **********9824</text>
    <text x="30" y="620" font-size="14" fill="#64748b">八達通餘額: HK$ 421.50</text>

    <text x="275" y="710" font-size="15" fill="#64748b" text-anchor="middle">多謝惠顧 · 歡迎再次光臨</text>
    <text x="275" y="735" font-size="13" fill="#94a3b8" text-anchor="middle">Thank You! Please Come Again.</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createParknShopSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="550" height="820" viewBox="0 0 550 820" style="background:#fff;font-family:'Courier New', monospace, sans-serif;">
    <rect width="550" height="820" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="275" y="45" font-size="24" font-weight="bold" fill="#0284c7" text-anchor="middle">PARKnSHOP 百佳超級市場</text>
    <text x="275" y="70" font-size="13" fill="#64748b" text-anchor="middle">Causeway Bay Branch · 銅鑼灣分店</text>
    <text x="275" y="90" font-size="13" fill="#64748b" text-anchor="middle">Tel: 2890 1288 · Tax Reg: HK-PNS-8831</text>
    <line x1="30" y1="105" x2="520" y2="105" stroke="#334155" stroke-dasharray="3,3"/>

    <text x="30" y="130" font-size="14" fill="#334155">Date: 2026-09-18 18:22</text>
    <text x="350" y="130" font-size="14" fill="#334155">Receipt # 992014</text>
    <line x1="30" y1="145" x2="520" y2="145" stroke="#334155" stroke-dasharray="3,3"/>

    <text x="30" y="180" font-size="15" fill="#0f172a">明治特濃鮮牛奶 946ML</text>
    <text x="470" y="180" font-size="15" fill="#0f172a">29.90</text>

    <text x="30" y="215" font-size="15" fill="#0f172a">維他檸檬茶 6包裝 (250ML)</text>
    <text x="470" y="215" font-size="15" fill="#0f172a">16.50</text>

    <text x="30" y="250" font-size="15" fill="#0f172a">金鳳泰國頂級香米 5KG</text>
    <text x="470" y="250" font-size="15" fill="#0f172a">98.00</text>

    <text x="30" y="285" font-size="15" fill="#0f172a">出前一丁麻油味即食麵 5包裝</text>
    <text x="470" y="285" font-size="15" fill="#0f172a">21.50</text>

    <text x="30" y="320" font-size="15" fill="#0f172a">日式特大初生雞蛋 10隻</text>
    <text x="470" y="320" font-size="15" fill="#0f172a">32.50</text>

    <line x1="30" y1="355" x2="520" y2="355" stroke="#cbd5e1"/>

    <text x="30" y="390" font-size="15" fill="#334155">Items Total (5 Items):</text>
    <text x="460" y="390" font-size="15" fill="#334155">198.40</text>

    <line x1="30" y1="415" x2="520" y2="415" stroke="#0f172a" stroke-width="1.5"/>

    <text x="30" y="455" font-size="22" font-weight="bold" fill="#0f172a">TOTAL TOTAL (HKD):</text>
    <text x="400" y="455" font-size="26" font-weight="bold" fill="#0284c7">HK$ 198.40</text>

    <line x1="30" y1="475" x2="520" y2="475" stroke="#0f172a" stroke-width="1.5"/>

    <text x="30" y="510" font-size="15" fill="#334155">Tender Type: 轉數快 / FPS</text>
    <text x="30" y="535" font-size="14" fill="#64748b">Auth Code: FPS891024 · Ref: 20260918001</text>
    <text x="275" y="650" font-size="14" fill="#64748b" text-anchor="middle">Save with MoneyBack 易賞錢</text>
    <text x="275" y="675" font-size="13" fill="#94a3b8" text-anchor="middle">Customer Service: 2606 8658</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_RECEIPTS_DATA: {
  title: string;
  subtitle: string;
  badge: string;
  imageDataUrl: string;
  receiptData: Receipt;
}[] = [
  {
    title: 'HK Taxi (Handwritten Chit)',
    subtitle: 'TF 8821 · Airport to Central Pier',
    badge: 'Handwritten Taxi',
    imageDataUrl: createTaxiSvg(),
    receiptData: {
      id: 'demo_taxi_01',
      date: '2026-09-21',
      merchantName: 'HK Taxi (TF 8821)',
      category: 'Transportation',
      totalAmount: 285.0,
      currency: 'HKD',
      notes: 'Handwritten HK Taxi slip. Trip from Hong Kong International Airport T1 to Central Star Ferry Pier. Includes Western Harbour Tunnel toll HK$25, 2x luggage toll HK$12, and Tsing Ma bridge toll.',
      taxOrServiceCharge: 0,
      paymentMethod: 'Cash',
      isHandwritten: true,
      confidenceScore: 0.96,
      createdAt: '2026-09-21T14:30:00.000Z',
      items: [
        { name: 'Meter Base Fare (咪錶車資)', quantity: 1, price: 235.0 },
        { name: 'Western Tunnel Toll (西區海底隧道)', quantity: 1, price: 25.0 },
        { name: 'Luggage Toll (行李附加費 2件)', quantity: 2, price: 12.0 },
        { name: 'Other Surcharge (附加費)', quantity: 1, price: 13.0 },
      ],
      imageUrl: createTaxiSvg(),
    },
  },
  {
    title: 'Tsui Wah Restaurant (翠華餐廳)',
    subtitle: 'Central Wellington St · Lunch Set',
    badge: 'Cha Chaan Teng',
    imageDataUrl: createTsuiWahSvg(),
    receiptData: {
      id: 'demo_dining_02',
      date: '2026-09-20',
      merchantName: '翠華餐廳 Tsui Wah Restaurant',
      category: 'Meals & Dining',
      totalAmount: 160.6,
      currency: 'HKD',
      notes: 'Central Wellington Street branch. Includes Crispy Bun with Condensed Milk, Swiss Sauce Chicken Wings Noodles, Iced Milk Tea, and Iced Lemon Tea. 10% service charge (加一) included. Paid by Octopus.',
      taxOrServiceCharge: 14.6,
      paymentMethod: 'Octopus',
      isHandwritten: false,
      confidenceScore: 0.99,
      createdAt: '2026-09-20T13:45:00.000Z',
      items: [
        { name: '招牌至潮脆樺奶油豬 (Crispy Bun)', quantity: 1, price: 28.0 },
        { name: '瑞士汁雞翼撈公仔麵 (Swiss Sauce Noodles)', quantity: 1, price: 68.0 },
        { name: '凍香滑奶茶 (Iced Milk Tea)', quantity: 1, price: 25.0 },
        { name: '凍檸檬茶 (Iced Lemon Tea)', quantity: 1, price: 25.0 },
      ],
      imageUrl: createTsuiWahSvg(),
    },
  },
  {
    title: 'PARKnSHOP (百佳超級市場)',
    subtitle: 'Causeway Bay · Groceries',
    badge: 'Supermarket',
    imageDataUrl: createParknShopSvg(),
    receiptData: {
      id: 'demo_groceries_03',
      date: '2026-09-18',
      merchantName: 'PARKnSHOP 百佳超級市場',
      category: 'Groceries',
      totalAmount: 198.4,
      currency: 'HKD',
      notes: 'Causeway Bay branch. Items: Meiji Fresh Milk, Vita Lemon Tea 6-pack, Golden Phoenix Thai Hom Mali Rice 5KG, Demae Itcho Sesame Ramen 5-pack, Japanese Fresh Eggs. Paid via FPS (轉數快).',
      taxOrServiceCharge: 0,
      paymentMethod: 'FPS',
      isHandwritten: false,
      confidenceScore: 0.98,
      createdAt: '2026-09-18T18:25:00.000Z',
      items: [
        { name: '明治特濃鮮牛奶 946ML', quantity: 1, price: 29.9 },
        { name: '維他檸檬茶 6包裝 (250ML)', quantity: 1, price: 16.5 },
        { name: '金鳳泰國頂級香米 5KG', quantity: 1, price: 98.0 },
        { name: '出前一丁麻油味即食麵 5包裝', quantity: 1, price: 21.5 },
        { name: '日式特大初生雞蛋 10隻', quantity: 1, price: 32.5 },
      ],
      imageUrl: createParknShopSvg(),
    },
  },
  {
    title: 'Eslite Bookstore (誠品書店)',
    subtitle: 'Hysan Place · Stationery & Books',
    badge: 'Stationery',
    imageDataUrl: createParknShopSvg(),
    receiptData: {
      id: 'demo_stationery_04',
      date: '2026-08-25',
      merchantName: '誠品生活 Eslite Spectrum',
      category: 'Office Supplies',
      totalAmount: 238.0,
      currency: 'HKD',
      notes: 'Hysan Place Causeway Bay. MD Notebook, Hobonichi Techo Cover on Cover, Zebra Sarasa Clip pens. Paid via Credit Card.',
      taxOrServiceCharge: 0,
      paymentMethod: 'Credit Card',
      isHandwritten: false,
      confidenceScore: 0.99,
      createdAt: '2026-08-25T15:10:00.000Z',
      items: [
        { name: 'Midori MD Notebook A5 方眼', quantity: 1, price: 98.0 },
        { name: 'Zebra Sarasa Clip 0.5 (3支裝)', quantity: 1, price: 42.0 },
        { name: '手帳和紙膠帶套組 (復古風)', quantity: 2, price: 98.0 },
      ],
      imageUrl: createParknShopSvg(),
    },
  },
  {
    title: 'Hong Kong Urban Taxi (市區的士 TF3329)',
    subtitle: 'Wan Chai to Kowloon Station · Handwritten',
    badge: 'Taxi',
    imageDataUrl: createTaxiSvg(),
    receiptData: {
      id: 'demo_taxi_05',
      date: '2026-08-14',
      merchantName: '香港市區的士 TF 3329',
      category: 'Transportation',
      totalAmount: 145.0,
      currency: 'HKD',
      notes: '手寫單據：灣仔到九龍站 (Wan Chai to Kowloon Station)。包含紅磡海底隧道收費 $25 及咪錶車資 $120。司機姓名：陳志強。現金找續付款。',
      taxOrServiceCharge: 0,
      paymentMethod: 'Cash',
      isHandwritten: true,
      confidenceScore: 0.95,
      createdAt: '2026-08-14T21:40:00.000Z',
      items: [
        { name: '咪錶基本車費 (Meter Fare)', quantity: 1, price: 120.0 },
        { name: '紅磡海底隧道收費 (Cross Harbour Tunnel)', quantity: 1, price: 25.0 },
      ],
      imageUrl: createTaxiSvg(),
    },
  },
];
