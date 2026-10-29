import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getCategoryName } from '../helpers';

export async function runChiefManager(trends: any, profits: any, category: string = 'pokemon') {
    const categoryName = getCategoryName(category);
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const prompt = `あなたは越境【${categoryName}】代理購入事業の【チーフマネージャー】です。
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