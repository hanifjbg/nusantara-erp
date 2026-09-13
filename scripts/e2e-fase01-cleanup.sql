-- Bersihkan data E2E Fase 1 (tenant_code LIKE 'E2E%'). Dev only.
DO $$
DECLARE
  tid uuid;
  r record;
BEGIN
  FOR tid IN SELECT id FROM tenants WHERE tenant_code LIKE 'E2E%' LOOP
    DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE tenant_id = tid);
    DELETE FROM login_histories WHERE user_id IN (SELECT id FROM users WHERE tenant_id = tid);
    DELETE FROM audit_logs WHERE tenant_id = tid;
    DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE tenant_id = tid);
    DELETE FROM user_organizations WHERE user_id IN (SELECT id FROM users WHERE tenant_id = tid);
    FOR r IN SELECT id FROM roles WHERE tenant_id = tid LOOP
      DELETE FROM role_permissions WHERE role_id = r.id;
    END LOOP;
    DELETE FROM roles WHERE tenant_id = tid;
    DELETE FROM users WHERE tenant_id = tid;
    DELETE FROM branches WHERE tenant_id = tid;
    DELETE FROM number_sequences WHERE tenant_id = tid;
    DELETE FROM custom_field_values WHERE tenant_id = tid;
    DELETE FROM custom_field_definitions WHERE tenant_id = tid;
    DELETE FROM addresses WHERE tenant_id = tid;
    DELETE FROM organizations WHERE tenant_id = tid;
    DELETE FROM tenant_settings WHERE tenant_id = tid;
    DELETE FROM feature_flags WHERE tenant_id = tid;
    DELETE FROM tenants WHERE id = tid;
  END LOOP;
END;
$$;
SELECT count(*) AS sisa_e2e FROM tenants WHERE tenant_code LIKE 'E2E%';
