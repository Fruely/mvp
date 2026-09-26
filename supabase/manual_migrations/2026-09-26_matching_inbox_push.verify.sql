-- Read-only check after the four 2026-09-26 matching migrations.
-- Run in the Supabase SQL editor. It does not change schema or data.
-- A missing object comes back as present = false. Counts contain no row contents.

-- 1. Tables.
SELECT expected.name AS table_name,
       to_regclass('public.' || expected.name) IS NOT NULL AS present
FROM (VALUES
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

-- 2. Required columns and nullability.
SELECT expected.table_name,
       expected.column_name,
       columns.data_type,
       columns.is_nullable,
       columns.column_name IS NOT NULL AS present
FROM (VALUES
  ('service_requests', 'service_languages'),
  ('service_requests', 'selected_specialist_id'),
  ('service_requests', 'selected_at'),
  ('service_requests', 'first_specialist_response_at'),
  ('specialists', 'notification_locale'),
  ('service_request_matches', 'status'),
  ('service_request_matches', 'opened_at'),
  ('service_request_matches', 'responded_at'),
  ('service_request_matches', 'first_notified_at'),
  ('inbox_items', 'recipient_user_id'),
  ('inbox_items', 'service_request_id'),
  ('inbox_items', 'read_at'),
  ('inbox_items', 'dedupe_key'),
  ('inbox_items', 'push_tapped_at'),
  ('notification_outbox', 'recipient_user_id'),
  ('notification_outbox', 'status'),
  ('notification_delivery_attempts', 'outbox_id'),
  ('notification_delivery_attempts', 'attempt'),
  ('notification_delivery_attempts', 'endpoint_id'),
  ('notification_delivery_attempts', 'provider'),
  ('notification_delivery_attempts', 'platform'),
  ('service_request_access_tokens', 'token_hash'),
  ('conversations', 'service_request_id'),
  ('conversations', 'status'),
  ('conversation_messages', 'kind'),
  ('push_endpoints', 'token_hash'),
  ('push_endpoints', 'user_id'),
  ('push_endpoints', 'device_id'),
  ('push_endpoints', 'platform'),
  ('notification_preferences', 'marketing_consent')
) AS expected(table_name, column_name)
LEFT JOIN information_schema.columns AS columns
  ON columns.table_schema = 'public'
 AND columns.table_name = expected.table_name
 AND columns.column_name = expected.column_name
ORDER BY expected.table_name, expected.column_name;

-- 3. Match statuses, one-selection invariant, unread index, push uniqueness.
SELECT con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint AS con
JOIN pg_namespace AS n ON n.oid = con.connamespace
WHERE n.nspname = 'public'
  AND con.conname IN (
    'service_request_matches_status_check',
    'inbox_items_recipient_present',
    'notification_preferences_marketing_false',
    'push_endpoints_platform_check',
    'push_endpoints_token_hash_unique',
    'push_endpoints_user_device_unique',
    'conversations_request_unique'
  )
ORDER BY con.conname;

SELECT expected.index_name,
       idx.indexname IS NOT NULL AS present,
       idx.indexdef
FROM (VALUES
  ('service_request_matches_one_selected'),
  ('idx_inbox_items_recipient_unread'),
  ('notification_delivery_attempts_endpoint_unique'),
  ('push_endpoints_token_hash_unique'),
  ('push_endpoints_user_device_unique'),
  ('idx_push_endpoints_user_active')
) AS expected(index_name)
LEFT JOIN pg_indexes AS idx
  ON idx.schemaname = 'public'
 AND idx.indexname = expected.index_name
ORDER BY expected.index_name;

-- 4. RLS and expected policies.
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
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

-- 5. Counts only. No contact fields, tokens or message text.
SELECT relname AS table_name,
       n_live_tup AS estimated_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN (
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
ORDER BY relname;
