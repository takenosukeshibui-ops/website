// components/countries.ts
// [UPDATED] 英語名(enName)を追加し、多言語対応できるように構造を変更

export interface Country {
    code: string;
    name: string;
    enName: string; // [NEW]
}

export const countries: Country[] = [
    // アジア・東アジア
    { code: 'JP', name: '日本', enName: 'Japan' },
    { code: 'US', name: 'アメリカ', enName: 'United States' },
    { code: 'KR', name: '韓国', enName: 'South Korea' },
    { code: 'CN', name: '中国', enName: 'China' },
    { code: 'TW', name: '台湾', enName: 'Taiwan' },
    { code: 'HK', name: '香港', enName: 'Hong Kong' },
    { code: 'MO', name: 'マカオ', enName: 'Macau' },

    // 東南アジア
    { code: 'SG', name: 'シンガポール', enName: 'Singapore' },
    { code: 'TH', name: 'タイ', enName: 'Thailand' },
    { code: 'MY', name: 'マレーシア', enName: 'Malaysia' },
    { code: 'PH', name: 'フィリピン', enName: 'Philippines' },
    { code: 'VN', name: 'ベトナム', enName: 'Vietnam' },
    { code: 'ID', name: 'インドネシア', enName: 'Indonesia' },
    { code: 'IN', name: 'インド', enName: 'India' },
    { code: 'BN', name: 'ブルネイ', enName: 'Brunei' },
    { code: 'KH', name: 'カンボジア', enName: 'Cambodia' },
    { code: 'LA', name: 'ラオス', enName: 'Laos' },

    // 北米・中南米
    { code: 'CA', name: 'カナダ', enName: 'Canada' },
    { code: 'MX', name: 'メキシコ', enName: 'Mexico' },
    { code: 'BR', name: 'ブラジル', enName: 'Brazil' },
    { code: 'AR', name: 'アルゼンチン', enName: 'Argentina' },
    { code: 'CL', name: 'チリ', enName: 'Chile' },
    { code: 'CO', name: 'コロンビア', enName: 'Colombia' },
    { code: 'PE', name: 'ペルー', enName: 'Peru' },

    // オセアニア
    { code: 'AU', name: 'オーストラリア', enName: 'Australia' },
    { code: 'NZ', name: 'ニュージーランド', enName: 'New Zealand' },

    // ヨーロッパ (EU・非EU)
    { code: 'GB', name: 'イギリス', enName: 'United Kingdom' },
    { code: 'DE', name: 'ドイツ', enName: 'Germany' },
    { code: 'FR', name: 'フランス', enName: 'France' },
    { code: 'IT', name: 'イタリア', enName: 'Italy' },
    { code: 'ES', name: 'スペイン', enName: 'Spain' },
    { code: 'NL', name: 'オランダ', enName: 'Netherlands' },
    { code: 'BE', name: 'ベルギー', enName: 'Belgium' },
    { code: 'CH', name: 'スイス', enName: 'Switzerland' },
    { code: 'SE', name: 'スウェーデン', enName: 'Sweden' },
    { code: 'NO', name: 'ノルウェー', enName: 'Norway' },
    { code: 'FI', name: 'フィンランド', enName: 'Finland' },
    { code: 'DK', name: 'デンマーク', enName: 'Denmark' },
    { code: 'AT', name: 'オーストリア', enName: 'Austria' },
    { code: 'PL', name: 'ポーランド', enName: 'Poland' },
    { code: 'IE', name: 'アイルランド', enName: 'Ireland' },
    { code: 'PT', name: 'ポルトガル', enName: 'Portugal' },
    { code: 'GR', name: 'ギリシャ', enName: 'Greece' },
    { code: 'CZ', name: 'チェコ', enName: 'Czech Republic' },
    { code: 'HU', name: 'ハンガリー', enName: 'Hungary' },
    { code: 'RO', name: 'ルーマニア', enName: 'Romania' },
    { code: 'SK', name: 'スロバキア', enName: 'Slovakia' },
    { code: 'BG', name: 'ブルガリア', enName: 'Bulgaria' },
    { code: 'HR', name: 'クロアチア', enName: 'Croatia' },
    { code: 'SI', name: 'スロベニア', enName: 'Slovenia' },
    { code: 'EE', name: 'エストニア', enName: 'Estonia' },
    { code: 'LV', name: 'ラトビア', enName: 'Latvia' },
    { code: 'LT', name: 'リトアニア', enName: 'Lithuania' },
    { code: 'LU', name: 'ルクセンブルク', enName: 'Luxembourg' },

    // 中東・近東
    { code: 'AE', name: 'アラブ首長国連邦', enName: 'UAE' },
    { code: 'SA', name: 'サウジアラビア', enName: 'Saudi Arabia' },
    { code: 'IL', name: 'イスラエル', enName: 'Israel' },
    { code: 'TR', name: 'トルコ', enName: 'Turkey' },
    { code: 'QA', name: 'カタール', enName: 'Qatar' },
    { code: 'KW', name: 'クウェート', enName: 'Kuwait' },
    { code: 'BH', name: 'バーレーン', enName: 'Bahrain' },
    { code: 'OM', name: 'オマーン', enName: 'Oman' },

    // アフリカ
    { code: 'ZA', name: '南アフリカ', enName: 'South Africa' },
    { code: 'EG', name: 'エジプト', enName: 'Egypt' },
    { code: 'MA', name: 'モロッコ', enName: 'Morocco' },
    { code: 'KE', name: 'ケニア', enName: 'Kenya' },
    { code: 'NG', name: 'ナイジェリア', enName: 'Nigeria' }
];