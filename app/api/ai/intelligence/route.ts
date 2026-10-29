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
    "instagramAngle": "Instagramクリエイターに対するカルーセル構成・画像レイアウト・トーン指示",
    "discordOfferAngle": "有料コミュニティ担当に対するロット数・直送手配オファーの落とし込み指示"
  }
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// ---------------------------------------------------------
// 4. IGアナリスト（自社アカウント分析）
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
  "soWhat": "次回のSNSクリエイターへの指示ルール",
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
// 5. SNSクリエイター（チーフ指示書に基づく撒き餌作成）
// ---------------------------------------------------------
async function runSnsPosts(chiefPackage: any, accountReport: any) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.3,
    });

    const prompt = `あなたはSNS投稿クリエイターです。
チーフマネージャーからの指示書:
${JSON.stringify(chiefPackage)}

IGアナリスト指示:
${JSON.stringify(accountReport)}

【絶対ルール】
- チーフマネージャーが選定した案件（${chiefPackage?.chosenCardOrItem || '選定案件'}）を中心に投稿を構成すること。
- 答えを教えない撒き餌設計: 事実（Fact）と結果（Result）のみを伝え、具体的な国内仕入れルートや手配手順（Reason/Action）は伏せること。
- 詳細情報や高騰フルレポートは「VIP Discord」へ、即時直送手配・購入依頼は「自社サイト」へ誘導する明確なマルチ導線（CTA）を末尾に配置すること。

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
// 6. 有料コミュニティ担当（チーフ指示書に基づく実務オファー）
// ---------------------------------------------------------
async function runSalesDM(chiefPackage: any) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const prompt = `あなたはVIPコミュニティ（Discord）専任の担当AIです。
チーフマネージャーからの指示書:
${JSON.stringify(chiefPackage)}

チーフが選定した案件（${chiefPackage?.chosenCardOrItem || '選定案件'}）に基づき、大口バイヤーやVIP会員が自社代理購入サービスへ発注したくなる成約オファー文を作成してください。

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
// 7. 的中実績・証明投稿エンジン（タイプC：社会的証明・権威性構築）
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

    const prompt = `あなたは越境トレカ代理購入組織のチーフ直下に組み込まれた【的中実績・証明投稿エンジン】です[cite: 1]。
設計書第5章に基づき、過去に蓄積されたトレンド予測履歴と現在の海外市場実相場を照合し、
実際に高騰が的中したキラー実績を1件特定して「タイプC（的中実績・証明投稿）」パッケージを作成してください[cite: 1]。

【過去の予測ストック履歴】:
${JSON.stringify(pastPredictions).slice(0, 3000)}

【設計書ルール（タイプC）】[cite: 1]:
1. 内容: 過去に予測した銘柄の「当時の予測画面・当時の価格」と「現在の高騰した海外相場」を比較対比させる[cite: 1]。
2. 目的: 「この組織の予測は本当に当たる」という圧倒的な社会的証明（Social Proof）と権威性を確立する[cite: 1]。
3. 誘導フック: 「次の波に乗り遅れたくない方、本当に当たる一次情報を受け取りたい方は有料VIP Discordへ」を主軸とする[cite: 1]。

必ず以下のJSON形式のみを出力してください:
{
  "cardName": "的中したカード名・商品名",
  "predictedDate": "予測時期 (例: 3週間前 / 2026年9月上旬)",
  "predictedPrice": "当時の相場 ($XXX / ¥XX,XXX)",
  "currentPrice": "現在の海外成約相場 ($XXX / ¥XX,XXX)",
  "growthRate": "急騰上昇率 (例: +45.8%)",
  "hitReasonPattern": "的中要因 (先行需要 / コレクター波及 / 日本限定希少性)[cite: 1]",
  "proofPost": "タイプC投稿キャプション全文（当時の予測事実と現在の急騰結果を並べ、圧倒的な証拠を提示するテキスト。ハッシュタグ含む）[cite: 1]",
  "visualGuideline": {
    "beforeImageDesc": "左側/1枚目: 当時の予測レポート画面のキャプチャ指示",
    "afterImageDesc": "右側/2枚目: 現在の海外実成約（Sold Listings）急騰画面のスクショ指示",
    "comparisonLayout": "ビフォーアフター対比レイアウト指示"
  },
  "discordCTA": "今後の先行一次情報を受け取るためのVIP Discord誘導文"[cite: 1]
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

        // 5. SNS原稿単体実行
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

        // 6. 有料コミュニティ営業文単体実行
        if (action === 'dm') {
            const salesDM = await runSalesDM(currentData?.chiefPackage);
            return NextResponse.json({
                success: true,
                data: { salesDM }
            });
        }

        // 7. 的中実績・証明投稿（タイプC）単体生成
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

        // 8. 全AI一斉調査（階層型パイプライン実行）
        if (action === 'all') {
            const supabase = await createClient();
            const { data: pastLogs } = await supabase
                .from('ai_intelligence_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(15);

            // [Step 1] 6名のリサーチャー ＋ IGアナリスト ＋ 的中実績エンジンを並行実行[cite: 1]
            const [
                trendUS, trendEU, trendAsia,
                sayaUS, sayaEU, sayaAsia,
                accountReport,
                proofPackage
            ] = await Promise.all([
                runMarketTrend('us'),
                runMarketTrend('eu'),
                runMarketTrend('asia'),
                runSayaAnalysis('us'),
                runSayaAnalysis('eu'),
                runSayaAnalysis('asia'),
                runAccountAnalysis(),
                runHitProofEngine(pastLogs || [])
            ]);

            const trendInsights = { us: trendUS, eu: trendEU, asia: trendAsia };
            const profitableCards = { us: sayaUS, eu: sayaEU, asia: sayaAsia };

            // [Step 2] チーフマネージャーが最優秀案件を審査・パッケージ化[cite: 1]
            const chiefPackage = await runChiefManager(trendInsights, profitableCards);

            // [Step 3] チーフ指示書に基づきSNS担当と営業担当が作成[cite: 1]
            const [snsPosts, salesDM] = await Promise.all([
                runSnsPosts(chiefPackage, accountReport),
                runSalesDM(chiefPackage)
            ]);

            const fullData = {
                trendInsights,
                profitableCards,
                chiefPackage,
                proofPackage,
                accountInsights: accountReport,
                snsPosts,
                salesDM
            };

            const { data: savedRecord } = await supabase
                .from('ai_intelligence_logs')
                .insert({
                    trend_insights: trendInsights,
                    profitable_cards: profitableCards,
                    chief_package: chiefPackage,
                    account_insights: accountReport,
                    sns_posts: snsPosts,
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