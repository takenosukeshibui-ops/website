// app/AiDashboard/types.ts

export interface FactItem {
  label: string;
  value: string;
}

export interface RiskAndMitigation {
  risk: string;
  mitigation: string;
}

export type CategoryKey = 'pokemon' | 'onepiece' | 'yugioh' | 'figure';
export type RegionKey = 'us' | 'eu' | 'asia';

// 🌟 5スロット（全時代・全ジャンル網羅）
export type ResearchSlotKey =
  | 'classic_vintage'   // クラシック・ヴィンテージ枠（旧裏〜PCG期）
  | 'neo_vintage'       // ネオ・ヴィンテージ枠（DP〜XY期、世代回帰）
  | 'exclusive_promo'   // 限定プロモ・配布枠（ジム、ポケセン、タイアップ等）
  | 'modern_meta'       // 現行モダン・メタ枠（SM〜SV、直近弾、大会メタ）
  | 'graded_sealed';    // 高額鑑定・POP希少・未開封BOX枠（PSA10/BGS等）

// 🌟 5段階価格帯キー
export type PriceTierKey = 'under_3k' | 'under_10k' | 'middle' | 'upper' | 'top_end';

export interface StrategicReport {
  title: string;
  claim: string;
  reasons: string[];
  facts: FactItem[];
  soWhat: string;
  riskAndMitigation: RiskAndMitigation;
  verificationChecklist: string[];
  curatorDirectives?: {
    recommendedTrendDay: string;
    slotWeights: Record<string, string>;
  };
}

// ==========================================
// 🌟 アービトラージ（サヤ取り）関連型定義
// ==========================================
export interface ArbitrageItemData {
  priceTier?: PriceTierKey;
  priceTierLabel?: string;
  cardName: string;              // 実在カード名・型番
  conditionGrade: string;        // 状態（PSA10, Raw NM等）
  jpBuyPriceJPY: string;         // 日本国内での調達原価（例: "¥2,200"）
  jpEvidenceUrl?: string;        // 🌟 日本市場の証拠URL
  targetSoldPrice: string;       // 自国市場での実成約・売価相場（例: "$32 (約¥4,900)"）
  priceSpreadJPY: string;        // 単純価格差・粗利マージン（例: "¥2,700"）
  spreadROI: string;             // 粗利比率（例: "122%"）
  liquidity: string;             // 現地市場成約頻度（例: "直近7日 14件"）
  insight: string;               // 現地顧客需要・買い付け狙い目メモ
  sourcePlatform?: string;
  evidenceNote?: string;
  sourceEvidenceUrl?: string;
}

export interface ArbitragePriceTierCell {
  priceTier: PriceTierKey;
  priceTierLabel: string;
  mainItem: ArbitrageItemData;   // 👑 本命商品
  subItems: ArbitrageItemData[]; // 🥈 代替候補
}

export interface ArbitrageSlotReport {
  slotKey: ResearchSlotKey | string;
  slotLabel: string;
  tiers: ArbitragePriceTierCell[];
  items?: ArbitrageItemData[];
}

export interface ArbitrageExecutiveSummary {
  headline: string;
  macroAnalysis: {
    japanSourcingClimate: string;
    localMarketDemand: string;
  };
  microAnalysis: {
    topImportMarginCard: string;
    topLocalVelocityCard: string;
    conditionGradingInsight: string;
  };
  riskAlert: {
    sourcingQualityTrap: string;
    localInventoryRisk: string;
  };
  actionDirectives: string[];
}

export interface MultiSlotArbitrageReport {
  title: string;
  claim?: string;
  exchangeRate?: { currency: string; rateJPY: number; label: string }; // 🌟 リアルタイム為替レート
  summary?: ArbitrageExecutiveSummary;
  slots: ArbitrageSlotReport[];
  reasons?: string[];
  facts?: FactItem[];
  soWhat?: string;
  riskAndMitigation?: RiskAndMitigation;
  verificationChecklist?: string[];
}

