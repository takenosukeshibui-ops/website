// app/api/ai/intelligence/agents/marketTrend.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules } from '../helpers';

export async function runMarketTrend(region: 'us' | 'eu' | 'asia' = 'us') {
    const rules = await getAgentRules('trend');

    const regionContexts = {
        us: {
            name: '北米市場（アメリカ・カナダ）',
            targets: 'eBay USA, TCGPlayer, 米国YouTuber/インフルエンサー動向',
            focus: '日本先行発売に伴うタイムラグ先行需要、海外大会メタ入り後の日本語版ハイレアリティ投資流入'
        },
        eu: {
            name: '欧州市場（イギリス・ドイツ・フランス等）',
            targets: 'Cardmarket (EU), eBay UK/DE',
            focus: '言語版差異、PSA10鑑定品の欧州コレクタープレミアム、日本限定ジムプロモ・ポケセン限定サプライの希少性'
        },
        asia: {
            name: 'アジア市場（台湾・香港・韓国・東南アジア）',
            targets: 'Shopee, 現地専門店, 各国コミュニティ',
            focus: '女性サポートSR/SARの熱量、日本限定プロモやピカチュウ/リザードン等の限定品の投資資金流入'
        }
    };

    const cur = regionContexts[region];
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const prompt = `あなたは【${cur.name}】専属の日本語版ポケモンカード市場トレンドアナリストです。

【監視スコープと主要着目点】
- 監視スコープ: ${cur.targets}
- 主要着目点: ${cur.focus}

【厳格要件】
1. 架空のカード名やレアリティは絶対に出力せず、実在する人気ポケモンカード銘柄（直近弾〜近年の人気シングル）を1件選定すること。
2. 3点観測（先行需要・アート性/キャラクター人気・ソーシャル熱量）および自己反証（下落リスクとその対抗策）を徹底すること。
${rules}

以下のJSON形式のみを出力してください:
{
  "title": "【${region.toUpperCase()}市場】銘柄名＋高騰予測タイトル",
  "claim": "結論（推奨銘柄、推奨保有期間、ターゲット市場）",
  "reasons": [
    "根拠1: 3点観測の観点A（先行・メタ需要）",
    "根拠2: 3点観測の観点B（アート・キャラクター熱量）",
    "根拠3: 海外コミュニティでの言及・売れ行き傾向"
  ],
  "facts": [
    { "label": "現地推定相場", "value": "$XXX / €XXX" },
    { "label": "国内フリマ相場", "value": "¥XX,XXX" },
    { "label": "直近1ヶ月推移", "value": "+XX%" },
    { "label": "3点観測スコア", "value": "3軸適合 (確度: 高)" }
  ],
  "soWhat": "自社事業への示唆（代理購入・VIP Discordでの訴求ポイント）",
  "riskAndMitigation": {
    "risk": "自己反証による懸念（例: 英語版発売による短期的な反落、再販リスク等）",
    "mitigation": "リスク対抗策（例: PSA10鑑定化による差別化、先行利確等）"
  },
  "verificationChecklist": [
    "成約価格の実績確認",
    "現地コミュニティの言及頻度チェック",
    "国内仕入れ在庫の流通量確認"
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}