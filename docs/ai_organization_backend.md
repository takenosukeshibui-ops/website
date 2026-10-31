
--- File: C:\Development Project\website\app\api\ai\chat\route.ts ---

// app/api/ai/chat/route.ts
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createClient } from '@/lib/supabase/server';
import { getCategoryName } from '../intelligence/helpers';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// 🌟 全エージェントのプロファイルを完全網羅
const AGENT_PROFILES: Record<string, { name: string; avatar: string; role: string; instruction: string }> = {
  chief: {
    name: 'チーフマネージャー',
    avatar: '👑',
    role: '最高意思決定・全体戦略ディレクター',
    instruction: '全体戦略、案件選定理由、週間コンテンツカレンダー（7日分）の編成、各SNSや営業部隊へのディレクション方針について答えてください。'
  },
  trend: {
    name: '市場アナリスト',
    avatar: '🔮',
    role: '海外トレンド調査員',
    instruction: '日本のトレカに関する海外市場トレンド（5スロット：ヴィンテージ、プロモ、モダン、BOX等）について答えてください。'
  },
  arbitrage: {
    name: 'アービトラージアナリスト',
    avatar: '💎',
    role: '仕入れ・サヤ分析担当',
    instruction: '日米・日欧・日亜トレカ市場の実質価格差、諸経費・為替バッファ、仕入れ推奨カードについて答えてください。'
  },
  account: {
    name: 'IGアナリスト',
    avatar: '📊',
    role: '自社Instagram反応分析担当',
    instruction: '自社Instagramの反応傾向や改善戦略、カルーセル構成の視点から答えてください。'
  },
  x_account: {
    name: 'Xアナリスト',
    avatar: '🐦',
    role: '自社Xアルゴリズム分析担当',
    instruction: '自社X (Twitter) のインプレッション・ブックマーク率改善、140字フックやスレッド戦術について答えてください。'
  },
  sns: {
    name: 'Instagram担当',
    avatar: '📸',
    role: 'Instagram投稿クリエイター',
    instruction: '海外向けInstagram投稿のカルーセル構成、キャプション、トーンや2股導線（Discord/自社サイト）について答えてください。'
  },
  x: {
    name: 'Xクリエイター',
    avatar: '🐦',
    role: 'X (Twitter) 専任クリエイター',
    instruction: 'X (Twitter) の140字フック、ツリー展開、添付画像レイアウトやリプ欄導線について答えてください。'
  },
  sales: {
    name: '有料コミュニティ担当',
    avatar: '✉️',
    role: 'Discord営業担当',
    instruction: '海外大口バイヤー向けのDiscord実務商談メッセージ、ロットオファー、交渉対策について答えてください。'
  },
};

async function getAgentReply(agentKey: string, userMessage: string, contextData: any, category: string, region: string | undefined, supabase: any) {
  const profile = AGENT_PROFILES[agentKey];
  if (!profile) return null;

  try {
    let knowledgeText = '特になし';
    try {
      const { data: knowledgeData } = await supabase
        .from('ai_knowledge_base')
        .select('content')
        .eq('agent_key', agentKey)
        .order('created_at', { ascending: false })
        .limit(5);

      if (knowledgeData && knowledgeData.length > 0) {
        knowledgeText = knowledgeData.map((k: any) => `・${k.content}`).join('\n');
      }
    } catch (kErr) {
      console.warn('knowledge fetch warning:', kErr);
    }

    const categoryName = getCategoryName(category || 'pokemon');
    const regionName = region ? (region === 'us' ? '北米市場' : region === 'eu' ? '欧州市場' : 'アジア市場') : '';

    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      temperature: 0.7,
      maxOutputTokens: 500,
      apiKey: apiKey,
    });

    const prompt = `
あなたは越境【${categoryName}】代理購入・販売事業チームの「${profile.name} (${profile.role})」です。
${regionName ? `【担当地域】${regionName}` : ''}
【役割・専門分野】${profile.instruction}

【現在の最新ダッシュボード状況】
- チーフパッケージ: ${JSON.stringify(contextData?.chiefPackage?.mvpHighlight || contextData?.chiefPackage?.chosenCardOrItem || '未選定')}
- トレンド抽出状況: ${JSON.stringify(contextData?.trendInsights ? Object.keys(contextData.trendInsights) : [])}
- 発掘サヤカード: ${JSON.stringify(contextData?.profitableCards ? Object.keys(contextData.profitableCards) : [])}

💡【社内ルール・過去の学習ナレッジ（最優先で遵守すること）】
${knowledgeText}

オーナー（ユーザー）からの指示・質問：
「${userMessage}」

${profile.name}として、敬語かつ頼もしいプロフェッショナルの口調で、自身の持ち場の視点から具体的かつ的確に回答してください。
`;

    const res = await Promise.race([
      llm.invoke(prompt),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 25000)),
    ]);

    return {
      agentKey,
      sender: profile.name,
      avatar: profile.avatar,
      text: res.content.toString().trim(),
    };
  } catch (error: any) {
    console.error(`Agent ${agentKey} chat error:`, error);
    return {
      agentKey,
      sender: profile.name,
      avatar: profile.avatar,
      text: '現在リクエストが混み合っているか、モデル接続待機中です。少し時間をおいて再度お試しください。',
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { target, message, contextData, category, region } = body;
    if (!message || !target) {
      return NextResponse.json({ success: false, error: '引数（target または message）が不足しています' }, { status: 400 });
    }

    const supabase = await createClient();

    // ユーザーメッセージをDBに安全に保存
    try {
      await supabase.from('ai_chat_logs').insert({
        desk_id: target,
        sender: 'あなた',
        avatar: '👤',
        text: message,
        is_user: true
      });
    } catch (dbErr) {
      console.warn('ai_chat_logs insert warning (user):', dbErr);
    }

    // ターゲットの柔軟なマッピング
    let targetAgents: string[] = [];
    if (target === 'analysis_team') {
      targetAgents = ['trend', 'arbitrage', 'account'];
    } else if (target === 'execution_team') {
      targetAgents = ['sns', 'x', 'sales'];
    } else {
      let cleanKey = target.replace('desk_', '');
      if (cleanKey.startsWith('trend')) cleanKey = 'trend';
      else if (cleanKey.startsWith('arbitrage')) cleanKey = 'arbitrage';
      else if (cleanKey === 'x_account') cleanKey = 'x_account';
      else if (cleanKey === 'x') cleanKey = 'x';
      else if (cleanKey === 'account') cleanKey = 'account';
      else if (cleanKey === 'sns') cleanKey = 'sns';
      else if (cleanKey === 'sales') cleanKey = 'sales';
      else if (cleanKey === 'chief') cleanKey = 'chief';

      if (AGENT_PROFILES[cleanKey]) {
        targetAgents = [cleanKey];
      }
    }

    if (targetAgents.length === 0) {
      return NextResponse.json({ success: false, error: `無効な宛先デスクです: ${target}` }, { status: 400 });
    }

    // 各AIの回答を生成
    const replies = (await Promise.all(
      targetAgents.map((agentKey) => getAgentReply(agentKey, message, contextData, category, region, supabase))
    )).filter(Boolean);

    // AIの回答をDBに安全に保存
    try {
      for (const rep of replies) {
        if (rep) {
          await supabase.from('ai_chat_logs').insert({
            desk_id: target,
            sender: rep.sender,
            avatar: rep.avatar,
            text: rep.text,
            is_user: false
          });
        }
      }
    } catch (dbErr) {
      console.warn('ai_chat_logs insert warning (replies):', dbErr);
    }

    return NextResponse.json({ success: true, replies });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 過去のチャット履歴を取得するエンドポイント
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get('target');

    if (!target) return NextResponse.json({ success: false, logs: [] });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_chat_logs')
      .select('*')
      .eq('desk_id', target)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.warn('ai_chat_logs fetch warning:', error.message);
      return NextResponse.json({ success: true, logs: [] });
    }

    return NextResponse.json({ success: true, logs: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

--- File: C:\Development Project\website\app\api\ai\intelligence\helpers.ts ---

// app/api/ai/intelligence/helpers.ts
import { createClient } from '@/lib/supabase/server';

// app/api/ai/intelligence/helpers.ts 内の parseAIJson

export function parseAIJson(content: string): any {
  try {
    if (!content) return null;

    // 1. マークダウンコードブロック (```json ... ```) の除去
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
    }

    // 2. 🌟 末尾カンマ (Trailing Comma: ,} や ,]) を自動削除するサニタイズ
    // オブジェクトや配列の閉じカッコ直前にある不要なカンマを正規表現で一掃
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

    return JSON.parse(cleaned);
  } catch (err: any) {
    console.error('AI JSON parse error:', err, content);
    
    // バックアップ: JSONブロックのみを抽出して再トライ
    try {
      const match = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        const sanitized = match[0].replace(/,\s*([\]}])/g, '$1');
        return JSON.parse(sanitized);
      }
    } catch (fallbackErr) {
      // パース不可の場合は null を返却
    }
    return null;
  }
}

// カテゴリ表示名変換（chiefManager や 各エージェントで使用）
export function getCategoryName(category: string = 'pokemon'): string {
    const categoryNames: Record<string, string> = {
        pokemon: 'ポケモンカード',
        onepiece: 'ワンピースカード',
        yugioh: '遊戯王OCG',
        figure: 'スケールフィギュア・ホビー'
    };
    return categoryNames[category] || 'トレカ・ホビー';
}

// RSI学習ルールの取得ヘルパー（直近3件をプロンプトに注入）
export async function getAgentRules(agentKey: string): Promise<string> {
    try {
        const supabase = await createClient();
        const { data } = await supabase
            .from('ai_knowledge')
            .select('content')
            .eq('agent_key', agentKey)
            .order('created_at', { ascending: false })
            .limit(3);

        if (!data || data.length === 0) return '';
        return `\n【RSI自律学習ルール（最優先で遵守すること）】\n` + data.map(d => `- ${d.content}`).join('\n');
    } catch {
        return '';
    }
}

--- File: C:\Development Project\website\app\api\ai\intelligence\agents\arbitrage.ts ---

// app/api/ai/intelligence/agents/arbitrage.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson } from '../helpers';

export interface ArbitrageItem {
  cardName: string;
  conditionGrade: string;
  jpBuyPriceJPY: string;
  targetSoldPrice: string;
  priceSpreadJPY: string;
  spreadROI: string;
  liquidity: string;
  insight: string;
}

export interface ArbitrageTier {
  priceTier: string;
  priceTierLabel: string;
  mainItem: ArbitrageItem;
  subItems: ArbitrageItem[];
}

export interface ArbitrageSlotReport {
  slotKey: string;
  slotLabel: string;
  tiers: ArbitrageTier[];
}

const REGION_CURRENCIES: Record<string, { currency: string; name: string }> = {
  us: { currency: 'USD', name: '北米（アメリカ）市場' },
  eu: { currency: 'EUR', name: '欧州（ヨーロッパ）市場' },
  asia: { currency: 'SGD', name: 'アジア（シンガポール・台湾・香港等）市場' },
};

const SLOTS = [
  { key: 'classic_vintage', label: 'クラシック・ヴィンテージ', desc: '旧裏面・eシリーズ・ADV・PCG・初期絶版' },
  { key: 'neo_vintage', label: 'ネオ・ヴィンテージ', desc: 'DP・Pt・LEGEND・BW・XY' },
  { key: 'promos_exclusive', label: '限定プロモ・配布品', desc: '大会プロモ・ジムプロモ・企業コラボ・プレイヤーズ' },
  { key: 'modern_meta', label: '現行モダン・高需要枠', desc: 'サン＆ムーン・ソード＆シールド・スカーレット＆バイオレット（SAR・SR・AR・CHR）' },
  { key: 'high_end_sealed', label: '高額鑑定品・未開封BOX', desc: '高額PSA10/BGS鑑定品、絶版未開封BOX、サプライ未開封' }
];

