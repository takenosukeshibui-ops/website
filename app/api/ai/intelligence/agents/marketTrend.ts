// app/api/ai/intelligence/agents/marketTrend.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules } from '../helpers';

export async function runMarketTrend(region: 'us' | 'eu' | 'asia' = 'us', _category: string = 'pokemon') {
    const rules = await getAgentRules('trend');

    const regionContexts = {
        us: {
            name: '北米市場（アメリカ・カナダ）',
            targets: 'eBay USA, TCGPlayer, 米国YouTuber/インフルエンサー動向, Reddit (r/pkmntcgcollections等)',
            focus: '日本先行発売に伴うタイムラグ先行需要、海外大会メタ入り後の日本語版ハイレアリティ投資、初期ヴィンテージの再評価'
        },
        eu: {
            name: '欧州市場（イギリス・ドイツ・フランス等）',
            targets: 'Cardmarket (EU), eBay UK/DE, 欧州コレクターコミュニティ',
            focus: '言語版差異プレミアム、PSA10鑑定品の欧州コレクター需要、日本限定ジムプロモ・ポケセン限定品の希少性'
        },
        asia: {
            name: 'アジア市場（台湾・香港・韓国・東南アジア）',
            targets: 'Shopee, 現地専門店, 各国トレカコミュニティ',
            focus: '女性サポートSR/SARの熱量、日本限定プロモやピカチュウ/リザードン等の限定品の投資資金流入'
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

【調査任務：5大スロット網羅リサーチ（週次定点観測）】
現行の新弾に偏ることなく、以下の5つのスロットすべてについて【マクロ動向】と【具体的商品】を抽出してください。

1. classic_vintage: クラシック・ヴィンテージ枠（旧裏面、eシリーズ、ADV/PCG等）
2. neo_vintage: ネオ・ヴィンテージ枠（DP/Pt、LEGEND、BW、XY等の絶版・世代回帰）
3. exclusive_promo: 限定プロモ・配布枠（ジムプロモ、ポケセン限定、映画・企業タイアップ、配布枚数限定）
4. modern_meta: 現行モダン・メタ枠（SM、SS、SVのSAR/SR/UR、直近弾先行需要、世界大会メタ）
5. graded_sealed: 高額鑑定・POP希少・未開封BOX枠（PSA10/BGS Black Label、絶版未開封BOX等）

【抽出件数の動的ルール（案B）】
- 各スロットの銘柄（items）は【基本1商品】を厳選すること。
- ただし、以下の【熱狂解禁トリガー】のいずれかを満たす強いシグナルがある場合のみ、例外として【最大2商品】まで抽出してよい（無理な数合わせは厳禁）:
  ① 取引速度の急変: 直近1〜2週間で実成約数が通常時の1.5倍以上に急増
  ② 価格ブレイク: 直近30日以内で成約相場が+30%以上急上昇
  ③ ソーシャル過熱: 海外インフルエンサーの言及や海外コミュニティでスレッドが急増

【厳格品質担保ルール】
1. 架空の銘柄は絶対に出力せず、実在する人気カード名・BOX名を正確に出力すること。
2. 【3点観測のクロスチェック】: 各商品について「先行/限定性」「アート/コレクター性」「ソーシャル熱量/取引急増」の3軸中、最低2軸以上の裏付けを明記すること。
3. 【自己反証（悪魔の代弁者）の義務化】: 「一時的な過熱（Pump）ではないか？」「海外版が出ても日本語版が選ばれる理由はあるか？」を自ら検証し、耐え抜いた理由を記述すること。
${rules}

必ず以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "title": "【${region.toUpperCase()}トレンド】世界3大市場 5大スロット網羅トレンドレポート",
  "claim": "今週の${cur.name}における日本語版ポケカ市場の総括的結論（最も熱いスロット、資金流入傾向）",
  "reasons": [
    "全体潮目1: 主要スロットにおける海外コレクターの資金移動動向",
    "全体潮目2: 現地コミュニティやインフルエンサーの反響トレンド",
    "全体潮目3: 為替および流通在庫の枯渇傾向"
  ],
  "facts": [
    { "label": "最注目スロット", "value": "例: クラシック・ヴィンテージ枠" },
    { "label": "平均上昇トレンド", "value": "+XX.X% (注目銘柄群)" },
    { "label": "海外熱狂度", "value": "高熱量 (言及頻度急増)" },
    { "label": "3点観測適合度", "value": "全スロット2軸以上裏付け完了" }
  ],
  "soWhat": "自社事業への示唆（自社サイトでの早期仕入れオファー ＆ VIP Discordでの先行情報共有）",
  "riskAndMitigation": {
    "risk": "海外版発売や一時的バブルによる急落リスク",
    "mitigation": "PSA10/高グレード鑑定品による差別化または初動売り抜け指示"
  },
  "verificationChecklist": [
    "実在カード名および直近成約の確認",
    "海外コミュニティ（Reddit/X/YouTube）での言及頻度確認",
    "国内フリマ・専門店の流通在庫状況チェック"
  ],
  "slots": [
    {
      "slotKey": "classic_vintage",
      "slotLabel": "クラシック・ヴィンテージ枠（旧裏〜PCG期）",
      "macroTrend": "このスロットで起きているマクロな潮目・海外需要の背景解説（1〜2文）",
      "isSurgeTriggered": false,
      "surgeReason": "2件目を出した理由（トリガー該当時のみ記入。1件なら空文字）",
      "items": [
        {
          "cardName": "正確なカード名 / 収録弾・年代",
          "condition": "PSA9 / PSA10 / Raw NM 等",
          "currentJpPriceJPY": "¥XX,XXX",
          "targetMarketPrice": "$XXX / €XXX",
          "growthRate": "+XX.X%",
          "threePointCheck": "アート視点＋ソーシャル言及の2軸適合（具体的な裏付け）",
          "devilAdvocate": {
            "risk": "自己反証による懸念（例: 状態判定のブレ、一時的過熱等）",
            "mitigation": "対抗策（例: PSA鑑定化による保証、初版希少性等）"
          }
        }
      ]
    },
    {
      "slotKey": "neo_vintage",
      "slotLabel": "ネオ・ヴィンテージ枠（DP〜XY期）",
      "macroTrend": "マクロ動向解説",
      "isSurgeTriggered": false,
      "surgeReason": "",
      "items": [
        {
          "cardName": "カード名",
          "condition": "状態",
          "currentJpPriceJPY": "¥XX,XXX",
          "targetMarketPrice": "$XXX",
          "growthRate": "+XX%",
          "threePointCheck": "2軸以上の適合理由",
          "devilAdvocate": { "risk": "懸念", "mitigation": "対策" }
        }
      ]
    },
    {
      "slotKey": "exclusive_promo",
      "slotLabel": "限定プロモ・配布枠",
      "macroTrend": "マクロ動向解説",
      "isSurgeTriggered": false,
      "surgeReason": "",
      "items": [
        {
          "cardName": "カード名",
          "condition": "状態",
          "currentJpPriceJPY": "¥XX,XXX",
          "targetMarketPrice": "$XXX",
          "growthRate": "+XX%",
          "threePointCheck": "2軸以上の適合理由",
          "devilAdvocate": { "risk": "懸念", "mitigation": "対策" }
        }
      ]
    },
    {
      "slotKey": "modern_meta",
      "slotLabel": "現行モダン・メタ枠",
      "macroTrend": "マクロ動向解説",
      "isSurgeTriggered": false,
      "surgeReason": "",
      "items": [
        {
          "cardName": "カード名",
          "condition": "状態",
          "currentJpPriceJPY": "¥XX,XXX",
          "targetMarketPrice": "$XXX",
          "growthRate": "+XX%",
          "threePointCheck": "2軸以上の適合理由",
          "devilAdvocate": { "risk": "懸念", "mitigation": "対策" }
        }
      ]
    },
    {
      "slotKey": "graded_sealed",
      "slotLabel": "高額鑑定・POP希少・未開封BOX枠",
      "macroTrend": "マクロ動向解説",
      "isSurgeTriggered": false,
      "surgeReason": "",
      "items": [
        {
          "cardName": "カード名 / BOX名",
          "condition": "PSA10 / 未開封シュリンク付 等",
          "currentJpPriceJPY": "¥XX,XXX",
          "targetMarketPrice": "$XXX",
          "growthRate": "+XX%",
          "threePointCheck": "2軸以上の適合理由",
          "devilAdvocate": { "risk": "懸念", "mitigation": "対策" }
        }
      ]
    }
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}