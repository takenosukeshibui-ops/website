// app/api/ai/intelligence/agents/chief.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getCategoryName } from '../helpers';

export async function runChiefManager(trends: any, profits: any, category: string = 'pokemon') {
    const categoryName = getCategoryName(category);
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        temperature: 0.2,
        maxOutputTokens: 8192,
    });

    const prompt = `あなたは越境【${categoryName}】代理購入事業の最高意思決定者である【チーフマネージャー】です。
あなたの責務は、6名のリサーチャー（米欧亜の市場トレンドアナリスト3名、米欧亜のアービトラージアナリスト3名）から提出されたレポートを総合審査し、
単一地域や1つの商材に偏ることなく【7日分の週間コンテンツカレンダー（月曜〜日曜）】として日替わりで戦略的に編成し、SNSクリエイターとコミュニティ営業へ発行することです。

【⚠️ 最重要：需要の前提と答えを教えない『撒き餌』ディレクション原則】
1. 欧米公式大会における日本語版プレイ需要の誤認禁止:
   - 欧米公式大会では日本語版カードの使用は禁止されています。
   - したがって、大会メタカードであってもノーマルや汎用パーツではなく、「最高レアリティ（SAR/UR）の鑑賞・記念需要」「日本限定プロモ」「特定作家アート」などのコレクター・資産価値を重視して選定してください。
2. 情報（Reason）と行動（Action）の秘匿分離:
   - 無料SNSで拡散させる内容は「事実（Fact）」と「数字・結果（Result）」のみに限定すること。
   - 公開OK: 各地域の確定価格差、現地実成約相場、客観的シグナル、価格推移（Fact / Result）
   - 公開NG（厳重秘匿）: 日本国内の具体的な仕入れ店舗名、仕入れルート、検品・PSA鑑定ノウハウ、詳細な高騰波及理由（Action / Reason）
   - 導線分離: 「詳細理由（Reason）」を求める層を有料VIP Discordへ、「代行調達（Action）」を求める層を自社サイトへ誘導すること。

【リサーチャー提出レポート】
■ 市場トレンド（米/欧/亜 トレンド仮説 ＆ 波及銘柄Rank 1〜5）:
${JSON.stringify(trends)}

■ アービトラージ利ざや（米/欧/亜 5スロット×5価格帯）:
${JSON.stringify(profits)}

【週間カレンダー編成ルール（全7日分を必ず網羅すること）】
1. 月曜 (Monday): Flagship_GlobalCatalog
   - 看板案件（MVP）を表紙に据え、世界3大市場（米・欧・亜）の価格差とトレンドを俯瞰する大型総合カタログ。
2. 火曜 (Tuesday): Vintage_Focus
   - クラシック・ヴィンテージ（旧裏〜PCG）およびネオ・ヴィンテージ（DP〜XY）の海外高騰・サヤ取り特集。
3. 水曜 (Wednesday): Promo_Focus
   - 日本限定ジムプロモ、ポケセン限定品、映画・企業タイアップ品の海外需要・価格差特集。
4. 木曜 (Thursday): Modern_Meta_Focus
   - 最新弾の先行需要、象徴的エースポケモンの最高レアSAR、作家アートの現地回転・需要特集。
5. 金曜 (Friday): Graded_Sealed_Focus
   - PSA10鑑定品プレミアム、POP数希少品、絶版未開封BOXの海外資産需要・大口直送特集。
6. 土曜 (Saturday): Hit_Proof_SocialProof
   - 的中実績・証明投稿（タイプC）。過去の予測データと現在の急騰結果を並べ、情報の確度を誇示する社会的証明。
7. 日曜 (Sunday): Weekly_Summary_CTA
   - 今週の利益率ランキング振り返りと、来週の波に乗るためのVIP Discord＆自社サイトへの総括誘導。

必ず以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "selectedLeadMagnetType": "GlobalCatalog",
  "winningRegion": "global",
  "leadMagnetTitle": "世界3大市場（米・欧・亜）日本語版ポケカ最新価格差＆トレンド週間インテリジェンス",
  "mvpHighlight": {
    "cardName": "全案件中、最も数字・利ざやインパクトが大きい目玉カード名（状態含む）",
    "region": "us または eu または asia",
    "slotKey": "classic_vintage / neo_vintage / exclusive_promo / modern_meta / graded_sealed",
    "hookFact": "最も目を引く確定価格差や現地相場（例: 国内仕入れ¥18,000 → 米国実成約$340 / 差額+¥32,000）",
    "selectionReason": "今週のMVPとして選定した戦略的理由"
  },
  "regionalMatrix": {
    "us": {
      "topArbitrage": "北米向け最高利益案件のカード名とNet ROI",
      "topTrend": "北米先行トレンド最注目銘柄と需要ドライバー",
      "summary": "北米市場の今週の総括（1文）"
    },
    "eu": {
      "topArbitrage": "欧州向け最高利益案件のカード名とNet ROI",
      "topTrend": "欧州先行トレンド最注目銘柄と需要ドライバー",
      "summary": "欧州市場の今週の総括（1文）"
    },
    "asia": {
      "topArbitrage": "アジア向け最高利益案件のカード名とNet ROI",
      "topTrend": "アジア先行トレンド最注目銘柄と需要ドライバー",
      "summary": "アジア市場の今週の総括（1文）"
    }
  },
  "globalInsight": "3地域を俯瞰したプロの示唆（地域ごとの買い傾向・言語プレミアム・資金移動の差）",
  "nextWeekResearchBias": "利ざや偏重（Arbitrage-focused） または トレンド偏重（Trend-focused）",
  "selectionReason": "MVP案件および全体カレンダー編成のディレクション方針サマリー",
  "coreHookFact": "月曜看板投稿で提示する最重要フック数値",
  "creativeDirective": {
    "instagramAngle": "Instagramクリエイター向け: 週間全体のカルーセル統一トンマナと週初め表紙の指示",
    "xTwitterAngle": "Xクリエイター向け: 毎日1ポスト目140字フック＋スレッド展開＋画像4枚指示",
    "discordOfferAngle": "Discord営業向け: 週前半の速報シェアと週末前の大口直送オファー指示"
  },
  "contentCalendar": [
    {
      "dayOfWeek": "Monday",
      "dayLabelJa": "月曜: 世界3大市場サヤ比較まとめ (MVP特集)",
      "postType": "Flagship_GlobalCatalog",
      "targetSlot": "all",
      "targetRegion": "all",
      "selectedCardOrTopic": "MVP銘柄を中心とした3地域横断比較カタログ",
      "hookFact": "無料SNSで提示する数字・事実（各地域の確定価格差リスト）",
      "hiddenActionReason": "SNS上では絶対に伏せるべき仕入れルート・詳細理由の秘匿指示",
      "directiveForCreator": {
        "instagramAngle": "1枚目表紙（世界比較フック）→ 2〜4枚目（米・欧・亜）→ 5枚目（まとめ）→ 6枚目（2股CTA）",
        "xTwitterAngle": "1ポスト目140字フック → 2〜4ポスト目地域別ツリー → 5ポスト目CTA",
        "discordOfferAngle": "VIP限定の3地域完全比較フルレポートの告知"
      }
    },
    {
      "dayOfWeek": "Tuesday",
      "dayLabelJa": "火曜: ヴィンテージ特化（旧裏〜DP絶版）",
      "postType": "Vintage_Focus",
      "targetSlot": "classic_vintage",
      "targetRegion": "us",
      "selectedCardOrTopic": "選定したヴィンテージカード名（状態含む）",
      "hookFact": "国内相場と海外成約相場の事実比較",
      "hiddenActionReason": "国内の鑑定品確保ルートや仕入れノウハウの秘匿指示",
      "directiveForCreator": {
        "instagramAngle": "カルーセル構成指示",
        "xTwitterAngle": "スレッド構成指示",
        "discordOfferAngle": "ヴィンテージ大口仕入れオファー指示"
      }
    },
    {
      "dayOfWeek": "Wednesday",
      "dayLabelJa": "水曜: 限定プロモ特化（日本限定希少品）",
      "postType": "Promo_Focus",
      "targetSlot": "exclusive_promo",
      "targetRegion": "eu",
      "selectedCardOrTopic": "選定した限定プロモカード名",
      "hookFact": "日本限定品の海外プレミアム事実",
      "hiddenActionReason": "入手経路や未開封保存状態の選別ノウハウの秘匿指示",
      "directiveForCreator": {
        "instagramAngle": "カルーセル構成指示",
        "xTwitterAngle": "スレッド構成指示",
        "discordOfferAngle": "限定プロモ直送オファー指示"
      }
    },
    {
      "dayOfWeek": "Thursday",
      "dayLabelJa": "木曜: 最新弾先行・象徴アート特化（新弾先行・最高レアSAR需要）",
      "postType": "Modern_Meta_Focus",
      "targetSlot": "modern_meta",
      "targetRegion": "us",
      "selectedCardOrTopic": "選定した現行モダン最高レアカード名",
      "hookFact": "海外での新弾タイムラグ先行成約や初期SARの価格差事実",
      "hiddenActionReason": "発売直後の最安仕入れタイミング等の秘匿指示",
      "directiveForCreator": {
        "instagramAngle": "カルーセル構成指示",
        "xTwitterAngle": "スレッド構成指示",
        "discordOfferAngle": "即金回転ロットオファー指示"
      }
    },
    {
      "dayOfWeek": "Friday",
      "dayLabelJa": "金曜: 高額鑑定・BOX特化（週末大口オファー）",
      "postType": "Graded_Sealed_Focus",
      "targetSlot": "graded_sealed",
      "targetRegion": "asia",
      "selectedCardOrTopic": "選定したPSA10鑑定品または未開封BOX名",
      "hookFact": "PSA10の海外成約プレミアムやBOX相場の事実",
      "hiddenActionReason": "再シュリンク見極め法や安全直送便の秘匿指示",
      "directiveForCreator": {
        "instagramAngle": "カルーセル構成指示",
        "xTwitterAngle": "スレッド構成指示",
        "discordOfferAngle": "週末の決済・直送手配ロット確保オファー指示"
      }
    },
    {
      "dayOfWeek": "Saturday",
      "dayLabelJa": "土曜: 的中実績・社会的証明（タイプC）",
      "postType": "Hit_Proof_SocialProof",
      "targetSlot": "all",
      "targetRegion": "all",
      "selectedCardOrTopic": "過去の予測で実際に海外成約が跳ねた的中銘柄",
      "hookFact": "当時の予測レポート画面と現在の海外成約急騰画面の対比事実",
      "hiddenActionReason": "次の急騰予測シグナルの検知ロジックの秘匿指示",
      "directiveForCreator": {
        "instagramAngle": "ビフォーアフター対比スライド構成",
        "xTwitterAngle": "当時のポスト引用＋現在価格スクショ構成",
        "discordOfferAngle": "今後の一次情報を受け取るためのVIP Discord案内"
      }
    },
    {
      "dayOfWeek": "Sunday",
      "dayLabelJa": "日曜: 週間まとめ＆利益ランキング（来週への布石）",
      "postType": "Weekly_Summary_CTA",
      "targetSlot": "all",
      "targetRegion": "all",
      "selectedCardOrTopic": "今週の利益率トップ3・急騰トップ3のまとめ",
      "hookFact": "今週1週間のサヤ取り・トレンド総括データ",
      "hiddenActionReason": "来週初動の先行仕込みリストの秘匿指示",
      "directiveForCreator": {
        "instagramAngle": "週間ランキングまとめスライド構成",
        "xTwitterAngle": "週間まとめスレッド構成",
        "discordOfferAngle": "月曜朝の最速インテリジェンス配信に向けたDiscord参加CTA"
      }
    }
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}