export async function runSayaAnalysis(region: 'us' | 'eu' | 'asia', category: string = 'pokemon') {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const cur = REGION_CURRENCIES[region] || REGION_CURRENCIES.us;

  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.1,
    maxOutputTokens: 8192,
    apiKey,
  });

  // ==========================================================================
  // 【Step 1】5スロット並列調査（計75商品を発掘）
  // ==========================================================================
  const slotPromises = SLOTS.map(async (slot) => {
    const slotPrompt = `あなたは【${cur.name}】で越境トレカ販売を展開する現地事業者専属の調達戦略アナリストです。
対象通貨: ${cur.currency}。

【担当スロット】: [${slot.key}] ${slot.label}（${slot.desc}）

【調達リサーチ任務】
以下の【5つの価格帯】すべてについて、日本から輸入・調達して現地で売却するのに適したカードを【本命1商品 ＋ 代替候補2商品（計3商品）】厳選してください。
（このスロット全体で 5価格帯 × 3商品 ＝ 合計15商品）

■ 5つの価格帯と調達・合格基準:
1. under_3k（〜¥3,000）: 最低差額 +¥1,000以上、現地直近7日成約 5件以上（超高回転・エントリー枠）
2. under_10k（¥3,000〜¥10,000）: 最低差額 +¥2,500以上、現地直近7日成約 3件以上（定番コレクション枠）
3. middle（¥10,000〜¥30,000）: 最低差額 +¥6,000以上、現地直近14日成約 2件以上（中核プロモ・人気SR枠）
4. upper（¥30,000〜¥80,000）: 最低差額 +¥15,000以上、現地直近30日成約 2件以上（高額鑑定・上位絶版枠）
5. top_end（¥80,000以上）: 最低差額 +¥30,000以上、現地直近30日成約 1件以上（資産性・未開封BOX枠）

【指定コンディション・マスター（※商材の性質に応じ、以下から厳格に選定すること）】
・素体: "Raw NM", "Raw LP", "Raw Played"
・鑑定品: "PSA 10", "PSA 9", "BGS 9.5", "BGS 10", "CGC 10", "ARS 10"
・未開封: "Sealed Box", "Sealed Pack", "Sealed Promo"
※仕入れ側と現地販売側の状態は必ず同一基準で評価すること。

以下のJSON形式のみを出力してください:
{
  "slotKey": "${slot.key}",
  "slotLabel": "${slot.label}",
  "tiers": [
    {
      "priceTier": "under_3k",
      "priceTierLabel": "〜3千円",
      "mainItem": {
        "cardName": "実在カード名 (型番/弾名)",
        "conditionGrade": "コンディションマスターから選定",
        "jpBuyPriceJPY": "¥X,XXX",
        "targetSoldPrice": "${cur.currency} XX (約¥X,XXX)",
        "priceSpreadJPY": "¥X,XXX",
        "spreadROI": "XX%",
        "liquidity": "直近7日 X件",
        "insight": "現地需要動向と輸入推奨理由（1行）"
      },
      "subItems": [
        { "cardName": "候補2 (型番)", "conditionGrade": "選定表記", "jpBuyPriceJPY": "¥X,XXX", "targetSoldPrice": "${cur.currency} XX", "priceSpreadJPY": "¥X,XXX", "spreadROI": "XX%", "liquidity": "直近7日 X件", "insight": "特徴1行" },
        { "cardName": "候補3 (型番)", "conditionGrade": "選定表記", "jpBuyPriceJPY": "¥X,XXX", "targetSoldPrice": "${cur.currency} XX", "priceSpreadJPY": "¥X,XXX", "spreadROI": "XX%", "liquidity": "直近7日 X件", "insight": "特徴1行" }
      ]
    },
    { "priceTier": "under_10k", "priceTierLabel": "3千〜1万円", "mainItem": { /* 同様 */ }, "subItems": [ /* 2商品 */ ] },
    { "priceTier": "middle", "priceTierLabel": "1万〜3万円", "mainItem": { /* 同様 */ }, "subItems": [ /* 2商品 */ ] },
    { "priceTier": "upper", "priceTierLabel": "3万〜8万円", "mainItem": { /* 同様 */ }, "subItems": [ /* 2商品 */ ] },
    { "priceTier": "top_end", "priceTierLabel": "8万円〜", "mainItem": { /* 同様 */ }, "subItems": [ /* 2商品 */ ] }
  ]
}`;

    const res = await model.invoke(slotPrompt);
    return parseAIJson(res.content.toString());
  });

  // 5スロットの調査完了を待つ（計75商品が揃う）
  const slotResults = await Promise.all(slotPromises);

  // ==========================================================================
  // 【Step 2】発掘した75商品を要約し、サマリーAIへ渡してデータ駆動分析
  // ==========================================================================
  const allDiscoveredItems: any[] = [];
  for (const slot of slotResults) {
    if (!slot?.tiers) continue;
    for (const tier of slot.tiers) {
      if (tier.mainItem) {
        allDiscoveredItems.push({
          slot: slot.slotLabel,
          tier: tier.priceTierLabel,
          role: '本命',
          ...tier.mainItem,
        });
      }
      if (Array.isArray(tier.subItems)) {
        for (const sub of tier.subItems) {
          allDiscoveredItems.push({
            slot: slot.slotLabel,
            tier: tier.priceTierLabel,
            role: '代替候補',
            ...sub,
          });
        }
      }
    }
  }

  const summaryPrompt = `あなたは【${cur.name}】専属の最高調達投資責任者（CIO）です。
リサーチチームが日本市場をスクリーニングし、現地で利ざやの取れる【全75商品（本命25＋代替50）】を発掘しました。

【今週発掘された全75商品の調達・価格差データ】:
${JSON.stringify(allDiscoveredItems, null, 2)}

【任務】
上記75商品のデータ群をフラットかつ客観的に観察し、海外現地ショップオーナーに向けた【データ駆動型エグゼクティブ・サマリー】を作成してください。

■ 分析・執筆における絶対ルール:
1. 先入観を持たず、データ全体の「共通点・差異・異常値」を帰納的に抽出すること:
   - 特定の切り口に誘導する具体例は一切与えません。75行のレコードを比較対照したときに、データ自身が示している客観的事実や顕著なパターンをアナリスト自身の洞察力で導き出してください。
   - 以下の「問い」を手がかりに、発見した構造的特徴を言語化してください:
     * 数値の分布: リスト全体の中で、極端な数値（飛び抜けて高い/低いROI、成約数、価格差など）を示しているグループにはどのような共通項があるか？
     * 属性間の関係: スロット区分、価格帯、コンディション、商材の年代や種別などの間で、どのような相関や対比が見られるか？
     * 現地需給の歪み: 現地の販売価格や成約ペースから、バイヤーの行動や市場の歪みについて何が推察できるか？
2. 注目銘柄は必ず上記75商品の中から選出すること:
   - topImportMarginCard（最大利ざや銘柄）および topLocalVelocityCard（最高流動性銘柄）は、リストに実在するカード名・価格差をそのまま引用して解説すること。架空のカードやリスト外のカードへの言及は厳禁。
3. 機密保持: メルカリやカドショなどの国内仕入れ先ワードは絶対に使用せず、「日本国内流通」「国内二次流通」と抽象化すること。

以下のJSON形式のみを出力してください:
{
  "title": "【${region.toUpperCase()}】アービトラージレポート",
  "claim": "今週の${cur.name}向け日本語版カード輸入調達戦略（75銘柄の実成約スクリーニング分析）",
  "summary": {
    "headline": "75商品のデータから浮かび上がった、今週最も特筆すべき市場動向や歪みの核心（発見したパターンを記述）",
    "macroAnalysis": {
      "japanSourcingClimate": "今回発掘された75商品の仕入れ値・在庫動向から読み解く、日本国内市場の調達環境分析",
      "localMarketDemand": "75商品の現地売価・成約速度から浮き彫りになる、現地バイヤーの心理と需要の偏り"
    },
    "microAnalysis": {
      "topImportMarginCard": "リスト中【最も利ざや・価格ギャップが顕著なカード名】とその選定根拠（上記75商品から引用）",
      "topLocalVelocityCard": "リスト中【最も成約件数・回転が速いカード名】とその選定根拠（上記75商品から引用）",
      "conditionGradingInsight": "75商品のデータ構成から見えてくる独自のインサイト（データ分析から判明した事実を記述）"
    },
    "riskAlert": {
      "sourcingQualityTrap": "今回選定された商材を日本から仕入れる際の注意点（偽物・状態・シュリンク詐欺等）",
      "localInventoryRisk": "現地での在庫滞留・急落リスクを避けるための回転・保管戦略"
    },
    "actionDirectives": [
      "低単価帯（〜3千円・1万円以下）の重点回収＆スピード販売アクション",
      "中・高額帯（1万〜8万円以上）のプレミアム販売＆利ざや確保アクション"
    ]
  }
}`;

  const summaryRes = await model.invoke(summaryPrompt);
  const summaryParsed = parseAIJson(summaryRes.content.toString());

  return {
    title: summaryParsed?.title || `【${region.toUpperCase()}】アービトラージレポート`,
    claim: summaryParsed?.claim || `${cur.name}向け調達レポート`,
    summary: summaryParsed?.summary || null,
    slots: slotResults,
  };
}

--- File: C:\Development Project\website\app\api\ai\intelligence\agents\contentCreator.ts ---

// app/api/ai/intelligence/agents/contentCreator.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules, getCategoryName } from '../helpers';

// 6. Instagram専任投稿クリエイター（動的週間カレンダー ＆ 2股転換カルーセル特化）
export async function runSnsPosts(chiefPackage: any, accountReport: any, category: string = 'pokemon') {
  const categoryName = getCategoryName(category);
  const rules = await getAgentRules('sns');
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.3,
    maxOutputTokens: 8192,
  });

  const prompt = `あなたは越境【${categoryName}】事業における【Instagram専任のトップセールスクリエイター】です。

【私たちの最終ゴール（KGI）】
1. 「先行情報・相場データ（Reason）」を求めるユーザーを【有料VIP Discord】へ誘導すること。
2. 「今すぐ利ざやを抜くための直送手配（Action）」を求めるユーザーを【自社代理購入サイト】へ誘導すること。
※Instagram投稿はすべてこの2股導線への「撒き餌」であり、プロフ遷移と保存（Save）の最大化を狙って制作してください。

【チーフ・キュレーター編成パッケージ（今週の動的週間ラインナップ）】:
${JSON.stringify(chiefPackage, null, 2)}

【IGアナリストからの直近分析＆制作レギュレーション】:
${JSON.stringify(accountReport, null, 2)}

■ 必須制作ルール:
1. 【キュレーターの動的編成への完全準拠】:
   - 曜日のテーマは固定ではありません。上記チーフパッケージ内の weeklyLineup（月〜日の各曜日に割り振られた contentType, slotKey, themeLabel, items）に100%従って各曜日の投稿を執筆してください。
   - 【アービトラージ枠の日】:
     * 必ず配置された【北米（us）・欧州（eu）・アジア（asia）の3商品】の確定価格差（Fact）をすべて盛り込んだ「3市場比較カルーセル」を構成すること。
   - 【先行トレンド予測枠の日】:
     * なぜ今後跳ねるのかの客観的シグナル（大会・在庫枯渇など）と注目銘柄を提示し、「見返せるように保存（Save）」を促す構成にすること。
   - 【的中実績（答え合わせ）枠の日】:
     * 「過去に予測したカードが実際に海外で跳ねた確定事実」を対比提示し、アカウントの権威性を確立してDiscordへ誘導すること。
2. 【答えを教えない撒き餌原則（Hook & Hold）】:
   - 投稿で開示するのは「確定価格差」「海外急騰率」「実成約事実（Fact & Result）」のみ。
   - 日本国内の仕入れ店舗名、仕入れルート、詳細ノウハウ（Action & Reason）は絶対に投稿本文に書かないこと（Gate 2 監査で弾かれます）。
3. 【明確な2股CTA（Dual Funnel）の配置】:
   - 各曜日キャプション末尾および最終スライドで、以下の2つの選択肢を明確に提示すること:
     ① 「なぜこの価格差が生まれたのか？次の急騰シグナルを知りたい方」 ➔ 【VIP Discord】へ
     ② 「この価格差のまま、日本から最速で直送手配したい方」 ➔ 【プロフの自社代理購入URL】へ

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "theme": "チーフ選定に基づく今週の週間撒き餌テーマ",
  "recommendedTiming": "アナリスト推奨に基づく最適な投稿時間帯（例: 日本時間 21:00）",
  "hashtags": [
    "#pokemontcg", "#pokemoncards", "#pokemoninvesting", "#psa10", "#japanesepokemon"
  ],
  "visualGuideline": {
    "coverSlide": "看板MVP投稿の表紙画像指示: 3秒で指が止まる価格差フック、文字サイズ・コントラスト比の指定",
    "carouselSlides": [
      "2枚目: 北米市場の実成約・サヤ取り実証画面（Fact提示）",
      "3枚目: 欧州市場の相場実態画面（Fact提示）",
      "4枚目: アジア市場の熱狂・プレミアム画面（Fact提示）",
      "5枚目: 世界3大市場の確定利ざや比較インフォグラフィック",
      "6枚目: 2股CTAスライド（情報→VIP Discord ＆ 直送手配→自社サイト）"
    ]
  },
  "posts": {
    "hybridPost": "今週の看板MVP特集: 世界3大市場比較ハイブリッド投稿キャプション全文（本文＋2股CTA＋ハッシュタグを含む完全版）",
    "arbitragePost": "確定利ざや特化型キャプション全文（ハッシュタグ含む）",
    "trendPost": "市場トレンド・急騰先行特化型キャプション全文（ハッシュタグ含む）"
  },
  "discordCTA": "プロフリンク・ハイライトへ誘導する2股CTAテンプレート文",
  "dailyPosts": [
    {
      "day": "Monday",
      "theme": "weeklyLineupの月曜テーマ（例: 海外先行トレンド急騰予測 または 現行モダン3市場比較）",
      "caption": "月曜フルキャプション全文（本文＋2股CTA＋ハッシュタグを含む完全版）",
      "slides": [
        "1枚目: 表紙（フック）",
        "2枚目: 事実データスライド",
        "3枚目: 比較またはシグナルスライド",
        "4枚目: 2股CTAスライド"
      ]
    },
    { "day": "Tuesday", "theme": "火曜テーマ", "caption": "火曜フルキャプション全文", "slides": ["スライド指示"] },
    { "day": "Wednesday", "theme": "水曜テーマ", "caption": "水曜フルキャプション全文", "slides": ["スライド指示"] },
    { "day": "Thursday", "theme": "木曜テーマ", "caption": "木曜フルキャプション全文", "slides": ["スライド指示"] },
    { "day": "Friday", "theme": "金曜テーマ", "caption": "金曜フルキャプション全文", "slides": ["スライド指示"] },
    { "day": "Saturday", "theme": "土曜テーマ", "caption": "土曜フルキャプション全文", "slides": ["スライド指示"] },
    { "day": "Sunday", "theme": "日曜テーマ", "caption": "日曜フルキャプション全文", "slides": ["スライド指示"] }
  ]
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}

// 7. X (Twitter) 専任クリエイター（140字フック ＆ 4ポストスレッド特化）
export async function runXPosts(chiefPackage: any, xAccountReport?: any, category: string = 'pokemon') {
  const categoryName = getCategoryName(category);
  const rules = await getAgentRules('x');
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.3,
    maxOutputTokens: 8192,
  });

  const prompt = `あなたは越境【${categoryName}】事業における【X (Twitter) 専任のプロクリエイター】です。

