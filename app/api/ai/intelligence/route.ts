// app/api/ai/intelligence/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runMarketTrend } from './agents/marketTrend';
import { runSayaAnalysis } from './agents/arbitrage';
import { runChiefManager } from './agents/chiefManager';
import { runAccountAnalysis, runXAccountAnalysis } from './agents/snsAccount';
import { runSnsPosts, runXPosts } from './agents/contentCreator';
import { runSalesDM } from './agents/salesDM';
import { runHitProofEngine } from './agents/proofEngine';
import { runRSIOptimization } from './agents/rsiOptimizer';

export const maxDuration = 60;

// GET: 履歴取得
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');

        const supabase = await createClient();
        let query = supabase
            .from('ai_intelligence_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (category) {
            query = query.eq('category', category);
        }

        const { data: history, error } = await query;
        if (error) throw error;
        return NextResponse.json({ success: true, history: history || [] });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

// POST: 各種エージェント実行
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, currentData, region, category = 'pokemon' } = body;
        const targetRegion = (region as 'us' | 'eu' | 'asia') || 'us';

        // 1. 市場トレンドアナリスト単体実行
        if (action === 'trend') {
            const report = await runMarketTrend(targetRegion, category);
            const currentTrends = currentData?.trendInsights || { us: null, eu: null, asia: null };
            return NextResponse.json({
                success: true,
                data: { trendInsights: { ...currentTrends, [targetRegion]: report } }
            });
        }

        // 2. アービトラージアナリスト単体実行
        if (action === 'arbitrage') {
            const report = await runSayaAnalysis(targetRegion, category);
            const currentProfits = currentData?.profitableCards || { us: null, eu: null, asia: null };
            return NextResponse.json({
                success: true,
                data: { profitableCards: { ...currentProfits, [targetRegion]: report } }
            });
        }

        // 3. チーフマネージャー単体選定
        if (action === 'chief') {
            const chiefPackage = await runChiefManager(
                currentData?.trendInsights,
                currentData?.profitableCards,
                category
            );
            return NextResponse.json({ success: true, data: { chiefPackage } });
        }

        // 4. IGアナリスト単体実行
        if (action === 'account') {
            const accountReport = await runAccountAnalysis(category);
            return NextResponse.json({ success: true, data: { accountInsights: accountReport } });
        }

        // 5. Xアナリスト単体実行
        if (action === 'x_account') {
            const xAccountReport = await runXAccountAnalysis();
            return NextResponse.json({ success: true, data: { xAccountInsights: xAccountReport } });
        }

        // 6. Instagram原稿単体実行
        if (action === 'sns') {
            const snsPosts = await runSnsPosts(currentData?.chiefPackage, currentData?.accountInsights, category);
            return NextResponse.json({ success: true, data: { snsPosts } });
        }

        // 7. X原稿単体実行
        if (action === 'x' || action === 'x_posts') {
            const xPosts = await runXPosts(currentData?.chiefPackage, currentData?.xAccountInsights, category);
            return NextResponse.json({ success: true, data: { xPosts } });
        }

        // 8. 有料コミュニティ営業文単体実行
        if (action === 'dm') {
            const salesDM = await runSalesDM(currentData?.chiefPackage);
            return NextResponse.json({ success: true, data: { salesDM } });
        }

        // 9. 的中実績（タイプC）単体生成
        if (action === 'proof') {
            const supabase = await createClient();
            const { data: pastLogs } = await supabase
                .from('ai_intelligence_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(15);

            const proofPackage = await runHitProofEngine(pastLogs || []);
            return NextResponse.json({ success: true, data: { proofPackage } });
        }

        // 10. RSI（再帰的自己改善）自律評価
        if (action === 'rsi') {
            const supabase = await createClient();
            const { data: pastLogs } = await supabase
                .from('ai_intelligence_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(15);

            const rsiReport = await runRSIOptimization(pastLogs || []);

            if (rsiReport?.autoGeneratedRules && Array.isArray(rsiReport.autoGeneratedRules)) {
                for (const rule of rsiReport.autoGeneratedRules) {
                    await supabase
                        .from('ai_knowledge')
                        .insert({ agent_key: rule.targetAgent, content: rule.ruleText });
                }
            }

            return NextResponse.json({ success: true, data: { rsiReport } });
        }

        // 11. 全AI一斉調査（フルパイプライン）
        if (action === 'all') {
            const supabase = await createClient();
            const { data: pastLogs } = await supabase
                .from('ai_intelligence_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(15);

            // [Step 1] 6名リサーチャー ＋ IG/Xアナリスト ＋ 的中実績エンジン
            const [
                trendUS, trendEU, trendAsia,
                sayaUS, sayaEU, sayaAsia,
                accountReport,
                xAccountReport,
                proofPackage
            ] = await Promise.all([
                runMarketTrend('us', category),
                runMarketTrend('eu', category),
                runMarketTrend('asia', category),
                runSayaAnalysis('us', category),
                runSayaAnalysis('eu', category),
                runSayaAnalysis('asia', category),
                runAccountAnalysis(category),
                runXAccountAnalysis(),
                runHitProofEngine(pastLogs || [])
            ]);

            const trendInsights = { us: trendUS, eu: trendEU, asia: trendAsia };
            const profitableCards = { us: sayaUS, eu: sayaEU, asia: sayaAsia };

            // [Step 2] チーフマネージャーによる最優秀選定
            const chiefPackage = await runChiefManager(trendInsights, profitableCards, category);

            // [Step 3] クリエイター陣による原稿制作
            const [snsPosts, xPosts, salesDM] = await Promise.all([
                runSnsPosts(chiefPackage, accountReport, category),
                runXPosts(chiefPackage, xAccountReport, category),
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
                    category,
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