import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slide = searchParams.get('slide') || '1';
  const isArbitrage = searchParams.get('type') === 'arbitrage';
  const cardName = searchParams.get('cardName') || 'Pokémon TCG Rare Item';
  const hookText = searchParams.get('hookText') || 'MARKET TREND SIGNAL';
  const jpPrice = searchParams.get('jpPrice') || '¥0';
  const overseasPrice = searchParams.get('overseasPrice') || '$0';
  const spread = searchParams.get('spread') || '+¥0';
  const roi = searchParams.get('roi') || '0%';

  const accentColor = isArbitrage ? '#10b981' : '#f59e0b';

  // ==========================================
  // 🌟 スライド2枚目: 2股導線 CTA スライド
  // ==========================================
  if (slide === '2') {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#020617',
            padding: '80px 60px',
            fontFamily: 'sans-serif',
            color: '#f8fafc',
          }}
        >
          {/* ヘッダー */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', letterSpacing: 4, color: '#94a3b8', textTransform: 'uppercase' }}>
              Action & Next Step
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, marginTop: 12, color: '#ffffff' }}>
              次のアクションを選択
            </div>
          </div>

          {/* 2股導線カードエリア */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* 導線1: VIP Discord */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#0f172a',
                border: '2px solid #6366f1',
                borderRadius: 24,
                padding: '36px 40px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 28, fontWeight: 'bold', color: '#818cf8' }}>
                  💬 VIP Discord コミュニティ
                </span>
                <span style={{ fontSize: 22, color: '#cbd5e1' }}>先行シグナル ➔</span>
              </div>
              <p style={{ fontSize: 20, color: '#94a3b8', marginTop: 12, margin: 0 }}>
                なぜ跳ねるのか？SNS非公開の先行急騰分析・未公開ロットリストを配信中
              </p>
            </div>

            {/* 導線2: 自社代理購入サイト */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#0f172a',
                border: '2px solid #10b981',
                borderRadius: 24,
                padding: '36px 40px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 28, fontWeight: 'bold', color: '#34d399' }}>
                  📦 自社代理購入・直送手配
                </span>
                <span style={{ fontSize: 22, color: '#cbd5e1' }}>プロフURLから依頼 ➔</span>
              </div>
              <p style={{ fontSize: 20, color: '#94a3b8', marginTop: 12, margin: 0 }}>
                この価格差のまま日本から最速確保。厳重検品・FedEx Priorityで安全直送
              </p>
            </div>
          </div>

          {/* フッター */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #1e293b', paddingTop: 32 }}>
            <span style={{ fontSize: 24, fontWeight: 'bold', color: '#64748b' }}>WORLDWIDE JAPAN</span>
            <span style={{ fontSize: 20, color: '#94a3b8' }}>Link in Bio 📌</span>
          </div>
        </div>
      ),
      { width: 1080, height: 1080 }
    );
  }

  // ==========================================
  // 🌟 スライド1枚目: 価格差インフォグラフィック（既存維持）
  // ==========================================
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#090d16',
          padding: '80px 60px',
          fontFamily: 'sans-serif',
          color: '#ffffff',
        }}
      >
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 3, color: accentColor, textTransform: 'uppercase' }}>
            {hookText}
          </div>
          <div style={{ fontSize: 44, fontWeight: 900, marginTop: 12, lineHeight: 1.2 }}>
            {cardName}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, backgroundColor: '#131b2e', padding: '36px 40px', borderRadius: 24, border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 20, color: '#94a3b8' }}>Japan Price (Buy)</span>
            <span style={{ fontSize: 42, fontWeight: 800, marginTop: 8 }}>{jpPrice}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 20, color: '#94a3b8' }}>Overseas (Sell)</span>
            <span style={{ fontSize: 42, fontWeight: 800, color: accentColor, marginTop: 8 }}>{overseasPrice}</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '2px solid #1e293b', paddingTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 46, fontWeight: 900, color: accentColor }}>{spread}</span>
            <span style={{ fontSize: 22, fontWeight: 'bold', padding: '6px 16px', borderRadius: 12, backgroundColor: `${accentColor}25`, color: accentColor }}>
              ROI {roi}
            </span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 'bold', color: '#64748b' }}>WORLDWIDE JAPAN</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}