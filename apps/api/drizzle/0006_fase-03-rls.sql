-- Fase 3 — RLS workflow (idempotent).
-- definitions + instances tenant-scoped langsung; steps & actions via EXISTS ke parent.
--> statement-breakpoint

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['workflow_definitions', 'workflow_instances'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO PUBLIC USING (tenant_id::text = nullif(current_setting(%L, true), %L)) WITH CHECK (tenant_id::text = nullif(current_setting(%L, true), %L))',
      t || '_tenant_isolation', t, 'app.tenant_id', '', 'app.tenant_id', ''
    );
  END LOOP;
END;
$$;
--> statement-breakpoint
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS workflow_steps_tenant_isolation ON workflow_steps;
--> statement-breakpoint
CREATE POLICY workflow_steps_tenant_isolation ON workflow_steps FOR ALL TO PUBLIC
USING (EXISTS (
  SELECT 1 FROM workflow_definitions d
  WHERE d.id = workflow_steps.workflow_definition_id
    AND d.tenant_id::text = nullif(current_setting('app.tenant_id', true), '')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM workflow_definitions d
  WHERE d.id = workflow_steps.workflow_definition_id
    AND d.tenant_id::text = nullif(current_setting('app.tenant_id', true), '')
));
--> statement-breakpoint
ALTER TABLE workflow_approval_actions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS workflow_approval_actions_tenant_isolation ON workflow_approval_actions;
--> statement-breakpoint
CREATE POLICY workflow_approval_actions_tenant_isolation ON workflow_approval_actions FOR ALL TO PUBLIC
USING (EXISTS (
  SELECT 1 FROM workflow_instances i
  WHERE i.id = workflow_approval_actions.workflow_instance_id
    AND i.tenant_id::text = nullif(current_setting('app.tenant_id', true), '')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM workflow_instances i
  WHERE i.id = workflow_approval_actions.workflow_instance_id
    AND i.tenant_id::text = nullif(current_setting('app.tenant_id', true), '')
));
