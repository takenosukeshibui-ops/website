-- ========================================================
-- 1. ENUM型の作成（二重作成エラー防止付き）
-- ========================================================
DO $$ BEGIN
  CREATE TYPE pipeline_status AS ENUM (
    'initialized',
    'researching',
    'curating',
    'gate1_auditing',
    'generating_content',
    'gate2_auditing',
    'ready_to_publish',
    'partially_failed',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_status AS ENUM ('pending', 'passed', 'rejected', 'needs_revision');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('drafting', 'pending_review', 'approved', 'rejected', 'published', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ========================================================
-- 2. パイプライン親管理テーブル: ai_pipeline_cycles
-- ========================================================
CREATE TABLE IF NOT EXISTS public.ai_pipeline_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'pokemon',
  target_week DATE NOT NULL,
  status pipeline_status NOT NULL DEFAULT 'initialized',
  trigger_type TEXT NOT NULL DEFAULT 'cron',
  error_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_pipeline_cycles_status ON public.ai_pipeline_cycles(status);
CREATE INDEX IF NOT EXISTS idx_ai_pipeline_cycles_target_week ON public.ai_pipeline_cycles(target_week);

-- ========================================================
-- 3. リサーチ・キュレーター選定・Gate 1 監査テーブル: ai_research_items
-- ========================================================
CREATE TABLE IF NOT EXISTS public.ai_research_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.ai_pipeline_cycles(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  region TEXT NOT NULL,
  slot_key TEXT NOT NULL,
  price_tier TEXT,
  card_name TEXT NOT NULL,
  condition_grade TEXT NOT NULL DEFAULT 'Raw NM',
  jp_buy_price_jpy NUMERIC NOT NULL,
  target_sold_price_local TEXT NOT NULL,
  target_sold_price_jpy NUMERIC NOT NULL,
  price_spread_jpy NUMERIC NOT NULL,
  spread_roi_percent NUMERIC NOT NULL,
  liquidity_indicator TEXT,
  research_insight TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_day TEXT,
  is_mvp BOOLEAN NOT NULL DEFAULT FALSE,
  core_hook_fact TEXT,
  curator_rationale TEXT,
  gate1_status audit_status NOT NULL DEFAULT 'pending',
  gate1_checks JSONB DEFAULT '{"card_existence_verified": null, "roi_calculation_valid": null, "official_tournament_compliant": null}'::jsonb,
  gate1_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_research_items_cycle_selected ON public.ai_research_items(cycle_id, is_selected);
CREATE INDEX IF NOT EXISTS idx_ai_research_items_gate1_status ON public.ai_research_items(gate1_status);

-- ========================================================
-- 4. プラットフォーム戦術レギュレーションテーブル: ai_platform_tactics
-- ========================================================
CREATE TABLE IF NOT EXISTS public.ai_platform_tactics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.ai_pipeline_cycles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  recommended_timing TEXT NOT NULL,
  hook_guidelines TEXT NOT NULL,
  structure_blueprint JSONB NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  raw_insights JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_cycle_platform UNIQUE (cycle_id, platform)
);

-- ========================================================
-- 5. 原稿成果物・Gate 2 監査・配信実績テーブル: ai_content_deliverables
-- ========================================================
CREATE TABLE IF NOT EXISTS public.ai_content_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.ai_pipeline_cycles(id) ON DELETE CASCADE,
  research_item_id UUID REFERENCES public.ai_research_items(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  post_type TEXT NOT NULL,
  content_payload JSONB NOT NULL,
  gate2_status audit_status NOT NULL DEFAULT 'pending',
  gate2_checks JSONB DEFAULT '{"secrets_leaked": null, "platform_rule_compliant": null, "dual_funnel_cta_valid": null}'::jsonb,
  gate2_feedback TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  status delivery_status NOT NULL DEFAULT 'drafting',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  external_post_id TEXT,
  actual_metrics JSONB DEFAULT '{"impressions": 0, "saves_or_bookmarks": 0, "clicks": 0, "inquiries_or_deals": 0}'::jsonb,
  accuracy_hit_confirmed BOOLEAN DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_content_deliverables_cycle_day ON public.ai_content_deliverables(cycle_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_ai_content_deliverables_status ON public.ai_content_deliverables(status);

-- ========================================================
-- 6. RLS (Row Level Security) の設定
-- ========================================================
ALTER TABLE public.ai_pipeline_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_research_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_platform_tactics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_content_deliverables ENABLE ROW LEVEL SECURITY;

-- 管理者・サービスロール用の全アクセス許可ポリシー
CREATE POLICY "Admin full access on ai_pipeline_cycles" ON public.ai_pipeline_cycles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access on ai_research_items" ON public.ai_research_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access on ai_platform_tactics" ON public.ai_platform_tactics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access on ai_content_deliverables" ON public.ai_content_deliverables
  FOR ALL USING (true) WITH CHECK (true);