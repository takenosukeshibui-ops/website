export type PipelineStatus =
  | 'initialized'
  | 'researching'
  | 'curating'
  | 'gate1_auditing'
  | 'generating_content'
  | 'gate2_auditing'
  | 'ready_to_publish'
  | 'partially_failed'
  | 'completed';

export type AuditStatus = 'pending' | 'passed' | 'rejected' | 'needs_revision';
export type DeliveryStatus = 'drafting' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'failed';

export interface ResearchItemRecord {
  id: string;
  cycle_id: string;
  agent_key: string;
  region: 'us' | 'eu' | 'asia';
  slot_key: string;
  price_tier?: string;
  card_name: string;
  condition_grade: string;
  jp_buy_price_jpy: number;
  target_sold_price_local: string;
  target_sold_price_jpy: number;
  price_spread_jpy: number;
  spread_roi_percent: number;
  liquidity_indicator?: string;
  research_insight?: string;
  raw_payload?: any;
  is_selected: boolean;
  assigned_day?: string;
  is_mvp: boolean;
  core_hook_fact?: string;
  curator_rationale?: string;
  gate1_status: AuditStatus;
  gate1_checks?: any;
  gate1_feedback?: string;
}

export interface DeliverableRecord {
  id: string;
  cycle_id: string;
  research_item_id?: string;
  platform: 'instagram' | 'x' | 'discord';
  day_of_week: string;
  post_type: string;
  content_payload: any;
  gate2_status: AuditStatus;
  gate2_checks?: any;
  gate2_feedback?: string;
  retry_count: number;
  status: DeliveryStatus;
}