// components/countries.ts

export interface Country {
    code: string;
    name: string;
}

// [UPDATED] FedEx・日本郵便（船便）の対応国を大幅拡張網羅した国リスト定義
export const countries: Country[] = [
    // アジア・東アジア
    { code: 'JP', name: '日本 (Japan)' },
    { code: 'US', name: 'アメリカ (United States)' },
    { code: 'KR', name: '韓国 (South Korea)' },
    { code: 'CN', name: '中国 (China)' },
    { code: 'TW', name: '台湾 (Taiwan)' },
    { code: 'HK', name: '香港 (Hong Kong)' },
    { code: 'MO', name: 'マカオ (Macau)' },

    // 東南アジア
    { code: 'SG', name: 'シンガポール (Singapore)' },
    { code: 'TH', name: 'タイ (Thailand)' },
    { code: 'MY', name: 'マレーシア (Malaysia)' },
    { code: 'PH', name: 'フィリピン (Philippines)' },
    { code: 'VN', name: 'ベトナム (Vietnam)' },
    { code: 'ID', name: 'インドネシア (Indonesia)' },
    { code: 'IN', name: 'インド (India)' },
    { code: 'BN', name: 'ブルネイ (Brunei)' },
    { code: 'KH', name: 'カンボジア (Cambodia)' },
    { code: 'LA', name: 'ラオス (Laos)' },

    // 北米・中南米
    { code: 'CA', name: 'カナダ (Canada)' },
    { code: 'MX', name: 'メキシコ (Mexico)' },
    { code: 'BR', name: 'ブラジル (Brazil)' },
    { code: 'AR', name: 'アルゼンチン (Argentina)' },
    { code: 'CL', name: 'チリ (Chile)' },
    { code: 'CO', name: 'コロンビア (Colombia)' },
    { code: 'PE', name: 'ペルー (Peru)' },

    // オセアニア
    { code: 'AU', name: 'オーストラリア (Australia)' },
    { code: 'NZ', name: 'ニュージーランド (New Zealand)' },

    // ヨーロッパ (EU・非EU)
    { code: 'GB', name: 'イギリス (United Kingdom)' },
    { code: 'DE', name: 'ドイツ (Germany)' },
    { code: 'FR', name: 'フランス (France)' },
    { code: 'IT', name: 'イタリア (Italy)' },
    { code: 'ES', name: 'スペイン (Spain)' },
    { code: 'NL', name: 'オランダ (Netherlands)' },
    { code: 'BE', name: 'ベルギー (Belgium)' },
    { code: 'CH', name: 'スイス (Switzerland)' },
    { code: 'SE', name: 'スウェーデン (Sweden)' },
    { code: 'NO', name: 'ノルウェー (Norway)' },
    { code: 'FI', name: 'フィンランド (Finland)' },
    { code: 'DK', name: 'デンマーク (Denmark)' },
    { code: 'AT', name: 'オーストリア (Austria)' },
    { code: 'PL', name: 'ポーランド (Poland)' },
    { code: 'IE', name: 'アイルランド (Ireland)' },
    { code: 'PT', name: 'ポルトガル (Portugal)' },
    { code: 'GR', name: 'ギリシャ (Greece)' },
    { code: 'CZ', name: 'チェコ (Czech Republic)' },
    { code: 'HU', name: 'ハンガリー (Hungary)' },
    { code: 'RO', name: 'ルーマニア (Romania)' },
    { code: 'SK', name: 'スロバキア (Slovakia)' },
    { code: 'BG', name: 'ブルガリア (Bulgaria)' },
    { code: 'HR', name: 'クロアチア (Croatia)' },
    { code: 'SI', name: 'スロベニア (Slovenia)' },
    { code: 'EE', name: 'エストニア (Estonia)' },
    { code: 'LV', name: 'ラトビア (Latvia)' },
    { code: 'LT', name: 'リトアニア (Lithuania)' },
    { code: 'LU', name: 'ルクセンブルク (Luxembourg)' },

    // 中東・近東
    { code: 'AE', name: 'アラブ首長国連邦 (UAE)' },
    { code: 'SA', name: 'サウジアラビア (Saudi Arabia)' },
    { code: 'IL', name: 'イスラエル (Israel)' },
    { code: 'TR', name: 'トルコ (Turkey)' },
    { code: 'QA', name: 'カタール (Qatar)' },
    { code: 'KW', name: 'クウェート (Kuwait)' },
    { code: 'BH', name: 'バーレーン (Bahrain)' },
    { code: 'OM', name: 'オマーン (Oman)' },

    // アフリカ
    { code: 'ZA', name: '南アフリカ (South Africa)' },
    { code: 'EG', name: 'エジプト (Egypt)' },
    { code: 'MA', name: 'モロッコ (Morocco)' },
    { code: 'KE', name: 'ケニア (Kenya)' },
    { code: 'NG', name: 'ナイジェリア (Nigeria)' }
];