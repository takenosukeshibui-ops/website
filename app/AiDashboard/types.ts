export interface FactItem { label: string; value: string; }
export interface RiskAndMitigation { risk: string; mitigation: string; }
export type CategoryKey = 'pokemon' | 'onepiece' | 'yugioh' | 'figure';
export type RegionKey = 'us' | 'eu' | 'asia';

// 🌟 5スロット（全時代・全ジャンル網羅）
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

// 🌟 トレンド：スロット内商品アイテム（1〜2件）
export interface TrendSlotItem {
    cardName: string;
    condition?: string;
    currentJpPriceJPY: string;
    targetMarketPrice: string;
    growthRate: string;
    threePointCheck: string;
    devilAdvocate: RiskAndMitigation;
}

// 🌟 トレンド：1スロットのレポート
export interface TrendSlotReport {
    slotKey: ResearchSlotKey;
    slotLabel: string;
    macroTrend: string;
    isSurgeTriggered: boolean;
    surgeReason?: string;
    items: TrendSlotItem[];
}

// 🌟 トレンド：5スロット統合レポート（StrategicReport互換）
export interface MultiSlotTrendReport extends StrategicReport {
    slots: TrendSlotReport[];
}

// 🌟 アービトラージ：スロット内商品アイテム（1〜2件）
export interface ArbitrageSlotItem {
    cardName: string;
    conditionGrade: string;
    jpBuyPriceJPY: string;
    targetSoldPrice: string;
    priceSpreadJPY: string;  // 国内外の単純価格差
    spreadROI: string;       // 価格差比率・粗利倍率
    liquidity: string;
    riskAndMitigation: RiskAndMitigation;
    verificationDetail: string;
}

// 🌟 アービトラージ：1スロットのレポート
export interface ArbitrageSlotReport {
    slotKey: ResearchSlotKey;
    slotLabel: string;
    isHighRoiTriggered: boolean;
    triggerReason?: string;
    items: ArbitrageSlotItem[];
}

// 🌟 アービトラージ：5スロット統合レポート（StrategicReport互換）
export interface MultiSlotArbitrageReport extends StrategicReport {
    slots: ArbitrageSlotReport[];
}

export interface ProfitableCardReport extends StrategicReport {
    cardName: string;
    jpPriceJPY: number;
    usPriceUSD: number;
    estimatedProfitUSD: number;
    imageUrl?: string;
}

// 🌟 週間コンテンツカレンダー（7日分の日替わり投稿指示）
export interface ContentCalendarItem {
    dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
    dayLabelJa: string;
    postType: 'Flagship_GlobalCatalog' | 'Vintage_Focus' | 'Promo_Focus' | 'Modern_Meta_Focus' | 'Graded_Sealed_Focus' | 'Hit_Proof_SocialProof' | 'Weekly_Summary_CTA';
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
    regionalMatrix?: {
        us: { topArbitrage: string; topTrend: string; summary: string; };
        eu: { topArbitrage: string; topTrend: string; summary: string; };
        asia: { topArbitrage: string; topTrend: string; summary: string; };
    };
    globalInsight?: string;
    contentCalendar?: ContentCalendarItem[];
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
    dailyPosts?: {
        day: string;
        caption: string;
        slides: string[];
    }[];
}

export interface XPostsData {
    theme: string;
    mainPost: string;
    threadPosts: string[];
    imageGuideline: string[];
    xCallToAction: string;
    dailyThreads?: {
        day: string;
        mainPost: string;
        threadPosts: string[];
    }[];
}

export interface SalesDMData {
    targetSegment: string;
    offerSummary: string;
    discordMessage: string;
    commercialTerms: { minimumOrderQty: string; shippingMethod: string; paymentMethod: string; };
    negotiationTip: string;
}

export interface RSIAutoRule { targetAgent: string; ruleText: string; }

export interface RSIReportData {
    overallEvaluation: string;
    accuracyScore: number;
    trendWeightAdjustments: { recommendedPattern: string; rationale: string; };
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