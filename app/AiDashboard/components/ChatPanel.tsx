// app/AiDashboard/components/ChatPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import { IntelligenceData, RegionKey, ChatMessage, KnowledgeItem, CategoryKey } from '../types';

interface ChatPanelProps {
    activeCategory: CategoryKey;
    aiActiveDesk: string;
    activeTrendRegion: RegionKey;
    activeArbitrageRegion: RegionKey;
    aiData: IntelligenceData | null;
    runSingleAi: (action: string, region?: RegionKey) => void;
    runningAction: string | null;
}

export default function ChatPanel({
    activeCategory,
    aiActiveDesk,
    activeTrendRegion,
    activeArbitrageRegion,
    aiData,
    runSingleAi,
    runningAction
}: ChatPanelProps) {
    const [chatCommand, setChatCommand] = useState('');
    const [chatLogs, setChatLogs] = useState<Record<string, ChatMessage[]>>({});
    const [isChatSubmitting, setIsChatSubmitting] = useState(false);
    const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
    const [showKnowledgePanel, setShowKnowledgePanel] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatLogs, aiActiveDesk]);

    // 🌟 デスクに対応するエージェント識別キーの判定
    const getActiveAgentKey = (desk: string): string | null => {
        if (desk === 'desk_audit') return 'auditor'; // 🛡️ 監査役
        if (desk.startsWith('desk_trend')) return 'trend';
        if (desk.startsWith('desk_arbitrage')) return 'arbitrage';
        if (desk === 'desk_x_account') return 'x_account';
        if (desk === 'desk_account') return 'account';
        if (desk === 'desk_sns') return 'sns';
        if (desk === 'desk_x') return 'x';
        if (desk === 'desk_sales') return 'sales'; // ✉️ コミュニティ営業
        if (desk === 'desk_chief') return 'chief';
        if (desk.startsWith('desk_')) return desk.replace('desk_', '');
        return null;
    };

    // 🌟 デスクに応じたタイトル表示
    const getDeskTitle = (desk: string): string => {
        if (desk === 'desk_audit') return '🛡️ 品質・規約監査役';
        if (desk === 'desk_chief') return '👑 チーフマネージャー（キュレーター）';
        if (desk.startsWith('desk_trend')) return `🔮 市場アナリスト (${activeTrendRegion.toUpperCase()})`;
        if (desk.startsWith('desk_arbitrage')) return `💎 アービトラージアナリスト (${activeArbitrageRegion.toUpperCase()})`;
        if (desk === 'desk_account') return '📊 IGアナリスト';
        if (desk === 'desk_x_account') return '🐦 Xアナリスト';
        if (desk === 'desk_sns') return '📸 Instagram担当';
        if (desk === 'desk_x') return '🐦 Xクリエイター';
        if (desk === 'desk_sales') return '✉️ コミュニティ営業担当';
        return '担当AI';
    };

    const fetchKnowledge = async () => {
        const agentKey = getActiveAgentKey(aiActiveDesk);
        try {
            const url = agentKey ? `/api/ai/knowledge?agentKey=${agentKey}` : '/api/ai/knowledge?agentKey=all';
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) setKnowledgeList(json.knowledge || []);
        } catch (e) {
            console.error('ナレッジ取得エラー:', e);
        }
    };

    useEffect(() => { fetchKnowledge(); }, [aiActiveDesk]);

    const handleDeleteKnowledge = async (id: string) => {
        if (!window.confirm('このナレッジ（学習ルール）を削除しますか？次回からAIはこのルールを参照しなくなります。')) return;
        try {
            const res = await fetch(`/api/ai/knowledge?id=${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setKnowledgeList(prev => prev.filter(k => k.id !== id));
            alert('ナレッジを削除しました');
        } catch (err: any) { alert(`削除エラー: ${err.message}`); }
    };

    const handlePinKnowledge = async (sender: string, text: string, isUserMessage: boolean = false) => {
        const senderToAgentKey: Record<string, string> = {
            'チーフマネージャー': 'chief',
            '品質・規約監査役': 'auditor',
            '監査役': 'auditor',
            '市場アナリスト': 'trend',
            'アービトラージアナリスト': 'arbitrage',
            'IGアナリスト': 'account',
            'Xアナリスト': 'x_account',
            'Instagram担当': 'sns',
            'インスタ担当': 'sns',
            'X担当': 'x',
            'Xクリエイター': 'x',
            '有料コミュニティ担当': 'sales',
            'コミュニティ営業担当': 'sales'
        };
        let agentKey = senderToAgentKey[sender];
        if (isUserMessage) {
            agentKey = getActiveAgentKey(aiActiveDesk) || '';
            if (!agentKey) return alert('個別デスクを開いてから学習登録してください。');
        }
        if (!agentKey) return alert('対象のエージェントが特定できません。');

        const confirmMsg = isUserMessage
            ? `あなたのこの指示を、担当AIの「社内ルール（ナレッジ）」として学習させますか？\n\n${text.slice(0, 60)}...`
            : `この発言を「${sender}」の社内ルール（ナレッジ）として学習させますか？\n\n${text.slice(0, 60)}...`;
        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await fetch('/api/ai/knowledge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentKey, content: text })
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            alert('ナレッジとして学習・登録しました！次回からこのルールを参考にして回答します。');
            fetchKnowledge();
        } catch (err: any) { alert(`エラー: ${err.message}`); }
    };

    const handleSendChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatCommand.trim() || isChatSubmitting) return;

        const userMsgText = chatCommand.trim();
        const currentTarget = aiActiveDesk;
        const nowTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

        const newUserMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'あなた',
            avatar: '👤',
            text: userMsgText,
            isUser: true,
            timestamp: nowTime
        };

        setChatLogs(prev => ({
            ...prev,
            [currentTarget]: [...(prev[currentTarget] || []), newUserMessage]
        }));
        setChatCommand('');
        setIsChatSubmitting(true);

        const currentRegion = aiActiveDesk.startsWith('desk_trend')
            ? activeTrendRegion
            : aiActiveDesk.startsWith('desk_arbitrage')
            ? activeArbitrageRegion
            : undefined;

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target: currentTarget,
                    message: userMsgText,
                    contextData: aiData || {},
                    category: activeCategory,
                    region: currentRegion
                })
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'チャット応答の取得に失敗しました');

            const incomingReplies: ChatMessage[] = (json.replies || []).map((rep: any, idx: number) => ({
                id: `${Date.now()}_${idx}`,
                sender: rep.sender,
                avatar: rep.avatar,
                text: rep.text,
                isUser: false,
                timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
            }));

            setChatLogs(prev => ({
                ...prev,
                [currentTarget]: [...(prev[currentTarget] || []), ...incomingReplies]
            }));
        } catch (err: any) {
            alert(`チャットエラー: ${err.message}`);
        } finally {
            setIsChatSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchChatLogs = async () => {
            try {
                const res = await fetch(`/api/ai/chat?target=${aiActiveDesk}&category=${activeCategory}`);
                const json = await res.json();
                if (json.success && json.logs) {
                    const formatted = json.logs.map((log: any) => ({
                        id: log.id,
                        sender: log.sender,
                        avatar: log.avatar,
                        text: log.text,
                        isUser: log.is_user,
                        timestamp: new Date(log.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                    }));
                    setChatLogs(prev => ({ ...prev, [aiActiveDesk]: formatted }));
                }
            } catch (e) {
                console.error('Chat log fetch error:', e);
            }
        };
        fetchChatLogs();
    }, [aiActiveDesk, activeCategory]);

    return (
        <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <span>💬</span>
                    <span>{getDeskTitle(aiActiveDesk)}との個別チャット</span>
                </h3>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowKnowledgePanel(!showKnowledgePanel)}
                        className="text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all shadow-sm"
                    >
                        <span>📖 蓄積ナレッジ ({knowledgeList.length})</span>
                        <span>{showKnowledgePanel ? '▲' : '▼'}</span>
                    </button>
                    {isChatSubmitting && (
                        <span className="text-[10px] text-blue-400 animate-pulse font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></span>
                            AIが入力中...
                        </span>
                    )}
                </div>
            </div>

            {showKnowledgePanel && (
                <div className="mb-4 bg-slate-900 border border-amber-500/40 rounded-xl p-4 animate-fadeIn shadow-lg space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <span>🧠</span> 学習済み社内ルール一覧（自動注入中）
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => runSingleAi('rsi')}
                                disabled={runningAction === 'rsi'}
                                className="px-2.5 py-1 bg-gradient-to-r from-amber-600 to-emerald-600 hover:opacity-90 text-white rounded text-[10px] font-bold shadow flex items-center gap-1"
                            >
                                {runningAction === 'rsi' ? '🔄 組織を自律改善中...' : '🔄 RSI（自律進化）を実行'}
                            </button>
                        </div>
                    </div>

                    {aiData?.rsiReport && (
                        <div className="bg-slate-950 p-3 rounded-lg border border-amber-500/30 text-xs space-y-2">
                            <div className="flex justify-between items-center text-slate-300">
                                <span className="font-bold text-amber-300">
                                    📊 RSI自己採点スコア: <span className="font-mono text-sm text-white">{aiData.rsiReport.accuracyScore}点</span>
                                </span>
                                <span className="text-[10px] text-slate-500">直近予測ログと実相場を突合分析</span>
                            </div>
                            <p className="text-slate-300 leading-relaxed">{aiData.rsiReport.overallEvaluation}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
                                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                    <span className="text-amber-400 font-bold block mb-0.5">🔮 トレンド重み付け補正</span>
                                    <p className="text-slate-400">{aiData.rsiReport.trendWeightAdjustments?.rationale}</p>
                                </div>
                                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                    <span className="text-emerald-400 font-bold block mb-0.5">💎 サヤスプレッド監査</span>
                                    <p className="text-slate-400">{aiData.rsiReport.arbitrageSpreadAudits?.rationale}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {knowledgeList.length === 0 ? (
                        <p className="text-xs text-slate-500 py-3 text-center">まだ登録されたルールはありません。チャットから「📌 ルールとして学習」を押すか、「🔄 RSIを実行」で蓄積されます。</p>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {knowledgeList.map((item) => (
                                <div key={item.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex justify-between items-start gap-3">
                                    <div className="text-xs text-slate-300 flex-1 whitespace-pre-wrap leading-relaxed">
                                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono mr-2">{item.agent_key}</span>{item.content}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteKnowledge(item.id)}
                                        className="text-slate-500 hover:text-red-400 text-xs px-2 py-1 bg-slate-900 hover:bg-red-500/10 rounded transition-colors"
                                        title="削除"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* チャット履歴表示エリア */}
            <div className="space-y-3 bg-slate-900/60 rounded-xl p-4 border border-slate-800/80 max-h-80 overflow-y-auto shadow-inner">
                {(!chatLogs[aiActiveDesk] || chatLogs[aiActiveDesk].length === 0) ? (
                    <div className="text-center py-8 text-slate-500 text-xs italic">
                        {getDeskTitle(aiActiveDesk)}とのチャット履歴はまだありません。下のフォームから質問や追加指示を送ってみましょう。
                    </div>
                ) : (
                    chatLogs[aiActiveDesk].map((msg) => (
                        <div key={msg.id} className={`flex gap-3 text-xs ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                            {!msg.isUser && (
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-base shadow-sm">
                                    {msg.avatar}
                                </div>
                            )}
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-sm ${msg.isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 border border-slate-700/60 text-slate-200 rounded-bl-none'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-[11px] opacity-80">{msg.sender}</span>
                                    <span className="text-[9px] opacity-50 font-mono">{msg.timestamp}</span>
                                </div>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                                {!msg.isUser && (
                                    <div className="mt-2 pt-2 border-t border-slate-700/50 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handlePinKnowledge(msg.sender, msg.text, false)}
                                            className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 ml-auto transition-colors"
                                        >
                                            <span>📌</span> 回答をルールとして学習
                                        </button>
                                    </div>
                                )}
                                {msg.isUser && (
                                    <div className="mt-2 pt-2 border-t border-blue-500/50 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handlePinKnowledge('YOU', msg.text, true)}
                                            className="text-[10px] text-blue-100 hover:text-white font-bold flex items-center gap-1 ml-auto transition-colors opacity-90 hover:opacity-100"
                                        >
                                            <span>📌</span> この指示を社内ルール化
                                        </button>
                                    </div>
                                )}
                            </div>
                            {msg.isUser && (
                                <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm">
                                    YOU
                                </div>
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* メッセージ入力・送信フォーム */}
            <form onSubmit={handleSendChatMessage} className="mt-3 flex gap-2">
                <input
                    type="text"
                    value={chatCommand}
                    onChange={(e) => setChatCommand(e.target.value)}
                    placeholder={`${getDeskTitle(aiActiveDesk)}に指示や質問を入力... (Enterで送信)`}
                    disabled={isChatSubmitting}
                    className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={!chatCommand.trim() || isChatSubmitting}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shrink-0"
                >
                    {isChatSubmitting ? (
                        <span>応答中...</span>
                    ) : (
                        <>
                            <span>送信</span>
                            <span>🚀</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}