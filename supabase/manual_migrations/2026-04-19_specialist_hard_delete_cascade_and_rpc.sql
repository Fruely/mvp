-- =============================================================================
-- DELIVERABLE 1 (audit, short) — зафиксировано в комментариях ниже
-- =============================================================================
-- FK на public.specialists(id): перевести дочерние ограничения в ON DELETE CASCADE,
--   чтобы DELETE FROM specialists CASCADE удалил зависимые строки в public.
-- НЕ трогаем FK specialists.user_id -> auth.users: каскад с auth.users не добавляем.
-- public.profiles: в коде приложения используется specialist_profiles; таблицы profiles
--   в миграциях репозитория нет — этот файл её не создаёт и не удаляет.
-- specialist_applications: FK на specialists в репозитории не описан; связь по email.
--   Удаление строк заявок делается в public.admin_delete_specialist_tx по email специалиста.
-- По умолчанию auth.users НЕ удаляется (флаг delete_auth_user в Edge Function).
-- =============================================================================

-- Single transaction: FK fixes + RPC (run whole file in SQL editor or via psql)
BEGIN;

-- -----------------------------------------------------------------------------
-- DELIVERABLE 2 — пересоздать все FK на public.specialists(id) с ON DELETE CASCADE
-- (имена constraint подставляются из pg_constraint; безопасно при неизвестных именах)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_child_cols text;
  v_parent_cols text;
BEGIN
  FOR r IN
    SELECT
      c.conname,
      c.conrelid,
      c.confrelid,
      c.conkey,
      c.confkey,
      c.conrelid::regclass AS child_reg
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.specialists'::regclass
      AND c.conrelid IS DISTINCT FROM c.confrelid
      AND cl.relkind IN ('r', 'p')
  LOOP
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY u.ord)
    INTO v_child_cols
    FROM unnest(r.conkey) WITH ORDINALITY AS u(attnum, ord)
    JOIN pg_attribute a
      ON a.attrelid = r.conrelid AND a.attnum = u.attnum AND NOT a.attisdropped;

    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY u.ord)
    INTO v_parent_cols
    FROM unnest(r.confkey) WITH ORDINALITY AS u(attnum, ord)
    JOIN pg_attribute a
      ON a.attrelid = r.confrelid AND a.attnum = u.attnum AND NOT a.attisdropped;

    IF v_child_cols IS NULL OR v_parent_cols IS NULL THEN
      RAISE EXCEPTION 'Could not resolve columns for FK % on %', r.conname, r.child_reg;
    END IF;

    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.child_reg, r.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %s(%s) ON DELETE CASCADE',
      r.child_reg,
      r.conname,
      v_child_cols,
      r.confrelid::regclass,
      v_parent_cols
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- То же для FK на public.specialist_services(id) (в т.ч. specialist_service_translations)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_child_cols text;
  v_parent_cols text;
BEGIN
  FOR r IN
    SELECT
      c.conname,
      c.conrelid,
      c.confrelid,
      c.conkey,
      c.confkey,
      c.conrelid::regclass AS child_reg
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.specialist_services'::regclass
      AND c.conrelid IS DISTINCT FROM c.confrelid
      AND cl.relkind IN ('r', 'p')
  LOOP
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY u.ord)
    INTO v_child_cols
    FROM unnest(r.conkey) WITH ORDINALITY AS u(attnum, ord)
    JOIN pg_attribute a
      ON a.attrelid = r.conrelid AND a.attnum = u.attnum AND NOT a.attisdropped;

    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY u.ord)
    INTO v_parent_cols
    FROM unnest(r.confkey) WITH ORDINALITY AS u(attnum, ord)
    JOIN pg_attribute a
      ON a.attrelid = r.confrelid AND a.attnum = u.attnum AND NOT a.attisdropped;

    IF v_child_cols IS NULL OR v_parent_cols IS NULL THEN
      RAISE EXCEPTION 'Could not resolve columns for FK % on %', r.conname, r.child_reg;
    END IF;

    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.child_reg, r.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %s(%s) ON DELETE CASCADE',
      r.child_reg,
      r.conname,
      v_child_cols,
      r.confrelid::regclass,
      v_parent_cols
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- DELIVERABLE 3 — RPC: одна транзакция, заявки по email, затем specialists
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_specialist_tx(p_specialist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_user_id uuid;
  v_deleted_apps int;
BEGIN
  SELECT s.email, s.user_id
  INTO v_email, v_user_id
  FROM public.specialists s
  WHERE s.id = p_specialist_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SPECIALIST_NOT_FOUND'
      USING ERRCODE = 'P0001',
        HINT = 'No row in public.specialists for the given id';
  END IF;

  IF v_email IS NOT NULL AND btrim(v_email) <> '' THEN
    DELETE FROM public.specialist_applications sa
    WHERE lower(btrim(sa.email)) = lower(btrim(v_email));
    GET DIAGNOSTICS v_deleted_apps = ROW_COUNT;
  ELSE
    v_deleted_apps := 0;
  END IF;

  DELETE FROM public.specialists s
  WHERE s.id = p_specialist_id;

  RETURN jsonb_build_object(
    'ok', true,
    'specialist_id', p_specialist_id,
    'user_id', v_user_id,
    'deleted_specialist_applications', v_deleted_apps
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_specialist_tx(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_specialist_tx(uuid) TO service_role;

COMMENT ON FUNCTION public.admin_delete_specialist_tx(uuid) IS
  'Hard-delete specialist row (CASCADE to dependent public rows) and matching specialist_applications by email. Does not delete auth.users.';

COMMIT;

-- -----------------------------------------------------------------------------
-- DELIVERABLE 2 — verification (run manually after migration)
-- -----------------------------------------------------------------------------
-- SELECT tc.table_schema,
--        tc.table_name,
--        tc.constraint_name,
--        pg_get_constraintdef(c.oid, true) AS definition
-- FROM information_schema.table_constraints tc
-- JOIN pg_constraint c ON c.conname = tc.constraint_name
--   AND c.connamespace = (SELECT oid FROM pg_namespace WHERE nspname = tc.table_schema)
-- JOIN information_schema.constraint_column_usage ccu
--   ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND ccu.table_schema = 'public'
--   AND ccu.table_name = 'specialists'
-- ORDER BY tc.table_name, tc.constraint_name;
--
-- Ожидание: в definition для каждой дочерней таблицы есть ON DELETE CASCADE
-- (кроме случаев, когда на specialists ссылается не через FK — таких в запросе не будет).
