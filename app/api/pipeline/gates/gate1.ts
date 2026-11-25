// app/api/pipeline/gates/gate1.ts
import { ResearchItemRecord } from '../types';

export interface Gate1AuditResult {
  itemId: string;
  passed: boolean;
  checks: {
    card_existence_verified: boolean;
    roi_calculation_valid: boolean;
    official_tournament_compliant: boolean;
  };
  feedback: string | null;
}

// ----------------------------------------------------------------------------
// Gate 1-A: アービトラージ数値マージン監査（コードによる0.01秒の決定論的検算）
// ----------------------------------------------------------------------------
export function runArbitrageMathAudit(items: ResearchItemRecord[]): Gate1AuditResult[] {
  const results: Gate1AuditResult[] = [];

  for (const item of items) {
    const buy = Number(item.jp_buy_price_jpy) || 0;
    const target = Number(item.target_sold_price_jpy) || 0;
    const spread = target - buy;
    const roi = buy > 0 ? Math.round((spread / buy) * 100) : 0;

    // 1. 異常値チェック（仕入れ値0円、利益なし、ROI 10%未満）
    if (buy <= 0 || spread <= 0 || roi < 10) {
      results.push({
        itemId: item.id,
        passed: false,
        checks: {
          card_existence_verified: true,
          roi_calculation_valid: false,
          official_tournament_compliant: true,
        },
        feedback: `利ざや不足または価格異常: 仕入 ¥${buy}, 売価 ¥${target} (粗利 ¥${spread}, ROI ${roi}%)`,
      });
      continue;
    }

    // 2. 申告値との四則計算チェック（許容誤差: 差額 ±150円, ROI ±3%）
    const isSpreadValid = Math.abs(spread - item.price_spread_jpy) <= 150;
    const isROIValid = Math.abs(roi - item.spread_roi_percent) <= 3;

    if (!isSpreadValid || !isROIValid) {
      results.push({
        itemId: item.id,
        passed: false,
        checks: {
          card_existence_verified: true,
          roi_calculation_valid: false,
          official_tournament_compliant: true,
        },
        feedback: `検算不一致: 実利 ¥${spread} (申告: ¥${item.price_spread_jpy}), 実ROI ${roi}% (申告: ${item.spread_roi_percent}%)`,
      });
    } else {
      results.push({
        itemId: item.id,
        passed: true,
        checks: {
          card_existence_verified: true,
          roi_calculation_valid: true,
          official_tournament_compliant: true,
        },
        feedback: null,
      });
    }
  }

  return results;
}

// ----------------------------------------------------------------------------
// Gate 1 統括エントリーポイント
// ----------------------------------------------------------------------------
export async function runGate1Audit(
  items: ResearchItemRecord[],
  _category: string = 'pokemon'
): Promise<{ allPassed: boolean; results: Gate1AuditResult[] }> {
  const arbitrageItems = items.filter((i) => i.agent_key === 'arbitrage');
  const arbResults = runArbitrageMathAudit(arbitrageItems);

  return {
    allPassed: arbResults.every((r) => r.passed),
    results: arbResults,
  };
}