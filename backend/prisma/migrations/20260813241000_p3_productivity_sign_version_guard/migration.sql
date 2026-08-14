-- P3.6 integrity hardening: tenant/document/version relationships are enforced by composite foreign keys.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='ux_business_document_tenant_id'
      AND conrelid='public.business_documents'::regclass
  ) THEN
    ALTER TABLE public.business_documents
      ADD CONSTRAINT ux_business_document_tenant_id UNIQUE (tenant_id,id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='ux_business_document_version_scope_id'
      AND conrelid='public.business_document_versions'::regclass
  ) THEN
    ALTER TABLE public.business_document_versions
      ADD CONSTRAINT ux_business_document_version_scope_id UNIQUE (tenant_id,id,document_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='fk_business_document_version_tenant_document'
      AND conrelid='public.business_document_versions'::regclass
  ) THEN
    ALTER TABLE public.business_document_versions
      ADD CONSTRAINT fk_business_document_version_tenant_document
      FOREIGN KEY (tenant_id,document_id)
      REFERENCES public.business_documents(tenant_id,id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='fk_signature_request_exact_document_version'
      AND conrelid='public.signature_requests'::regclass
  ) THEN
    ALTER TABLE public.signature_requests
      ADD CONSTRAINT fk_signature_request_exact_document_version
      FOREIGN KEY (tenant_id,document_version_id,document_id)
      REFERENCES public.business_document_versions(tenant_id,id,document_id)
      ON DELETE RESTRICT;
  END IF;
END $$;
