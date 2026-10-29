export function parseAIJson(content: string) {
    try {
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("AI JSON parse error:", e, content);
        return null;
    }
}

export function getCategoryName(category: string = 'pokemon'): string {
    const categoryNames: Record<string, string> = {
        pokemon: 'ポケモンカード',
        onepiece: 'ワンピースカード',
        yugioh: '遊戯王OCG',
        figure: 'スケールフィギュア'
    };
    return categoryNames[category] || 'トレカ・ホビー';
}