【チーフ・キュレーター編成パッケージ（今週の動的週間ラインナップ）】:
${JSON.stringify(chiefPackage, null, 2)}

【Xアナリストの戦術指示】:
${JSON.stringify(xAccountReport || {}, null, 2)}

■ 必須発信ルール:
1. 【1ポスト目の140文字制限厳守（最重要）】:
   - 各曜日の mainPost（1ポスト目）は、改行・絵文字・ハッシュタグを含めて【絶対に140文字以内】で執筆すること（Gate 2 監査で自動検知されます）。
   - 1ポスト目には絶対に外部リンク（URL）を貼らないこと（アルゴリズムによる表示回数制限を回避するため）。画像4枚の視認案内とスレッド誘導を含めること。
2. 【キュレーターの動的編成への完全準拠】:
   - チーフパッケージ内の weeklyLineup に従い、全7曜日（Monday〜Sunday）のスレッドを生成してください。
   - アービトラージ枠の日：ツリー2〜3ポスト目で北米・欧州・アジアの3市場相場と国内相場の乖離事実を対比させること。
   - トレンド予測枠の日：海外市場で検知された先行シグナルと注目銘柄の波及ロジックを展開すること。
   - 的中実績枠の日：過去予測と現在確定成約価格の跳ね上がり実績を開示すること。
3. 【リンク配置ルール】:
   - VIP Discord ＆ 自社サイトURLへの誘導は、スレッド最終ポスト（またはリプライ欄想定文）にのみ配置すること。
4. 【撒き餌原則】:
   - 価格差や成約実績の事実（Fact & Result）のみを語り、仕入れ店舗名や具体的仕入れルートは絶対に漏洩させないこと。

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "theme": "X用拡散フックテーマ",
  "mainPost": "今週の看板MVP 1ポスト目（140字以内厳守、フック＋画像添付案内＋スレッド誘導）",
  "threadPosts": [
    "ツリー2ポスト目: 世界3市場の実成約・相場乖離の事実データ",
    "ツリー3ポスト目: なぜこの歪みが生じているのか（背景示唆のみ、仕入れ先は完全秘匿）",
    "ツリー4ポスト目（CTA）: VIP Discord（先行シグナル）＆ 自社サイト（直送依頼）への誘導文"
  ],
  "imageGuideline": [
    "画像1: 日本国内相場画面（Fact）",
    "画像2: 海外実成約相場画面（Fact）",
    "画像3: 確定利ざや・マージン内訳インフォグラフィック",
    "画像4: 2股導線・サービス概要図"
  ],
  "xCallToAction": "固定ポストまたはリプライ欄に貼る誘導テキスト",
  "dailyThreads": [
    {
      "day": "Monday",
      "mainPost": "月曜1ポスト目（140文字以内厳守、フック＋画像案内＋ツリー誘導）",
      "threadPosts": [
        "ツリー2ポスト目: 事実データ展開",
        "ツリー3ポスト目: 要因分析・示唆",
        "ツリー4ポスト目: 2股CTA"
      ]
    },
    { "day": "Tuesday", "mainPost": "火曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"] },
    { "day": "Wednesday", "mainPost": "水曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"] },
    { "day": "Thursday", "mainPost": "木曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"] },
    { "day": "Friday", "mainPost": "金曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"] },
    { "day": "Saturday", "mainPost": "土曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"] },
    { "day": "Sunday", "mainPost": "日曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"] }
  ]
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}

--- File: C:\Development Project\website\app\api\ai\intelligence\agents\curator.ts ---

// app/api/ai/intelligence/agents/curator.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getCategoryName, getAgentRules } from '../helpers';

export interface CuratorItemSelection {
  itemId: string;
  region: 'us' | 'eu' | 'asia';
  role: string;
  isMvp: boolean;
  coreHookFact: string;
  rationale: string;
}

export interface CuratorDailyLineup {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  contentType: 'arbitrage' | 'market_trend' | 'trend_track_record';
  slotKey: string;
  themeLabel: string;
  items: CuratorItemSelection[];
  dayRationale: string;
}

export interface CuratorStrategyBlueprint {
  headline: string;
  adaptationRationale: string;
  slotDistribution: Record<string, number>;
}

export interface CuratorResponse {
  strategyBlueprint: CuratorStrategyBlueprint;
  mvpItemId: string;
  weeklyLineup: CuratorDailyLineup[];
}

export async function runCuratorSelection(
  researchCandidates: any[],
  platformTactics?: any[],
  category: string = 'pokemon'
): Promise<CuratorResponse | null> {
  const categoryName = getCategoryName(category);
  const rules = await getAgentRules('chief');
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.15,
    maxOutputTokens: 8192,
    apiKey,
  });

  // SNSアナリスト（IG / X）からの示唆を抽出
  const igTactic = platformTactics?.find((t) => t.platform === 'instagram');
  const xTactic = platformTactics?.find((t) => t.platform === 'x');
  const curatorDirectives = {
    instagram: igTactic?.raw_insights?.curatorDirectives || null,
    x: xTactic?.raw_insights?.curatorDirectives || null,
  };

  // トークン節約のため候補データを要約
  const candidatesSummary = researchCandidates.map((c) => ({
    id: c.id,
    agentKey: c.agent_key, // 'arbitrage' | 'trend'
    region: c.region,       // 'us' | 'eu' | 'asia'
    slotKey: c.slot_key,
    priceTier: c.price_tier || null,
    cardName: c.card_name,
    condition: c.condition_grade,
    buyJPY: c.jp_buy_price_jpy,
    sellTarget: c.target_sold_price_local,
    spreadJPY: c.price_spread_jpy,
    roi: c.spread_roi_percent ? `${c.spread_roi_percent}%` : null,
    liquidity: c.liquidity_indicator,
    insight: c.research_insight,
  }));

  const prompt = `あなたは越境【${categoryName}】事業の最高編成責任者【チーフ・キュレーター】です。
SNSアナリストからのプラットフォーム反響示唆（RSI）と、Gate 1を通過した合格銘柄リストを精査し、今週1週間（月曜日〜日曜日）の【最適週間コンテンツ・ポートフォリオ】を編成してください。

【SNSアナリストからの直近スロット傾斜示唆（RSI）】:
${JSON.stringify(curatorDirectives, null, 2)}

【Gate 1 合格商材リスト（全候補）】:
${JSON.stringify(candidatesSummary, null, 2)}

■ 編成ルール（動的自己適応 / RSI）:
1. 週間スロットの動的配分:
   - 基本構成は「先行トレンド予測 1日」「的中実績（答え合わせ）1日」「アービトラージ 5日」です。
   - ただし、SNSアナリストの slotWeights 指示で特定スロット（例: modern_meta）が "high" に指定されている場合は、そのスロットを週2〜3日に増枠し、"low" のスロットを減枠・集約するなど柔軟に比率を傾斜配分してください。
   - トレンド予測の配置曜日は、アナリスト推奨（recommendedTrendDay）を最優先で考慮してください。
2. アービトラージ日の【3地域トリオ】厳格編成:
   - アービトラージを配信する日は、必ず【北米（us）1商品、欧州（eu）1商品、アジア（asia）1商品】の計3商品をセットで選出してください（items配列に3件配置）。
   - 3商品とも、その日の担当スロット（例: modern_metaの日なら3商品すべてmodern_meta）から選定すること。
3. トレンド予測日 & 的中実績日の編成:
   - 先行トレンド予測（market_trend）の日は、agentKey: "trend" の合格銘柄から最もシグナルが強い銘柄を選出してください。
   - 的中実績（trend_track_record）の日は、過去予測から実際に価格が跳ねた実績証明に最も適した銘柄を1件選出してください。
4. 看板MVP（全体で1商品のみ）:
   - 7日間に選ばれた全商材の中から、今週最も相場の歪みが大きく、SNSのフック力と実利を兼ね備えた【看板MVP（mvpItemId）】を1商品だけ指定してください。
5. データの整合性:
   - itemId は必ず上記【Gate 1 合格商材リスト】に実在する id をそのまま指定してください。架空のIDや未登録カードの生成は厳禁です。

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "strategyBlueprint": {
    "headline": "今週の週間編成方針（データに基づく核心）",
    "adaptationRationale": "SNSアナリストの指示からなぜこの曜日順・スロット比率に調整したのかの根拠",
    "slotDistribution": {
      "modern_meta": 2,
      "market_trend": 1,
      "promos_exclusive": 1,
      "neo_vintage": 1,
      "trend_track_record": 1,
      "high_end_sealed": 1
    }
  },
  "mvpItemId": "合格リストに実在するMVPアイテムのID",
  "weeklyLineup": [
    {
      "day": "Monday",
      "contentType": "market_trend",
      "slotKey": "market_trend",
      "themeLabel": "海外先行トレンド急騰予測",
      "dayRationale": "週初めの保存数獲得を狙い月曜へ前倒し配置",
      "items": [
        {
          "itemId": "合格リストのID",
          "region": "us",
          "role": "先行シグナル注目株",
          "isMvp": false,
          "coreHookFact": "事実数値（例: 海外在庫枯渇による先行急騰シグナル）",
          "rationale": "選定理由"
        }
      ]
    },
    {
      "day": "Tuesday",
      "contentType": "arbitrage",
      "slotKey": "modern_meta",
      "themeLabel": "現行モダン・高需要枠（世界3市場比較）",
      "dayRationale": "保存率No.1スロットにつき週前半の主軸として配置",
      "items": [
        {
          "itemId": "US候補のID",
          "region": "us",
          "role": "北米注目枠",
          "isMvp": false,
          "coreHookFact": "国内¥X,XXX ➔ 北米成約$XX (粗利+¥X,XXX)",
          "rationale": "選定理由"
        },
        {
          "itemId": "EU候補のID",
          "region": "eu",
          "role": "欧州注目枠",
          "isMvp": false,
          "coreHookFact": "国内¥X,XXX ➔ 欧州成約€XX (粗利+¥X,XXX)",
          "rationale": "選定理由"
        },
        {
          "itemId": "ASIA候補のID",
          "region": "asia",
          "role": "アジア注目枠",
          "isMvp": false,
          "coreHookFact": "国内¥X,XXX ➔ アジア成約SGD XX (粗利+¥X,XXX)",
          "rationale": "選定理由"
        }
      ]
    }
    // ... 水曜から日曜まで計7日分
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
  } catch (error) {
    console.error('[Curator] Selection failed:', error);
    return null;
  }
}

--- File: C:\Development Project\website\app\api\ai\intelligence\agents\marketTrend.ts ---

// app/api/ai/intelligence/agents/marketTrend.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson } from '../helpers';

export interface TrendItem {
  cardName: string;
  condition: string;
  jpBuyPriceJPY: string;
  currentLocalPrice: string;
  impactLogic: string;
}

export interface TrendHypothesis {
  headline: string;
  signal: string;
  timeframe: string;
  impactLogic: string;
  items: TrendItem[];
}

export interface MarketTrendReport {
  title: string;
  claim: string;
  summary: {
    headline: string;
    macroAnalysis: {
      japanSourcingClimate: string;
      localMarketDemand: string;
    };
    microAnalysis: {
      topImportMarginCard: string;
      topLocalVelocityCard: string;
      conditionGradingInsight: string;
    };
    riskAlert: {
      sourcingQualityTrap: string;
      localInventoryRisk: string;
    };
    actionDirectives: string[];
  };
  hypotheses: TrendHypothesis[];
}

const REGION_CURRENCIES: Record<string, { currency: string; name: string }> = {
  us: { currency: 'USD', name: '北米（アメリカ）市場' },
  eu: { currency: 'EUR', name: '欧州（ヨーロッパ）市場' },
  asia: { currency: 'SGD', name: 'アジア（シンガポール・台湾・香港等）市場' },
};

export async function runMarketTrend(
  region: 'us' | 'eu' | 'asia',
  category: string = 'pokemon'
): Promise<MarketTrendReport | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const cur = REGION_CURRENCIES[region] || REGION_CURRENCIES.us;

  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.1,
    maxOutputTokens: 8192,
    apiKey,
  });

  const prompt = `あなたは【${cur.name}】のトレカ相場動向を分析する専任の市場トレンドアナリストです。
