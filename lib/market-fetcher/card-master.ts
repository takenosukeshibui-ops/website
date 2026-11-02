// lib/market-fetcher/card-master.ts

export interface SeedCardDefinition {
  name: string;
  category: 'pokemon' | 'onepiece' | 'yugioh' | 'figure';
  slotKey: 'classic_vintage' | 'neo_vintage' | 'promos_exclusive' | 'modern_meta' | 'high_end_sealed';
  queryEbay: string;
  tcgCategoryId: number; // 3: Pokemon
  searchTcg: string;
}

export const COMPREHENSIVE_SEED_CARDS: SeedCardDefinition[] = [
  // -------------------------------------------------------------
  // 1. クラシック・ヴィンテージ枠（旧裏・初期・ADV・PCG）
  // -------------------------------------------------------------
  { name: 'リザードン 旧裏 第1弾', category: 'pokemon', slotKey: 'classic_vintage', queryEbay: 'Charizard Base Set No Rarity Japanese', tcgCategoryId: 3, searchTcg: 'Charizard' },
  { name: 'ゲンガー 通信進化', category: 'pokemon', slotKey: 'classic_vintage', queryEbay: 'Gengar Masaki Vending Japanese', tcgCategoryId: 3, searchTcg: 'Gengar' },
  { name: 'カメックス とりかえっこプリーズ', category: 'pokemon', slotKey: 'classic_vintage', queryEbay: 'Blastoise Trade Please Japanese Promo', tcgCategoryId: 3, searchTcg: 'Blastoise' },
  { name: 'ミュウツー 初版 マークなし', category: 'pokemon', slotKey: 'classic_vintage', queryEbay: 'Mewtwo No Rarity Symbol Japanese', tcgCategoryId: 3, searchTcg: 'Mewtwo' },
  { name: 'ピカチュウ 初版', category: 'pokemon', slotKey: 'classic_vintage', queryEbay: 'Pikachu No Rarity Symbol Japanese Base', tcgCategoryId: 3, searchTcg: 'Pikachu' },
  { name: 'フシギバナ 旧裏 第1弾', category: 'pokemon', slotKey: 'classic_vintage', queryEbay: 'Venusaur Japanese Base Set', tcgCategoryId: 3, searchTcg: 'Venusaur' },

  // -------------------------------------------------------------
  // 2. ネオ・ヴィンテージ枠（DP・Pt・LEGEND・BW・XY）
  // -------------------------------------------------------------
  { name: 'ギラティナ オリジンフォルム LV.X', category: 'pokemon', slotKey: 'neo_vintage', queryEbay: 'Giratina Lv.X Japanese DP', tcgCategoryId: 3, searchTcg: 'Giratina' },
  { name: 'ゲンガー＆ミミッキュGX SA', category: 'pokemon', slotKey: 'neo_vintage', queryEbay: 'Gengar Mimikyu GX SA Japanese', tcgCategoryId: 3, searchTcg: 'Gengar & Mimikyu' },
  { name: 'ルギア LEGEND (上下)', category: 'pokemon', slotKey: 'neo_vintage', queryEbay: 'Lugia Legend Japanese Set', tcgCategoryId: 3, searchTcg: 'Lugia Legend' },
  { name: 'ホウオウ LEGEND (上下)', category: 'pokemon', slotKey: 'neo_vintage', queryEbay: 'Ho-Oh Legend Japanese Set', tcgCategoryId: 3, searchTcg: 'Ho-Oh Legend' },
  { name: 'レックウザ UR (BW5)', category: 'pokemon', slotKey: 'neo_vintage', queryEbay: 'Rayquaza UR 055/050 Japanese BW5', tcgCategoryId: 3, searchTcg: 'Rayquaza' },
  { name: 'ミュウEX SR (SC)', category: 'pokemon', slotKey: 'neo_vintage', queryEbay: 'Mew EX 024/020 SR Japanese', tcgCategoryId: 3, searchTcg: 'Mew EX' },

  // -------------------------------------------------------------
  // 3. 限定プロモ・配布品枠（ポケセン、大会、プレイヤーズ）
  // -------------------------------------------------------------
  { name: 'ピカチュウ プレシャスコレクターボックス', category: 'pokemon', slotKey: 'promos_exclusive', queryEbay: 'Pikachu 323/S-P Precious Collector Japanese', tcgCategoryId: 3, searchTcg: 'Pikachu 323' },
  { name: 'カナザワのピカチュウ', category: 'pokemon', slotKey: 'promos_exclusive', queryEbay: 'Kanazawa Pikachu 144/S-P Japanese Promo', tcgCategoryId: 3, searchTcg: 'Kanazawa Pikachu' },
  { name: 'ポンチョを着たピカチュウ (リザードン)', category: 'pokemon', slotKey: 'promos_exclusive', queryEbay: 'Poncho Pikachu Charizard 207/XY-P Japanese', tcgCategoryId: 3, searchTcg: 'Poncho Pikachu' },
  { name: 'マリオピカチュウ', category: 'pokemon', slotKey: 'promos_exclusive', queryEbay: 'Mario Pikachu 294/XY-P Japanese Promo', tcgCategoryId: 3, searchTcg: 'Mario Pikachu' },
  { name: 'ヨコハマのピカチュウ', category: 'pokemon', slotKey: 'promos_exclusive', queryEbay: 'Yokohama Pikachu 280/SM-P Japanese Promo', tcgCategoryId: 3, searchTcg: 'Yokohama Pikachu' },
  { name: '長場雄 ピカチュウ プロモ', category: 'pokemon', slotKey: 'promos_exclusive', queryEbay: 'Yu Nagaba Pikachu 208/S-P Japanese Promo', tcgCategoryId: 3, searchTcg: 'Yu Nagaba Pikachu' },

  // -------------------------------------------------------------
  // 4. 現行モダン・高需要枠（SAR・AR・CHR・大会メタ）
  // -------------------------------------------------------------
  { name: 'ナンジャモ SAR', category: 'pokemon', slotKey: 'modern_meta', queryEbay: 'Iono SAR 096/071 Japanese Clay Burst', tcgCategoryId: 3, searchTcg: 'Iono' },
  { name: 'リザードンex SAR (151)', category: 'pokemon', slotKey: 'modern_meta', queryEbay: 'Charizard ex SAR 201/165 Japanese 151', tcgCategoryId: 3, searchTcg: 'Charizard ex' },
  { name: 'ピカチュウ AR (151)', category: 'pokemon', slotKey: 'modern_meta', queryEbay: 'Pikachu AR 173/165 Japanese 151', tcgCategoryId: 3, searchTcg: 'Pikachu' },
  { name: 'ミュウex SAR (151)', category: 'pokemon', slotKey: 'modern_meta', queryEbay: 'Mew ex SAR 205/165 Japanese 151', tcgCategoryId: 3, searchTcg: 'Mew ex' },
  { name: 'エリカの招待 SAR', category: 'pokemon', slotKey: 'modern_meta', queryEbay: 'Erika Invitation SAR 206/165 Japanese 151', tcgCategoryId: 3, searchTcg: 'Erika' },
  { name: 'キハダ SAR', category: 'pokemon', slotKey: 'modern_meta', queryEbay: 'Dendra SAR 099/073 Japanese Triplet Beat', tcgCategoryId: 3, searchTcg: 'Dendra' },
  { name: 'ミモザ SAR', category: 'pokemon', slotKey: 'modern_meta', queryEbay: 'Miriam SAR 105/078 Japanese Violet ex', tcgCategoryId: 3, searchTcg: 'Miriam' },

  // -------------------------------------------------------------
  // 5. 高額鑑定品・未開封BOX枠（PSA10 / 絶版未開封BOX）
  // -------------------------------------------------------------
  { name: 'ブラッキーVMAX SA (PSA 10)', category: 'pokemon', slotKey: 'high_end_sealed', queryEbay: 'Umbreon VMAX HR SA 095/069 PSA 10 Japanese', tcgCategoryId: 3, searchTcg: 'Umbreon VMAX' },
  { name: 'ルギアV SA (PSA 10)', category: 'pokemon', slotKey: 'high_end_sealed', queryEbay: 'Lugia V SR SA 110/098 PSA 10 Japanese', tcgCategoryId: 3, searchTcg: 'Lugia V' },
  { name: 'ギラティナV SA (PSA 10)', category: 'pokemon', slotKey: 'high_end_sealed', queryEbay: 'Giratina V SR SA 111/100 PSA 10 Japanese', tcgCategoryId: 3, searchTcg: 'Giratina V' },
  { name: 'ポケモンカード151 未開封BOX (シュリンク付き)', category: 'pokemon', slotKey: 'high_end_sealed', queryEbay: 'Pokemon 151 Booster Box Japanese Sealed with shrink', tcgCategoryId: 3, searchTcg: 'Pokemon 151 Booster Box' },
  { name: 'イーブイヒーローズ 未開封BOX (シュリンク付き)', category: 'pokemon', slotKey: 'high_end_sealed', queryEbay: 'Eevee Heroes Booster Box Japanese Sealed with shrink', tcgCategoryId: 3, searchTcg: 'Eevee Heroes Booster Box' },
  { name: 'クレイバースト 未開封BOX (シュリンク付き)', category: 'pokemon', slotKey: 'high_end_sealed', queryEbay: 'Clay Burst Booster Box Japanese Sealed with shrink', tcgCategoryId: 3, searchTcg: 'Clay Burst Booster Box' },
];