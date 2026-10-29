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
            focus: '日本先行発売（1〜3ヶ月）に伴うタイムラグ先行需要、海外大会メタ入り後の日本語版ハイレアリティ(SAR/SR/UR)投資流入'[cite: 1]
        },
        eu: {
            name: '欧州市場（イギリス・ドイツ・フランス等）',
            targets: 'Cardmarket (EU), eBay UK/DE',
            focus: '多言語版差異、PSA10鑑定品の欧州コレクタープレミアム、日本限定ジムプロモ・ポケセン限定サプライの希少性'[cite: 1]
        },
        asia: {
            name: 'アジア市場（台湾・香港・韓国・東南アジア）',
            targets: 'Shopee, 現地専門店, 各国コミュニティ',
            focus: '女性サポートSRの熱量、日本限定プロモやピカチュウ/リザードン等の限定品の投資資金流入'[cite: 1]
        }
    };

    const cur = regionContexts[region];
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        temperature: 0.2,
    });

    const prompt = `あなたは【${cur.name}】専属の日本語版ポケモンカード市場トレンドアナリストです[cite: 1]。
監視スコープ: ${cur.targets}
主要着目点: ${cur.focus}[cite: 1]

設計書のルールに従い、以下の3点観測（クロスチェック）および自己反証（悪魔の代弁者）を行い、推奨する高騰予測銘柄を1件選定してください[cite: 1]。
1. 先行・限定視点: 海外未発売の先行需要または日本限定の希少性[cite: 1]
2. アート・レアリティ視点: 女性サポートSR、人気ポケモン、人気イラストレーター等の需要[cite: 1]
3. ソーシャル・熱量視点: 現地インフルエンサーの言及・議論熱量[cite: 1]

必ず以下のJSON形式のみを出力してください（Markdownのバッククォート不要）:
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
        us: {
            name: '北米市場（日米アービトラージ）',
            currency: 'USD',
            feeRate: '約13% (eBay)',
            shipping: 'FedEx 約2,500円〜3,500円'
        },
        eu: {
            name: '欧州市場（日欧アービトラージ）',
            currency: 'EUR',
            feeRate: '約10% (Cardmarket/eBay)',
            shipping: 'EMS/国際特定記録 約3,000円〜4,500円 (VAT等留意)'
        },
        asia: {
            name: 'アジア市場（日亜アービトラージ）',
            currency: 'USD/HKD',
            feeRate: '約8〜12%',
            shipping: '日本郵便/EMS 約1,800円〜2,800円'
        }
    };

    const cur = regionContexts[region];
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        temperature: 0.1,
    });

    const prompt = `あなたは【${cur.name}】専属のアービトラージ（サヤ抜き）アナリストです[cite: 1]。
対象通貨: ${cur.currency}、プラットフォーム手数料: ${cur.feeRate}、送料目安: ${cur.shipping}。

【厳格ルール】[cite: 1]
1. 状態（PSA10 / PSA9 / 未開封BOX / 未鑑定NM）を厳密に一致させて利益計算すること[cite: 1]。
2. 直近の成約価格（Sold Listings）を基準とすること[cite: 1]。
3. 実質純利益（Net ROI: 手数料・送料・為替を控除した実利益）を明記すること[cite: 1]。

