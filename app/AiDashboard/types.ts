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

// 🌟 トレンド：スロット内商品アイテム
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

// 🌟 トレンド：5スロット統合レポート
export interface MultiSlotTrendReport extends StrategicReport {
    slots: TrendSlotReport[];
}

// 🌟 アービトラージ：1商品あたりの軽量データ（海外インポーター視点）
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

// 🌟 アービトラージ：1セル（本命1件 ＋ 代替候補4件）
export interface ArbitragePriceTierCell {
    priceTier: PriceTierKey;
    priceTierLabel: string;        // "〜3千円", "3千〜1万円" 等
    mainItem: ArbitrageItemData;   // 👑 本命商品
    subItems: ArbitrageItemData[]; // 🥈 代替候補（4商品）
}

// 🌟 アービトラージ：1スロット（5つの価格帯セルを内包）
export interface ArbitrageSlotReport {
    slotKey: ResearchSlotKey;
    slotLabel: string;
    tiers: ArbitragePriceTierCell[];
    items?: ArbitrageItemData[];
}

// 🌟 【海外現地事業者向け】サヤ取り・輸入調達エグゼクティブ・サマリー型
export interface ArbitrageExecutiveSummary {
    headline: string; // 今週の輸入調達・現地販売の総括見出し
    macroAnalysis: {
        japanSourcingClimate: string; // 日本市場の調達環境（円相場・流通在庫・国内相場動向）
        localMarketDemand: string;    // 自国（現地）市場での需要集中セクター・価格帯
    };
    microAnalysis: {
        topImportMarginCard: string;  // 最大利ざや・高マージン輸入推奨銘柄
        topLocalVelocityCard: string; // 現地で最速回転する高流動性銘柄
        conditionGradingInsight: string; // 状態・鑑定品（PSA10 vs 素体NM）の現地需要差
    };
    riskAlert: {
        sourcingQualityTrap: string;  // 日本からの買い付け時の状態不良・偽物・検品リスク
        localInventoryRisk: string;   // 現地在庫の滞留・相場下落・投機バブルリスク
    };
    actionDirectives: string[];       // 今週の日本調達発注＆現地販売アクション指針
}

// 🌟 アービトラージ：統合レポート
export interface MultiSlotArbitrageReport {
    title: string;
    claim?: string;
    summary?: ArbitrageExecutiveSummary;
    slots: ArbitrageSlotReport[];
    // 旧プロパティ互換
    reasons?: string[];
    facts?: FactItem[];
    soWhat?: string;
    riskAndMitigation?: RiskAndMitigation;
    verificationChecklist?: string[];
}

export interface ProfitableCardReport extends StrategicReport {
    cardName: string;
    jpPriceJPY: number;
    usPriceUSD: number;
    estimatedProfitUSD: number;
    imageUrl?: string;
}

// 🌟 週間コンテンツカレンダー
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