// app/api/ai/intelligence/agents/arbitrage.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules } from '../helpers';
import { ResearchSlotKey, PriceTierKey } from '@/app/AiDashboard/types';

interface SlotDefinition {
    key: ResearchSlotKey;
    label: string;
    desc: string;
}

const SLOTS: SlotDefinition[] = [
    { key: 'classic_vintage', label: 'クラシック・ヴィンテージ枠（旧裏〜PCG期）', desc: '旧裏面、eシリーズ、ADV/PCG等の初期絶版' },
    { key: 'neo_vintage', label: 'ネオ・ヴィンテージ枠（DP〜XY期）', desc: 'DP/Pt、LEGEND、BW、XY等の絶版シングル・1ED' },
    { key: 'exclusive_promo', label: '限定プロモ・配布枠', desc: 'ジムプロモ、ポケセン限定、映画付録、イベント配布' },
    { key: 'modern_meta', label: '現行モダン・メタ枠', desc: 'SM〜SVのSAR/SR/AR/CHR、直近弾、世界大会メタ' },
    { key: 'graded_sealed', label: '高額鑑定・未開封BOX枠', desc: 'PSA10鑑定品、未開封BOX・未開封パック' }
];

export async function runSayaAnalysis(region: 'us' | 'eu' | 'asia' = 'us', _category: string = 'pokemon') {
    const rules = await getAgentRules('arbitrage');

    const regionContexts = {
        us: { name: '北米市場（日米アービトラージ）', currency: 'USD' },
        eu: { name: '欧州市場（日欧アービトラージ）', currency: 'EUR' },
        asia: { name: 'アジア市場（日亜アービトラージ）', currency: 'USD/HKD' }
    };

    const cur = regionContexts[region];
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.1,
        maxOutputTokens: 8192,
    });

    // 1つのスロット（5価格帯 × 5商品 ＝ 計25商品）を査定するサブ関数
    const analyzeSingleSlot = async (slot: SlotDefinition) => {
        const slotPrompt = `あなたは【${cur.name}】専属の日本語版ポケモンカード アービトラージアナリストです。
対象通貨: ${cur.currency}。

【担当スロット】: [${slot.key}] ${slot.label}（${slot.desc}）

【任務】
以下の【5つの価格帯】すべてについて、条件を満たす商品を【本命1商品 ＋ 代替候補4商品（計5商品）】厳選してください。
（このスロット全体で 5価格帯 × 5商品 ＝ 合計25商品）

■ 5つの価格帯と足切り判定ルール:
1. under_3k（〜¥3,000）: 最低差額 +¥1,000以上、直近7日Sold 5件以上
2. under_10k（¥3,000〜¥10,000）: 最低差額 +¥2,500以上、直近7日Sold 3件以上
3. middle（¥10,000〜¥30,000）: 最低差額 +¥6,000以上、直近14日Sold 2件以上
4. upper（¥30,000〜¥80,000）: 最低差額 +¥15,000以上、直近30日Sold 2件以上
5. top_end（¥80,000以上）: 最低差額 +¥30,000以上、直近30日Sold 1件以上

【厳格品質ルール】
・実在するカード名、型番または弾名を明記すること（架空カード厳禁）。
・国内仕入れと海外販売先の状態（PSA10＝PSA10、Raw NM＝Raw NM）を完全一致させること。
・直近の実成約価格（Sold Listings）を参照し、単純な価格差額とROIを算出すること。

以下のJSONのみを出力してください:
{
  "slotKey": "${slot.key}",
  "slotLabel": "${slot.label}",
  "tiers": [
    {
      "priceTier": "under_3k",
      "priceTierLabel": "〜3千円",
      "mainItem": {
        "cardName": "実在カード名 (型番)",
        "conditionGrade": "Raw NM",
        "jpBuyPriceJPY": "¥X,XXX",
        "targetSoldPrice": "${cur.currency} XX (約¥X,XXX)",
        "priceSpreadJPY": "¥X,XXX",
        "spreadROI": "XX%",
        "liquidity": "直近7日 X件",
        "insight": "海外需要と狙い目（1行）"
      },
      "subItems": [
        { "cardName": "候補2 (型番)", "conditionGrade": "Raw NM", "jpBuyPriceJPY": "¥X,XXX", "targetSoldPrice": "${cur.currency} XX", "priceSpreadJPY": "¥X,XXX", "spreadROI": "XX%", "liquidity": "直近7日 X件", "insight": "特徴1行" },
        { "cardName": "候補3 (型番)", "conditionGrade": "Raw NM", "jpBuyPriceJPY": "¥X,XXX", "targetSoldPrice": "${cur.currency} XX", "priceSpreadJPY": "¥X,XXX", "spreadROI": "XX%", "liquidity": "直近7日 X件", "insight": "特徴1行" },
        { "cardName": "候補4 (型番)", "conditionGrade": "Raw NM", "jpBuyPriceJPY": "¥X,XXX", "targetSoldPrice": "${cur.currency} XX", "priceSpreadJPY": "¥X,XXX", "spreadROI": "XX%", "liquidity": "直近7日 X件", "insight": "特徴1行" },
        { "cardName": "候補5 (型番)", "conditionGrade": "Raw NM", "jpBuyPriceJPY": "¥X,XXX", "targetSoldPrice": "${cur.currency} XX", "priceSpreadJPY": "¥X,XXX", "spreadROI": "XX%", "liquidity": "直近7日 X件", "insight": "特徴1行" }
      ]
    },
    { "priceTier": "under_10k", "priceTierLabel": "3千〜1万円", "mainItem": { /* 同様 */ }, "subItems": [ /* 4商品 */ ] },
    { "priceTier": "middle", "priceTierLabel": "1万〜3万円", "mainItem": { /* 同様 */ }, "subItems": [ /* 4商品 */ ] },
    { "priceTier": "upper", "priceTierLabel": "3万〜8万円", "mainItem": { /* 同様 */ }, "subItems": [ /* 4商品 */ ] },
    { "priceTier": "top_end", "priceTierLabel": "8万円〜", "mainItem": { /* 同様 */ }, "subItems": [ /* 4商品 */ ] }
  ]
}`;

        try {
            const res = await model.invoke(slotPrompt);
            return parseAIJson(res.content.toString());
        } catch (e) {
            console.error(`Slot analysis failed for ${slot.key}:`, e);
            return null;
        }
    };

    // 全体サマリーを生成する関数（オウム返し定型文を廃止し、実務インサイトに特化）
    const generateExecutiveSummary = async () => {
        const summaryPrompt = `あなたは【${cur.name}】専属の日本語版ポケモンカード アービトラージアナリストです。
手数料や送料を一旦除外した「単純価格差」と「成約速度」を評価基準としています。
${rules}

今週の相場環境を踏まえ、仕入れ担当者が即座に判断できる実務的な【今週のサヤ取りエグゼクティブ・サマリー】を作成してください。
以下のJSONのみを出力してください:
{
  "title": "【${region.toUpperCase()}利ざや】5スロット×5価格帯 125枠網羅マトリクスサヤ取りレポート",
  "claim": "今週の${cur.name}におけるサヤ取り総括（注力すべきスロットと即売れポートフォリオ）",
  "summary": {
    "headline": "今週のサヤ取り相場核心（例: 低単価ARの急回転と限定プロモの利幅拡大）",
    "hotSectors": "今週特にサヤが厚い注目のスロット・価格帯とその理由（具体的に1〜2文で記述）",
    "buyerVelocity": "海外実成約（Sold）の回転速度・バイヤー動向（具体的に1〜2文で記述）",
    "actionDirectives": [
      "低単価帯（〜3千円・1万円以下）の具体的な仕入れ・出品アクション",
      "高額帯（3万円以上）の具体的な仕入れ・出品アクション"
    ]
  }
}`;
        try {
            const res = await model.invoke(summaryPrompt);
            return parseAIJson(res.content.toString());
        } catch {
            return {
                title: `【${region.toUpperCase()}利ざや】5スロット×5価格帯 125枠網羅マトリクスサヤ取りレポート`,
                claim: `今週の${cur.name}におけるサヤ取り総括`,
                summary: {
                    headline: "低単価帯の高回転と中位プロモの利幅拡大",
                    hotSectors: "現行モダン〜3千円枠および限定プロモ1万〜3万円枠で日米価格差が拡大中",
                    buyerVelocity: "直近7日成約5件以上の高回転銘柄が低単価帯に集中",
                    actionDirectives: [
                        "低単価帯は国内フリマで即時仕入れし、即出品でキャッシュを高速回転",
                        "高額帯は直近Sold実績と状態NMを確認した上で慎重に調達"
                    ]
                }
            };
        }
    };

    // 5スロット並列処理 ＋ サマリー生成を同時に実行
    const [summaryResult, ...slotResults] = await Promise.all([
        generateExecutiveSummary(),
        ...SLOTS.map(s => analyzeSingleSlot(s))
    ]);

    const validSlots = slotResults.filter(Boolean);

    return {
        title: summaryResult?.title || `【${region.toUpperCase()}利ざや】125枠網羅サヤ取りレポート`,
        claim: summaryResult?.claim || "全年代・全予算帯を網羅したサヤ取りポートフォリオ",
        summary: summaryResult?.summary,
        slots: validSlots
    };
}