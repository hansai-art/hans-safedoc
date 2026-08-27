/**
 * 臺灣個資與敏感識別碼偵測規則層 v2
 *
 * 設計原則：
 * 1. 有檢查碼的一律驗檢查碼，不只比對格式。
 * 2. 漏判成本遠高於誤判成本。漏判是資料外洩，誤判只是多按一次滑鼠。
 *    因此沒有把握的情況一律「降級」成低分候選，不「丟棄」。
 *    唯一例外是誤判會淹沒使用者的規則（9 碼、12 碼純數字），才用 noContext: 'drop'。
 * 3. 不把會隨時間變動的核配資料（電信號段、護照首碼）寫死在偵測器裡，
 *    那會製造一個自己腐化的漏判來源。只驗結構，精確度交給情境詞與人工審核。
 * 4. confidence 是人工設定的啟發式規則分數，不是經標註資料校準的機率。
 *    不得對外宣稱為準確率。
 * 5. 純函式、零執行期相依，可單獨測試，也可搬去 CLI 或 Web Worker。
 * 6. 只做偵測，不做替換。替換與對照表是另一層的事。
 *
 * 已知限制：本層只偵測結構化識別碼。客戶名、專案代號、報價、製程節點
 * 這類企業真正在意的內容，必須由字典層負責，而字典層與對照表一樣
 * 存放在 Vault 之外的加密目錄。
 */

export type EntityType =
  | 'TW_ID'            // 中華民國身分證統一編號
  | 'TW_ARC'           // 外來人口統一證號（新式與舊式）
  | 'TW_TAX_ID'        // 營利事業暨扣繳單位統一編號
  | 'TW_PASSPORT'      // 中華民國護照號碼
  | 'TW_MOBILE'        // 行動電話
  | 'TW_LANDLINE'      // 市內電話
  | 'TW_PLATE'         // 車牌
  | 'TW_INVOICE'       // 統一發票字軌號碼
  | 'TW_NHI_CARD'      // 健保卡卡號
  | 'TW_ADDRESS'       // 臺灣地址
  | 'TW_POSTCODE'      // 郵遞區號（3、5、6 碼）
  | 'CREDIT_CARD'
  | 'TW_BANK_ACCOUNT'  // 臺灣銀行帳號；臺灣不使用 IBAN 命名
  | 'EMAIL'
  | 'IPV4'
  | 'URL'
  | 'LINE_ID'
  | 'SECRET';          // API key / token / private key，不做可逆替換

export interface Entity {
  type: EntityType;
  /** 原文字元起始位置（含） */
  start: number;
  /** 原文字元結束位置（不含） */
  end: number;
  text: string;
  /** 0..1 的規則分數；這是啟發式分數，不是經校準的機率。 */
  confidence: number;
  /** 命中的規則名稱，方便追查誤判。 */
  rule: string;
  /** true 代表預設禁止匯出，不應進行可逆代碼化。 */
  blockOnly?: boolean;
}

/* ------------------------------------------------------------------ */
/* 檢查碼驗證                                                          */
/* ------------------------------------------------------------------ */

/** 身分證字母對應數值。I=34、O=35、W=32、X=30、Y=31、Z=33 是不連續的，容易寫錯。 */
const LETTER_VALUE: Record<string, number> = {
  A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34,
  J: 18, K: 19, L: 20, M: 21, N: 22, O: 35, P: 23, Q: 24, R: 25,
  S: 26, T: 27, U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33,
};

/**
 * 中華民國身分證統一編號 / 新式統一證號
 *
 * 格式：1 英文字母 + 9 位數字
 * 第 2 碼：1 或 2 為國民身分證（男／女）；8 或 9 為 2021 年起的新式外來人口統一證號
 *
 * 加權：字母拆成兩位數 N1 N2，N1×1 + N2×9，
 *       接著第 2 至第 9 碼依序 ×8,7,6,5,4,3,2,1，末碼檢查碼 ×1，
 *       總和須為 10 的倍數。
 */
