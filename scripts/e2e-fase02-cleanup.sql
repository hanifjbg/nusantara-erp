-- Bersihkan data E2E Fase 2 (tenant_code LIKE 'E2B%'). Dev only.
DO $$
DECLARE
  tid uuid;
  r record;
BEGIN
  FOR tid IN SELECT id FROM tenants WHERE tenant_code LIKE 'E2B%' LOOP
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
    FOR r IN SELECT id FROM price_lists WHERE tenant_id = tid LOOP
      DELETE FROM price_list_items WHERE price_list_id = r.id;
    END LOOP;
    DELETE FROM price_lists WHERE tenant_id = tid;
    DELETE FROM item_variants WHERE tenant_id = tid;
    DELETE FROM items WHERE tenant_id = tid;
    DELETE FROM item_categories WHERE tenant_id = tid;
    DELETE FROM uom_conversions WHERE tenant_id = tid;
    DELETE FROM units_of_measure WHERE tenant_id = tid;
    DELETE FROM customer_contacts WHERE tenant_id = tid;
    DELETE FROM customer_addresses WHERE tenant_id = tid;
    DELETE FROM customers WHERE tenant_id = tid;
    DELETE FROM vendor_contacts WHERE tenant_id = tid;
    DELETE FROM vendors WHERE tenant_id = tid;
    DELETE FROM warehouse_bins WHERE tenant_id = tid;
    DELETE FROM warehouse_zones WHERE tenant_id = tid;
    DELETE FROM warehouses WHERE tenant_id = tid;
    DELETE FROM exchange_rates WHERE tenant_id = tid;
    DELETE FROM chart_of_accounts WHERE tenant_id = tid;
    DELETE FROM fiscal_periods WHERE tenant_id = tid;
    DELETE FROM tax_codes WHERE tenant_id = tid;
    DELETE FROM number_sequences WHERE tenant_id = tid;
    DELETE FROM branches WHERE tenant_id = tid;
    DELETE FROM organizations WHERE tenant_id = tid;
    DELETE FROM tenants WHERE id = tid;
  END LOOP;
END;
$$;
SELECT count(*) AS sisa_e2b FROM tenants WHERE tenant_code LIKE 'E2B%';
