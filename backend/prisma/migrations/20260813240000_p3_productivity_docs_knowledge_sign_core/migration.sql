-- P3.6 Productivity core: private Documents, Knowledge, and electronic-signature workflow.
-- Protected file bytes are stored outside the public /uploads static tree. This schema stores metadata,
-- immutable versions, ACLs, knowledge revisions, signature requests, recipients, and append-only audit events.

CREATE TABLE IF NOT EXISTS public.document_folders (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES public.document_folders(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT document_folder_name_not_blank CHECK (length(trim(name)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_document_folder_name
  ON public.document_folders (tenant_id, COALESCE(parent_id,0), lower(name));
CREATE INDEX IF NOT EXISTS idx_document_folder_scope ON public.document_folders (tenant_id,parent_id,id);

CREATE TABLE IF NOT EXISTS public.business_documents (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  folder_id BIGINT REFERENCES public.document_folders(id) ON DELETE SET NULL,
  title VARCHAR(240) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  current_version INTEGER NOT NULL DEFAULT 0,
  owner_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  linked_record_type VARCHAR(80),
  linked_record_id VARCHAR(120),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT business_document_status_valid CHECK (status IN ('draft','active','archived')),
  CONSTRAINT business_document_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT business_document_version_nonnegative CHECK (current_version >= 0)
);
CREATE INDEX IF NOT EXISTS idx_business_document_scope ON public.business_documents (tenant_id,status,folder_id,id);
CREATE INDEX IF NOT EXISTS idx_business_document_link ON public.business_documents (tenant_id,linked_record_type,linked_record_id);

CREATE TABLE IF NOT EXISTS public.business_document_versions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id BIGINT NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(160) NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_document_version_positive CHECK (version_no > 0),
  CONSTRAINT business_document_size_valid CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  CONSTRAINT business_document_sha_valid CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT ux_business_document_version UNIQUE (tenant_id,document_id,version_no),
  CONSTRAINT ux_business_document_version_hash UNIQUE (tenant_id,document_id,sha256)
);
CREATE INDEX IF NOT EXISTS idx_business_document_version_scope ON public.business_document_versions (tenant_id,document_id,version_no DESC,id);

CREATE TABLE IF NOT EXISTS public.business_document_acl (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id BIGINT NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
  principal_type VARCHAR(20) NOT NULL,
  principal_user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  role_name VARCHAR(80),
  access_level VARCHAR(20) NOT NULL DEFAULT 'view',
  granted_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_document_acl_principal_valid CHECK (
    (principal_type='user' AND principal_user_id IS NOT NULL AND role_name IS NULL) OR
    (principal_type='role' AND principal_user_id IS NULL AND role_name IS NOT NULL AND length(trim(role_name)) > 0)
  ),
  CONSTRAINT business_document_acl_level_valid CHECK (access_level IN ('view','edit','manage'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_business_document_acl_user
  ON public.business_document_acl (tenant_id,document_id,principal_user_id)
  WHERE principal_type='user';
CREATE UNIQUE INDEX IF NOT EXISTS ux_business_document_acl_role
  ON public.business_document_acl (tenant_id,document_id,lower(role_name))
  WHERE principal_type='role';
CREATE INDEX IF NOT EXISTS idx_business_document_acl_scope ON public.business_document_acl (tenant_id,document_id,id);

CREATE TABLE IF NOT EXISTS public.knowledge_spaces (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  visibility VARCHAR(20) NOT NULL DEFAULT 'tenant',
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_space_visibility_valid CHECK (visibility IN ('tenant','restricted')),
  CONSTRAINT knowledge_space_name_not_blank CHECK (length(trim(name)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_knowledge_space_name ON public.knowledge_spaces (tenant_id,lower(name));

CREATE TABLE IF NOT EXISTS public.knowledge_articles (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  space_id BIGINT NOT NULL REFERENCES public.knowledge_spaces(id) ON DELETE CASCADE,
  slug VARCHAR(140) NOT NULL,
  title VARCHAR(240) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  current_version INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  CONSTRAINT knowledge_article_status_valid CHECK (status IN ('draft','published','archived')),
  CONSTRAINT knowledge_article_slug_valid CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,139}$'),
  CONSTRAINT knowledge_article_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT knowledge_article_version_nonnegative CHECK (current_version >= 0),
  CONSTRAINT ux_knowledge_article_slug UNIQUE (tenant_id,space_id,slug)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_article_scope ON public.knowledge_articles (tenant_id,space_id,status,id);

CREATE TABLE IF NOT EXISTS public.knowledge_article_versions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  article_id BIGINT NOT NULL REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary VARCHAR(500),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_article_version_positive CHECK (version_no > 0),
  CONSTRAINT knowledge_article_content_array CHECK (jsonb_typeof(content)='array'),
  CONSTRAINT ux_knowledge_article_version UNIQUE (tenant_id,article_id,version_no)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_article_version_scope ON public.knowledge_article_versions (tenant_id,article_id,version_no DESC,id);

CREATE TABLE IF NOT EXISTS public.signature_requests (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id BIGINT NOT NULL REFERENCES public.business_documents(id) ON DELETE RESTRICT,
  document_version_id BIGINT NOT NULL REFERENCES public.business_document_versions(id) ON DELETE RESTRICT,
  subject VARCHAR(240) NOT NULL,
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  expires_at TIMESTAMPTZ,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT signature_request_status_valid CHECK (status IN ('draft','sent','completed','cancelled','expired')),
  CONSTRAINT signature_request_subject_not_blank CHECK (length(trim(subject)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_signature_request_scope ON public.signature_requests (tenant_id,status,id);
CREATE INDEX IF NOT EXISTS idx_signature_request_document ON public.signature_requests (tenant_id,document_id,document_version_id,id);

CREATE TABLE IF NOT EXISTS public.signature_recipients (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  request_id BIGINT NOT NULL REFERENCES public.signature_requests(id) ON DELETE CASCADE,
  recipient_type VARCHAR(20) NOT NULL DEFAULT 'external',
  user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_name VARCHAR(180) NOT NULL,
  recipient_email VARCHAR(240) NOT NULL,
  signing_order INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  access_token_hash CHAR(64) NOT NULL,
  signature_type VARCHAR(20),
  signature_name VARCHAR(180),
  signature_evidence_hash CHAR(64),
  consent_text VARCHAR(1000),
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT signature_recipient_type_valid CHECK (recipient_type IN ('user','external')),
  CONSTRAINT signature_recipient_user_valid CHECK (
    (recipient_type='user' AND user_id IS NOT NULL) OR recipient_type='external'
  ),
  CONSTRAINT signature_recipient_status_valid CHECK (status IN ('pending','signed','declined')),
  CONSTRAINT signature_recipient_order_valid CHECK (signing_order > 0),
  CONSTRAINT signature_recipient_token_valid CHECK (access_token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT signature_recipient_mark_valid CHECK (
    (status='signed' AND signature_type='typed' AND signature_name IS NOT NULL AND signature_evidence_hash IS NOT NULL AND signed_at IS NOT NULL)
    OR status <> 'signed'
  ),
  CONSTRAINT ux_signature_recipient_order UNIQUE (tenant_id,request_id,signing_order),
  CONSTRAINT ux_signature_recipient_token UNIQUE (access_token_hash)
);
CREATE INDEX IF NOT EXISTS idx_signature_recipient_scope ON public.signature_recipients (tenant_id,request_id,status,id);

CREATE TABLE IF NOT EXISTS public.productivity_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) NOT NULL,
  entity_id BIGINT NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  actor_recipient_id BIGINT REFERENCES public.signature_recipients(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT productivity_event_entity_valid CHECK (entity_type IN ('document','document_version','knowledge_space','knowledge_article','signature_request','signature_recipient')),
  CONSTRAINT productivity_event_type_not_blank CHECK (length(trim(event_type)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_productivity_event_scope ON public.productivity_events (tenant_id,entity_type,entity_id,id);

CREATE OR REPLACE FUNCTION public.prevent_productivity_version_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_document_versions_immutable ON public.business_document_versions;
CREATE TRIGGER trg_business_document_versions_immutable
BEFORE UPDATE OR DELETE ON public.business_document_versions
FOR EACH ROW EXECUTE FUNCTION public.prevent_productivity_version_mutation();

DROP TRIGGER IF EXISTS trg_knowledge_article_versions_immutable ON public.knowledge_article_versions;
CREATE TRIGGER trg_knowledge_article_versions_immutable
BEFORE UPDATE OR DELETE ON public.knowledge_article_versions
FOR EACH ROW EXECUTE FUNCTION public.prevent_productivity_version_mutation();

DROP TRIGGER IF EXISTS trg_productivity_events_immutable ON public.productivity_events;
CREATE TRIGGER trg_productivity_events_immutable
BEFORE UPDATE OR DELETE ON public.productivity_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_productivity_version_mutation();

COMMENT ON TABLE public.business_document_versions IS
  'Immutable metadata for protected document versions; storage_key points to private, non-static file storage.';
COMMENT ON TABLE public.knowledge_article_versions IS
  'Immutable declarative JSON article revisions. Raw HTML is not a supported knowledge content contract.';
COMMENT ON TABLE public.signature_requests IS
  'Electronic acknowledgement workflow pinned to one immutable business_document_versions row.';
COMMENT ON TABLE public.signature_recipients IS
  'Recipient access is via hashed opaque token; baseline signature mark is typed name plus evidence hash.';
COMMENT ON TABLE public.productivity_events IS
  'Append-only audit ledger for Documents, Knowledge, and Sign lifecycle operations.';