// ==========================================
// 🌟 市場トレンド（因果関係・上位5銘柄）型定義
// ==========================================
export type ConvictionLevel = 'High' | 'Mid' | 'Speculative';
export type CardCondition = 'Raw NM' | 'PSA10';

export interface MarketTrendCardItem {
  rankLabel: string;          // "Rank 1 (最本命)", "Rank 2 (高連動)", ..., "Rank 5 (先行大穴)"
  cardName: string;           // 実在カード名 (型番 / レアリティ)
  condition: CardCondition | string;   // 推奨状態 (Raw NM / PSA10)
  conviction?: ConvictionLevel; // 確信度 (High / Mid / Speculative)
  jpBuyPriceJPY: string;      // 🇯🇵 日本調達原価 (例: "¥4,500")
  currentLocalPrice: string;  // 🇺🇸 現地現在相場 (例: "$35 (約¥5,400)")
  timeframe?: string;         // 売り時目安
  exitStrategy?: string;      // 推奨出口戦略
  impactLogic?: string;       // 波及ロジック
  sourcePlatform?: string;
  evidenceNote?: string;
  sourceEvidenceUrl?: string;
}

export interface MarketTrendHypothesis {
  headline: string;           // トレンド核心タイトル
  signal: string;             // 検知された客観的シグナル・事実
  timeframe: string;          // トレンド全体の想定ピーク時期
  items: MarketTrendCardItem[]; // トレンド合致銘柄
}

export interface MarketTrendExecutiveSummary {
  headline: string;
  trendDynamics: {
    catalystOverview: string;
    japanPriceLag: string;
  };
  strategicHighlights: {
    mvpCatalystCard: string;
    optimalExitWindow: string;
  };
  riskAlert: {
    hypeTrapWarning: string;
    gradingVsRawStrategy: string;
  };
  actionDirectives: string[];
}

export interface MarketTrendReport {
  title: string;
  claim: string;
  createdAt?: string;
  summary?: MarketTrendExecutiveSummary;
  hypotheses: MarketTrendHypothesis[];
}

// ==========================================
// 🌟 インフォグラフィック・画像生成共通型定義
// ==========================================
export interface InfographicData {
  type: 'arbitrage' | 'trend';
  cardName: string;
  region?: RegionKey | string;
  jpPrice: string;
  overseasPrice: string;
  spread: string;
  roi: string;
  hookText: string;
}

// ==========================================
// 🌟 パッケージ・週間編成・SNS・プロモーション型定義
// ==========================================
export interface ContentCalendarItemDetail {
  region: RegionKey | string;
  selectedCardOrTopic: string;
  hookFact: string;
  hiddenActionReason: string;
}

export interface ContentCalendarItem {
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  dayLabelJa: string;
  postType: string;
  selectedCardOrTopic?: string;
  hookFact?: string;
  hiddenActionReason?: string;
  items?: ContentCalendarItemDetail[]; // 🌟 1日あたり米・欧・亜の3商品（トリオ）を保持
  directiveForCreator?: {
    instagramAngle: string;
    xTwitterAngle: string;
    discordOfferAngle: string;
  };
}

export interface CuratorStrategyBlueprint {
  headline: string;
  adaptationRationale: string;
  slotDistribution?: Record<string, number>;
}

export interface ChiefPackageData {
  selectedLeadMagnetType?: 'TypeA_Arbitrage' | 'TypeB_Trend' | 'GlobalCatalog';
  winningRegion?: 'us' | 'eu' | 'asia' | 'global';
  leadMagnetTitle?: string;
  chosenCardOrItem?: string;
  strategyBlueprint?: CuratorStrategyBlueprint | null;
  mvpHighlight?: {
    cardName: string;
    region: RegionKey | string;
    slotKey: ResearchSlotKey | string;
    hookFact: string;
    selectionReason: string;
  } | null;
  regionalMatrix?: {
    us: { topArbitrage: string; topTrend: string; summary: string };
    eu: { topArbitrage: string; topTrend: string; summary: string };
    asia: { topArbitrage: string; topTrend: string; summary: string };
  };
  globalInsight?: string;
  contentCalendar?: ContentCalendarItem[];
  approvedItems?: any[];
  nextWeekResearchBias?: string;
  selectionReason?: string;
  coreHookFact?: string;
  creativeDirective?: {
    instagramAngle: string;
    xTwitterAngle?: string;
    discordOfferAngle: string;
  };
}

