export interface FactItem { label: string; value: string; }
export interface RiskAndMitigation { risk: string; mitigation: string; }
export type CategoryKey = 'pokemon' | 'onepiece' | 'yugioh' | 'figure';
export type RegionKey = 'us' | 'eu' | 'asia';

// 🌟 5大スロット（全時代・全ジャンル網羅）
export type ResearchSlotKey =
    | 'classic_vintage'   // クラシック・ヴィンテージ枠（旧裏〜PCG期）
    | 'neo_vintage'       // ネオ・ヴィンテージ枠（DP〜XY期、世代回帰）
    | 'exclusive_promo'   // 限定プロモ・配布枠（ジム、ポケセン、タイアップ等）
    | 'modern_meta'       // 現行モダン・メタ枠（SM〜SV、直近弾、大会メタ）
    | 'graded_sealed';    // 高額鑑定・POP希少・未開封BOX枠（PSA10/BGS等）

export interface StrategicReport {
    title: string;
    claim: string;
    reasons: string[];
    facts: FactItem[];
    soWhat: string;
    riskAndMitigation: RiskAndMitigation;
    verificationChecklist: string[];
}

// ----------------------------------------------------
// トレンド分析用の型定義（既存機能）
// ----------------------------------------------------
export interface TrendSlotItem {
    cardName: string;
    condition?: string;
    currentJpPriceJPY: string;
    targetMarketPrice: string;
    growthRate: string;
    threePointCheck: string;
    devilAdvocate: RiskAndMitigation;
}

export interface TrendSlotReport {
    slotKey: ResearchSlotKey;
    slotLabel: string;
    macroTrend: string;
    isSurgeTriggered: boolean;
    surgeReason?: string;
    items: TrendSlotItem[];
}

export interface MultiSlotTrendReport extends StrategicReport {
    slots: TrendSlotReport[];
}

// ----------------------------------------------------
// 🌟 アービトラージ（サヤ取り）用の型定義（抜本改修版）
// ----------------------------------------------------
export type PriceTierKey = 'under_3k' | 'under_10k' | 'middle' | 'upper' | 'top_end';

// 1商品あたりの軽量データ（トークン節約型）
export interface ArbitrageItemData {
    cardName: string;              // 実在カード名・型番
    conditionGrade: string;        // 状態完全一致（PSA10, Raw NM等）
    jpBuyPriceJPY: string;         // 国内仕入れ想定額
    targetSoldPrice: string;       // 現地実成約額
    priceSpreadJPY: string;        // 単純価格差
    spreadROI: string;             // 価格差比率・粗利倍率
    liquidity: string;             // 直近成約頻度（例: "直近7日 14件"）
    insight: string;               // 1行要約・狙い目ポイント（本命用）
}

// 1枠（セル）：本命1件 ＋ 代替候補4件を格納
export interface ArbitragePriceTierCell {
    priceTier: PriceTierKey;
    priceTierLabel: string;        // "〜3千円", "3千〜1万円" 等
    mainItem: ArbitrageItemData;   // 👑 本命商品（第1候補）
    subItems: ArbitrageItemData[]; // 🥈 代替候補（最大4商品）
}

// 1スロット：5つの価格帯セルを内包
export interface ArbitrageSlotReport {
    slotKey: string;
    slotLabel: string;
    tiers: ArbitragePriceTierCell[];
}

// サヤ取りレポート全体（5スロット × 5価格帯 × 5候補 ＝ 計125品）
export interface MultiSlotArbitrageReport extends StrategicReport {
    slots: ArbitrageSlotReport[];
}

// ----------------------------------------------------
// その他の既存機能の型定義
// ----------------------------------------------------
export interface ProfitableCardReport extends StrategicReport {
    cardName: string;
    jpPriceJPY: number;
    usPriceUSD: number;
    estimatedProfitUSD: number;
    imageUrl?: string;
}

export interface ContentCalendarItem {
    dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
    dayLabelJa: string;
    postType: string;
    targetSlot?: ResearchSlotKey | 'all';
    targetRegion?: RegionKey | 'all';
    selectedCardOrTopic: string;
    hookFact: string;
    hiddenActionReason: string;
    directiveForCreator: {
        instagramAngle: string;
        xTwitterAngle: string;
        discordOfferAngle: string;
    };
}

export interface ChiefPackageData {
    selectedLeadMagnetType: 'TypeA_Arbitrage' | 'TypeB_Trend' | 'GlobalCatalog';
    winningRegion: 'us' | 'eu' | 'asia' | 'global';
    leadMagnetTitle?: string;
    chosenCardOrItem?: string;
    mvpHighlight?: {
        cardName: string;
        region: RegionKey;
        slotKey: ResearchSlotKey;
        hookFact: string;
        selectionReason: string;
    };
    regionalMatrix?: any;
    globalInsight?: string;
    contentCalendar?: ContentCalendarItem[];
    nextWeekResearchBias?: string;
    selectionReason?: string;
    coreHookFact?: string;
    creativeDirective?: any;
}

export interface ProofPackageData {
    cardName: string;
    predictedDate: string;
    predictedPrice: string;
    currentPrice: string;
    growthRate: string;
    hitReasonPattern: string;
    proofPost: string;
    visualGuideline: { beforeImageDesc: string; afterImageDesc: string; comparisonLayout: string; };
    discordCTA: string;
}

export interface SnsPostsData {
    theme: string;
    recommendedTiming: string;
    hashtags?: string[];
    visualGuideline: { coverSlide: string; carouselSlides: string[]; };
    posts: { hybridPost: string; arbitragePost: string; trendPost: string; };
    discordCTA: string;
    dailyPosts?: any[];
}

export interface XPostsData {
    theme: string;
    mainPost: string;
    threadPosts: string[];
    imageGuideline: string[];
    xCallToAction: string;
    dailyThreads?: any[];
}

export interface SalesDMData {
    targetSegment: string;
    offerSummary: string;
    discordMessage: string;
    commercialTerms: any;
    negotiationTip: string;
}

export interface RSIAutoRule { targetAgent: string; ruleText: string; }

export interface RSIReportData {
    overallEvaluation: string;
    accuracyScore: number;
    trendWeightAdjustments: { recommendedPattern: string; rationale: string; };
    arbitrageSpreadAudits: any;
    autoGeneratedRules: RSIAutoRule[];
}

export interface RegionalContainer<T> {
    us: T | null;
    eu: T | null;
    asia: T | null;
}

export interface IntelligenceData {
    trendInsights: RegionalContainer<MultiSlotTrendReport | StrategicReport> | null;
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