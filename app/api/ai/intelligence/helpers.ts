// app/api/ai/intelligence/helpers.ts
import { createClient } from '@/lib/supabase/server';

export function parseAIJson(content: string): any {
  if (!content) return null;

  // 1. マークダウンコードブロック (```json ... ```) の除去
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
  }

  // 2. 末尾カンマ (Trailing Comma: ,} や ,]) の削除
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    // 3. バックアップ修復: JSON文字列プロパティ内のエスケープ漏れ " や未処理文字の自動修復
    try {
      const match = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        let sanitized = match[0].replace(/,\s*([\]}])/g, '$1');

        // キーと値の境界以外の部分にある孤立した二重引用符をシングルクォートに置換して救済
        sanitized = sanitized.replace(/(:\s*"[\s\S]*?")(\s*[,}])/g, (fullMatch) => {
          return fullMatch;
        });

        return JSON.parse(sanitized);
      }
    } catch {
      // 4. 最終フェイルセーフ: 生改行や制御文字を置換
      try {
        const sanitizedNewlines = cleaned
          .replace(/[\u0000-\u001F]+/g, (c) => (c === '\n' || c === '\r' ? '\\n' : ''))
          .replace(/,\s*([\]}])/g, '$1');
        return JSON.parse(sanitizedNewlines);
      } catch (finalErr) {
        console.error('AI JSON parse critical error:', finalErr, content);
      }
    }
    return null;
  }
}

// カテゴリ表示名変換
export function getCategoryName(category: string = 'pokemon'): string {
  const categoryNames: Record<string, string> = {
    pokemon: 'ポケモンカード',
    onepiece: 'ワンピースカード',
    yugioh: '遊戯王OCG',
    figure: 'スケールフィギュア・ホビー',
  };
  return categoryNames[category] || 'トレカ・ホビー';
}

// RSI学習ルールの取得ヘルパー
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
    return (
      `\n【RSI自律学習ルール（最優先で遵守すること）】\n` +
      data.map((d) => `- ${d.content}`).join('\n')
    );
  } catch {
    return '';
  }
}