export interface ProofPackageData {
  cardName: string;
  predictedDate: string;
  predictedPrice: string;
  currentPrice: string;
  growthRate: string;
  hitReasonPattern: string;
  proofPost: string;
  visualGuideline: {
    beforeImageDesc: string;
    afterImageDesc: string;
    comparisonLayout: string;
  };
  discordCTA: string;
}

export interface SnsPostsData {
  theme: string;
  recommendedTiming: string;
  hashtags?: string[];
  visualGuideline?: {
    coverSlide: string;
    carouselSlides: string[];
  };
  posts?: {
    hybridPost: string;
    arbitragePost: string;
    trendPost: string;
  };
  discordCTA: string;
  dailyPosts?: {
    day: string;
    theme?: string;
    caption: string;
    slides?: string[];
    infographicData?: InfographicData;
  }[];
}

export interface XPostsData {
  theme: string;
  mainPost?: string;
  threadPosts?: string[];
  imageGuideline?: string[];
  xCallToAction: string;
  dailyThreads?: {
    day: string;
    mainPost: string;
    threadPosts: string[];
    infographicData?: InfographicData;
  }[];
}

export interface SalesDMData {
  targetSegment: string;
  offerSummary: string;
  discordMessage: string;
  commercialTerms: {
    minimumOrderQty: string;
    shippingMethod: string;
    paymentMethod: string;
  };
  negotiationTip: string;
}

export interface RSIAutoRule {
  targetAgent: string;
  ruleText: string;
}

export interface RSIReportData {
  overallEvaluation: string;
  accuracyScore: number;
  trendWeightAdjustments: {
    recommendedPattern: string;
    rationale: string;
  };
  arbitrageSpreadAudits: {
    spreadReliabilityScore: string;
    recommendedMinimumSpread: string;
    rationale: string;
  };
  autoGeneratedRules: RSIAutoRule[];
}

export interface RegionalContainer<T> {
  us: T | null;
  eu: T | null;
  asia: T | null;
}

// 🌟 統合インテリジェンスデータ
export interface IntelligenceData {
  trendInsights: RegionalContainer<MarketTrendReport | StrategicReport> | null;
  profitableCards: RegionalContainer<MultiSlotArbitrageReport | StrategicReport> | null;
  chiefPackage: ChiefPackageData | null;
  proofPackage?: ProofPackageData | null;
  accountInsights: StrategicReport | null;
  xAccountInsights?: StrategicReport | null;
  snsPosts: SnsPostsData | null;
  xPosts?: XPostsData | null;
  salesDM: SalesDMData | null;
  rsiReport?: RSIReportData | null;
}

export interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

export interface KnowledgeItem {
  id: string;
  agent_key: string;
  content: string;
  created_at: string;
}

// ==========================================
// 🌟 パイプライン進捗・監査役ステータス型定義
// ==========================================
export type PipelinePhase =
  | 'initialized'
  | 'researching'
  | 'curating'
  | 'gate1_auditing'
  | 'generating_content'
  | 'gate2_auditing'
  | 'ready_to_publish'
  | 'partially_failed'
  | 'completed';

export interface Gate1AuditItem {
  id: string;
  card: string;
  slot: string;
  region: string;
  status: 'pending' | 'passed' | 'rejected' | 'needs_revision';
  checks?: any;
  feedback?: string | null;
}

export interface Gate2AuditItem {
  id: string;
  platform: string;
  day: string;
  status: 'pending' | 'passed' | 'rejected' | 'needs_revision';
  checks?: any;
  feedback?: string | null;
}

export interface PipelineProgressState {
  cycleId: string | null;
  status: PipelinePhase | null;
  gate1Audits: Gate1AuditItem[];
  gate2Audits: Gate2AuditItem[];
}