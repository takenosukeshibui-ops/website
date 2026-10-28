// app/admin/intelligence/page.tsx
'use client';

import React, { useState } from 'react';

// レスポンスの型定義
interface ProfitableCard {
  cardName: string;
  jpPriceJPY: number;
  usPriceUSD: number;
  estimatedProfitUSD: number;
  reason: string;
}

interface SnsPosts {
  trendPost: string;
  arbitragePost: string;
  hybridPost: string;
}

interface IntelligenceData {
  trendInsights: string[];
  profitableCards: ProfitableCard[];
  snsPosts: SnsPosts;
  salesDM: string;
}

export default function IntelligenceDashboard() {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // AIパイプラインを実行する
  const runIntelligenceAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/intelligence', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error(`エラーが発生しました: ${res.statusText}`);
      }

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || '解析に失敗しました');
      }

      setData(json.data);
    } catch (err: any) {
      setError(err.message || '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // テキストをクリップボードにコピー
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ヘッダーセクション */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-amber-400">⚡</span> 市場インテリジェンス・AIオペレーション
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Gemini × LangGraph により、市場トレンドとサヤ抜きカードの発掘、販促テキストの生成を自動実行します。
            </p>
          </div>

          <button
            onClick={runIntelligenceAnalysis}
            disabled={loading}
            className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg flex items-center justify-center gap-2 ${
              loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-blue-500/20'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                AIエージェント分析中...
              </>
            ) : (
              <>
                <span>🚀 最新インテリジェンスを実行</span>
              </>
            )}
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="p-4 bg-red-950/50 border border-red-800/80 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* 結果表示エリア */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 左カラム：情報収集＆サヤ発掘結果 */}
            <div className="space-y-6">
              
              {/* 1. 予言者AI：トレンドインサイト */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-sm">🔮</span>
                  市場トレンドインサイト（予言者AI）
                </h2>
                <ul className="space-y-3">
                  {data.trendInsights.map((insight, idx) => (
                    <li key={idx} className="text-sm text-slate-300 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60 leading-relaxed">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 2. サヤ分析AI：利鞘発掘カード */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm">💎</span>
                  日米サヤ抜き発掘カード（サヤ分析AI）
                </h2>
                <div className="space-y-4">
                  {data.profitableCards.map((card, idx) => (
                    <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold text-white text-base">{card.cardName}</span>
                        <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-full whitespace-nowrap">
                          想定利益 +${card.estimatedProfitUSD}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-400">
                        <span>日本仕入: <strong className="text-slate-200">¥{card.jpPriceJPY.toLocaleString()}</strong></span>
                        <span>米相場: <strong className="text-slate-200">${card.usPriceUSD}</strong></span>
                      </div>
                      <p className="text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                        {card.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* 右カラム：コンテンツ出力（SNS・営業DM） */}
            <div className="space-y-6">
              
              {/* 3. SNS運用AI：3パターンの投稿文 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                  <span className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg text-sm">📱</span>
                  海外向けSNS投稿（X / Twitter）
                </h2>

                {/* タブ or 並列展開：ハイブリッド投稿 */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-amber-400">★ 推奨: トレンド×サヤ ハイブリッド型</span>
                    <button
                      onClick={() => handleCopy(data.snsPosts.hybridPost, 'hybrid')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                    >
                      {copiedKey === 'hybrid' ? '✓ コピー済み' : 'コピー'}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 rounded-xl text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 leading-relaxed">
                    {data.snsPosts.hybridPost}
                  </pre>
                </div>

                {/* サヤ特化投稿 */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-emerald-400">利益・スプレッド特化型</span>
                    <button
                      onClick={() => handleCopy(data.snsPosts.arbitragePost, 'arbitrage')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                    >
                      {copiedKey === 'arbitrage' ? '✓ コピー済み' : 'コピー'}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 rounded-xl text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 leading-relaxed">
                    {data.snsPosts.arbitragePost}
                  </pre>
                </div>

                {/* トレンド特化投稿 */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-sky-400">トレンド・考察特化型</span>
                    <button
                      onClick={() => handleCopy(data.snsPosts.trendPost, 'trend')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                    >
                      {copiedKey === 'trend' ? '✓ コピー済み' : 'コピー'}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 rounded-xl text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 leading-relaxed">
                    {data.snsPosts.trendPost}
                  </pre>
                </div>
              </div>

              {/* 4. 営業DMAI：オファー文 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <span className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-sm">✉️</span>
                    大口バイヤー向け営業オファー（Discord / Email）
                  </h2>
                  <button
                    onClick={() => handleCopy(data.salesDM, 'dm')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                  >
                    {copiedKey === 'dm' ? '✓ コピー済み' : 'コピー'}
                  </button>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl text-xs text-slate-300 whitespace-pre-wrap border border-slate-800 max-h-96 overflow-y-auto leading-relaxed">
                  {data.salesDM}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}