import { NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createClient } from '@/lib/supabase/server';
import { getInstagramInsights } from '@/lib/instagram';

export const maxDuration = 60;

function parseAIJson(content: string) {
    try {
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("AI JSON parse error:", e, content);
        return null;
    }
}

// ---------------------------------------------------------
// 1. 市場トレンドアナリスト（米・欧・亜 地域別）
// ---------------------------------------------------------
async function runMarketTrend(region: 'us' | 'eu' | 'asia' = 'us') {
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
            focus: '女性サポートSRの熱量、日本限定プロモやピカチュウ/リザードン等の限定品の投資資金流入'
        }
    };

    const cur = regionContexts[region];
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const prompt = `あなたは【${cur.name}】専属の日本語版ポケモンカード市場トレンドアナリストです。
監視スコープ: ${cur.targets}
主要着目点: ${cur.focus}

設計書のルールに従い、3点観測（先行・アート・ソーシャル）および自己反証を行い、推奨する高騰予測銘柄を1件選定してください。

必ず以下のJSON形式のみを出力してください:
{
  "title": "【${region.toUpperCase()}市場】銘柄名＋高騰予測タイトル",
  "claim": "結論（推奨銘柄、推奨保有期間、ターゲット市場）",
  "reasons": [
    "根拠1: 3点観測の観点A",
    "根拠2: 3点観測の観点B",
    "根拠3: 海外コミュニティでの熱量"
  ],
  "facts": [
    { "label": "現地推定相場", "value": "$XXX / €XXX" },
    { "label": "国内フリマ相場", "value": "¥XX,XXX" },
    { "label": "直近1ヶ月推移", "value": "+XX%" },
    { "label": "3点観測スコア", "value": "3軸適合 (確度: 高)" }
  ],
  "soWhat": "自社事業への示唆（代理購入・VIP Discordでの訴求ポイント）",
  "riskAndMitigation": {
    "risk": "自己反証による懸念（例: 英語版発売による短期的な反落リスク等）",
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

// ---------------------------------------------------------
// 2. アービトラージアナリスト（米・欧・亜 地域別）
// ---------------------------------------------------------
async function runSayaAnalysis(region: 'us' | 'eu' | 'asia' = 'us') {
    const regionContexts = {
        us: { name: '北米市場（日米アービトラージ）', currency: 'USD', feeRate: '約13% (eBay)', shipping: 'FedEx 約2,500円〜3,500円' },
        eu: { name: '欧州市場（日欧アービトラージ）', currency: 'EUR', feeRate: '約10% (Cardmarket/eBay)', shipping: 'EMS 約3,000円〜4,500円' },
        asia: { name: 'アジア市場（日亜アービトラージ）', currency: 'USD/HKD', feeRate: '約8〜12%', shipping: 'EMS 約1,800円〜2,800円' }
    };

    const cur = regionContexts[region];
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.1,
    });

    const prompt = `あなたは【${cur.name}】専属のアービトラージ（サヤ抜き）アナリストです。
対象通貨: ${cur.currency}、プラットフォーム手数料: ${cur.feeRate}、送料目安: ${cur.shipping}。
状態を厳密に揃え、成約価格中央値を基準に実質純利益（Net ROI）を算出してください。