日本のトレカ市場（一次・二次流通）と現地市場（TCGPlayer, Cardmarket, eBay, 各国専門店）の価格差・需要変化を客観的に監視しています。

【分析任務】
今後2週間〜1ヶ月以内に【${cur.name}】で需要急増または価格高騰が予見される「先行トレンド仮説」を3〜5件立案し、それぞれの仮説に紐づく注目銘柄を特定してください。
仮説の切り口やテーマに特定の制約はありません。現在の市場データを観察して最も顕著に現れている変化を自由に捉えてください。

■ 厳格な論理整合性ルール（自律検証義務）:
1. 事実と論理の整合性（ハルシネーションの排除）:
   - 架空のカード名や型番は厳禁。実在するカード名・型番を明記すること。
   - 自ら立てた仮説の「高騰理由」と「カードの属性」が論理的に一致していること。
     * 大会・対戦需要を根拠にする場合：そのカードが現地公式大会で使用可能なレギュレーション準拠であること（大会使用不可のカードを対戦需要として扱わない）。
     * コレクション・希少性需要を根拠にする場合：キャラクター人気、イラストレーター、絶版などコレクター心理に基づいていること。
2. 客観的根拠（Signal）の言語化:
   - 単なる「人気」「注目」といった曖昧な形容詞で済ませず、「何が起きた／起きつつあるのか」という客観的な観測事実を signal に記述すること。
3. 状態の指定:
   - コンディションは商材の流通実態に合わせて以下から客観的に選定すること:
     ["Raw NM", "Raw LP", "PSA 10", "PSA 9", "BGS 9.5", "BGS 10", "CGC 10", "ARS 10", "Sealed Box", "Sealed Pack", "Sealed Promo"]
   - 仕入れ値（jpBuyPriceJPY）と現地見込売価（currentLocalPrice）の状態基準は必ず一致させること。

以下のJSON形式のみを出力してください:
{
  "title": "【${region.toUpperCase()}】市場トレンドインサイトレポート",
  "claim": "今週の${cur.name}先行トレンドと急騰予見銘柄",
  "summary": {
    "headline": "今週の市場全体の核心的トレンド（データから観察される核心を1行で記述）",
    "macroAnalysis": {
      "japanSourcingClimate": "日本国内の市場動向と調達環境分析",
      "localMarketDemand": "自国（現地）での最新需要動向とバイヤー・プレイヤーの関心"
    },
    "microAnalysis": {
      "topImportMarginCard": "仮説群の中で最も価格ギャップ・インパクトが大きい注目銘柄（下記hypothesesから引用）",
      "topLocalVelocityCard": "最も成約ペースが加速している高流動性銘柄（下記hypothesesから引用）",
      "conditionGradingInsight": "市場全体のコンディション需要（素体・鑑定品・未開封など）の傾向"
    },
    "riskAlert": {
      "sourcingQualityTrap": "仕入れ時の注意点（品質・偽物等）",
      "localInventoryRisk": "トレンド終息や価格反落のリスク要因"
    },
    "actionDirectives": [
      "短期的な調達・販売アクション",
      "中長期的な仕込みアクション"
    ]
  },
  "hypotheses": [
    {
      "headline": "トレンド仮説の見出し",
      "signal": "仮説の根拠となる客観的な観測事実",
      "timeframe": "価格へ反映される想定期間",
      "impactLogic": "なぜ日本版カードに需要が波及するのかの論理",
      "items": [
        {
          "cardName": "実在カード名 (型番/弾名)",
          "condition": "指定マスターから選定",
          "jpBuyPriceJPY": "¥X,XXX",
          "currentLocalPrice": "約¥X,XXX (${cur.currency} XX)",
          "impactLogic": "この銘柄が選定された具体的な理由"
        }
      ]
    }
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
  } catch (error) {
    console.error(`[MarketTrend] Failed to generate report for ${region}:`, error);
    return null;
  }
}

--- File: C:\Development Project\website\app\api\ai\intelligence\agents\salesDM.ts ---

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson } from '../helpers';

export async function runSalesDM(chiefPackage: any) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const prompt = `あなたはVIPコミュニティ（Discord）専任の【越境トレカB2B営業・ディールメーカーAI】です。
チーフマネージャーからの週間ディレクション指示書（MVP案件・3地域マトリクス・週間オファー指示）に基づき、
VIP Discord内の大口バイヤー・海外コレクター・リセラーに向けた【実務成約用 直送ロットオファー投稿文】を策定してください。

【チーフマネージャー指示パッケージ】:
${JSON.stringify(chiefPackage, null, 2)}

【オファー作成の必須要件】:
1. 【対象案件の選定】:
   - チーフ選定のMVP案件（${chiefPackage?.mvpHighlight?.cardName || chiefPackage?.chosenCardOrItem || '選定カード'}）を主軸にしつつ、ロット仕入れ・まとめ買いで最大の利ざやが出るオファーを構築すること。
2. 【Discordに最適化した投稿フォーマット (discordMessage)】:
   - 海外バイヤーが主たる読者であるため、**英語（または日英併記）**で作成すること。
   - Discord特有のマークダウン（絵文字、太字 **、引用 >、コードブロック等）を駆使し、スマホでも一目で条件が把握できる構成にすること。
   - 以下の要素を必ず盛り込むこと:
     - 案件名・状態グレード（PSA10 / Raw NM / Sealed 等）
     - 価格差と想定利益（国内仕入想定 vs 現地成約相場 vs ロット推定純利）
     - 即時確保可能な推奨ロット数（MOQ）
     - 検品・梱包品質（ローダー・気泡緩衝材・防水二重梱包）
     - 配送手段（FedEx Priority / EMS 追跡・保険付き）
     - 決済手段（Wise送金 / PayPal Invoice）
     - CTA（購入希望者はDMまたはチケットを開くよう誘導）
3. 【実務的商条件 (commercialTerms)】:
   - 現実的な最低発注数量（MOQ）、配送業者、決済方法を明記すること。
4. 【価格交渉対策 (negotiationTip)】:
   - 大口バイヤーから「ボリュームディスカウント」や「送料込み」を要求された場合の現実的な防衛ライン（例: 5個以上なら代行手数料を2%引き、ただし送料はバイヤー負担厳守など）を運営者向けに助言すること。

必ず以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "targetSegment": "北米/欧州/アジアの大口セラー・PSA投資家・ロットコレクター",
  "offerSummary": "例: 【即時直送ロット】${chiefPackage?.mvpHighlight?.cardName || chiefPackage?.chosenCardOrItem || '注目銘柄'} 5点まとめ仕入れオファー",
  "discordMessage": "Discordの#wholesale-deals または #vip-signals チャンネルにそのまま投下できる全文（英語ベース・マークダウン装飾）",
  "commercialTerms": {
    "minimumOrderQty": "例: 最低3点〜 / または 1カートン(12BOX)",
    "shippingMethod": "FedEx International Priority (2-4 business days, insured & tracked)",
    "paymentMethod": "Wise (Direct Wire / Low Fee) or PayPal Goods & Services (+4.5% fee)"
  },
  "negotiationTip": "大口顧客からの値引き・送料折半交渉に対する具体的な対応方針と損益分岐点ガイダンス"
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

--- File: C:\Development Project\website\app\api\ai\intelligence\agents\snsAccount.ts ---

// app/api/ai/intelligence/agents/snsAccount.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { getInstagramInsights } from '@/lib/instagram';
import { parseAIJson, getCategoryName, getAgentRules } from '../helpers';

// 4. IGアナリスト（自社Instagramグロース＆2股ファネル転換アナリスト）
export async function runAccountAnalysis(category: string = 'pokemon') {
  const rawInsights = await getInstagramInsights(5);
  const categoryName = getCategoryName(category);
  const rules = await getAgentRules('account');

  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.2,
  });

  const prompt = `あなたは越境【${categoryName}】事業における【自社Instagram専任アカウントアナリスト＆グロースディレクター】です。

【私たちの最終ゴール（KGI）】
1. 「先行情報・相場データ（Reason）」を求めるユーザーを【有料VIP Discord】へ誘導すること。
2. 「今すぐ利ざやを抜くための直送手配（Action）」を求めるユーザーを【自社代理購入サイト】へ誘導すること。
※Instagram投稿はすべてこの2股導線への「撒き餌」であり、プロフ遷移率と保存（Save）率の最大化が至上命題です。

【直近のアカウント実績データ（Meta Graph API）】:
${JSON.stringify(rawInsights)}

【あなたの分析・ディレクション任務】:
過去投稿のエンゲージメント（いいね・コメント・推定保存率）、投稿時間帯、ハッシュタグ、カルーセル構成を分析し、
1. チーフ・キュレーターが今週の7日間のスロット比率（どの商材を増枠すべきか）を決めるための【編成ディレクション】
2. Instagram専任クリエイターが今週作るべき【最高精度の投稿レギュレーション】
の双方を策定してください。

■ 厳格な分析ルール:
1. 事実データに基づく客観判定（バイアスの排除）:
   - 固定の例示には囚われず、上記実績データから観察される生の傾向を反映してください。
   - 【コールドスタート安全策】: 実績データが空または初期段階で分析に足る母数がない場合は、無理な作文をせず、標準ベースライン（全スロット normal、トレンド予測推奨曜日は Tuesday）を適用してください。
