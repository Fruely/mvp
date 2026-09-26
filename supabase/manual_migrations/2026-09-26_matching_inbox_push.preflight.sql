-- Read-only production preflight for the matching, inbox, selection and push migrations.
-- Run in the Supabase SQL editor BEFORE any of:
--   2026-09-26_service_request_matches.sql
--   2026-09-26_freuly_inbox_delivery.sql
--   2026-09-26_client_selection.sql
--   2026-09-26_native_push_notifications.sql
-- This file only reads catalogs. It does not change schema or data.
-- Counts come from pg_stat and contain no row contents.

-- 1. Tables the migrations assume or will add.
SELECT expected.name AS object_name,
       to_regclass('public.' || expected.name) IS NOT NULL AS present
FROM (VALUES
  ('service_requests'),
  ('specialists'),
  ('service_request_matches'),
  ('inbox_items'),
  ('notification_outbox'),
  ('notification_delivery_attempts'),
  ('service_request_access_tokens'),
  ('conversations'),
  ('conversation_messages'),
  ('push_endpoints'),
  ('notification_preferences')
) AS expected(name)
ORDER BY expected.name;

-- 2. Columns required before the migrations, and columns the migrations add.
SELECT expected.table_name,
       expected.column_name,
       columns.data_type,
       columns.is_nullable,
       columns.column_default,
       columns.column_name IS NOT NULL AS present
FROM (VALUES
  ('service_requests', 'id'),
  ('service_requests', 'status'),
  ('service_requests', 'service_languages'),
  ('service_requests', 'selected_specialist_id'),
  ('service_requests', 'selected_at'),
  ('service_requests', 'first_specialist_response_at'),
  ('specialists', 'id'),
  ('specialists', 'user_id'),
  ('specialists', 'notification_locale'),
  ('inbox_items', 'recipient_user_id'),
  ('inbox_items', 'service_request_id'),
  ('inbox_items', 'read_at'),
  ('inbox_items', 'push_tapped_at'),
  ('notification_outbox', 'recipient_user_id'),
  ('notification_delivery_attempts', 'endpoint_id'),
  ('notification_delivery_attempts', 'provider'),
  ('notification_delivery_attempts', 'platform')
) AS expected(table_name, column_name)
LEFT JOIN information_schema.columns AS columns
  ON columns.table_schema = 'public'
 AND columns.table_name = expected.table_name
 AND columns.column_name = expected.column_name
ORDER BY expected.table_name, expected.column_name;

-- 3. auth.uid and the roles used by policies.
SELECT n.nspname AS schema_name, p.proname AS function_name
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'auth' AND p.proname = 'uid';

SELECT rolname
FROM pg_roles
WHERE rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY rolname;

-- 4. Current check constraints whose names the migrations replace.
SELECT con.conrelid::regclass AS table_name,
       con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint AS con
JOIN pg_namespace AS n ON n.oid = con.connamespace
WHERE n.nspname = 'public'
  AND con.conname IN (
    'service_request_matches_status_check',
    'inbox_items_recipient_present',
    'notification_outbox_status_check',
    'notification_delivery_attempts_unique',
    'notification_preferences_marketing_false',
    'push_endpoints_platform_check',
    'push_endpoints_provider_check',
    'conversations_status_check',
    'conversation_messages_shape_check'
  )
ORDER BY con.conname;

-- 5. Indexes and unique names the migrations use.
SELECT expected.index_name,
       idx.indexname IS NOT NULL AS present,
       idx.tablename,
       idx.indexdef
FROM (VALUES
  ('idx_service_request_matches_specialist_matched'),
  ('idx_service_request_matches_request'),
  ('service_request_matches_one_selected'),
  ('idx_inbox_items_recipient_created'),
  ('idx_inbox_items_recipient_unread'),
  ('idx_notification_outbox_due'),
  ('notification_delivery_attempts_endpoint_unique'),
  ('idx_service_request_access_tokens_request'),
  ('idx_conversation_messages_conversation'),
  ('idx_push_endpoints_user_active'),
  ('push_endpoints_token_hash_unique'),
  ('push_endpoints_user_device_unique'),
  ('service_request_matches_unique_pair'),
  ('inbox_items_dedupe_key_unique'),
  ('notification_outbox_dedupe_key_unique'),
  ('service_request_access_tokens_hash_unique'),
  ('conversations_request_unique')
) AS expected(index_name)
LEFT JOIN pg_indexes AS idx
  ON idx.schemaname = 'public'
 AND idx.indexname = expected.index_name
ORDER BY expected.index_name;

-- 6. Policies the migrations use, and current RLS.
SELECT expected.policy_name,
       pol.polname IS NOT NULL AS present
FROM (VALUES
  ('service_request_matches_select_own'),
  ('inbox_items_select_own'),
  ('conversations_select_participant'),
  ('conversation_messages_select_participant'),
  ('push_endpoints_select_own'),
  ('push_endpoints_insert_own'),
  ('push_endpoints_update_own'),
  ('notification_preferences_select_own'),
  ('notification_preferences_insert_own'),
  ('notification_preferences_update_own')
) AS expected(policy_name)
LEFT JOIN pg_policy AS pol ON pol.polname = expected.policy_name
ORDER BY expected.policy_name;

SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'service_requests',
    'specialists',
    'service_request_matches',
    'inbox_items',
    'notification_outbox',
    'notification_delivery_attempts',
    'service_request_access_tokens',
    'conversations',
    'conversation_messages',
    'push_endpoints',
    'notification_preferences'
  )
ORDER BY c.relname;

-- 7. Estimated row counts. No emails, phones, tokens or request text.
SELECT relname AS table_name,
       n_live_tup AS estimated_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN (
    'service_requests',
    'specialists',
    'service_request_matches',
    'inbox_items',
    'notification_outbox',
    'notification_delivery_attempts'
  )
ORDER BY relname;