必ず以下のJSON形式のみを出力してください:
{
  "title": "【${region.toUpperCase()}利ざや】対象カード名・BOX名（状態完全一致）",
  "claim": "1件あたりの実質純利益 ¥XX,XXX / $XXX (Net ROI: XX%) の即時仕入れ・販売判断",
  "reasons": [
    "国内仕入れ価格の安定性",
    "現地プラットフォームでの直近7〜14日成約実績",
    "為替リスクを織り込んだ利益マージン"
  ],
  "facts": [
    { "label": "国内仕入れ価格", "value": "¥XX,XXX" },
    { "label": "現地実成約価格", "value": "${cur.currency} XXX" },
    { "label": "想定諸経費計", "value": "¥X,XXX (手数料＋送料)" },
    { "label": "実質純利益 (Net)", "value": "¥XX,XXX (ROI: XX%)" }
  ],
  "soWhat": "自社代理購入サービスを通じた直送手配での成約余地と推奨オファー",
  "riskAndMitigation": {
    "risk": "為替変動や配送遅延による相場反落リスク",
    "mitigation": "受発注のリアルタイム化または即時買い付け指示"
  },
  "verificationChecklist": [
    "PSA10の状態一致確認",
    "直近7日成約履歴の照合",
    "サイズ・重量の送料確認"
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// ---------------------------------------------------------
// 3. チーフマネージャー（最優秀案件の選定と戦略パッケージ化）
// ---------------------------------------------------------
async function runChiefManager(trends: any, profits: any) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const prompt = `あなたは越境トレカ代理購入事業の【チーフマネージャー】です。
あなたの責務は、6名のリサーチャー（米欧亜トレンド3名、米欧亜アービトラージ3名）から提出されたレポートを総合的に審査し、
今週最も高い成約利益（ROI）と集客効果を生み出す「最優秀案件」を1点選定し、SNS部隊と営業部隊へディレクション指示書を発行することです。

【リサーチャー提出レポート】
■ 市場トレンド（米/欧/亜）:
${JSON.stringify(trends)}

■ アービトラージ利ざや（米/欧/亜）:
${JSON.stringify(profits)}

以下の判断基準で選定してください:
1. タイプA（利ざや重視）: 実質純利益額・ROIが高く、仕入れ再現性が高い案件
2. タイプB（トレンド重視）: 先行需要やコレクター波及の熱量が高く、FOMOを最も刺激できる案件

必ず以下のJSON形式のみを出力してください:
{
  "selectedLeadMagnetType": "TypeA_Arbitrage または TypeB_Trend",
  "winningRegion": "us / eu / asia",
  "chosenCardOrItem": "選定したカード名 / 商品名",
  "selectionReason": "6案件の中からこの銘柄を選定した戦略的判断理由（ROI・話題性・成約確率）",
  "coreHookFact": "無料SNSで提示する『事実（Fact）』と『結果（Result）』の核心フック（※国内仕入れルートや具体的手順などのAction/Reasonは伏せる）",
  "creativeDirective": {
    "instagramAngle": "Instagramクリエイターに対するカルーセル構成・画像レイアウト指示",
    "xTwitterAngle": "Xクリエイターに対する140字フック・画像4枚・ツリー展開の指示",
    "discordOfferAngle": "有料コミュニティ担当に対するロット数・直送手配オファーの落とし込み指示"
  }
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// ---------------------------------------------------------
// 4. IGアナリスト（自社Instagramアカウント分析）
// ---------------------------------------------------------
async function runAccountAnalysis() {
    const rawInsights = await getInstagramInsights(5);
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const prompt = `あなたは越境トレカ販売事業の専任IGアナリストです。
直近データ: ${JSON.stringify(rawInsights)}

答えを教えない撒き餌設計（Fact/Result提示、Action/Reason秘匿）に基づき、改善戦術を分析してください。

以下のJSON形式のみを出力してください:
{
  "title": "自社Instagramアカウントエンゲージメント・ファネル診断",
  "claim": "改善すべき主要フックおよび投稿方針の推奨アクション",
  "reasons": [
    "過去投稿のエンゲージメント分析結果",
    "クリック率・プロフ誘導のボトルネック",
    "最も反響の高かった投稿切り口の法則"
  ],
  "facts": [
    { "label": "平均いいね/保存数", "value": "XX件" },
    { "label": "高反響の訴求軸", "value": "確定利ざや系 or トレンド系" },
    { "label": "推奨投稿時間帯", "value": "日本時間 20:00〜22:00" },
    { "label": "プロフ遷移率", "value": "X.X%" }
  ],
  "soWhat": "次回のInstagramクリエイターへの指示ルール",
  "riskAndMitigation": {
    "risk": "アルゴリズム変更によるリーチ低下",
    "mitigation": "カルーセルスライド複数枚化による滞在時間の向上"
  },
  "verificationChecklist": [
    "プロフURLの計測タグ確認",
    "保存率の高いスライド構成のテンプレ化"
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// ---------------------------------------------------------
// 5. Xアナリスト（自社Xアカウント・アルゴリズム分析専任）
// ---------------------------------------------------------
async function runXAccountAnalysis() {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const prompt = `あなたは越境トレカ販売事業の専任【X (Twitter) アナリスト】です。
設計書第2章に基づき、Xプラットフォーム特有のアルゴリズム（インプレッション最大化、ブックマーク保存率、リポスト連鎖、外部リンク遷移のペナルティ回避）を分析し、Xクリエイター向けの戦術ルールを策定してください。

以下のJSON形式のみを出力してください:
{
  "title": "自社X (Twitter) アルゴリズム・エンゲージメント診断",
  "claim": "Xの拡散力・ブックマーク率を最大化する投稿戦術ルールの推奨アクション",
  "reasons": [
    "1ポスト目の文字数・行数とインプレッションの相関",
    "画像4枚構成時のプレビュー視認性ルール",
    "リポストおよびリプライ欄導線のクリック率検証"
  ],
  "facts": [
    { "label": "目標ブックマーク率", "value": "1.5%以上" },
    { "label": "推奨スレッド構成", "value": "全3〜4ポスト" },
    { "label": "推奨投稿時間帯", "value": "日本時間 19:00〜21:00 / 08:00 (米国夕方)" },
    { "label": "リンク配置ルール", "value": "スレッド最終ポストまたは固定ポスト" }
  ],
  "soWhat": "次回のXクリエイターへの制作戦術指示（フック文字数、画像アスペクト比、ツリー展開順）",
  "riskAndMitigation": {
    "risk": "外部リンク貼付による表示回数制限（シャドウリミット）",
    "mitigation": "1ポスト目にはリンクを置かず、完全スレッド完結型にしてリプ欄にURL配置"
  },
  "verificationChecklist": [
    "1ポスト目が140文字以内に収まっているか",
    "画像4枚の視認性チェック",
    "アナリティクスのインプレッション中央値照合"
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// ---------------------------------------------------------
// 6. Instagramクリエイター（撒き餌作成）
// ---------------------------------------------------------
async function runSnsPosts(chiefPackage: any, accountReport: any) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.3,
    });

    const prompt = `あなたはInstagram専任のSNS投稿クリエイターです。
チーフマネージャーからの指示書:
${JSON.stringify(chiefPackage)}

IGアナリスト指示:
${JSON.stringify(accountReport)}

以下のJSON形式のみを出力してください:
{
  "theme": "チーフ選定に基づく今週のメイン撒き餌テーマ",
  "recommendedTiming": "推奨投稿日時",
  "visualGuideline": {
    "coverSlide": "1枚目（表紙）画像指示",
    "carouselSlides": [
      "2枚目: 価格差・高騰事実の提示",
      "3枚目: 証拠画面",
      "4枚目: VIP Discord/自社サイト誘導"
    ]
  },
  "posts": {
    "hybridPost": "推奨ハイブリッド投稿キャプション全文",
    "arbitragePost": "タイプA: 確定利ざや特化投稿キャプション全文",
    "trendPost": "タイプB: 市場トレンド特化投稿キャプション全文"
  },
  "discordCTA": "VIP Discordおよび自社サイトへの明確なアクション用誘導文"
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// ---------------------------------------------------------
// 7. X (Twitter) クリエイター（短文・ツリー・画像4枚構成）
// ---------------------------------------------------------
async function runXPosts(chiefPackage: any, xAccountReport?: any) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.3,
    });

    const prompt = `あなたはX (Twitter) 専任のクリエイターです。
チーフマネージャーからの指示書:
${JSON.stringify(chiefPackage)}

Xアナリストの戦術指示:
${JSON.stringify(xAccountReport || {})}

以下のJSON形式のみを出力してください:
{
  "theme": "X用拡散フックテーマ",
  "mainPost": "1ポスト目（140字以内、フック＋画像添付案内＋スレッド誘導）",
  "threadPosts": [
    "ツリー2ポスト目: 国内相場と海外成約相場の事実比較",
    "ツリー3ポスト目: なぜ今この価格差が生じているのか（背景の示唆のみ）",
    "ツリー4ポスト目（CTA）: VIP Discord（詳細データ）＆ 自社サイト（直送依頼）への誘導文"
  ],
  "imageGuideline": [
    "画像1: 日本国内フリマ相場（メルカリ/スニダン等）の画面",
    "画像2: 海外実成約価格（eBay Sold等）の画面",
    "画像3: 実質利幅の内訳インフォグラフィック",
    "画像4: サービス概要・直送フロー図"
  ],
  "xCallToAction": "固定ポストまたはリプ欄に貼る誘導テキスト"
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// ---------------------------------------------------------
// 8. 有料コミュニティ担当（チーフ指示書に基づく実務オファー）
// ---------------------------------------------------------
async function runSalesDM(chiefPackage: any) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const prompt = `あなたはVIPコミュニティ（Discord）専任の担当AIです。
チーフマネージャーからの指示書:
${JSON.stringify(chiefPackage)}

以下のJSON形式のみを出力してください:
{
  "targetSegment": "選定地域（${chiefPackage?.winningRegion || '海外'}）の大口セラー/コレクター",
  "offerSummary": "オファー概要（ロット確保・即時直送手配）",
  "discordMessage": "Discord大口バイヤー向けチャンネル投稿文全文（商条件・決済方法・直送メリットを明記）",
  "commercialTerms": {
    "minimumOrderQty": "最低ロット条件",
    "shippingMethod": "FedEx Priority / EMS 追跡付き直送",
    "paymentMethod": "PayPal / Wise送金"
  },
  "negotiationTip": "価格・数量交渉に対する事前対策ガイダンス"
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// ---------------------------------------------------------
// 9. 的中実績・証明投稿エンジン（タイプC：社会的証明）
// ---------------------------------------------------------
async function runHitProofEngine(pastLogs: any[]) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const pastPredictions = pastLogs.map(log => ({
        date: log.created_at,
        trends: log.trend_insights,
        chiefPackage: log.chief_package
    })).filter(p => Boolean(p.trends || p.chiefPackage));

    const prompt = `あなたは越境トレカ代理購入組織のチーフ直下に組み込まれた【的中実績・証明投稿エンジン】です。
設計書第5章に基づき、過去に蓄積されたトレンド予測履歴と現在の海外市場実相場を照合し、
実際に高騰が的中したキラー実績を1件特定して「タイプC（的中実績・証明投稿）」パッケージを作成してください。

以下のJSON形式のみを出力してください:
{
  "cardName": "的中したカード名・商品名",
  "predictedDate": "予測時期 (例: 3週間前 / 2026年9月上旬)",
  "predictedPrice": "当時の相場 ($XXX / ¥XX,XXX)",
  "currentPrice": "現在の海外成約相場 ($XXX / ¥XX,XXX)",
  "growthRate": "急騰上昇率 (例: +45.8%)",
  "hitReasonPattern": "的中要因 (先行需要 / コレクター波及 / 日本限定希少性)",
  "proofPost": "タイプC投稿キャプション全文（当時の予測事実と現在の急騰結果を並べ、圧倒的な証拠を提示するテキスト。ハッシュタグ含む）",
  "visualGuideline": {
    "beforeImageDesc": "左側/1枚目: 当時の予測レポート画面のキャプチャ指示",
    "afterImageDesc": "右側/2枚目: 現在の海外実成約（Sold Listings）急騰画面のスクショ指示",
    "comparisonLayout": "ビフォーアフター対比レイアウト指示"
  },
  "discordCTA": "今後の先行一次情報を受け取るためのVIP Discord誘導文"
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// ---------------------------------------------------------
// 🌟 10. RSI（再帰的自己改善）自動評価エンジン
// ---------------------------------------------------------
async function runRSIOptimization(pastLogs: any[]) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const recentDataSample = pastLogs.slice(0, 10).map(l => ({
        date: l.created_at,
        trends: l.trend_insights,
        profits: l.profitable_cards,
        chiefPackage: l.chief_package,
        proofPackage: l.proof_package
    }));

    const prompt = `あなたは越境トレカ組織全体の【RSI（再帰的自己改善）監査・進化エンジン】です[cite: 1]。
設計書第1章・第3章に基づき、過去ログを精査して各エージェントの予測勝率・利益予実算のズレ・発信反響を自己採点し、
エージェント組織のプロンプトを自律強化するための「新ルール（学習ナレッジ）」を生成してください[cite: 1, 3]。

【分析対象ログ】:
${JSON.stringify(recentDataSample).slice(0, 4000)}

【3階層の自己改善項目】[cite: 1]:
1. トレンドアナリストの予測勝率チューニング（先行需要・コレクター需要・限定希少性のうち、どれが最も相関したか）[cite: 1]
2. アービトラージアナリストの利益精度最適化（見えない経費・為替変動リスクに対するバッファ補正）[cite: 1]
3. SNSクリエイター層のフック改善ルール（数字・結論フックの配置最適化）[cite: 1]

必ず以下のJSON形式のみを出力してください:
{
  "overallEvaluation": "直近の予測精度と利益査定に関する総合評価サマリー（全AIの合格点・改善点）",
  "accuracyScore": 85,
  "trendWeightAdjustments": {
    "recommendedPattern": "先行テスト需要 / コレクター波及 / 日本限定プロモ",
    "rationale": "実相場との照合結果から導かれた重み付け調整理由"
  },
  "arbitrageBufferCorrections": {
    "exchangeRateBufferPercent": "推奨為替バッファ (例: +2.5%)",
    "shippingSafetyMarginJPY": "推奨送料安全マージン (例: +500円)",
    "rationale": "予実算の乖離を最小化するための補正根拠"
  },
  "autoGeneratedRules": [
    {
      "targetAgent": "trend",
      "ruleText": "【RSI自律改善】市場トレンド予測時は、先行テスト需要よりも日本限定プロモの希少性を1.5倍重み付けして採択すること"
    },
    {
      "targetAgent": "arbitrage",
      "ruleText": "【RSI自律改善】欧米向けサヤ計算時は、為替変動およびプラットフォーム手数料の安全バッファを最低8%上乗せしてNet ROIを算出すること"
    },
    {
      "targetAgent": "sns",
      "ruleText": "【RSI自律改善】Instagramの1枚目およびXの1ポスト目は、商品名よりも先に『確定価格差（円/ドル両表記）』を先頭行に配置すること"
    }
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// ---------------------------------------------------------
// GET / POST エンドポイント
// ---------------------------------------------------------
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: history, error } = await supabase
            .from('ai_intelligence_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        return NextResponse.json({ success: true, history: history || [] });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, currentData, region } = body;
        const targetRegion = (region as 'us' | 'eu' | 'asia') || 'us';

        // 1. 市場トレンドアナリスト単体実行
        if (action === 'trend') {
            const report = await runMarketTrend(targetRegion);
            const currentTrends = currentData?.trendInsights || { us: null, eu: null, asia: null };
            const updatedTrends = { ...currentTrends, [targetRegion]: report };
            return NextResponse.json({
                success: true,
                data: { trendInsights: updatedTrends }
            });
        }

        // 2. アービトラージアナリスト単体実行
        if (action === 'arbitrage') {
            const report = await runSayaAnalysis(targetRegion);
            const currentProfits = currentData?.profitableCards || { us: null, eu: null, asia: null };
            const updatedProfits = { ...currentProfits, [targetRegion]: report };
            return NextResponse.json({
                success: true,
                data: { profitableCards: updatedProfits }
            });
        }

        // 3. チーフマネージャー単体選定
        if (action === 'chief') {
            const chiefPackage = await runChiefManager(
                currentData?.trendInsights,
                currentData?.profitableCards
            );
            return NextResponse.json({
                success: true,
                data: { chiefPackage }
            });
        }

        // 4. IGアナリスト単体実行
        if (action === 'account') {
            const accountReport = await runAccountAnalysis();
            return NextResponse.json({
                success: true,
                data: { accountInsights: accountReport }
            });
        }

        // 5. Xアナリスト単体実行
        if (action === 'x_account') {
            const xAccountReport = await runXAccountAnalysis();
            return NextResponse.json({
                success: true,
                data: { xAccountInsights: xAccountReport }
            });
        }

        // 6. Instagram原稿単体実行
        if (action === 'sns') {
            const snsPosts = await runSnsPosts(
                currentData?.chiefPackage,
                currentData?.accountInsights
            );
            return NextResponse.json({
                success: true,
                data: { snsPosts }
            });
        }

        // 7. X (Twitter) 原稿単体実行
        if (action === 'x') {
            const xPosts = await runXPosts(
                currentData?.chiefPackage,
                currentData?.xAccountInsights
            );
            return NextResponse.json({
                success: true,
                data: { xPosts }
            });
        }

        // 8. 有料コミュニティ営業文単体実行
        if (action === 'dm') {
            const salesDM = await runSalesDM(currentData?.chiefPackage);
            return NextResponse.json({
                success: true,
                data: { salesDM }
            });
        }

        // 9. 的中実績・証明投稿（タイプC）単体生成
        if (action === 'proof') {
            const supabase = await createClient();
            const { data: pastLogs } = await supabase
                .from('ai_intelligence_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(15);

            const proofPackage = await runHitProofEngine(pastLogs || []);
            return NextResponse.json({
                success: true,
                data: { proofPackage }
            });
        }

        // 🌟 10. RSI（再帰的自己改善）自律評価・ルール自動生成実行
        if (action === 'rsi') {
            const supabase = await createClient();
            const { data: pastLogs } = await supabase
                .from('ai_intelligence_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(15);

            const rsiReport = await runRSIOptimization(pastLogs || []);

            // 生成された自律ルールを ai_knowledge テーブルに自動保存
            if (rsiReport?.autoGeneratedRules && Array.isArray(rsiReport.autoGeneratedRules)) {
                for (const rule of rsiReport.autoGeneratedRules) {
                    await supabase
                        .from('ai_knowledge')
                        .insert({
                            agent_key: rule.targetAgent,
                            content: rule.ruleText
                        });
                }
            }

            return NextResponse.json({
                success: true,
                data: { rsiReport }
            });
        }

        // 11. 全AI一斉調査（階層型フルパイプライン実行）
        if (action === 'all') {
            const supabase = await createClient();
            const { data: pastLogs } = await supabase
                .from('ai_intelligence_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(15);

            // [Step 1] 6名リサーチャー ＋ IGアナリスト ＋ Xアナリスト ＋ 的中実績エンジンを並行実行[cite: 1]
            const [
                trendUS, trendEU, trendAsia,
                sayaUS, sayaEU, sayaAsia,
                accountReport,
                xAccountReport,
                proofPackage
            ] = await Promise.all([
                runMarketTrend('us'),
                runMarketTrend('eu'),
                runMarketTrend('asia'),
                runSayaAnalysis('us'),
                runSayaAnalysis('eu'),
                runSayaAnalysis('asia'),
                runAccountAnalysis(),
                runXAccountAnalysis(),
                runHitProofEngine(pastLogs || [])
            ]);

            const trendInsights = { us: trendUS, eu: trendEU, asia: trendAsia };
            const profitableCards = { us: sayaUS, eu: sayaEU, asia: sayaAsia };

            // [Step 2] チーフマネージャーが最優秀案件を審査・パッケージ化[cite: 1]
            const chiefPackage = await runChiefManager(trendInsights, profitableCards);

            // [Step 3] チーフ指示書と各SNSアナリスト戦術に基づき、クリエイターが並行作成[cite: 1]
            const [snsPosts, xPosts, salesDM] = await Promise.all([
                runSnsPosts(chiefPackage, accountReport),
                runXPosts(chiefPackage, xAccountReport),
                runSalesDM(chiefPackage)
            ]);

            const fullData = {
                trendInsights,
                profitableCards,
                chiefPackage,
                proofPackage,
                accountInsights: accountReport,
                xAccountInsights: xAccountReport,
                snsPosts,
                xPosts,
                salesDM
            };

            const { data: savedRecord } = await supabase
                .from('ai_intelligence_logs')
                .insert({
                    trend_insights: trendInsights,
                    profitable_cards: profitableCards,
                    chief_package: chiefPackage,
                    account_insights: accountReport,
                    x_account_insights: xAccountReport,
                    sns_posts: snsPosts,
                    x_posts: xPosts,
                    sales_dm: salesDM,
                    trigger_type: body.triggerType || 'manual'
                })
                .select('id')
                .single();

            return NextResponse.json({
                success: true,
                data: fullData,
                savedRecordId: savedRecord?.id
            });
        }

        return NextResponse.json({ success: false, error: '不正なアクションです' }, { status: 400 });
    } catch (e: any) {
        console.error('API Error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}