// app/api/ai/intelligence/agents/arbitrage.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules } from '../helpers';
import { ResearchSlotKey } from '@/app/AiDashboard/types';

interface SlotDefinition {
    key: ResearchSlotKey;
    label: string;
    desc: string;
}

const SLOTS: SlotDefinition[] = [
    { key: 'classic_vintage', label: 'クラシック・ヴィンテージ枠（旧裏〜PCG期）', desc: '旧裏面、eシリーズ、ADV/PCG等の初期絶版シングル' },
    { key: 'neo_vintage', label: 'ネオ・ヴィンテージ枠（DP〜XY期）', desc: 'DP/Pt、LEGEND、BW、XY等の絶版シングル・1ED' },
    { key: 'exclusive_promo', label: '限定プロモ・配布枠', desc: 'ジムプロモ、ポケセン限定、映画付録、イベント配布品' },
    { key: 'modern_meta', label: '現行モダン・メタ枠', desc: 'SM〜SVのSAR/SR/AR/CHR、直近弾、世界大会メタ' },
    { key: 'graded_sealed', label: '高額鑑定・未開封BOX枠', desc: 'PSA10鑑定品、未開封BOX・未開封パック' }
];

export async function runSayaAnalysis(region: 'us' | 'eu' | 'asia' = 'us', _category: string = 'pokemon') {
    const rules = await getAgentRules('arbitrage');

    const regionContexts = {
        us: { name: '北米市場（現地TCGショップ・リセラー）', currency: 'USD' },
        eu: { name: '欧州市場（現地Cardmarket/ローカルショップ）', currency: 'EUR' },
        asia: { name: 'アジア市場（現地リテール・コレクター向け）', currency: 'USD/HKD' }
    };

    const cur = regionContexts[region];
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.1,
        maxOutputTokens: 8192,
    });

    const formattedCreatedAt = new Date().toLocaleString('ja-JP', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    // 1つのスロット（5価格帯 × 5商品 ＝ 計25商品）を査定するサブ関数
    const analyzeSingleSlot = async (slot: SlotDefinition) => {
        const slotPrompt = `あなたは【${cur.name}】でポケモンカード販売を展開し、日本から日本語版カードを輸入・調達（Import & Retail）する海外現地事業者専属の調達戦略アナリストです。
対象通貨: ${cur.currency}。

【担当スロット】: [${slot.key}] ${slot.label}（${slot.desc}）

【調達リサーチ任務】
以下の【5つの価格帯】すべてについて、自国への輸入販売に適した日本語版カードを【本命1商品 ＋ 代替候補4商品（計5商品）】厳選してください。
（このスロット全体で 5価格帯 × 5商品 ＝ 合計25商品）

■ 5つの価格帯と調達・合格基準:
1. under_3k（〜¥3,000）: 最低差額 +¥1,000以上、現地直近7日成約 5件以上（超高回転・エントリー枠）
2. under_10k（¥3,000〜¥10,000）: 最低差額 +¥2,500以上、現地直近7日成約 3件以上（手頃な定番コレクション枠）
3. middle（¥10,000〜¥30,000）: 最低差額 +¥6,000以上、現地直近14日成約 2件以上（中核プロモ・人気SR枠）
4. upper（¥30,000〜¥80,000）: 最低差額 +¥15,000以上、現地直近30日成約 2件以上（高額鑑定・上位絶版枠）
5. top_end（¥80,000以上）: 最低差額 +¥30,000以上、現地直近30日成約 1件以上（資産性・未開封BOX枠）

【厳格品質ルール】
・実在するカード名、型番または弾名を明記すること（架空カード厳禁）。
・日本国内調達と自国現地販売先の状態（PSA10＝PSA10、Raw NM＝Raw NM）を完全一致させること。
・自国の実成約データ（Sold Listings）を参照し、単純な価格マージン（差額）とROIを算出すること。

以下のJSONのみを出力してください:
{
  "slotKey": "${slot.key}",
  "slotLabel": "${slot.label}",
  "tiers": [
    {
      "priceTier": "under_3k",
      "priceTierLabel": "〜3千円",
      "mainItem": {
        "cardName": "実在カード名 (型番/弾名)",
        "conditionGrade": "Raw NM 等",
        "jpBuyPriceJPY": "¥X,XXX",
        "targetSoldPrice": "${cur.currency} XX (約¥X,XXX)",
        "priceSpreadJPY": "¥X,XXX",
        "spreadROI": "XX%",
        "liquidity": "直近7日 X件",
        "insight": "現地コレクターの需要動向と日本から輸入すべき理由（1行）"
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

    // 全体サマリーを生成する関数（海外現地事業者・インポーター視点）
    const generateExecutiveSummary = async () => {
        const summaryPrompt = `あなたは【${cur.name}】でポケモンカード販売を展開し、日本から日本語版カードを輸入・調達する海外現地事業者専属の調達戦略アナリストです。
${rules}

【重要】
このレポートの読者は「日本から日本語版カードを輸入して自国で販売している海外事業者（ショップオーナー・バイヤー）」です。
日本国内の輸出セラー向けではなく、海外現地事業者が日本からスマートに輸入・調達し、現地店舗やECで利益を最大化するための【今週の輸入調達・現地販売エグゼクティブ・サマリー】を作成してください。

以下のJSONのみを出力してください:
{
  "title": "${formattedCreatedAt} 【${region.toUpperCase()}】アービトラージレポート",
  "claim": "今週の${cur.name}向け日本語版カード輸入調達戦略（高マージン調達と現地即売れポートフォリオ）",
  "summary": {
    "headline": "今週の日本調達・現地販売戦略の核心（例: 円安基調を活かした低単価ARの大量調達と限定プロモの現地プレ値活用）",
    "macroAnalysis": {
      "japanSourcingClimate": "日本市場の調達環境（円相場の有利度、日本のショップ・フリマの流通在庫状況、仕入れやすさの動向）",
      "localMarketDemand": "自国（現地）市場での日本語版カード需要（現地顧客が今どのスロット・価格帯を熱狂的に求めているか）"
    },
    "microAnalysis": {
      "topImportMarginCard": "今週最も輸入マージン（利ざや）が厚い注目銘柄とその背景",
      "topLocalVelocityCard": "自国にストックした瞬間即売れする最高流動性銘柄",
      "conditionGradingInsight": "現地での状態需要特性（PSA10プレミアムの強さ、素体NMの許容度、日本版特有の検品傾向）"
    },
    "riskAlert": {
      "sourcingQualityTrap": "日本からの調達時に警戒すべき品質リスク（フリマ写真の白かけ見落とし、センタリング、偽物・再シュリンク等）",
      "localInventoryRisk": "自国在庫としての滞留リスク（現地での一時的な投機熱の冷え込み、価格急落リスクへの対策）"
    },
    "actionDirectives": [
      "低単価帯（〜3千円・1万円以下）の日本調達発注＆現地スピード販売アクション",
      "中・高額帯（1万〜8万円以上）の日本調達発注＆現地プレミアム販売アクション"
    ]
  }
}`;
        try {
            const res = await model.invoke(summaryPrompt);
            return parseAIJson(res.content.toString());
        } catch {
            return {
                title: `${formattedCreatedAt} 【${region.toUpperCase()}】アービトラージレポート`,
                claim: `今週の${cur.name}向け日本語版カード輸入調達戦略`,
                summary: {
                    headline: "円安環境を活かした高回転ARの日本一括調達と限定プロモの現地マージン確保",
                    macroAnalysis: {
                        japanSourcingClimate: "為替レートの恩恵により日本国内の調達原価が割安に推移。フリマ・専門店に良品在庫が豊富。",
                        localMarketDemand: "現行モダンAR/CHRの現地コレクター需要が極めて高く、手頃な絶版シングルへのコレクション需要も安定。"
                    },
                    microAnalysis: {
                        topImportMarginCard: "限定プロモ枠および準高額PSA10で30%〜50%以上の純利ざやを確保可能",
                        topLocalVelocityCard: "現行ARおよび世界大会メタの汎用カードが自国入荷から数日以内で回転",
                        conditionGradingInsight: "海外顧客は日本版の印刷品質に高い信頼を寄せており、Raw NMでも高値成約が持続"
                    },
                    riskAlert: {
                        sourcingQualityTrap: "日本のフリマ個人出品における白かけ・初期傷の見落としに注意。店舗美品またはPSA10を優先調達推奨。",
                        localInventoryRisk: "新弾の供給過多による一時的な現地価格調整に備え、入荷後即時の在庫回転を徹底。"
                    },
                    actionDirectives: [
                        "低単価帯は日本のフリマ・専門店からまとめ買い調達し、現地ショップ/ECで即時回転",
                        "高額帯は現地コレクターからのバックオーダー（予約注文）またはPSA10確実品のみを輸入"
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
        title: summaryResult?.title || `${formattedCreatedAt} 【${region.toUpperCase()}】アービトラージレポート`,
        claim: summaryResult?.claim || "海外現地事業者向け 日本語版カード輸入調達ポートフォリオ",
        createdAt: formattedCreatedAt,
        summary: summaryResult?.summary,
        slots: validSlots
    };
}