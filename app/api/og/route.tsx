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
    // 1. カルーセル2枚目: 日本語版ポケカ事業者向け 代理購入特化スライド (?type=cta)
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
              backgroundImage: 'radial-gradient(circle at 50% 15%, #064e3b 0%, #030712 65%)',
              padding: '64px',
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
                  fontSize: '20px',
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  color: '#34d399',
                  marginBottom: '10px',
                }}
              >
                FOR JAPANESE POKÉMON CARD RESELLERS & SHOPS
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '44px',
                  fontWeight: 900,
                  lineHeight: 1.2,
                  color: '#ffffff',
                  marginBottom: '6px',
                }}
              >
                Buy Cards Directly from Japan
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '20px',
                  color: '#9ca3af',
                  fontWeight: 500,
                }}
              >
                We buy from Japanese shops and ship directly to your door at Japanese prices.
              </div>
            </div>

            {/* 中央: 3大ベネフィット */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* ポイント1: 手数料5% */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1.5px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '20px',
                  padding: '20px 24px',
                  gap: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    color: '#000000',
                    fontSize: '24px',
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  %
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff' }}>
                      Only 5% Service Fee
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 800, backgroundColor: '#065f46', color: '#34d399', padding: '2px 10px', borderRadius: '6px' }}>
                      NO EXTRA FEES
                    </span>
                  </div>
                  <div style={{ display: 'flex', fontSize: '16px', color: '#9ca3af' }}>
                    No hidden costs. No storage fees. Simple 5% fee only.
                  </div>
                </div>
              </div>

              {/* ポイント2: 国際送料 1枚あたり約3円 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1.5px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '20px',
                  padding: '20px 24px',
                  gap: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    color: '#000000',
                    fontSize: '24px',
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  ✈️
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff' }}>
                      Shipping from $0.02 / Card【3jpy〜】
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 800, backgroundColor: '#065f46', color: '#34d399', padding: '2px 10px', borderRadius: '6px' }}>
                      FAST & LOW COSTS
                    </span>
                  </div>
                  <div style={{ display: 'flex', fontSize: '16px', color: '#9ca3af' }}>
                    We combine your orders into one box to cut shipping costs (~10,000 cards / 18kg to US)
                  </div>
                </div>
              </div>

              {/* ポイント3: 国内複数ショップからの一括調達 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1.5px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '20px',
                  padding: '20px 24px',
                  gap: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    color: '#000000',
                    fontSize: '22px',
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  📦
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', fontSize: '24px', fontWeight: 900, color: '#ffffff', marginBottom: '2px' }}>
                    We Buy from Japanese Card Shops & Flea Markets
                  </div>
                  <div style={{ display: 'flex', fontSize: '16px', color: '#9ca3af' }}>
                    Add items with 1 click while browsing Japanese sites. We buy and ship them all together.
                  </div>
                </div>
              </div>
            </div>

            {/* 下部: CTAボタン & お問い合わせ案内 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#10b981',
                  borderRadius: '18px',
                  padding: '22px',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '26px', fontWeight: 900, color: '#030712' }}>
                  Sign Up Free (Link in Bio)
                </span>
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#030712"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', fontSize: '18px', color: '#9ca3af', fontWeight: 600 }}>
                  Questions? DM us on Instagram or send an Email
                </div>
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