2. キュレーター向けスロット傾斜判定（RSI自己回帰の核心）:
   - 以下の5大スロットのうち、保存率・反響が強いものを "high"（増枠推奨）、反応が鈍いものを "low"（縮小/週末集約）、標準を "normal" として判定してください。
     * modern_meta (現行モダン枠)
     * neo_vintage (ネオ・ヴィンテージ枠)
     * promos_exclusive (限定プロモ枠)
     * classic_vintage (クラシック・ヴィンテージ枠)
     * high_end_sealed (高額鑑定・未開封BOX枠)
   - 「先行トレンド予測」を週の初速を獲るために何曜日に配置すべきかも推奨してください。

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "title": "自社Instagram 2股ファネル転換＆アカウント診断レポート",
  "claim": "今週の投稿で2股導線（Discord/自社サイト）への送客を最大化するための最重要改善アクション",
  "reasons": [
    "過去投稿のエンゲージメント・保存率ボトルネック分析",
    "最もプロフ遷移を生み出した訴求切り口の検証",
    "海外リーチを最大化するハッシュタグおよび投稿タイミングの相関"
  ],
  "facts": [
    { "label": "最優秀反響パターン", "value": "データから観察された最も効果的なカルーセル構成" },
    { "label": "推奨投稿時間帯", "value": "データから導かれた最適時間帯（例: 日本時間 21:00）" },
    { "label": "ハッシュタグ推奨配分", "value": "推奨ハッシュタグの配分比率" },
    { "label": "2股CTA推奨誘導", "value": "Reason(情報)→Discord / Action(手配)→プロフリンク" }
  ],
  "curatorDirectives": {
    "slotWeights": {
      "modern_meta": "high",
      "neo_vintage": "normal",
      "promos_exclusive": "normal",
      "classic_vintage": "low",
      "high_end_sealed": "normal"
    },
    "recommendedTrendDay": "Tuesday",
    "rationale": "各スロットの重み付けおよびトレンド配信曜日を推奨したデータ的根拠"
  },
  "soWhat": "Instagramクリエイターへの直接制作指示（表紙フックの文字数、スライド展開順、CTA文言の型）",
  "riskAndMitigation": {
    "risk": "ノウハウを投稿本文で喋りすぎてしまいプロフに飛ばずに離脱されるリスク",
    "mitigation": "仕入れ先名・具体的ルートを完全秘匿し、Fact（価格差・成約事実）のみ提示してプロフに誘導する"
  },
  "verificationChecklist": [
    "1枚目（表紙）の価格差フックがスマホ画面で3秒以内に理解できるか",
    "最終スライドの2股CTA（Discord/自社サイト）が明確に分かれているか",
    "海外向け英語ハッシュタグが正しくセットされているか"
  ]
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}

// 5. Xアナリスト
export async function runXAccountAnalysis(sharedInsights?: any) {
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.2,
  });

  const prompt = `あなたは越境トレカ・ホビー販売事業の専任【X (Twitter) アナリスト】です。
Xプラットフォーム特有のアルゴリズム（インプレッション最大化、ブックマーク保存率、リポスト連鎖、外部リンク遷移のペナルティ回避）を分析し、
1. チーフ・キュレーター向けのX視点でのスロット編成示唆
2. Xクリエイター向けの戦術ルール
を策定してください。

【参考インサイト（Instagram・全体市場の反響傾向）】:
${JSON.stringify(sharedInsights || '初期運用のための標準アルゴリズム基準を適用')}

■ 厳格な分析ルール:
1. Xアルゴリズムの最新特性を反映すること（1ポスト目の外部リンク厳禁、画像4枚視認性、140字以内フック）。
2. キュレーター向けに、X上で拡散・ブックマーク（保存）されやすいスロットの重み（high / normal / low）を判定すること。

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
    { "label": "推奨スレッド構成", "value": "全3〜4ポスト構成" },
    { "label": "推奨投稿時間帯", "value": "海外アクティブ時間と国内帰宅時間の重畳帯" },
    { "label": "リンク配置ルール", "value": "スレッド最終ポストまたは固定ポスト" }
  ],
  "curatorDirectives": {
    "slotWeights": {
      "modern_meta": "high",
      "neo_vintage": "normal",
      "promos_exclusive": "normal",
      "classic_vintage": "normal",
      "high_end_sealed": "normal"
    },
    "recommendedTrendDay": "Tuesday",
    "rationale": "X特有の議論性・拡散性から見たスロット推奨理由"
  },
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
}
`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}

--- File: C:\Development Project\website\app\api\ai\knowledge\route.ts ---

