-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activation_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key_code text NOT NULL UNIQUE,
  key_type text NOT NULL CHECK (key_type = ANY (ARRAY['membership'::text, 'credits'::text])),
  membership_type text,
  credits_amount integer,
  is_used boolean DEFAULT false,
  used_by uuid,
  used_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activation_keys_pkey PRIMARY KEY (id),
  CONSTRAINT activation_keys_used_by_fkey FOREIGN KEY (used_by) REFERENCES auth.users(id),
  CONSTRAINT activation_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.ai_model_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL,
  source_key text NOT NULL,
  source_name text NOT NULL,
  api_url text NOT NULL,
  api_key_env_var text NOT NULL,
  model_id_override text,
  reasoning_model_id text,
  is_active boolean DEFAULT false,
  is_enabled boolean DEFAULT true,
  priority integer DEFAULT 0,
  max_context_tokens integer,
  max_output_tokens integer,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_model_sources_pkey PRIMARY KEY (id),
  CONSTRAINT ai_model_sources_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.ai_models(id)
);
CREATE TABLE public.ai_model_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  model_key text NOT NULL,
  source_key text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  call_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  total_tokens_used bigint DEFAULT 0,
  total_response_time_ms bigint DEFAULT 0,
  CONSTRAINT ai_model_stats_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ai_models (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  model_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  vendor text NOT NULL,
  is_enabled boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  required_tier text NOT NULL DEFAULT 'free'::text CHECK (required_tier = ANY (ARRAY['free'::text, 'plus'::text, 'pro'::text])),
  supports_reasoning boolean DEFAULT false,
  reasoning_required_tier text DEFAULT 'plus'::text CHECK (reasoning_required_tier = ANY (ARRAY['free'::text, 'plus'::text, 'pro'::text])),
  is_reasoning_default boolean DEFAULT false,
  supports_vision boolean DEFAULT false,
  default_temperature numeric DEFAULT 0.7,
  default_max_tokens integer DEFAULT 4000,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_models_pkey PRIMARY KEY (id)
);
CREATE TABLE public.annual_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year integer NOT NULL,
  report_data jsonb NOT NULL,
  generated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT annual_reports_pkey PRIMARY KEY (id),
  CONSTRAINT annual_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.app_settings (
  setting_key text NOT NULL,
  setting_value boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (setting_key)
);
CREATE TABLE public.archived_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type = ANY (ARRAY['conversation'::text, 'record'::text, 'chat_message'::text, 'bazi_chart'::text, 'ziwei_chart'::text, 'tarot_reading'::text, 'liuyao_divination'::text, 'hepan_chart'::text, 'face_reading'::text, 'palm_reading'::text, 'mbti_reading'::text, 'ming_record'::text, 'daily_fortune'::text, 'monthly_fortune'::text])),
  source_id text NOT NULL,
  kb_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT archived_sources_pkey PRIMARY KEY (id),
  CONSTRAINT archived_sources_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT archived_sources_kb_id_fkey FOREIGN KEY (kb_id) REFERENCES public.knowledge_bases(id)
);
CREATE TABLE public.bazi_charts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  gender text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text])),
  birth_date date NOT NULL,
  birth_time text,
  birth_place text,
  chart_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  calendar_type text DEFAULT 'solar'::text,
  is_leap_month boolean DEFAULT false,
  CONSTRAINT bazi_charts_pkey PRIMARY KEY (id),
  CONSTRAINT bazi_charts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.community_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid,
  content text NOT NULL,
  upvote_count integer DEFAULT 0,
  downvote_count integer DEFAULT 0,
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_comments_pkey PRIMARY KEY (id),
  CONSTRAINT community_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id),
  CONSTRAINT community_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT community_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.community_comments(id)
);
CREATE TABLE public.community_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  anonymous_name text NOT NULL DEFAULT '匿名用户'::text,
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general'::text,
  tags ARRAY DEFAULT '{}'::text[],
  view_count integer DEFAULT 0,
  upvote_count integer DEFAULT 0,
  downvote_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_posts_pkey PRIMARY KEY (id),
  CONSTRAINT community_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.community_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type = ANY (ARRAY['post'::text, 'comment'::text])),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'resolved'::text, 'dismissed'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_reports_pkey PRIMARY KEY (id),
  CONSTRAINT community_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id),
  CONSTRAINT community_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
);
CREATE TABLE public.community_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type = ANY (ARRAY['post'::text, 'comment'::text])),
  target_id uuid NOT NULL,
  vote_type text NOT NULL CHECK (vote_type = ANY (ARRAY['up'::text, 'down'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_votes_pkey PRIMARY KEY (id),
  CONSTRAINT community_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  bazi_chart_id uuid,
  ziwei_chart_id uuid,
  personality text DEFAULT 'master'::text,
  title text DEFAULT '新对话'::text,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  source_type text DEFAULT 'chat'::text,
  source_data jsonb,
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT conversations_bazi_chart_id_fkey FOREIGN KEY (bazi_chart_id) REFERENCES public.bazi_charts(id),
  CONSTRAINT conversations_ziwei_chart_id_fkey FOREIGN KEY (ziwei_chart_id) REFERENCES public.ziwei_charts(id)
);
CREATE TABLE public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['earn'::text, 'spend'::text, 'reward'::text])),
  source text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credit_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.daily_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  checkin_date date NOT NULL,
  streak_days integer DEFAULT 1,
  reward_credits integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_checkins_pkey PRIMARY KEY (id),
  CONSTRAINT daily_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.face_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  analysis_type text DEFAULT 'full'::text,
  created_at timestamp with time zone DEFAULT now(),
  conversation_id uuid,
  CONSTRAINT face_readings_pkey PRIMARY KEY (id),
  CONSTRAINT face_readings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT face_readings_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.feature_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_key character varying NOT NULL,
  notify_email boolean DEFAULT true,
  notify_site boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feature_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT feature_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.hepan_charts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['love'::text, 'business'::text, 'family'::text])),
  person1_name text NOT NULL,
  person1_birth jsonb NOT NULL,
  person2_name text NOT NULL,
  person2_birth jsonb NOT NULL,
  compatibility_score integer,
  created_at timestamp with time zone DEFAULT now(),
  conversation_id uuid,
  result_data jsonb,
  CONSTRAINT hepan_charts_pkey PRIMARY KEY (id),
  CONSTRAINT hepan_charts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT hepan_charts_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.knowledge_bases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  weight text DEFAULT 'normal'::text CHECK (weight = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_bases_pkey PRIMARY KEY (id),
  CONSTRAINT knowledge_bases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.knowledge_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kb_id uuid NOT NULL,
  content text NOT NULL,
  content_vector USER-DEFINED,
  source_type text NOT NULL,
  source_id text NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_entries_pkey PRIMARY KEY (id),
  CONSTRAINT knowledge_entries_kb_id_fkey FOREIGN KEY (kb_id) REFERENCES public.knowledge_bases(id)
);
CREATE TABLE public.liuyao_divinations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  question text NOT NULL,
  hexagram_code text NOT NULL,
  changed_hexagram_code text,
  changed_lines jsonb,
  created_at timestamp with time zone DEFAULT now(),
  conversation_id uuid,
  yongshen_targets ARRAY CHECK (yongshen_targets IS NULL OR COALESCE(array_length(yongshen_targets, 1), 0) >= 1 AND yongshen_targets <@ ARRAY['父母'::text, '兄弟'::text, '子孙'::text, '妻财'::text, '官鬼'::text]),
  CONSTRAINT liuyao_divinations_pkey PRIMARY KEY (id),
  CONSTRAINT liuyao_divinations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT liuyao_divinations_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  attempt_at timestamp with time zone DEFAULT now(),
  success boolean DEFAULT false,
  CONSTRAINT login_attempts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.mbti_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mbti_type text NOT NULL,
  scores jsonb,
  percentages jsonb,
  created_at timestamp with time zone DEFAULT now(),
  conversation_id uuid,
  CONSTRAINT mbti_readings_pkey PRIMARY KEY (id),
  CONSTRAINT mbti_readings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT mbti_readings_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.mcp_api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  key_code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  reset_count integer NOT NULL DEFAULT 0,
  is_banned boolean NOT NULL DEFAULT false,
  CONSTRAINT mcp_api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT mcp_api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.mcp_oauth_clients (
  client_id text NOT NULL,
  client_secret text,
  client_secret_expires_at bigint,
  client_id_issued_at bigint NOT NULL DEFAULT EXTRACT(epoch FROM now()),
  redirect_uris ARRAY NOT NULL,
  grant_types ARRAY DEFAULT '{authorization_code,refresh_token}'::text[],
  response_types ARRAY DEFAULT '{code}'::text[],
  token_endpoint_auth_method text DEFAULT 'none'::text,
  client_name text,
  client_uri text,
  logo_uri text,
  scope text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mcp_oauth_clients_pkey PRIMARY KEY (client_id)
);
CREATE TABLE public.mcp_oauth_codes (
  code text NOT NULL,
  client_id text NOT NULL,
  user_id uuid NOT NULL,
  redirect_uri text NOT NULL,
  code_challenge text NOT NULL,
  code_challenge_method text NOT NULL DEFAULT 'S256'::text,
  scope text,
  resource text,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mcp_oauth_codes_pkey PRIMARY KEY (code),
  CONSTRAINT mcp_oauth_codes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.mcp_oauth_clients(client_id),
  CONSTRAINT mcp_oauth_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.mcp_oauth_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  refresh_token text NOT NULL UNIQUE,
  client_id text NOT NULL,
  user_id uuid NOT NULL,
  scope text,
  expires_at timestamp with time zone NOT NULL,
  revoked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  resource text,
  CONSTRAINT mcp_oauth_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT mcp_oauth_tokens_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.mcp_oauth_clients(client_id),
  CONSTRAINT mcp_oauth_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.ming_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  note_date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL,
  mood text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ming_notes_pkey PRIMARY KEY (id),
  CONSTRAINT ming_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.ming_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  category text DEFAULT 'general'::text,
  tags ARRAY DEFAULT '{}'::text[],
  event_date date,
  related_chart_type text,
  related_chart_id uuid,
  is_pinned boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ming_records_pkey PRIMARY KEY (id),
  CONSTRAINT ming_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type character varying NOT NULL,
  title text NOT NULL,
  content text,
  is_read boolean DEFAULT false,
  link text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  product_type text NOT NULL CHECK (product_type = ANY (ARRAY['plus'::text, 'pro'::text, 'pay_per_use'::text])),
  amount numeric NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text, 'refunded'::text])),
  payment_method text,
  created_at timestamp with time zone DEFAULT now(),
  paid_at timestamp with time zone,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.palm_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  analysis_type text DEFAULT 'full'::text,
  hand_type text DEFAULT 'left'::text CHECK (hand_type = ANY (ARRAY['left'::text, 'right'::text, 'both'::text])),
  created_at timestamp with time zone DEFAULT now(),
  conversation_id uuid,
  CONSTRAINT palm_readings_pkey PRIMARY KEY (id),
  CONSTRAINT palm_readings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT palm_readings_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.purchase_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  link_type text NOT NULL UNIQUE CHECK (link_type = ANY (ARRAY['plus'::text, 'pro'::text, 'credits'::text])),
  url text NOT NULL,
  description text,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT purchase_links_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_links_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.rate_limits (
  id integer NOT NULL DEFAULT nextval('rate_limits_id_seq'::regclass),
  identifier character varying NOT NULL,
  endpoint character varying NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limits_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reminder_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type = ANY (ARRAY['solar_term'::text, 'fortune'::text, 'key_date'::text])),
  enabled boolean DEFAULT true,
  notify_email boolean DEFAULT false,
  notify_site boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reminder_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT reminder_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.scheduled_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reminder_type text NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  content jsonb,
  sent boolean DEFAULT false,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduled_reminders_pkey PRIMARY KEY (id),
  CONSTRAINT scheduled_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.tarot_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  spread_id text NOT NULL,
  question text,
  cards jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  conversation_id uuid,
  CONSTRAINT tarot_readings_pkey PRIMARY KEY (id),
  CONSTRAINT tarot_readings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT tarot_readings_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_key text NOT NULL,
  unlocked_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_levels (
  user_id uuid NOT NULL,
  level integer DEFAULT 1,
  experience integer DEFAULT 0,
  total_experience integer DEFAULT 0,
  title text DEFAULT '初学者'::text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_levels_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_levels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_settings (
  user_id uuid NOT NULL,
  notifications_enabled boolean DEFAULT true,
  notify_email boolean DEFAULT true,
  notify_site boolean DEFAULT true,
  language text DEFAULT 'zh'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  default_bazi_chart_id uuid,
  default_ziwei_chart_id uuid,
  sidebar_config jsonb DEFAULT '{}'::jsonb,
  custom_instructions text,
  expression_style text DEFAULT 'direct'::text CHECK (expression_style = ANY (ARRAY['direct'::text, 'gentle'::text])),
  user_profile jsonb DEFAULT '{}'::jsonb,
  prompt_kb_ids jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT user_settings_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_settings_default_bazi_chart_id_fkey FOREIGN KEY (default_bazi_chart_id) REFERENCES public.bazi_charts(id),
  CONSTRAINT user_settings_default_ziwei_chart_id_fkey FOREIGN KEY (default_ziwei_chart_id) REFERENCES public.ziwei_charts(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  nickname text,
  avatar_url text,
  membership text DEFAULT 'free'::text CHECK (membership = ANY (ARRAY['free'::text, 'plus'::text, 'pro'::text])),
  membership_expires_at timestamp with time zone,
  ai_chat_count integer DEFAULT 3,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_credit_restore_at timestamp with time zone DEFAULT now(),
  is_admin boolean DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.ziwei_charts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  gender text,
  birth_date date NOT NULL,
  birth_time text,
  calendar_type text DEFAULT 'solar'::text,
  chart_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  is_leap_month boolean DEFAULT false,
  birth_place text,
  CONSTRAINT ziwei_charts_pkey PRIMARY KEY (id),
  CONSTRAINT ziwei_charts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