export function isValidTwId(value: string): boolean {
  const v = value.toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z][0-9]{9}$/.test(v)) return false;

  const gender = v[1];
  if (!'1289'.includes(gender)) return false;

  const n = LETTER_VALUE[v[0]];
  if (n === undefined) return false;

  let sum = Math.floor(n / 10) * 1 + (n % 10) * 9;
  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  for (let i = 0; i < 8; i++) {
    sum += Number(v[i + 1]) * weights[i];
  }
  sum += Number(v[9]);

  return sum % 10 === 0;
}

/** 2021 年新制的外來人口統一證號：與身分證同格式，但第 2 碼為 8 或 9 */
export function isNewArc(value: string): boolean {
  const v = value.toUpperCase().replace(/[\s-]/g, '');
  return isValidTwId(v) && '89'.includes(v[1]);
}

/**
 * 舊式外僑居留證號碼：2 英文字母 + 8 位數字
 *
 * 加權：第一個字母拆兩位 ×1、×9；第二個字母取其對應數值的個位數 ×8；
 *       接著 7 位數字 ×7,6,5,4,3,2,1，末碼檢查碼 ×1，總和須為 10 的倍數。
 */
export function isValidLegacyArc(value: string): boolean {
  const v = value.toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z]{2}[0-9]{8}$/.test(v)) return false;

  const n1 = LETTER_VALUE[v[0]];
  const n2 = LETTER_VALUE[v[1]];
  if (n1 === undefined || n2 === undefined) return false;

  let sum = Math.floor(n1 / 10) * 1 + (n1 % 10) * 9;
  sum += (n2 % 10) * 8;

  const weights = [7, 6, 5, 4, 3, 2, 1];
  for (let i = 0; i < 7; i++) {
    sum += Number(v[i + 2]) * weights[i];
  }
  sum += Number(v[9]);

  return sum % 10 === 0;
}

/**
 * 營利事業統一編號（8 位數）
 *
 * 財政部自 2023 年 4 月 1 日起改制：檢查碼由「除以 10」改為「除以 5」。
 * 加權 1,2,1,2,1,2,4,1，乘積若為兩位數則十位加個位。
 * 第 7 碼為 7 時，總和或總和加 1 能被 5 整除皆有效。
 */
export function isValidTwTaxId(value: string): boolean {
  const v = value.replace(/[\s-]/g, '');
  if (!/^[0-9]{8}$/.test(v)) return false;

  // 00000000 會通過純數學檢查，但屬典型空值／占位符。
  // 不應用『所有數字相同』作為排除條件，否則可能製造非官方的假陰性。
  if (/^0{8}$/.test(v)) return false;

  const weights = [1, 2, 1, 2, 1, 2, 4, 1];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const product = Number(v[i]) * weights[i];
    sum += Math.floor(product / 10) + (product % 10);
  }

  if (v[6] === '7') {
    return sum % 5 === 0 || (sum + 1) % 5 === 0;
  }
  return sum % 5 === 0;
}