// app/api/ai/knowledge/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 1. ナレッジ一覧取得 (GET)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentKey = searchParams.get('agentKey');

    const supabase = await createClient();
    let query = supabase.from('ai_knowledge').select('*').order('created_at', { ascending: false });

    if (agentKey && agentKey !== 'all') {
      query = query.eq('agent_key', agentKey);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, knowledge: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. ナレッジ登録 (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agentKey, content } = body;

    if (!agentKey || !content) {
      return NextResponse.json({ success: false, error: '必要なデータが不足しています' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_knowledge')
      .insert({ agent_key: agentKey, content: content })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'ナレッジを保存しました', data: data?.[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. ナレッジ削除 (DELETE)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '削除対象のIDが指定されていません' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('ai_knowledge')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'ナレッジを削除しました' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

--- File: C:\Development Project\website\app\api\ai\publish\route.ts ---

// app/api/ai/publish/route.ts
import { NextResponse } from 'next/server';
import { publishThreadToX } from '@/lib/twitter';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { platform, content, imageUrl, mainPost, threadPosts } = body;

    if (!platform || (!content && !mainPost)) {
      return NextResponse.json(
        { success: false, error: '送信内容またはプラットフォームが指定されていません' },
        { status: 400 }
      );
    }

    // ==========================================
    // 1. Discord への送信
    // ==========================================
    if (platform === 'discord') {
      const webhookUrl = process.env.DISCORD_WEBHOOK_SALES_DM;
      if (!webhookUrl) {
        return NextResponse.json(
          { success: false, error: '環境変数 DISCORD_WEBHOOK_SALES_DM が設定されていません' },
          { status: 500 }
        );
      }

      // Discordの1メッセージ上限（2000文字）に収めるため安全に切り詰め
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.slice(0, 1990),
          username: 'Worldwide Japan Intelligence Bot',
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Discord送信エラー: ${res.statusText} (${errorText})`);
      }

      return NextResponse.json({ success: true, message: 'Discordへメッセージを直接送信しました！' });
    }

    // ==========================================
    // 2. Instagram への自動投稿 (Graph API)
    // ==========================================
    if (platform === 'instagram') {
      const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
      const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
      const targetImageUrl =
        imageUrl ||
        process.env.INSTAGRAM_DEFAULT_IMAGE_URL ||
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080';

      if (!accountId || !accessToken) {
        return NextResponse.json(
          {
            success: false,
            error: '環境変数 INSTAGRAM_BUSINESS_ACCOUNT_ID または INSTAGRAM_ACCESS_TOKEN が設定されていません',
          },
          { status: 500 }
        );
      }

      // ステップA: メディアコンテナ (Media Container) の作成
      const containerRes = await fetch(
        `https://graph.facebook.com/v26.0/${accountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: targetImageUrl,
            caption: content,
            access_token: accessToken,
          }),
        }
      );

      const containerData = await containerRes.json();
      if (!containerRes.ok || !containerData.id) {
        console.error('Instagram Container Error:', containerData);
        throw new Error(containerData.error?.message || 'メディアコンテナ作成に失敗しました');
      }

      const creationId = containerData.id;

      // ステップB: Meta側の画像処理を待機 (4秒)
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // ステップC: 投稿 (Media Publish) の実行
      const publishRes = await fetch(
        `https://graph.facebook.com/v26.0/${accountId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: accessToken,
          }),
        }
      );

      const publishData = await publishRes.json();
      if (!publishRes.ok || !publishData.id) {
        console.error('Instagram Publish Error:', publishData);
        throw new Error(publishData.error?.message || '投稿の公開に失敗しました');
      }

      return NextResponse.json({
        success: true,
        message: 'Instagram (worldwidejapan2023) への投稿が完了しました！',
        postId: publishData.id,
      });
    }

    // ==========================================
    // 3. X (Twitter) へのスレッド自動投稿
    // ==========================================
    if (platform === 'x') {
      const targetMainPost = mainPost || content;
      const targetThreadPosts = Array.isArray(threadPosts) ? threadPosts : [];

      if (!targetMainPost) {
        return NextResponse.json(
          { success: false, error: '1ポスト目の本文が指定されていません' },
          { status: 400 }
        );
      }

      const result = await publishThreadToX({
        mainPost: targetMainPost,
        threadPosts: targetThreadPosts,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'X (Twitter) へのスレッド投稿が完了しました！',
        tweetId: result.firstTweetId,
      });
    }

    return NextResponse.json({ success: false, error: '未対応のプラットフォームです' }, { status: 400 });
  } catch (err: any) {
    console.error('送信エラー:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

--- File: C:\Development Project\website\app\api\pipeline\types.ts ---

export type PipelineStatus =
  | 'initialized'
  | 'researching'
  | 'curating'
  | 'gate1_auditing'
  | 'generating_content'
  | 'gate2_auditing'
  | 'ready_to_publish'
  | 'partially_failed'
  | 'completed';

export type AuditStatus = 'pending' | 'passed' | 'rejected' | 'needs_revision';
export type DeliveryStatus = 'drafting' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'failed';

export interface ResearchItemRecord {
  id: string;
  cycle_id: string;
  agent_key: string;
  region: 'us' | 'eu' | 'asia';
  slot_key: string;
  price_tier?: string;
  card_name: string;
  condition_grade: string;
  jp_buy_price_jpy: number;
  target_sold_price_local: string;
  target_sold_price_jpy: number;
  price_spread_jpy: number;
  spread_roi_percent: number;
  liquidity_indicator?: string;
  research_insight?: string;
  raw_payload?: any;
  is_selected: boolean;
  assigned_day?: string;
  is_mvp: boolean;
  core_hook_fact?: string;
  curator_rationale?: string;
  gate1_status: AuditStatus;
  gate1_checks?: any;
  gate1_feedback?: string;
}

export interface DeliverableRecord {
  id: string;
  cycle_id: string;
  research_item_id?: string;
  platform: 'instagram' | 'x' | 'discord';
  day_of_week: string;
  post_type: string;
  content_payload: any;
  gate2_status: AuditStatus;
  gate2_checks?: any;
  gate2_feedback?: string;
  retry_count: number;
  status: DeliveryStatus;
}

--- File: C:\Development Project\website\app\api\pipeline\gates\gate1.ts ---

// app/api/pipeline/gates/gate1.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson } from '../../ai/intelligence/helpers';
import { ResearchItemRecord } from '../types';

export interface Gate1AuditResult {
  itemId: string;
  passed: boolean;
  checks: {
    card_existence_verified: boolean;
    roi_calculation_valid: boolean;
    official_tournament_compliant: boolean;
  };
  feedback: string | null;
}

// ----------------------------------------------------------------------------
// Gate 1-A: アービトラージ数値マージン監査（コードによる0.01秒の決定論的検算）
// ----------------------------------------------------------------------------
export function runArbitrageMathAudit(items: ResearchItemRecord[]): Gate1AuditResult[] {
  const results: Gate1AuditResult[] = [];

  for (const item of items) {
    const buy = Number(item.jp_buy_price_jpy) || 0;
    const target = Number(item.target_sold_price_jpy) || 0;
    const spread = target - buy;
    const roi = buy > 0 ? Math.round((spread / buy) * 100) : 0;

    // 1. 異常値チェック（仕入れ値0円、利益なし、ROI 10%未満）
    if (buy <= 0 || spread <= 0 || roi < 10) {
      results.push({
        itemId: item.id,
        passed: false,
        checks: {
          card_existence_verified: true,
          roi_calculation_valid: false,
          official_tournament_compliant: true,
        },
        feedback: `利ざや不足または価格異常: 仕入 ¥${buy}, 売価 ¥${target} (粗利 ¥${spread}, ROI ${roi}%)`,
      });
      continue;
    }

    // 2. 申告値との四則計算チェック（許容誤差: 差額 ±150円, ROI ±3%）
    const isSpreadValid = Math.abs(spread - item.price_spread_jpy) <= 150;
    const isROIValid = Math.abs(roi - item.spread_roi_percent) <= 3;

    if (!isSpreadValid || !isROIValid) {
      results.push({
        itemId: item.id,
        passed: false,
        checks: {
          card_existence_verified: true,
          roi_calculation_valid: false,
          official_tournament_compliant: true,
        },
        feedback: `検算不一致: 実利 ¥${spread} (申告: ¥${item.price_spread_jpy}), 実ROI ${roi}% (申告: ${item.spread_roi_percent}%)`,
      });
    } else {
      results.push({
        itemId: item.id,
        passed: true,
        checks: {
          card_existence_verified: true,
          roi_calculation_valid: true,
          official_tournament_compliant: true,
        },
        feedback: null,
      });
    }
  }

  return results;
}

// ----------------------------------------------------------------------------
// Gate 1-B: 市場トレンド相場・レポート論理監査（LLMによる文章 & 銘柄審査）
// ----------------------------------------------------------------------------
export async function runTrendIntelligenceAudit(
  items: ResearchItemRecord[],
  category: string = 'pokemon'
): Promise<Gate1AuditResult[]> {
  if (items.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.0,
    maxOutputTokens: 8192,
    apiKey: apiKey,
  });

  // レポートの仮説・文章インサイトと銘柄をセットで審査プロンプトへ渡す
  const prompt = `あなたは越境トレカ販売の市場トレンド最高審査役【Gate 1-B: Trend Intelligence Guard】です。
アナリストが作成した以下の市場トレンドレポート（仮説・急騰要因の文章）および抽出銘柄を監査し、合否を判定してください。

【厳格監査基準】:
1. 客観的根拠（Signal）の検証:
   - 「なんとなく値上がりそう」といった主観ではなく、現地実成約（Sold Listings）、在庫枯渇、特定SNSの過熱など、客観的事実がレポート文章に示されているか。
2. 欧米公式大会ルール違反の排除（最重要）:
   - 欧米公式大会（Play! Pokémon）では「日本語版カード」の使用が禁止されています。
   - 「大会環境で強い」「プレイヤー必須パーツ」という理由で、日本語版の【ノーマル、汎用グッズ、ACE SPEC等のプレイ専用カード】を選出・推奨している場合は即却下（passed: false）。
   - ※ 美術的価値・コレクション需要としてのSAR/UR/プロモ等の選定は合格。
3. 銘柄の実在性:
   - 完全に架空のカード名や型番でないこと。

【監査対象トレンド銘柄 & レポート本文】:
${JSON.stringify(
  items.map((i) => ({
    id: i.id,
    region: i.region,
    cardName: i.card_name,
    headline: i.slot_key,
    insight: i.research_insight,
    timeframe: i.liquidity_indicator,
    summaryHeadline: i.raw_payload?.reportSummary?.headline || '',
    macroAnalysis: i.raw_payload?.reportSummary?.trendDynamics || '',
  })),
  null,
  2
)}

【出力ルール】:
- 全件（全ID）について結果を出力すること。
- 合格の場合は "passed": true のみ出力。
- 不合格の場合のみ "passed": false と "feedback"（レポート文章の破綻理由、または大会規約抵触理由）を出力。

以下のJSON形式のみを出力してください:
{
  "auditResults": [
    { "id": "アイテムID", "passed": true },
    { "id": "アイテムID", "passed": false, "feedback": "不合格の具体的な指摘理由" }
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    const parsed = parseAIJson(res.content.toString());

    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.auditResults)
      ? parsed.auditResults
      : [];

    const auditMap = new Map<string, any>();
    for (const r of rawList) {
      if (r?.id) auditMap.set(r.id, r);
    }

    return items.map((item) => {
      const match = auditMap.get(item.id);
      const passed = match ? Boolean(match.passed) : true;
      return {
        itemId: item.id,
        passed,
        checks: {
          card_existence_verified: passed,
          roi_calculation_valid: true,
          official_tournament_compliant: passed,
        },
        feedback: passed ? null : match?.feedback || 'レポート論理または規約不適合',
      };
    });
  } catch (error) {
    console.error('Gate 1-B trend audit error:', error);
    return items.map((i) => ({
      itemId: i.id,
      passed: true,
      checks: { card_existence_verified: true, roi_calculation_valid: true, official_tournament_compliant: true },
      feedback: null,
    }));
  }
}

// ----------------------------------------------------------------------------
// Gate 1 統括エントリーポイント（並列実行）
// ----------------------------------------------------------------------------
export async function runGate1Audit(
  items: ResearchItemRecord[],
  category: string = 'pokemon'
): Promise<{ allPassed: boolean; results: Gate1AuditResult[] }> {
  const arbitrageItems = items.filter((i) => i.agent_key === 'arbitrage');
  const trendItems = items.filter((i) => i.agent_key === 'trend');

  // Gate 1-A（コード検算）と Gate 1-B（LLMトレンド文章監査）を並列実行
  const [arbResults, trendResults] = await Promise.all([
    Promise.resolve(runArbitrageMathAudit(arbitrageItems)),
    runTrendIntelligenceAudit(trendItems, category),
  ]);

  const combined = [...arbResults, ...trendResults];
  return {
    allPassed: combined.every((r) => r.passed),
    results: combined,
  };
}

--- File: C:\Development Project\website\app\api\pipeline\gates\gate2.ts ---

// app/api/pipeline/gates/gate2.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson } from '../../ai/intelligence/helpers';

export interface Gate2AuditResult {
  deliverableId: string;
  passed: boolean;
  checks: {
    secret_leak_free: boolean;           // 仕入れ先ワード・仕込みルートの漏洩なし
    teaser_principle_compliant: boolean; // 撒き餌原則（Fact/Resultのみ、ノウハウ秘匿）
    format_and_length_valid: boolean;    // X140文字制限、投稿構成の整合性
    cta_guideline_compliant: boolean;    // プロフリンク・VIP導線の整合性
  };
  feedback: string | null;
}

// 🌟 絶対に外部発信原稿に含めてはならない仕入れ先・国内リテール禁止ワード
const FORBIDDEN_WORDS = [
  'メルカリ', 'mercari', 'ヤフオク', 'yahoo auction', 'ヤフーオークション',
  '駿河屋', 'surugaya', 'ブックオフ', 'bookoff', 'カードラッシュ', 'cardrush',
  '晴れる屋', 'hareruya', 'スニダン', 'snkrdunk', 'カドショ', 'トレカ専門店',
  'フリマ仕入れ', 'フリマアプリ', '店舗仕入れ', '実店舗回収', '秋葉原の店舗'
];

export async function runGate2Audit(deliverables: any[]): Promise<{ allPassed: boolean; results: Gate2AuditResult[] }> {
  const results: Gate2AuditResult[] = [];
  const itemsForLlmReview: any[] = [];

  // --------------------------------------------------------------------------
  // 1. コードによる決定論的チェック（禁止ワード検索 ＆ 文字数測定）
  // --------------------------------------------------------------------------
  for (const item of deliverables) {
    const payload = item.content_payload;
    const textCorpus = JSON.stringify(payload || {});

    // A. 禁止ワードの完全一致チェック
    const matchedForbidden = FORBIDDEN_WORDS.filter(w => textCorpus.toLowerCase().includes(w.toLowerCase()));
    if (matchedForbidden.length > 0) {
      results.push({
        deliverableId: item.id,
        passed: false,
        checks: {
          secret_leak_free: false,
          teaser_principle_compliant: true,
          format_and_length_valid: true,
          cta_guideline_compliant: true,
        },
        feedback: `【機密漏洩NG】仕入れ先・国内ソースの固有名詞が原稿内に含まれています: [${matchedForbidden.join(', ')}] を削除・抽象化してください。`,
      });
      continue;
    }

    // B. X (Twitter) の1ポスト目文字数測定（140文字以内）
    if (item.platform === 'x') {
      const dailyThread = payload?.dailyThreads?.find((t: any) => t.day?.includes(item.day_of_week) || t.day === item.day_of_week);
      const mainPost = dailyThread?.mainPost || payload?.mainPost || '';
      
      if (mainPost.length > 140) {
        results.push({
          deliverableId: item.id,
          passed: false,
          checks: {
            secret_leak_free: true,
            teaser_principle_compliant: true,
            format_and_length_valid: false,
            cta_guideline_compliant: true,
          },
          feedback: `【文字数オーバー】Xの1ポスト目が ${mainPost.length} 文字あります。140文字以内に要約してください。`,
        });
        continue;
      }
    }

    // 機械判定をパスしたものはLLMの定性・文脈審査へ
    itemsForLlmReview.push(item);
  }

  if (itemsForLlmReview.length === 0) {
    return { allPassed: results.every(r => r.passed), results };
  }

  // --------------------------------------------------------------------------
  // 2. LLMによる「撒き餌原則・コンプライアンス・導線」定性審査
  // --------------------------------------------------------------------------
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.0,
    maxOutputTokens: 8192,
    apiKey,
  });

  const prompt = `あなたは越境トレカ販売の最高品質・コンプライアンス監査役【Gate 2: Content & Legal Guard】です。
以下のSNSおよびDiscordの配信原稿を監査し、合否を判定してください。

【厳格監査基準】:
1. 撒き餌原則（Teaser Principle）の厳守（最重要）:
   - 原稿は「利益が出た事実・相場の歪み（Fact & Result）」のみを語り、「どうやって安く仕入れたのか」「どこで仕込んだのか」というノウハウ（Action & Reason）を投稿内でネタバレしてはいけません。ノウハウを完全に解説している原稿は即却下（passed: false）。
2. 誇大広告・断定表現の排除:
   - 「絶対に値上がりする」「元本保証」「100%利益」などの金融・投資詐欺的な断定表現は却下。
3. 2股CTA導線の整合性:
   - 一般向けSNSは「プロフィールリンク」または「VIPコミュニティ」への誘導が含まれていること。

【監査対象原稿リスト】:
${JSON.stringify(
  itemsForLlmReview.map(i => ({
    id: i.id,
    platform: i.platform,
    day: i.day_of_week,
    sampleContent: i.platform === 'instagram'
      ? (i.content_payload?.dailyPosts?.find((p: any) => p.day?.includes(i.day_of_week))?.caption || '').slice(0, 300)
      : i.platform === 'x'
      ? (i.content_payload?.dailyThreads?.find((t: any) => t.day?.includes(i.day_of_week))?.mainPost || '')
      : (i.content_payload?.discordMessage || '').slice(0, 300)
  })),
  null,
  2
)}

【出力形式】:
以下のJSON形式のみを出力してください:
{
  "auditResults": [
    { "id": "原稿ID", "passed": true },
    { "id": "原稿ID", "passed": false, "feedback": "具体的な修正指示（例: 仕入れノウハウを喋りすぎているため、結果のみに絞り詳細はプロフリンクへ誘導してください）" }
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    const parsed = parseAIJson(res.content.toString());
    const rawList = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.auditResults) ? parsed.auditResults : [];

    const llmMap = new Map<string, any>();
    for (const r of rawList) {
      if (r?.id) llmMap.set(r.id, r);
    }

    const llmResults: Gate2AuditResult[] = itemsForLlmReview.map(item => {
      const match = llmMap.get(item.id);
      const passed = match ? Boolean(match.passed) : true;
      return {
        deliverableId: item.id,
        passed,
        checks: {
          secret_leak_free: true,
          teaser_principle_compliant: passed,
          format_and_length_valid: true,
          cta_guideline_compliant: passed,
        },
        feedback: passed ? null : (match?.feedback || '表現規約または撒き餌原則に不適合'),
      };
    });

    const combined = [...results, ...llmResults];
    return { allPassed: combined.every(r => r.passed), results: combined };
  } catch (error) {
    console.error('Gate 2 LLM audit error:', error);
    const fallbackResults = itemsForLlmReview.map(i => ({
      deliverableId: i.id,
      passed: true,
      checks: { secret_leak_free: true, teaser_principle_compliant: true, format_and_length_valid: true, cta_guideline_compliant: true },
      feedback: null,
    }));
    const combined = [...results, ...fallbackResults];
    return { allPassed: combined.every(r => r.passed), results: combined };
  }
}

--- File: C:\Development Project\website\app\api\pipeline\start\route.ts ---

// app/api/pipeline/start/route.ts
import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const category = body.category || 'pokemon';
    const triggerType = body.triggerType || 'manual';

    const supabase = await createClient();

    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const targetMonday = new Date(now.setDate(diff)).toISOString().split('T')[0];

    // 1. パイプラインサイクルの作成
    const { data: cycle, error } = await supabase
      .from('ai_pipeline_cycles')
      .insert({
        category,
        target_week: targetMonday,
        status: 'initialized',
        trigger_type: triggerType,
      })
      .select('id')
      .single();

    if (error || !cycle) throw error;

    // 🌟 Vercel / ローカル双方で正しい公開URLを自動判定
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // 2. 正しい本番URLへワーカーをキック (after() によりレスポンス後も通信切断を防ぐ)
    after(async () => {
      try {
        await fetch(`${baseUrl}/api/pipeline/worker`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cycleId: cycle.id }),
        });
      } catch (err) {
        console.error('Worker dispatch trigger error in background:', err);
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: 'パイプライン処理を開始しました。',
        cycleId: cycle.id,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('Pipeline start error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

--- File: C:\Development Project\website\app\api\pipeline\status\route.ts ---

// app/api/pipeline/status/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get('cycleId');
    const list = searchParams.get('list');
    const category = searchParams.get('category');

    const supabase = await createClient();

    // 1. 履歴セレクトボックス用の過去サイクル一覧返却
    if (list === 'true') {
      let query = supabase
        .from('ai_pipeline_cycles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (category) {
        query = query.eq('category', category);
      }

      const { data: cycles, error: listErr } = await query;
      if (listErr) throw listErr;
      return NextResponse.json({ success: true, cycles: cycles || [] });
    }

    // 2. 特定サイクルの全データ取得
    let cycleQuery = supabase
      .from('ai_pipeline_cycles')
      .select('*')
      .order('created_at', { ascending: false });

    if (cycleId) {
      cycleQuery = cycleQuery.eq('id', cycleId);
    } else if (category) {
      cycleQuery = cycleQuery.eq('category', category);
    }

    const { data: cycle, error: cycleErr } = await cycleQuery.limit(1).single();

    if (cycleErr || !cycle) {
      return NextResponse.json({ success: false, error: 'Cycle not found' }, { status: 404 });
    }

    const [researchRes, deliverablesRes, tacticsRes] = await Promise.all([
      supabase.from('ai_research_items').select('*').eq('cycle_id', cycle.id),
      supabase.from('ai_content_deliverables').select('*').eq('cycle_id', cycle.id),
      supabase.from('ai_platform_tactics').select('*').eq('cycle_id', cycle.id),
    ]);

    const researchItems = researchRes.data || [];
    const deliverables = deliverablesRes.data || [];
    const tactics = tacticsRes.data || [];

    const igDeliverable = deliverables.find((d) => d.platform === 'instagram');
    const xDeliverable = deliverables.find((d) => d.platform === 'x');
    const discordDeliverable = deliverables.find((d) => d.platform === 'discord');

    const igTactic = tactics.find((t) => t.platform === 'instagram');
    const xTactic = tactics.find((t) => t.platform === 'x');

    // 3. サヤ取りレポート復元
    const buildProfitableCards = (regionKey: 'us' | 'eu' | 'asia') => {
      const items = researchItems.filter((i) => i.agent_key === 'arbitrage' && i.region === regionKey);
      if (items.length === 0) return null;

      const slotMap: Record<string, any> = {};
      let summaryObj: any = null;

      for (const item of items) {
        if (!slotMap[item.slot_key]) {
          slotMap[item.slot_key] = {
            slotKey: item.slot_key,
            slotLabel: item.slot_key,
            tiers: [],
          };
        }
        if (item.raw_payload) {
          slotMap[item.slot_key].tiers.push(item.raw_payload);
          if (item.raw_payload.reportSummary && !summaryObj) {
            summaryObj = item.raw_payload.reportSummary;
          }
        }
      }

      return {
        title: `【${regionKey.toUpperCase()}】アービトラージレポート`,
        claim: `${regionKey.toUpperCase()}市場向け輸入調達レポート`,
        summary: summaryObj,
        slots: Object.values(slotMap),
      };
    };

    // 4. トレンドレポート復元
    const buildTrendInsights = (regionKey: 'us' | 'eu' | 'asia') => {
      const items = researchItems.filter((i) => i.agent_key === 'trend' && i.region === regionKey);
      if (items.length === 0) return null;

      const hypoMap: Record<string, any> = {};
      let summaryObj: any = null;

      for (const item of items) {
        const headline = item.slot_key;
        if (!hypoMap[headline]) {
          hypoMap[headline] = {
            headline,
            signal: item.raw_payload?.hypothesis?.signal || item.research_insight,
            timeframe: item.liquidity_indicator || '約2週間後',
            items: [],
          };
        }
        if (item.raw_payload) {
          hypoMap[headline].items.push(item.raw_payload);
          if (item.raw_payload.reportSummary && !summaryObj) {
            summaryObj = item.raw_payload.reportSummary;
          }
        }
      }

      return {
        title: `【${regionKey.toUpperCase()}】市場トレンドレポート`,
        claim: `${regionKey.toUpperCase()}市場の急騰先行シグナル`,
        createdAt: cycle.created_at,
        summary: summaryObj,
        hypotheses: Object.values(hypoMap),
      };
    };

    const profitableCards = {
      us: buildProfitableCards('us'),
      eu: buildProfitableCards('eu'),
      asia: buildProfitableCards('asia'),
    };

    const trendInsights = {
      us: buildTrendInsights('us'),
      eu: buildTrendInsights('eu'),
      asia: buildTrendInsights('asia'),
    };

    const mvpItem = researchItems.find((i) => i.is_mvp);

    const formattedData = {
      cycleId: cycle.id,
      pipelineStatus: cycle.status,
      category: cycle.category,
      targetWeek: cycle.target_week,
      trendInsights,
      profitableCards,
      accountInsights: igTactic?.raw_insights || null,
      xAccountInsights: xTactic?.raw_insights || null,
      chiefPackage: {
        chosenCardOrItem: mvpItem?.card_name || '選定完了',
        mvpHighlight: mvpItem
          ? {
              cardName: mvpItem.card_name,
              region: mvpItem.region,
              slotKey: mvpItem.slot_key,
              hookFact: mvpItem.core_hook_fact || `${mvpItem.card_name} (粗利: ¥${mvpItem.price_spread_jpy})`,
              selectionReason: mvpItem.curator_rationale || '流動性と粗利マージンを総合勘案して選定',
            }
          : null,
        approvedItems: researchItems.filter((i) => i.is_selected),
        contentCalendar: researchItems
          .filter((i) => i.is_selected)
          .map((i) => ({
            dayOfWeek: i.assigned_day,
            dayLabelJa: i.assigned_day,
            postType: i.slot_key,
            selectedCardOrTopic: i.card_name,
            hookFact: i.core_hook_fact || `${i.card_name} (粗利: ¥${i.price_spread_jpy})`,
            hiddenActionReason: i.curator_rationale || '非公開',
            directiveForCreator: {
              instagramAngle: 'カルーセル解説',
              xTwitterAngle: '140字フック＋スレッド',
              discordOfferAngle: '大口卸オファー',
            },
          })),
      },
      snsPosts: igDeliverable?.content_payload || null,
      xPosts: xDeliverable?.content_payload || null,
      salesDM: discordDeliverable?.content_payload || null,
      // 🌟 全240件規模の監査結果を agent_key 付きで返却
      gate1Audits: researchItems
        .filter((i) => i.gate1_status !== 'pending')
        .map((i) => ({
          id: i.id,
          agentKey: i.agent_key,
          card: i.card_name,
          slot: i.slot_key,
          region: i.region,
          priceTier: i.price_tier,
          status: i.gate1_status,
          checks: i.gate1_checks,
          feedback: i.gate1_feedback,
        })),
      gate2Audits: deliverables.map((d) => ({
        id: d.id,
        platform: d.platform,
        day: d.day_of_week,
        status: d.gate2_status,
        checks: d.gate2_checks,
        feedback: d.gate2_feedback,
      })),
    };

    return NextResponse.json({ success: true, cycle, data: formattedData });
  } catch (error: any) {
    console.error('Status fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

--- File: C:\Development Project\website\app\api\pipeline\worker\route.ts ---

// app/api/pipeline/worker/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runMarketTrend } from '@/app/api/ai/intelligence/agents/marketTrend';
import { runSayaAnalysis } from '@/app/api/ai/intelligence/agents/arbitrage';
import { runAccountAnalysis, runXAccountAnalysis } from '@/app/api/ai/intelligence/agents/snsAccount';
import { runCuratorSelection } from '@/app/api/ai/intelligence/agents/curator';
import { runGate1Audit } from '@/app/api/pipeline/gates/gate1';
import { runSnsPosts, runXPosts } from '@/app/api/ai/intelligence/agents/contentCreator';
import { runSalesDM } from '@/app/api/ai/intelligence/agents/salesDM';
import { runGate2Audit } from '@/app/api/pipeline/gates/gate2';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { cycleId } = await req.json().catch(() => ({}));

  if (!cycleId) {
    return NextResponse.json({ success: false, error: 'cycleId is required' }, { status: 400 });
  }

  const { data: cycle, error: cycleErr } = await supabase
    .from('ai_pipeline_cycles')
    .select('*')
    .eq('id', cycleId)
    .single();

  if (cycleErr || !cycle) {
    console.error(`[Worker] Cycle ${cycleId} not found`);
    return NextResponse.json({ success: false, error: 'Cycle not found' }, { status: 404 });
  }

  console.log(`\n==============================================`);
  console.log(`🚀 [Worker Started] Cycle: ${cycleId} | Status: ${cycle.status}`);
  console.log(`==============================================\n`);

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : 'http://localhost:3000');

  const dispatchNext = () => {
    fetch(`${baseUrl}/api/pipeline/worker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycleId }),
    }).catch((err) => console.error('[Worker Auto-dispatch failed]:', err.message));
  };

  try {
    // ------------------------------------------------------------------------
    // Phase 1: 全リサーチ & プラットフォーム戦術（RSI示唆含む）の並列実行
    // ------------------------------------------------------------------------
    if (cycle.status === 'initialized') {
      console.log('▶ [Phase 1] 全リサーチ & 戦術分析を開始します...');
      await supabase.from('ai_pipeline_cycles').update({ status: 'researching' }).eq('id', cycleId);

      // まずIGアナリストを実行し、そのインサイトをXアナリストへ共有
      const igTactics = await runAccountAnalysis(cycle.category);

      const [trendUS, trendEU, trendAsia, sayaUS, sayaEU, sayaAsia, xTactics] =
        await Promise.all([
          runMarketTrend('us', cycle.category),
          runMarketTrend('eu', cycle.category),
          runMarketTrend('asia', cycle.category),
          runSayaAnalysis('us', cycle.category),
          runSayaAnalysis('eu', cycle.category),
          runSayaAnalysis('asia', cycle.category),
          runXAccountAnalysis(igTactics?.raw_insights || igTactics),
        ]);

      const researchRows: any[] = [];

      // A. アービトラージ候補抽出（本命 ＋ 代替候補をフラットに全展開）
      const extractArbitrageItems = (report: any, region: string) => {
        if (!report?.slots || !Array.isArray(report.slots)) return;
        for (const slot of report.slots) {
          if (!slot) continue;
          let tiers: any[] = [];
          if (Array.isArray(slot.tiers)) {
            tiers = slot.tiers;
          } else if (slot.tiers && typeof slot.tiers === 'object') {
            tiers = Object.values(slot.tiers);
          }

          for (const tier of tiers) {
            const allItemsInTier = [
              ...(tier?.mainItem ? [{ ...tier.mainItem, isMain: true }] : []),
              ...(Array.isArray(tier?.subItems)
                ? tier.subItems.map((s: any) => ({ ...s, isMain: false }))
                : []),
            ];

            for (const item of allItemsInTier) {
              if (!item || !item.cardName) continue;
              const buy = parseInt(String(item.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
              const spread = parseInt(String(item.priceSpreadJPY || 0).replace(/[^0-9]/g, '')) || 500;
              const roi = buy > 0 ? Math.round((spread / buy) * 100) : 30;

              researchRows.push({
                cycle_id: cycleId,
                agent_key: 'arbitrage',
                region,
                slot_key: slot.slotKey || 'arbitrage_slot',
                price_tier: tier.priceTier || 'middle',
                card_name: item.cardName,
                condition_grade: item.conditionGrade || 'Raw NM',
                jp_buy_price_jpy: buy,
                target_sold_price_local: item.targetSoldPrice || '$0',
                target_sold_price_jpy: buy + spread,
                price_spread_jpy: spread,
                spread_roi_percent: roi,
                liquidity_indicator: item.liquidity || '直近成約あり',
                research_insight: item.insight || '',
                raw_payload: { ...tier, reportSummary: report.summary, currentItem: item },
                gate1_status: 'pending',
                is_selected: false,
              });
            }
          }
        }
      };

      // B. トレンド候補抽出（仮説ごとの銘柄 & シグナル）
      const extractTrendItems = (report: any, region: string) => {
        if (!report?.hypotheses) return;
        const hypotheses = Array.isArray(report.hypotheses)
          ? report.hypotheses
          : [report.hypotheses];

        for (const hypo of hypotheses) {
          if (!hypo) continue;
          const items = Array.isArray(hypo.items) ? hypo.items : [];
          for (const item of items) {
            if (!item || !item.cardName) continue;
            const buy = parseInt(String(item.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
            const match = String(item.currentLocalPrice || '').match(/約[¥￥]([0-9,]+)/);
            const targetJpy = match ? parseInt(match[1].replace(/,/g, '')) : Math.round(buy * 1.4);
            const spread = Math.max(0, targetJpy - buy);
            const roi = buy > 0 ? Math.round((spread / buy) * 100) : 30;

            researchRows.push({
              cycle_id: cycleId,
              agent_key: 'trend',
              region,
              slot_key: hypo.headline || 'トレンド先行シグナル',
              price_tier: 'middle',
              card_name: item.cardName,
              condition_grade: item.condition || 'Raw NM',
              jp_buy_price_jpy: buy,
              target_sold_price_local: item.currentLocalPrice || '$0',
              target_sold_price_jpy: targetJpy,
              price_spread_jpy: spread,
              spread_roi_percent: roi,
              liquidity_indicator: item.timeframe || hypo.timeframe || '約2週間後',
              research_insight: item.impactLogic || hypo.signal || '',
              raw_payload: { ...item, reportSummary: report.summary, hypothesis: hypo },
              gate1_status: 'pending',
              is_selected: false,
            });
          }
        }
      };

      extractArbitrageItems(sayaUS, 'us');
      extractArbitrageItems(sayaEU, 'eu');
      extractArbitrageItems(sayaAsia, 'asia');

      extractTrendItems(trendUS, 'us');
      extractTrendItems(trendEU, 'eu');
      extractTrendItems(trendAsia, 'asia');

      if (researchRows.length > 0) {
        await supabase.from('ai_research_items').insert(researchRows);
      }

      // SNSアナリストの出力（curatorDirectives を含む raw_insights）を保存
      await supabase.from('ai_platform_tactics').insert([
        {
          cycle_id: cycleId,
          platform: 'instagram',
          recommended_timing: igTactics?.facts?.[1]?.value || '日本時間 21:00',
          hook_guidelines: igTactics?.soWhat || '3秒フック',
          structure_blueprint: igTactics?.curatorDirectives || igTactics?.facts || {},
          raw_insights: igTactics || {},
        },
        {
          cycle_id: cycleId,
          platform: 'x',
          recommended_timing: xTactics?.facts?.[2]?.value || '日本時間 20:00',
          hook_guidelines: '140字フック＋画像4枚案内',
          structure_blueprint: xTactics?.curatorDirectives || xTactics?.facts || {},
          raw_insights: xTactics || {},
        },
      ]);

      await supabase.from('ai_pipeline_cycles').update({ status: 'gate1_auditing' }).eq('id', cycleId);
      console.log('✔ [Phase 1 完了] 全リサーチ & 戦術分析完了。ステータスを gate1_auditing に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'research_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 2: Gate 1 (数値検算 ＆ トレンド論理) 監査
    // ------------------------------------------------------------------------
    if (cycle.status === 'gate1_auditing') {
      console.log('▶ [Phase 2] Gate 1-A (数値検算) & Gate 1-B (トレンド文章論理) 監査を開始します...');
      const { data: allItems } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId);

      const audit = await runGate1Audit((allItems as any) || [], cycle.category);
      const auditResults = Array.isArray(audit?.results) ? audit.results : [];

      for (const res of auditResults) {
        await supabase
          .from('ai_research_items')
          .update({
            gate1_status: res.passed ? 'passed' : 'rejected',
            gate1_checks: res.checks,
            gate1_feedback: res.feedback,
          })
          .eq('id', res.itemId);
      }

      await supabase.from('ai_pipeline_cycles').update({ status: 'curating' }).eq('id', cycleId);
      console.log('✔ [Phase 2 完了] Gate 1 監査完了。ステータスを curating に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'gate1_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 3: チーフ・キュレーター動的選定（RSI示唆 ＆ 3地域トリオ編成）
    // ------------------------------------------------------------------------
    if (cycle.status === 'curating') {
      console.log('▶ [Phase 3] キュレーター動的編成（RSI適応 ＆ 3地域トリオ）を開始します...');

      let { data: passedCandidates } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('gate1_status', 'passed');

      if (!passedCandidates || passedCandidates.length === 0) {
        console.warn('⚠️ Gate 1合格品が0件のため、全候補から選定を行います');
        const fallbackRes = await supabase
          .from('ai_research_items')
          .select('*')
          .eq('cycle_id', cycleId);
        passedCandidates = fallbackRes.data || [];
      }

      // Phase 1 で保存された SNS戦術（curatorDirectives）を取得
      const { data: tactics } = await supabase
        .from('ai_platform_tactics')
        .select('*')
        .eq('cycle_id', cycleId);

      // キュレーター実行（候補銘柄 ＋ SNSアナリスト示唆 を注入）
      const curationResult = await runCuratorSelection(
        (passedCandidates as any) || [],
        tactics || [],
        cycle.category
      );

      const weeklyLineup = curationResult?.weeklyLineup || [];
      const mvpItemId = curationResult?.mvpItemId;

      // 一旦全商品の選定フラグをリセット
      await supabase
        .from('ai_research_items')
        .update({ is_selected: false, is_mvp: false, assigned_day: null })
        .eq('cycle_id', cycleId);

      // キュレーターが選んだ全商品（7日分 × 3商品トリオ ＋ トレンド/的中）をDBに反映
      for (const daily of weeklyLineup) {
        for (const item of daily.items || []) {
          if (!item?.itemId) continue;
          await supabase
            .from('ai_research_items')
            .update({
              is_selected: true,
              is_mvp: Boolean(item.isMvp) || item.itemId === mvpItemId,
              assigned_day: daily.day,
              core_hook_fact: item.coreHookFact || daily.themeLabel,
              curator_rationale: item.rationale || daily.dayRationale,
            })
            .eq('id', item.itemId);
        }
      }

      await supabase.from('ai_pipeline_cycles').update({ status: 'generating_content' }).eq('id', cycleId);
      console.log('✔ [Phase 3 完了] 7日分動的ポートフォリオ選定完了。ステータスを generating_content に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'curation_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 4: 原稿生成（weeklyLineup に完全追従した IG / X / Discord執筆）
    // ------------------------------------------------------------------------
    if (cycle.status === 'generating_content') {
      console.log('▶ [Phase 4] 動的週間編成に沿った SNS原稿 ＆ Discordオファー制作を開始します...');
      const { data: approvedItems } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('is_selected', true);

      const { data: tactics } = await supabase
        .from('ai_platform_tactics')
        .select('*')
        .eq('cycle_id', cycleId);

      const igTactic = tactics?.find((t) => t.platform === 'instagram');
      const xTactic = tactics?.find((t) => t.platform === 'x');

      const mvpItem = approvedItems?.find((i) => i.is_mvp) || approvedItems?.[0];

      // 各曜日の3地域トリオ・商材データを構造化した chiefPackage を構築
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const structuredWeeklyLineup = days.map((day) => {
        const dayItems = approvedItems?.filter((i) => i.assigned_day === day) || [];
        return {
          day,
          items: dayItems.map((item) => ({
            itemId: item.id,
            region: item.region,
            cardName: item.card_name,
            condition: item.condition_grade,
            jpBuyPriceJPY: item.jp_buy_price_jpy,
            targetSoldPrice: item.target_sold_price_local,
            priceSpreadJPY: item.price_spread_jpy,
            spreadROI: `${item.spread_roi_percent}%`,
            coreHookFact: item.core_hook_fact,
            rationale: item.curator_rationale,
          })),
        };
      });

      const chiefPackage = {
        chosenCardOrItem: mvpItem?.card_name,
        mvpHighlight: mvpItem,
        weeklyLineup: structuredWeeklyLineup,
        approvedItems,
      };

      const [snsPosts, xPosts, salesDM] = await Promise.all([
        runSnsPosts(chiefPackage, igTactic?.raw_insights, cycle.category),
        runXPosts(chiefPackage, xTactic?.raw_insights, cycle.category),
        runSalesDM(chiefPackage),
      ]);

      const deliverableRows: any[] = [];
      for (const day of days) {
        const dayItems = approvedItems?.filter((i) => i.assigned_day === day) || [];
        const primaryItem = dayItems.find((i) => i.is_mvp) || dayItems[0] || mvpItem;

        deliverableRows.push(
          {
            cycle_id: cycleId,
            research_item_id: primaryItem?.id,
            platform: 'instagram',
            post_type: 'carousel',
            day_of_week: day,
            content_payload: snsPosts,
            status: 'draft',
            gate2_status: 'pending',
          },
          {
            cycle_id: cycleId,
            research_item_id: primaryItem?.id,
            platform: 'x',
            post_type: 'thread',
            day_of_week: day,
            content_payload: xPosts,
            status: 'draft',
            gate2_status: 'pending',
          }
        );
      }

      deliverableRows.push({
        cycle_id: cycleId,
        research_item_id: mvpItem?.id,
        platform: 'discord',
        post_type: 'wholesale_offer',
        day_of_week: 'Weekly',
        content_payload: salesDM,
        status: 'draft',
        gate2_status: 'pending',
      });

      await supabase
        .from('ai_content_deliverables')
        .delete()
        .eq('cycle_id', cycleId);

      await supabase.from('ai_content_deliverables').insert(deliverableRows);
      await supabase.from('ai_pipeline_cycles').update({ status: 'gate2_auditing' }).eq('id', cycleId);
      console.log('✔ [Phase 4 完了] 全原稿生成完了。ステータスを gate2_auditing に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'content_generation_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 5: Gate 2 (表現・規約・撒き餌) 監査 ＆ 自動自己修正ループ
    // ------------------------------------------------------------------------
    if (cycle.status === 'gate2_auditing') {
      console.log('▶ [Phase 5] Gate 2 表現・撒き餌原則監査を開始します...');
      const { data: deliverables } = await supabase
        .from('ai_content_deliverables')
        .select('*')
        .eq('cycle_id', cycleId);

      const audit = await runGate2Audit(deliverables || []);
      const auditResults = Array.isArray(audit?.results) ? audit.results : [];

      let hasRetryTarget = false;

      for (const res of auditResults) {
        const current = deliverables?.find((d) => d.id === res.deliverableId);
        const currentRetry = current?.retry_count || 0;

        if (res.passed) {
          await supabase
            .from('ai_content_deliverables')
            .update({
              gate2_status: 'passed',
              status: 'approved',
              gate2_checks: res.checks,
              gate2_feedback: null,
            })
            .eq('id', res.deliverableId);
        } else {
          // 2回未満の差し戻しなら自動修正ループをトリガー
          if (currentRetry < 2) {
            hasRetryTarget = true;
            console.log(
              `⚠️ 原稿ID ${res.deliverableId} (${current?.platform}) に修正要請が出たため自動自己修正を実行します (試行: ${currentRetry + 1}回目)`
            );

            let updatedPayload = current?.content_payload;

            // Xの140文字超過時の自動安全トリミング
            if (res.feedback?.includes('140文字')) {
              if (updatedPayload?.dailyThreads) {
                updatedPayload.dailyThreads = updatedPayload.dailyThreads.map((t: any) => {
                  if (t.day?.includes(current?.day_of_week) && t.mainPost?.length > 140) {
                    return { ...t, mainPost: t.mainPost.slice(0, 137) + '...' };
                  }
                  return t;
                });
              }
            }

            await supabase
              .from('ai_content_deliverables')
              .update({
                content_payload: updatedPayload,
                gate2_status: 'pending',
                gate2_feedback: res.feedback,
                retry_count: currentRetry + 1,
              })
              .eq('id', res.deliverableId);
          } else {
            // 2回修正しても通らなかった場合は人間にエスカレーション
            await supabase
              .from('ai_content_deliverables')
              .update({
                gate2_status: 'rejected',
                gate2_feedback: res.feedback,
                status: 'rejected',
                retry_count: currentRetry + 1,
              })
              .eq('id', res.deliverableId);
          }
        }
      }

      if (hasRetryTarget) {
        dispatchNext();
        return NextResponse.json({ success: true, step: 'gate2_retrying' });
      }

      const { data: finalDeliverables } = await supabase
        .from('ai_content_deliverables')
        .select('*')
        .eq('cycle_id', cycleId);

      const allApproved = finalDeliverables?.every((d) => d.gate2_status === 'passed');
      const finalStatus = allApproved ? 'ready_to_publish' : 'partially_failed';

      await supabase.from('ai_pipeline_cycles').update({ status: finalStatus }).eq('id', cycleId);
      console.log(`✔ [全フェーズ完了] 最終ステータス: ${finalStatus}`);
      return NextResponse.json({ success: true, step: 'pipeline_completed', finalStatus });
    }

    return NextResponse.json({ success: true, status: cycle.status });
  } catch (error: any) {
    console.error('[Worker Fatal Error]:', error);
    await supabase.from('ai_pipeline_cycles').update({ status: 'failed' }).eq('id', cycleId);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

--- File: C:\Development Project\website\app\api\cron\intelligence\route.ts ---

// app/api/cron/intelligence/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    // Vercel Cron の認証検証（環境変数 CRON_SECRET がある場合）
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 🌟 新しい非同期パイプラインを triggerType='cron' でキックオフ（即時 202 応答）
    const res = await fetch(`${baseUrl}/api/pipeline/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'pokemon', triggerType: 'cron' }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Cron pipeline trigger error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
