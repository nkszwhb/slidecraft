CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  current_step text NOT NULL DEFAULT 'requirements',
  theme_id text NOT NULL,
  theme_version text NOT NULL,
  recipe_id text NOT NULL,
  page_count integer NOT NULL,
  language text NOT NULL DEFAULT 'zh-CN',
  ratio text NOT NULL DEFAULT '16:9',
  requirements jsonb,
  outline jsonb,
  error_message text,
  has_assets boolean NOT NULL DEFAULT false,
  assets_skipped boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS task_steps (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  state text NOT NULL,
  error_message text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, step_id)
);

CREATE TABLE IF NOT EXISTS task_events (
  id bigserial PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type text NOT NULL,
  stage text,
  message text NOT NULL,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_events_task_id_id_idx ON task_events (task_id, id);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  original_name text NOT NULL,
  storage_key text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  purpose text NOT NULL DEFAULT 'content',
  parse_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artifacts (
  id uuid PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  kind text NOT NULL,
  storage_key text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  protocol text NOT NULL,
  base_url text NOT NULL,
  api_key_ciphertext text NOT NULL,
  api_key_iv text NOT NULL,
  api_key_tag text NOT NULL,
  timeout_ms integer NOT NULL DEFAULT 120000,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS models (
  id uuid PRIMARY KEY,
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  model_id text NOT NULL,
  display_name text NOT NULL,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default_text boolean NOT NULL DEFAULT false,
  is_default_vision boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS models_provider_model_idx ON models (provider_id, model_id);
CREATE UNIQUE INDEX IF NOT EXISTS one_default_text_model_idx ON models (is_default_text) WHERE is_default_text;
CREATE UNIQUE INDEX IF NOT EXISTS one_default_vision_model_idx ON models (is_default_vision) WHERE is_default_vision;