/** 信用卡 Luhn 檢查 */
export function isValidLuhn(value: string): boolean {
  const v = value.replace(/[\s-]/g, '');
  if (!/^[0-9]{13,19}$/.test(v)) return false;
  if (/^(\d)\1+$/.test(v)) return false;

  let sum = 0;
  let double = false;
  for (let i = v.length - 1; i >= 0; i--) {
    let d = Number(v[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * 中華民國護照號碼：總長固定 9 碼。
 *
 * 刻意不限制首碼。晶片普通護照「通常」以 3 開頭，但公開資料對非晶片、
 * 換發舊號與特殊類別（G、D、T、E 等說法並不一致）的首碼描述互相矛盾。
 * 去識別化工具的漏判成本遠高於誤判成本，因此只驗長度與字元類型，
 * 由情境詞要求負責把關精確度。
 */
export function isValidTwPassport(value: string): boolean {
  const v = value.toUpperCase().replace(/[\s-]/g, '');
  return /^(?:[0-9]{9}|[A-Z][0-9]{8})$/.test(v);
}

/**
 * 臺灣行動電話：09 起頭共 10 碼。
 *
 * 刻意不排除 099。查不到官方資料明確把 099 排除在行動電話之外，
 * 而排錯的代價是整段號碼直接漏掉。寧可多一個候選讓使用者取消勾選。
 */
export function isValidTwMobile(value: string): boolean {
  let v = value.replace(/[\s()-]/g, '');
  v = v.replace(/^\+?886/, '0');
  return /^09[0-9]{8}$/.test(v);
}

interface LandlineRule {
  areaCode: string;
  /** 區域碼後的用戶號碼長度，可能有多種。 */
  subscriberLengths: readonly number[];
}

/**
 * 市話區域碼與用戶號碼長度。
 *
 * 刻意「不」限制用戶號碼首碼。原本的首碼白名單看似精確，實測會拒絕真實號碼：
 * 例如 NCC 自己公告的 (02)4128-177 就會被 02 的首碼白名單擋掉。
 * 號段核配會變動，把它寫死在偵測器裡等於製造會隨時間惡化的漏判。
 * 長區域碼必須排在短區域碼前面，避免 0826 被拆成 082。
 */
const LANDLINE_RULES: readonly LandlineRule[] = [
  { areaCode: '0826', subscriberLengths: [5] },
  { areaCode: '0836', subscriberLengths: [5] },
  { areaCode: '037', subscriberLengths: [6] },
  { areaCode: '049', subscriberLengths: [7] },
  { areaCode: '082', subscriberLengths: [6] },
  { areaCode: '089', subscriberLengths: [6] },
  { areaCode: '02', subscriberLengths: [7, 8] },
  { areaCode: '03', subscriberLengths: [7] },
  { areaCode: '04', subscriberLengths: [7, 8] },
  { areaCode: '05', subscriberLengths: [7] },
  { areaCode: '06', subscriberLengths: [7] },
  { areaCode: '07', subscriberLengths: [7] },
  { areaCode: '08', subscriberLengths: [7] },
];

/** 服務號碼：免付費、代表號等。仍屬聯絡方式，一併偵測。 */
const SERVICE_NUMBER = /^0(?:800|809|900|910|911)[0-9]{6,7}$/;

/** 依區域碼與用戶號碼長度驗證市話，不驗用戶號碼首碼。 */
export function isValidTwLandline(value: string): boolean {
  const withoutExtension = value.replace(
    /\s*(?:#|轉|分機|ext\.?)\s*[0-9]{1,5}\s*$/i,
    '',
  );
  const digits = withoutExtension.replace(/[\s()-]/g, '');

  if (SERVICE_NUMBER.test(digits)) return true;

  for (const rule of LANDLINE_RULES) {
    if (!digits.startsWith(rule.areaCode)) continue;
    const subscriber = digits.slice(rule.areaCode.length);
    if (!/^[0-9]+$/.test(subscriber)) return false;
    return rule.subscriberLengths.includes(subscriber.length);
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* 情境詞：出現在附近時提高信心分數                                     */
/* ------------------------------------------------------------------ */

const CONTEXT_HINTS: Partial<Record<EntityType, string[]>> = {
  TW_ID: ['身分證', '身份證', '國民身分證', 'id', '證號'],
  TW_ARC: ['居留證', '統一證號', '外僑', 'arc', '證號'],
  TW_TAX_ID: ['統編', '營利事業統一編號', '扣繳單位統一編號', 'ubn', 'vat number'],
  TW_PASSPORT: ['護照', 'passport'],
  TW_MOBILE: ['手機', '行動電話', '聯絡', '電話', 'tel', '專線'],
  TW_LANDLINE: ['電話', '市話', 'tel', '傳真', 'fax', '分機'],
  TW_NHI_CARD: ['健保', '健保卡', '就醫'],
  TW_BANK_ACCOUNT: ['帳號', '匯款', '轉帳', '銀行', '行庫', '存摺'],
  TW_PLATE: ['車牌', '車號', '牌照'],
  TW_INVOICE: ['發票', '字軌', 'invoice'],
  TW_POSTCODE: ['郵遞區號', '郵編', '郵碼', 'zip', 'postal code'],
  CREDIT_CARD: ['信用卡', '卡號', 'credit card'],
};

const CONTEXT_WINDOW = 20;

function hasContext(text: string, start: number, end: number, type: EntityType): boolean {
  const hints = CONTEXT_HINTS[type];
  if (!hints) return false;
  const left = text.slice(Math.max(0, start - CONTEXT_WINDOW), start);
  const right = text.slice(end, Math.min(text.length, end + CONTEXT_WINDOW));
  const window = (left + right).toLowerCase();
  return hints.some((hint) => window.includes(hint.toLowerCase()));
}

/* ------------------------------------------------------------------ */
/* 規則定義                                                            */
/* ------------------------------------------------------------------ */

interface Rule {
  type: EntityType;
  name: string;
  pattern: RegExp;
  /** 回傳 false 代表丟棄該次命中。 */
  validate?: (match: string) => boolean;
  /** 通過格式或檢查碼後的基礎規則分數。 */
  baseConfidence: number;
  /**
   * 附近沒有指定情境詞時的處理方式。
   * 'drop'  完全丟棄（僅用於誤判會淹沒使用者的規則）
   * 數字     降級成該分數的候選，仍然回傳
   * 去識別化工具的漏判成本高於誤判成本，預設一律用降級。
   */
  noContext?: 'drop' | number;
  /** 只回傳指定擷取群組，保留標籤文字。 */
  captureGroup?: number;
  /** 對命中文字做不改變核心內容的正規化，例如移除網址尾端標點。 */
  normalize?: (match: string) => string;
  blockOnly?: boolean;
}

const RULES: Rule[] = [
  // ---- 有檢查碼或強格式，可以給較高分 ----
  {
    type: 'TW_ID',
    name: 'tw-id-checksum',
    pattern: /(?<![A-Za-z0-9])[A-Za-z][12][0-9]{8}(?![A-Za-z0-9])/g,
    validate: isValidTwId,
    baseConfidence: 0.97,
  },
  {
    type: 'TW_ARC',
    name: 'tw-arc-new-checksum',
    pattern: /(?<![A-Za-z0-9])[A-Za-z][89][0-9]{8}(?![A-Za-z0-9])/g,
    validate: isNewArc,
    baseConfidence: 0.95,
  },
  {
    type: 'TW_ARC',
    name: 'tw-arc-legacy-checksum',
    pattern: /(?<![A-Za-z0-9])[A-Za-z]{2}[0-9]{8}(?![A-Za-z0-9])/g,
    validate: isValidLegacyArc,
    baseConfidence: 0.9,
  },
  {
    type: 'CREDIT_CARD',
    name: 'credit-card-luhn',
    pattern: /(?<![0-9])(?:[0-9][ -]?){12,18}[0-9](?![0-9])/g,
    validate: isValidLuhn,
    baseConfidence: 0.95,
    blockOnly: true,
  },
  {
    // 新制統編檢查僅以 5 為模數，約五分之一的隨機八位數可能通過；
    // 因此只給候選分數，附近有明確標籤時才升分。
    type: 'TW_TAX_ID',
    name: 'tw-tax-id-checksum',
    pattern: /(?<![0-9A-Za-z])[0-9]{8}(?![0-9A-Za-z])/g,
    validate: isValidTwTaxId,
    baseConfidence: 0.75,
  },

  // ---- 沒有檢查碼，靠格式與情境 ----
  {
    type: 'TW_MOBILE',
    name: 'tw-mobile',
    pattern: /(?<![0-9])(?:\+?886[ -]?9|09)[0-9]{2}[ -]?[0-9]{3}[ -]?[0-9]{3}(?![0-9])/g,
    validate: isValidTwMobile,
    baseConfidence: 0.9,
  },
  {
    type: 'TW_LANDLINE',
    name: 'tw-landline',
    pattern:
      /(?<![0-9])(?:\((?:0826|0836|037|049|082|089|02|03|04|05|06|07|08)\)|(?:0826|0836|037|049|082|089|02|03|04|05|06|07|08))[ -]?[0-9](?:[ -]?[0-9]){4,7}(?:\s*(?:#|轉|分機|ext\.?)\s*[0-9]{1,5})?(?![0-9])/gi,
    validate: isValidTwLandline,
    baseConfidence: 0.8,
  },
  {
    type: 'TW_PASSPORT',
    name: 'tw-passport',
    pattern: /(?<![0-9A-Za-z])(?:[0-9]{9}|[A-Za-z][0-9]{8})(?![0-9A-Za-z])/g,
    validate: isValidTwPassport,
    // 9 碼數字在文件裡太常見（金額、序號），沒有護照情境詞時直接丟棄。
    noContext: 'drop',
    baseConfidence: 0.85,
  },
  {
    type: 'TW_NHI_CARD',
    name: 'tw-nhi-card',
    pattern: /(?<![0-9A-Za-z])[0-9]{12}(?![0-9A-Za-z])/g,
    noContext: 'drop',
    baseConfidence: 0.8,
  },
  {
    type: 'TW_PLATE',
    name: 'tw-plate',
    pattern:
      /(?<![0-9A-Za-z])(?:[A-Z]{3}-[0-9]{4}|[A-Z]{2}-[0-9]{4}|[0-9]{4}-[A-Z]{2}|[0-9]{3}-[A-Z]{2}|[A-Z]{3}-[0-9]{3})(?![0-9A-Za-z])/gi,
    // 沒有車輛情境時降為候選，不丟棄：公務車清單常常只有一排車牌。
    noContext: 0.55,
    baseConfidence: 0.7,
  },
  {
    // 舊式居留證與發票皆為 2 碼英文 + 8 碼數字，因此發票必須有情境詞。
    type: 'TW_INVOICE',
    name: 'tw-invoice',
    pattern: /(?<![0-9A-Za-z])[A-Z]{2}[ -]?[0-9]{8}(?![0-9A-Za-z])/gi,
    // 對帳單裡的發票號碼常常整排出現，附近沒有「發票」兩字。
    noContext: 0.6,
    baseConfidence: 0.82,
  },
  {
    type: 'TW_BANK_ACCOUNT',
    name: 'tw-bank-account',
    // 臺灣銀行帳號沒有單一通用檢查碼；僅在附近有銀行／匯款情境時列為候選。
    pattern: /(?<![0-9])(?:[0-9][ -]?){9,16}[0-9](?![0-9])/g,
    // 「帳戶」「戶名」「收款」等欄位名不在情境詞裡，降級保留而不是丟棄。
    noContext: 0.55,
    baseConfidence: 0.75,
  },
  {
    type: 'TW_ADDRESS',
    name: 'tw-address',
    pattern:
      /(?:臺北市|台北市|新北市|桃園市|臺中市|台中市|臺南市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)(?:[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]{1,6}(?:鄉|鎮|市|區))?(?:[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]{1,10}(?:村|里))?(?:[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff0-9一二三四五六七八九十]{1,12}(?:路|街|大道|道))(?:[一二三四五六七八九十0-9]{1,4}段)?(?:[0-9]{1,4}巷)?(?:[0-9]{1,4}弄)?[0-9]{1,4}(?:[-之][0-9]{1,4})?號(?:(?:地下)?[0-9]{1,3}樓(?:之[0-9]{1,3})?|[Bb][0-9]{1,2}|[0-9]{1,3}[Ff])?/g,
    baseConfidence: 0.88,
  },
  {
    type: 'TW_POSTCODE',
    name: 'tw-postcode-before-city',
    // 郵遞區號最常見的寫法是直接接在縣市名前面，這個結構本身就是訊號，
    // 不需要出現「郵遞區號」四個字。
    pattern: /(?<![0-9])[0-9]{3}(?:[0-9]{2,3})?(?=\s*(?:臺|台|新|桃|基|嘉|苗|彰|南|雲|屏|宜|花|澎|金|連|高)[\u4e00-\u9fff]{0,2}(?:市|縣))/g,
    baseConfidence: 0.85,
  },
  {
    type: 'TW_POSTCODE',
    name: 'tw-postcode',
    pattern: /(?<![0-9])[0-9]{3}(?:[0-9]{2,3})?(?![0-9])/g,
    // 三到六位數字太常見，沒有標籤也沒有縣市時降到很低，只在「顯示全部候選」時出現。
    noContext: 0.35,
    baseConfidence: 0.75,
  },

  // ---- 通用 ----
  {
    type: 'EMAIL',
    name: 'email',
    pattern: /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![A-Za-z])/g,
    baseConfidence: 0.97,
  },
  {
    type: 'IPV4',
    name: 'ipv4',
    pattern: /(?<![0-9.])(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(?![0-9.])/g,
    baseConfidence: 0.9,
  },
  {
    type: 'URL',
    name: 'url',
    pattern: /(?<![A-Za-z0-9])(?:https?|ftp):\/\/[^\s<>"'`，。！？；：、）】》]+/gi,
    normalize: (match) => match.replace(/[\]\[(){}<>.,;!?，。！？；：、）】》]+$/u, ''),
    baseConfidence: 0.88,
  },
  {
    type: 'LINE_ID',
    name: 'line-id',
    pattern: /(?:LINE)\s*(?:ID)?\s*[:：]\s*(@?[A-Za-z0-9._-]{3,20})/gi,
    captureGroup: 1,
    baseConfidence: 0.85,
  },

  // ---- 憑證類：偵測到就阻擋，不做可逆代碼化 ----
  {
    type: 'SECRET',
    name: 'secret-private-key',
    pattern: /-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----|-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
    baseConfidence: 0.99,
    blockOnly: true,
  },
  {
    type: 'SECRET',
    name: 'secret-jwt',
    pattern: /(?<![A-Za-z0-9._-])eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g,
    baseConfidence: 0.95,
    blockOnly: true,
  },
  {
    type: 'SECRET',
    name: 'secret-known-prefix',
    pattern:
      /(?<![A-Za-z0-9_-])(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|(?:AKIA|ASIA)[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[A-Za-z0-9_-]{35})/g,
    baseConfidence: 0.97,
    blockOnly: true,
  },
  {
    type: 'SECRET',
    name: 'secret-assignment',
    pattern:
      /(?:password|passwd|pwd|secret|api[_-]?key|apikey|access[_-]?token|auth[_-]?token|private[_-]?key|密碼|金鑰|權杖)\s*[:：=]\s*["']?([^\s"'\n,;]{6,})["']?/gi,
    captureGroup: 1,
    baseConfidence: 0.85,
    blockOnly: true,
  },
];

/* ------------------------------------------------------------------ */
/* 主要進入點                                                          */
/* ------------------------------------------------------------------ */

export interface DetectOptions {
  /** 低於此分數的命中不回傳。預設 0.5 */
  minConfidence?: number;
  /** 只跑指定類型 */
  only?: EntityType[];
  /** 排除指定類型 */
  exclude?: EntityType[];
}

export function detect(text: string, options: DetectOptions = {}): Entity[] {
  const { minConfidence = 0.5, only, exclude } = options;
  const found: Entity[] = [];

  for (const rule of RULES) {
    if (only && !only.includes(rule.type)) continue;
    if (exclude && exclude.includes(rule.type)) continue;

    // 每次重建 regex，避免 lastIndex 在多次呼叫之間殘留
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }

      const fullMatch = m[0];
      const captured = rule.captureGroup ? m[rule.captureGroup] : fullMatch;
      if (!captured) continue;

      const matched = rule.normalize ? rule.normalize(captured) : captured;
      if (!matched) continue;

      const capturedStart = rule.captureGroup ? fullMatch.indexOf(captured) : 0;
      const normalizedStart = captured.indexOf(matched);
      if (capturedStart < 0 || normalizedStart < 0) continue;
      const start = m.index + capturedStart + normalizedStart;
      const end = start + matched.length;

      if (rule.validate && !rule.validate(matched)) continue;

      const contextual = hasContext(text, start, end, rule.type);

      let confidence: number;
      if (contextual) {
        confidence = Math.min(0.99, rule.baseConfidence + 0.15);
      } else if (rule.noContext === 'drop') {
        continue;
      } else if (typeof rule.noContext === 'number') {
        confidence = rule.noContext;
      } else {
        confidence = rule.baseConfidence;
      }
      confidence = Math.round(confidence * 100) / 100;

      if (confidence < minConfidence) continue;

      found.push({
        type: rule.type,
        start,
        end,
        text: matched,
        confidence,
        rule: rule.name,
        ...(rule.blockOnly ? { blockOnly: true } : {}),
      });
    }
  }

  return resolveOverlaps(found);
}

/**
 * 重疊解析：同一段文字被多條規則命中時保留一個。
 * 優先序：blockOnly → 涵蓋範圍 → 分數。
 * 信用卡也可能符合銀行帳號格式，必須保留 blockOnly 的信用卡結果；
 * URL 內可能含 IP 或 Email，應保留涵蓋完整內容的 URL；
 * 舊式居留證與統一發票範圍相同時，再以情境加分決定。
 */
export function resolveOverlaps(entities: Entity[]): Entity[] {
  const sorted = [...entities].sort((a, b) => {
    // 先比涵蓋範圍再比分數。blockOnly 不參與排序，改用下面的「傳染」處理：
    // 讓 blockOnly 決定排名，會把「密碼：A123456789」裡的身分證誤標成 SECRET，
    // 使用者就看不到那其實是一個身分證。
    const lengthDiff = (b.end - b.start) - (a.end - a.start);
    if (lengthDiff !== 0) return lengthDiff;

    const confidenceDiff = b.confidence - a.confidence;
    if (confidenceDiff !== 0) return confidenceDiff;

    return Number(Boolean(b.blockOnly)) - Number(Boolean(a.blockOnly));
  });

  const kept: Entity[] = [];
  for (const entity of sorted) {
    const clashIndex = kept.findIndex((keptEntity) =>
      entity.start < keptEntity.end && keptEntity.start < entity.end,
    );

    if (clashIndex === -1) {
      kept.push(entity);
      continue;
    }

    // 被淘汰的那個如果是 blockOnly，把這個旗標交給留下的那個。
    // 類型維持較精確的判斷，但「禁止匯出」的決定不會因為重疊而消失。
    if (entity.blockOnly) kept[clashIndex] = { ...kept[clashIndex], blockOnly: true };
  }

  return kept.sort((a, b) => a.start - b.start);
}

/**
 * 殘留掃描：去識別化之後重新執行同一組規則。
 * 這只能找出『同一偵測器仍看得到的殘留』，不能證明資料已完整去識別化。
 */
export function scanResidual(sanitizedText: string, options: DetectOptions = {}): Entity[] {
  return detect(sanitizedText, { ...options, minConfidence: options.minConfidence ?? 0.7 });
}