必ず以下のJSON形式のみを出力してください（Markdownのバッククォート不要）:
{
  "title": "【${region.toUpperCase()}利ざや】対象カード名・BOX名（状態完全一致）",
  "claim": "1件あたりの実質純利益 ¥XX,XXX / $XXX (Net ROI: XX%) の即時仕入れ・販売判断",
  "reasons": [
    "国内仕入れ価格の安定性",
    "現地プラットフォームでの直近7〜14日成約実績",
    "為替リスクを織り込んだ利益マージン"
  ],
  "facts": [
    { "label": "国内仕入れ価格", "value": "¥XX,XXX (メルカリ/スニダン)" },
    { "label": "現地実成約価格", "value": "${cur.currency} XXX (Sold)" },
    { "label": "想定諸経費計", "value": "¥X,XXX (手数料${cur.feeRate}＋送料)" },
    { "label": "実質純利益 (Net)", "value": "¥XX,XXX (ROI: XX%)" }
  ],
  "soWhat": "自社代理購入サービスを通じた直送手配での成約余地と推奨オファー",
  "riskAndMitigation": {
    "risk": "為替変動や配送遅延による相場反落リスク",
    "mitigation": "受発注のリアルタイム化または即時買い付け指示"
  },
  "verificationChecklist": [
    "PSA10のケース傷・状態一致確認",
    "直近7日以内の成約履歴中央値の照合",
    "EMS/FedExの適用サイズ・重量確認"
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// ---------------------------------------------------------
// 3. IGアナリスト（自社アカウント分析）
// ---------------------------------------------------------
async function runAccountAnalysis() {
    const rawInsights = await getInstagramInsights(5);
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        temperature: 0.2,
    });

    const prompt = `あなたは越境トレカ販売事業の専任IGアナリストです[cite: 1]。
直近のInstagramデータ: ${JSON.stringify(rawInsights)}

設計書の「答えを教えない撒き餌設計（FactとResultのみ提示し、Action/Reasonは伏せてVIP Discordや自社サイトへ誘導）」に基づき[cite: 1]、
現在のアカウント傾向と改善戦術を分析してください。

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
  "soWhat": "次回のSNSクリエイターへの指示ルール（ハッシュタグ、フック構成、改行数）",
  "riskAndMitigation": {
    "risk": "アルゴリズム変更によるリーチ低下",
    "mitigation": "カルーセルスライド複数枚化による滞在時間の向上"
  },
  "verificationChecklist": [
    "プロフURL（自社サイト・Discord導線）の計測タグ確認",
    "保存率の高いスライド構成のテンプレ化"
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// ---------------------------------------------------------
// 4. SNSクリエイター（撒き餌投稿パッケージ）
// ---------------------------------------------------------
async function runSnsPosts(trends: any, profits: any, accountReport: any) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        temperature: 0.3,
    });

    const prompt = `あなたはSNS投稿クリエイターです[cite: 1]。
市場トレンドデータ(米欧亜): ${JSON.stringify(trends)}
サヤ抜き利ざやデータ(米欧亜): ${JSON.stringify(profits)}
IGアナリスト指示: ${JSON.stringify(accountReport)}

設計書の原則「答えを教えない『撒き餌』設計（FactとResultのみ提示し、ReasonとActionは秘匿してDiscordまたは自社サイトへ誘導）」に従い[cite: 1]、Instagram用キャプションを3パターン作成してください。

以下のJSON形式のみを出力してください:
{
  "theme": "今週のメイン撒き餌テーマ",
  "recommendedTiming": "推奨投稿日時 (例: 火曜 21:00 JST)",
  "visualGuideline": {
    "coverSlide": "1枚目（表紙）に掲載する強烈なインパクト画像・見出しテキストの指示",
    "carouselSlides": [
      "2枚目: 日米・日欧の価格差グラフまたは実成約画面",
      "3枚目: 差額の事実（Fact & Resultのみ）",
      "4枚目: 誘導スライド（Action/Reasonの案内）"
    ]
  },
  "posts": {
    "hybridPost": "推奨ハイブリッド投稿キャプション全文（ハッシュタグ、CTA含む）",
    "arbitragePost": "タイプA: 確定利ざや特化投稿キャプション全文[cite: 1]",
    "trendPost": "タイプB: 市場トレンド・先回り特化投稿キャプション全文[cite: 1]"
  },
  "discordCTA": "投稿末尾に配置するVIP Discordおよび自社サイトへの誘導文"[cite: 1]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// ---------------------------------------------------------
// 5. 有料コミュニティ担当（大口オファー・実務商談）
// ---------------------------------------------------------
async function runSalesDM(trends: any, profits: any) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        temperature: 0.2,
    });

    const prompt = `あなたはVIPコミュニティ（Discord）および大口バイヤー専任の担当AIです[cite: 1]。
トレンド情報: ${JSON.stringify(trends)}
アービトラージ情報: ${JSON.stringify(profits)}

自社代理購入サービスを通じた直送手配を成約させるための、具体的かつプロフェッショナルな実務オファーを作成してください[cite: 1]。

以下のJSON形式のみを出力してください:
{
  "targetSegment": "想定ターゲット（北米・欧州の大口セラー/コレクター）",
  "offerSummary": "オファー概要（即時直送手配・ロット確保）",
  "discordMessage": "Discord大口バイヤー向けチャンネル投稿文全文（商条件・決済方法・直送メリットを明記）",
  "commercialTerms": {
    "minimumOrderQty": "最低ロット条件 (例: 3枚〜 / 未開封2BOX〜)",
    "shippingMethod": "FedEx Priority / EMS 追跡付き直送",
    "paymentMethod": "PayPal / Wise送金"
  },
  "negotiationTip": "価格交渉やロット交渉が入った際の事前対策ガイダンス"
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

        // 3. IGアナリスト単体実行
        if (action === 'account') {
            const accountReport = await runAccountAnalysis();
            return NextResponse.json({
                success: true,
                data: { accountInsights: accountReport }
            });
        }

        // 4. SNS原稿単体実行
        if (action === 'sns') {
            const snsPosts = await runSnsPosts(
                currentData?.trendInsights,
                currentData?.profitableCards,
                currentData?.accountInsights
            );
            return NextResponse.json({
                success: true,
                data: { snsPosts }
            });
        }

        // 5. 有料コミュニティ営業文単体実行
        if (action === 'dm') {
            const salesDM = await runSalesDM(
                currentData?.trendInsights,
                currentData?.profitableCards
            );
            return NextResponse.json({
                success: true,
                data: { salesDM }
            });
        }

        // 6. 全AI一斉調査（並列実行）
        if (action === 'all') {
            const [
                trendUS, trendEU, trendAsia,
                sayaUS, sayaEU, sayaAsia,
                accountReport
            ] = await Promise.all([
                runMarketTrend('us'),
                runMarketTrend('eu'),
                runMarketTrend('asia'),
                runSayaAnalysis('us'),
                runSayaAnalysis('eu'),
                runSayaAnalysis('asia'),
                runAccountAnalysis()
            ]);

            const trendInsights = { us: trendUS, eu: trendEU, asia: trendAsia };
            const profitableCards = { us: sayaUS, eu: sayaEU, asia: sayaAsia };

            const [snsPosts, salesDM] = await Promise.all([
                runSnsPosts(trendInsights, profitableCards, accountReport),
                runSalesDM(trendInsights, profitableCards)
            ]);

            const fullData = {
                trendInsights,
                profitableCards,
                accountInsights: accountReport,
                snsPosts,
                salesDM
            };

            // DBへ保存
            const supabase = await createClient();
            const { data: savedRecord } = await supabase
                .from('ai_intelligence_logs')
                .insert({
                    trend_insights: trendInsights,
                    profitable_cards: profitableCards,
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