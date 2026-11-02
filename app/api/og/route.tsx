// app/api/og/route.tsx
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // AIが生成したデータをクエリパラメータから取得（なければフォールバック）
    const type = searchParams.get('type') || 'arbitrage';
    const cardName = searchParams.get('cardName') || 'Secret Premium Card';
    const jpPrice = searchParams.get('jpPrice') || '¥---';
    const overseasPrice = searchParams.get('overseasPrice') || '$---';
    const spread = searchParams.get('spread') || '+¥---';
    const roi = searchParams.get('roi') || '---%';
    const hookText = searchParams.get('hookText') || 'Massive Arbitrage Opportunity!';

    // 背景色やアクセントカラーを動的に切り替え（サヤ取り＝緑、トレンド＝オレンジ）
    const isArbitrage = type === 'arbitrage';
    const accentColor = isArbitrage ? '#10b981' : '#f59e0b'; // Emerald or Amber
    const bgGradient = isArbitrage 
      ? 'linear-gradient(to bottom right, #0f172a, #064e3b)' 
      : 'linear-gradient(to bottom right, #0f172a, #78350f)';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '60px 80px',
            background: bgGradient,
            fontFamily: 'sans-serif',
            color: 'white',
          }}
        >
          {/* トップ：煽りフックテキスト */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '32px', color: accentColor, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>
              {isArbitrage ? 'Japan Sourcing Alert' : 'Market Trend Signal'}
            </span>
            <span style={{ fontSize: '56px', fontWeight: 900, marginTop: '10px', lineHeight: 1.2 }}>
              {hookText}
            </span>
          </div>

          {/* 中央：カード名とデータ比較 */}
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '40px', borderRadius: '24px', border: `2px solid ${accentColor}` }}>
            <span style={{ fontSize: '40px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '40px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cardName}
            </span>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* 日本価格（仕入れ） */}
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <span style={{ fontSize: '28px', color: '#94a3b8' }}>Japan Price (Buy)</span>
                <span style={{ fontSize: '64px', fontWeight: 'bold' }}>{jpPrice}</span>
              </div>
              
              <div style={{ fontSize: '48px', color: '#64748b' }}>➔</div>

              {/* 海外価格（売価） */}
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '28px', color: '#94a3b8' }}>Overseas (Sell)</span>
                <span style={{ fontSize: '64px', fontWeight: 'bold', color: accentColor }}>{overseasPrice}</span>
              </div>
            </div>
          </div>

          {/* ボトム：利ざや（Spread & ROI）とロゴ */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '24px', color: '#cbd5e1', marginBottom: '10px' }}>Estimated Profit</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <span style={{ fontSize: '80px', fontWeight: 900, color: accentColor, lineHeight: 1 }}>{spread}</span>
                <div style={{ display: 'flex', backgroundColor: accentColor, padding: '10px 20px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a' }}>ROI {roi}</span>
                </div>
              </div>
            </div>
            
            {/* ブランドロゴ（透かし） */}
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)' }}>
              WORLDWIDE JAPAN
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080, // InstagramにもXにも対応しやすいスクエアサイズ
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image`, { status: 500 });
  }
}