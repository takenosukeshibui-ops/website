// app/api/ai/intelligence/helpers.ts
import { createClient } from '@/lib/supabase/server';

export function parseAIJson(content: string) {
    try {
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("AI JSON parse error:", e, content);
        return null;
    }
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