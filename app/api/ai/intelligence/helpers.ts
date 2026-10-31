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