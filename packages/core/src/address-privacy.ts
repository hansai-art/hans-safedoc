export type AddressPrivacyMode = 'FULL_REDACTION' | 'KEEP_CITY' | 'KEEP_DISTRICT';

export interface TaiwanAddressPrivacySplit {
  readonly mode: AddressPrivacyMode;
  readonly publicPrefix: string;
  readonly protectedDetail: string;
  readonly fellBackToFullRedaction: boolean;
}

const TAIWAN_CITY =
  /^(?:臺北市|台北市|新北市|桃園市|臺中市|台中市|臺南市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)/u;
const TAIWAN_DISTRICT = /^[\u3400-\u9fff]{1,8}?(?:鄉|鎮|市|區)/u;

/**
 * Splits only an address already admitted by the deterministic TW_ADDRESS detector.
 * Ambiguous or incomplete splits fail closed to full-address tokenization.
 */
export function splitTaiwanAddressForPrivacy(
  value: string,
  mode: AddressPrivacyMode,
): TaiwanAddressPrivacySplit {
  if (mode === 'FULL_REDACTION')
    return {
      mode,
      publicPrefix: '',
      protectedDetail: value,
      fellBackToFullRedaction: false,
    };

  const city = TAIWAN_CITY.exec(value)?.[0];
  if (!city)
    return {
      mode: 'FULL_REDACTION',
      publicPrefix: '',
      protectedDetail: value,
      fellBackToFullRedaction: true,
    };

  let publicPrefix = city;
  if (mode === 'KEEP_DISTRICT') {
    const district = TAIWAN_DISTRICT.exec(value.slice(city.length))?.[0];
    if (!district)
      return {
        mode: 'FULL_REDACTION',
        publicPrefix: '',
        protectedDetail: value,
        fellBackToFullRedaction: true,
      };
    publicPrefix += district;
  }

  const protectedDetail = value.slice(publicPrefix.length);
  if (!protectedDetail)
    return {
      mode: 'FULL_REDACTION',
      publicPrefix: '',
      protectedDetail: value,
      fellBackToFullRedaction: true,
    };
  return { mode, publicPrefix, protectedDetail, fellBackToFullRedaction: false };
}
