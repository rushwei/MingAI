BEGIN;

DROP TABLE IF EXISTS public.announcement_user_states;
DROP TABLE IF EXISTS public.announcements;

CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content text NOT NULL,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (id)
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

COMMIT;
