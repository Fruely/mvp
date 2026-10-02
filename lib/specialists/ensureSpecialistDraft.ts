export type SpecialistDraftIdentity = {
  id: string;
  status: string;
};

export type EnsureSpecialistDraftResult =
  | { ok: true; specialist: SpecialistDraftIdentity; created: boolean }
  | { ok: false; error: "forbidden_blocked" | "create_failed" };

export type SpecialistDraftStore = {
  findByUserId(userId: string): Promise<SpecialistDraftIdentity | null>;
  insertDraft(input: {
    userId: string;
    email: string | null;
  }): Promise<
    | { ok: true; specialist: SpecialistDraftIdentity }
    | { ok: false; reason: "duplicate" | "failed" }
  >;
  ensureProfileRow(specialistId: string): Promise<void>;
};

function asDraft(row: SpecialistDraftIdentity | null): SpecialistDraftIdentity | null {
  if (!row?.id) return null;
  const status = typeof row.status === "string" && row.status.trim() ? row.status : "draft";
  return { id: row.id, status };
}

/**
 * One specialist row per authenticated user.
 * An existing row is returned. A missing row is inserted as a draft.
 * A blocked row is not replaced.
 */
export async function ensureSpecialistDraft(
  store: SpecialistDraftStore,
  actor: { userId: string; email: string | null },
): Promise<EnsureSpecialistDraftResult> {
  const userId = actor.userId.trim();
  if (!userId) {
    return { ok: false, error: "create_failed" };
  }

  const existing = asDraft(await store.findByUserId(userId));
  if (existing?.status === "blocked") {
    return { ok: false, error: "forbidden_blocked" };
  }
  if (existing) {
    return { ok: true, specialist: existing, created: false };
  }

  const inserted = await store.insertDraft({ userId, email: actor.email });
  if (inserted.ok) {
    await store.ensureProfileRow(inserted.specialist.id);
    return { ok: true, specialist: asDraft(inserted.specialist)!, created: true };
  }

  if (inserted.reason === "duplicate") {
    const raced = asDraft(await store.findByUserId(userId));
    if (raced?.status === "blocked") {
      return { ok: false, error: "forbidden_blocked" };
    }
    if (raced) {
      return { ok: true, specialist: raced, created: false };
    }
  }

  return { ok: false, error: "create_failed" };
}
