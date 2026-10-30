// types.ts

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

// 🌟 案B：5段階価格帯キー
export type PriceTierKey = 'under_3k' | 'under_10k' | 'middle' | 'upper' | 'top_end';

export interface StrategicReport {
    title: string;
    claim: string;
    reasons: string[];
    facts: FactItem[];
    soWhat: string;
    riskAndMitigation: RiskAndMitigation;
    verificationChecklist: string[];
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
    targetSoldPrice: string;       // 自国市場での実成約・売価相場（例: "$32 (約¥4,900)"）
    priceSpreadJPY: string;        // 単純価格差・粗利マージン（例: "¥2,700"）
    spreadROI: string;             // 粗利比率（例: "122%"）
    liquidity: string;             // 現地市場成約頻度（例: "直近7日 14件"）
    insight: string;               // 現地顧客需要・買い付け狙い目メモ
}

export interface ArbitragePriceTierCell {
    priceTier: PriceTierKey;
    priceTierLabel: string;
    mainItem: ArbitrageItemData;   // 👑 本命商品
    subItems: ArbitrageItemData[]; // 🥈 代替候補（4商品）
}

export interface ArbitrageSlotReport {
    slotKey: ResearchSlotKey;
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
    condition: CardCondition;   // 推奨状態 (Raw NM / PSA10)
    conviction: ConvictionLevel;// 確信度 (High / Mid / Speculative)
    jpBuyPriceJPY: string;      // 🇯🇵 日本調達原価 (例: "¥4,500")
    currentLocalPrice: string;  // 🇺🇸 現地現在相場 (例: "$35 (約¥5,400)")
    timeframe: string;          // 売り時目安 (例: "【短期】約2週間後（北米大会前）")
    exitStrategy: string;       // 推奨出口戦略 (例: "入荷後、大会前週末の現地店頭・ECで即出し")
    impactLogic: string;        // 波及ロジック（なぜ跳ねるのか・日本の相場ラグ理由）
}

export interface MarketTrendHypothesis {
    headline: string;           // トレンド核心タイトル (例: "🔥 北米リージョナル大会での〇〇デッキ上位独占")
    signal: string;             // 検知された客観的シグナル・事実
    timeframe: string;          // トレンド全体の想定ピーク時期
    items: MarketTrendCardItem[]; // トレンド合致度上位5銘柄 (Rank 1〜5 固定)
}

export interface MarketTrendReport {
    title: string;
    claim: string;
    createdAt: string;
    hypotheses: MarketTrendHypothesis[]; // 最大3本
}

// ==========================================
// 🌟 パッケージ・SNS・プロモーション型定義
// ==========================================
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