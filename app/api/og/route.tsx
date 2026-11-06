// app/api/og/route.tsx
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const type = searchParams.get('type') || 'arbitrage';
    const cardName = searchParams.get('cardName') || 'Featured Card';
    const jpPrice = searchParams.get('jpPrice') || '¥120,000';
    const overseasPrice = searchParams.get('overseasPrice') || '$1,150';
    const spread = searchParams.get('spread') || '+¥50,000';
    const roi = searchParams.get('roi') || '42%';
    const hookText = searchParams.get('hookText') || 'Sealed Box Investment Opportunity';

    // =========================================================================
    // 1. カルーセル2枚目: 2股導線 CTA スライド (?type=cta)
    // =========================================================================
    if (type === 'cta') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: '#030712',
              backgroundImage: 'radial-gradient(circle at 50% 30%, #1e1b4b 0%, #030712 70%)',
              padding: '80px 70px',
              color: '#ffffff',
              fontFamily: 'sans-serif',
            }}
          >
            {/* 上部ヘッダー */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  color: '#a855f7',
                  marginBottom: '16px',
                }}
              >
                NEXT ACTION / NEXT STEP
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '52px',
                  fontWeight: 900,
                  lineHeight: 1.2,
                  color: '#ffffff',
                }}
              >
                利益を最大化する2つの選択肢
              </div>
            </div>

            {/* 中央: 2股導線カード比較 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {/* Option 1: VIP Discord */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'rgba(88, 101, 242, 0.12)',
                  border: '2px solid rgba(88, 101, 242, 0.5)',
                  borderRadius: '24px',
                  padding: '36px 40px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', fontSize: '20px', fontWeight: 800, color: '#818cf8', letterSpacing: '0.1em' }}>
                    OPTION 01: 先行急騰シグナル・市場データ
                  </div>
                  <div style={{ display: 'flex', backgroundColor: '#5865F2', padding: '6px 18px', borderRadius: '999px', fontSize: '18px', fontWeight: 800 }}>
                    VIP Discord ➔
                  </div>
                </div>
                <div style={{ display: 'flex', fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
                  なぜこの価格差が生まれたのか？次の急騰銘柄を知りたい方へ
                </div>
              </div>

              {/* Option 2: 代理購入サイト */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '2px solid rgba(16, 185, 129, 0.5)',
                  borderRadius: '24px',
                  padding: '36px 40px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', fontSize: '20px', fontWeight: 800, color: '#34d399', letterSpacing: '0.1em' }}>
                    OPTION 02: 最速直送・調達手配
                  </div>
                  <div style={{ display: 'flex', backgroundColor: '#10b981', padding: '6px 18px', borderRadius: '999px', fontSize: '18px', fontWeight: 800 }}>
                    自社代理購入 ➔
                  </div>
                </div>
                <div style={{ display: 'flex', fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
                  この価格差のまま、日本から直接安全に買い付け・発送手配したい方へ
                </div>
              </div>
            </div>

            {/* フッター */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #1f2937', paddingTop: '30px' }}>
              <div style={{ display: 'flex', fontSize: '24px', color: '#9ca3af', fontWeight: 600 }}>
                詳細はプロフィールリンクのURLをタップ
              </div>
              <div style={{ display: 'flex', fontSize: '26px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.08em' }}>
                WORLDWIDE JAPAN
              </div>
            </div>
          </div>
        ),
        { width: 1080, height: 1080 }
      );
    }

    // =========================================================================
    // 2. カルーセル1枚目: 価格差インフォグラフィック表紙スライド
    // =========================================================================
    const isArbitrage = type === 'arbitrage';
    const accentColor = isArbitrage ? '#10b981' : '#f59e0b';
    const badgeLabel = isArbitrage ? 'ARBITRAGE SPREAD' : 'MARKET TREND SIGNAL';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#0b0f19',
            backgroundImage: 'radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0b0f19 75%)',
            padding: '70px',
            color: '#ffffff',
            fontFamily: 'sans-serif',
          }}
        >
          {/* 上部: ラベル & フック */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '24px',
                fontWeight: 900,
                color: accentColor,
                letterSpacing: '0.15em',
                marginBottom: '16px',
              }}
            >
              {badgeLabel}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '56px',
                fontWeight: 900,
                lineHeight: 1.15,
                color: '#ffffff',
              }}
            >
              {hookText}
            </div>
          </div>

          {/* 中央: カード名 & 価格比較ボックス */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(17, 24, 39, 0.85)',
              border: `2px solid ${accentColor}`,
              borderRadius: '24px',
              padding: '40px 48px',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '36px',
                fontWeight: 800,
                color: '#f9fafb',
                marginBottom: '32px',
              }}
            >
              {cardName}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* 日本価格 */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', fontSize: '20px', color: '#9ca3af', fontWeight: 600, marginBottom: '8px' }}>
                  Japan Price (Buy)
                </div>
                <div style={{ display: 'flex', fontSize: '50px', fontWeight: 900, color: '#ffffff' }}>
                  {jpPrice}
                </div>
              </div>

              {/* 矢印アイコン風ディバイダー */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#1f2937',
                  color: accentColor,
                  fontSize: '28px',
                  fontWeight: 900,
                }}
              >
                ➔
              </div>

              {/* 海外価格 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', fontSize: '20px', color: '#9ca3af', fontWeight: 600, marginBottom: '8px' }}>
                  Overseas (Sell)
                </div>
                <div style={{ display: 'flex', fontSize: '50px', fontWeight: 900, color: accentColor }}>
                  {overseasPrice}
                </div>
              </div>
            </div>
          </div>

          {/* 下部: 粗利スプレッド & ロゴ */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: '20px', color: '#9ca3af', fontWeight: 600, marginBottom: '6px' }}>
                Estimated Profit
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <span style={{ fontSize: '64px', fontWeight: 900, color: accentColor }}>
                  {spread}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: accentColor,
                    color: '#000000',
                    fontSize: '28px',
                    fontWeight: 900,
                    padding: '8px 20px',
                    borderRadius: '12px',
                  }}
                >
                  ROI {roi}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', fontSize: '28px', fontWeight: 900, color: '#6b7280', letterSpacing: '0.08em' }}>
              WORLDWIDE JAPAN
            </div>
          </div>
        </div>
      ),
      { width: 1080, height: 1080 }
    );
  } catch (error: any) {
    console.error('OG generation error:', error);
    return new Response(`Failed to generate image: ${error.message}`, { status: 500 });
  }
}