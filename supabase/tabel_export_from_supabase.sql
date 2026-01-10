-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
  ai_wuxing_analysis text,
  ai_personality_analysis text,
  CONSTRAINT bazi_charts_pkey PRIMARY KEY (id),
  CONSTRAINT bazi_charts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
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
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT conversations_bazi_chart_id_fkey FOREIGN KEY (bazi_chart_id) REFERENCES public.bazi_charts(id),
  CONSTRAINT conversations_ziwei_chart_id_fkey FOREIGN KEY (ziwei_chart_id) REFERENCES public.ziwei_charts(id)
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
  ai_analysis text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT hepan_charts_pkey PRIMARY KEY (id),
  CONSTRAINT hepan_charts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.liuyao_divinations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  question text NOT NULL,
  hexagram_code text NOT NULL,
  changed_hexagram_code text,
  changed_lines jsonb,
  ai_interpretation text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT liuyao_divinations_pkey PRIMARY KEY (id),
  CONSTRAINT liuyao_divinations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  attempt_at timestamp with time zone DEFAULT now(),
  success boolean DEFAULT false,
  CONSTRAINT login_attempts_pkey PRIMARY KEY (id)
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
CREATE TABLE public.rate_limits (
  id integer NOT NULL DEFAULT nextval('rate_limits_id_seq'::regclass),
  identifier character varying NOT NULL,
  endpoint character varying NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limits_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tarot_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  spread_id text NOT NULL,
  question text,
  cards jsonb NOT NULL,
  interpretation text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tarot_readings_pkey PRIMARY KEY (id),
  CONSTRAINT tarot_readings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_settings (
  user_id uuid NOT NULL,
  notifications_enabled boolean DEFAULT true,
  notify_email boolean DEFAULT true,
  notify_site boolean DEFAULT true,
  language text DEFAULT 'zh'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_settings_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
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