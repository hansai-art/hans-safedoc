/**
 * 臺灣敏感識別碼偵測規則測試。
 * 所有資料皆為合成值或公開測試號碼，不含真實個資。
 *
 * 執行：npm test
 * 或：npx tsx taiwan-recognizers.v2.test.ts
 */

import {
  detect,
  isNewArc,
  isValidLegacyArc,
  isValidLuhn,
  isValidTwId,
  isValidTwLandline,
  isValidTwMobile,
  isValidTwPassport,
  isValidTwTaxId,
  scanResidual,
} from './taiwan-recognizers.v2';

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    return;
  }

  failed++;
  console.error(`  FAIL  ${name}`);
  console.error(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function section(title: string): void {
  console.log(`\n${title}`);
}

function typesOf(text: string): string[] {
  return detect(text).map((entity) => entity.type).sort();
}

/* ---------------- 身分證與統一證號 ---------------- */
section('身分證與外來人口統一證號');

check('A123456789 檢查碼正確', isValidTwId('A123456789'), true);
check('A123456788 檢查碼錯誤', isValidTwId('A123456788'), false);
check('第二碼 3 應拒絕', isValidTwId('A323456789'), false);
check('小寫也能驗證', isValidTwId('a123456789'), true);
check('I 的不連續對應值正確', isValidTwId('I102721443'), true);
check('O 的不連續對應值正確', isValidTwId('O158749576'), true);
check('新式統一證號 8 開頭', isNewArc('A823456783'), true);
check('國民身分證不是新式統一證號', isNewArc('A123456789'), false);
check('舊式統一證號正確', isValidLegacyArc('AB12345677'), true);
check('舊式統一證號檢查碼錯誤', isValidLegacyArc('AB12345678'), false);

/* ---------------- 統一編號 ---------------- */
section('營利事業暨扣繳單位統一編號');

check('12345675 有效', isValidTwTaxId('12345675'), true);
check('22099131 有效', isValidTwTaxId('22099131'), true);
check('00000000 作為空值明確排除', isValidTwTaxId('00000000'), false);
check('不應把所有重複數字一律排除', isValidTwTaxId('55555555'), true);
check('位數不足', isValidTwTaxId('1234567'), false);
check('含英文', isValidTwTaxId('1234567A'), false);

{
  const found = detect('公司成立日 20000101', { minConfidence: 0.85 });
  check('「公司」不是統編情境詞，日期不升為高分', found.some((e) => e.type === 'TW_TAX_ID'), false);
}

{
  const found = detect('統編 22099131');
  const taxId = found.find((entity) => entity.type === 'TW_TAX_ID');
  check('明確統編標籤會提高規則分數', taxId?.confidence, 0.9);
}

/* ---------------- 信用卡與銀行帳號 ---------------- */
section('信用卡與銀行帳號');

check('公開測試卡號通過 Luhn', isValidLuhn('4242424242424242'), true);
check('錯誤測試卡號不通過 Luhn', isValidLuhn('4242424242424241'), false);
check('重複 0 不應視為卡號', isValidLuhn('0000000000000000'), false);

{
  const found = detect('帳號 4242424242424242');
  check('同時像帳號與信用卡時保留信用卡', found[0]?.type, 'CREDIT_CARD');
  check('信用卡預設 blockOnly', found[0]?.blockOnly, true);
}

{
  const found = detect('銀行帳號 1234567890', { exclude: ['CREDIT_CARD'] });
  check('有銀行情境時可列為銀行帳號候選', found[0]?.type, 'TW_BANK_ACCOUNT');
}

/* ---------------- 護照 ---------------- */
section('中華民國護照號碼');

check('普通護照 3 加八位數字', isValidTwPassport('312345678'), true);
check('外交護照 D 加八位數字', isValidTwPassport('D12345678'), true);
check('公務護照 F 加八位數字', isValidTwPassport('F12345678'), true);
check('G 類護照', isValidTwPassport('G12345678'), true);
// 改：不再限制護照首碼。公開資料對非晶片與換發護照的首碼說法互相矛盾，
// 縮窄首碼等於製造漏判。精確度改由 noContext: 'drop' 把關。
check('字母開頭護照也接受，靠情境詞把關', isValidTwPassport('A12345678'), true);
check('沒有護照情境詞時仍不命中', detect('序號 A12345678').length, 0);
check('沒有護照情境詞時不命中', detect('序號 D12345678').length, 0);
check('有護照情境詞時命中', detect('護照 D12345678')[0]?.type, 'TW_PASSPORT');

/* ---------------- 電話 ---------------- */
section('臺灣電話');

check('0912 行動電話有效', isValidTwMobile('0912-345-678'), true);
check('+886 行動電話有效', isValidTwMobile('+886 912 345 678'), true);
check('090 行動電話格式有效', isValidTwMobile('0900-123-456'), true);
// 改：查不到官方資料把 099 排除在行動電話之外，排錯的代價是整段號碼漏掉。
check('099 保留為行動電話候選', isValidTwMobile('0991-234-567'), true);
check('市話 02 八碼', isValidTwLandline('(02) 2712-3456 分機 205'), true);
check('市話 04 臺中八碼', isValidTwLandline('(04) 2312-3456'), true);
check('市話 04 彰化七碼', isValidTwLandline('(04) 712-3456'), true);
check('烏坵 0826 五碼', isValidTwLandline('(0826) 6-1234'), true);
check('馬祖 0836 五碼', isValidTwLandline('(0836) 2-1234'), true);
// 改：不驗用戶號碼首碼。首碼白名單會拒絕真實號碼，例如 NCC 自己公告的 (02)4128-177。
check('不以用戶號碼首碼拒絕市話', isValidTwLandline('(0826) 7-1234'), true);
check('長度不符仍會拒絕', isValidTwLandline('(0826) 71-2345'), false);
check('偵測器把 099 當手機候選', detect('手機 0991-234-567')[0]?.type, 'TW_MOBILE');

/* ---------------- 發票、車牌、郵遞區號與地址 ---------------- */
section('其他臺灣格式');

{
  const invoice = detect('發票 AB12345677');
  check('發票情境優先於同格式的舊式統一證號', invoice[0]?.type, 'TW_INVOICE');
}

{
  const arc = detect('居留證 AB12345677');
  check('居留證情境保留舊式統一證號', arc[0]?.type, 'TW_ARC');
}

// 改：降級而不是丟棄。公務車清單常常只有一排車牌，沒有「車號」兩字。
check('沒有車輛情境時降為低信心候選', detect('專案 ABC-1234')[0]?.confidence, 0.55);
check('低信心候選預設不會被高門檻取用', detect('專案 ABC-1234', { minConfidence: 0.7 }).length, 0);
check('有車號情境時命中車牌', detect('車號 ABC-1234')[0]?.type, 'TW_PLATE');
check('3 碼郵遞區號', detect('郵遞區號 110')[0]?.type, 'TW_POSTCODE');
check('5 碼郵遞區號', detect('郵遞區號 10019')[0]?.type, 'TW_POSTCODE');
check('3+3 六碼郵遞區號', detect('郵遞區號 106409')[0]?.type, 'TW_POSTCODE');
check('四碼不是支援的郵遞區號', detect('郵遞區號 1234').length, 0);

{
  const text = '臺北市中正區濟南路1段2之2號3樓';
  const address = detect(text).find((entity) => entity.type === 'TW_ADDRESS');
  check('含「之」與樓層的地址', address?.text, text);
}

/* ---------------- 通用格式與秘密 ---------------- */
section('通用格式與秘密');

check('Email 與市話同時命中', typesOf('聯絡 (02) 2712-3456，或 chen@example.com.tw'), ['EMAIL', 'TW_LANDLINE']);
check('IPv4 命中', detect('主機 192.168.1.100')[0]?.type, 'IPV4');

{
  const url = detect('請開 https://internal.example.com/path，下一段')[0];
  check('URL 命中', url?.type, 'URL');
  check('URL 不吃掉後方中文標點與文字', url?.text, 'https://internal.example.com/path');
}

{
  const found = detect('https://user@example.com/a');
  check('URL 包含 Email 時保留完整 URL', found[0]?.type, 'URL');
}

{
  const lineId = detect('LINE ID: @hans.lin')[0];
  check('LINE 規則只回傳 ID 值', lineId?.text, '@hans.lin');
}

{
  const secret = detect('API_KEY = "sk-ant-abcdefghijklmnopqrstuvwxyz"')[0];
  check('憑證只回傳秘密值', secret?.text, 'sk-ant-abcdefghijklmnopqrstuvwxyz');
  check('憑證標記為 blockOnly', secret?.blockOnly, true);
}

check(
  'PGP 私鑰標頭會阻擋',
  detect('-----BEGIN PGP PRIVATE KEY BLOCK-----')[0]?.blockOnly,
  true,
);

/* ---------------- 整合、位置與殘留掃描 ---------------- */
section('整合、位置與殘留掃描');

{
  const text = '客戶王小明，身分證 A123456789，手機 0912-345-678，公司統編 22099131。';
  const found = detect(text);
  check('結構化識別碼抓到三類', found.map((e) => e.type).sort(), ['TW_ID', 'TW_MOBILE', 'TW_TAX_ID']);
}

{
  const text = '前綴文字 A123456789 後綴文字';
  const entity = detect(text)[0];
  check('start/end 能切回原字串', text.slice(entity.start, entity.end), 'A123456789');
}

{
  const clean = '客戶 TW_ID_a3f9 的手機是 TW_MOBILE_7b21，統編 TW_TAX_ID_c004。';
  check('代碼化文字無同規則可見殘留', scanResidual(clean).length, 0);
}

{
  const dirty = '客戶 TW_ID_a3f9 的身分證其實是 A123456789 沒被換掉。';
  check('殘留掃描找出可見漏網', scanResidual(dirty).length, 1);
}


/* ---------------- 回歸測試：修正的漏判與誤標 ---------------- */
section('回歸：曾經漏判或誤標的案例');

check('地址前的郵遞區號不需要標籤', detect('106409 臺北市大安區和平東路二段106號')[0]?.type, 'TW_POSTCODE');
check('三碼郵遞區號接縣市', detect('110臺北市信義區松高路11號')[0]?.type, 'TW_POSTCODE');
check('NCC 公告的 (02)4128 號段不被拒絕', isValidTwLandline('(02) 4128-1234'), true);
check('0800 免付費視為聯絡號碼', isValidTwLandline('0800-123-456'), true);
check('屏東 08-632 不被首碼白名單擋掉', isValidTwLandline('(08) 632-1234'), true);
check('苗栗 037 六碼', isValidTwLandline('(037) 123456'), true);
check('護照 1 開頭仍命中', detect('護照 112345678')[0]?.type, 'TW_PASSPORT');
check('護照 2 開頭仍命中', detect('護照 212345678')[0]?.type, 'TW_PASSPORT');

{
  const found = detect('密碼：A123456789');
  check('身分證放在密碼欄位仍標為身分證', found[0]?.type, 'TW_ID');
  check('但 blockOnly 旗標會被保留', found[0]?.blockOnly, true);
}

{
  const found = detect('公務車清單：\n- ABC-1234\n- DEF-5678');
  check('沒有情境詞的車牌清單仍列為候選', found.filter((e) => e.type === 'TW_PLATE').length, 2);
}

{
  const found = detect('| 郵區 | 106409 |', { minConfidence: 0.3 });
  check('欄位名同義詞：降級保留而非丟棄', found[0]?.type, 'TW_POSTCODE');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  throw new Error(`${failed} tests failed`);
}
