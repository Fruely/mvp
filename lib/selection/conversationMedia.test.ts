import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { quietHoursDeferralApplies } from "../inbox/policy.ts";
import {
  AUDIO_CODEC,
  AUDIO_CONTAINER,
  AUDIO_MAX_BYTES,
  AUDIO_MAX_DURATION_MS,
  AUDIO_MIME_TYPES,
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPE,
  authorizeConversationAudioUpload,
  authorizeConversationImageUpload,
  parseConversationPost,
  validateLocation,
} from "./conversationMedia.ts";
import { postConversationMessage } from "./messages.ts";
import { loadConversationForViewer, toTranscriptResponse, type Viewer } from "./view.ts";

type Row = Record<string, unknown>;

const CONVERSATION = "ff788ff2-d2f1-4534-92d0-e9eb81bad028";
const OTHER = "11111111-1111-4111-8111-111111111111";
const REQUEST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const UPLOAD = "22222222-2222-4222-8222-222222222222";
const CLIENT = "client-user";
const SPECIALIST = "specialist-a";
const SPECIALIST_USER = "specialist-user";
const EMAIL = "hidden@example.test";
const PHONE = "+491511234567";
const AUDIO_PATH = `conversation/${CONVERSATION}/${UPLOAD}.m4a`;

function memory(seed: Record<string, Row[]>, files: Map<string, { size: number; mimetype: string }> = new Map()) {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((row) => ({ ...row }));
  const ensure = (name: string) => {
    if (!tables[name]) tables[name] = [];
    return tables[name];
  };
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    const matched = () => ensure(table).filter((row) => filters.every((filter) => filter(row)));
    const api = {
      select() {
        return api;
      },
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return api;
      },
      in(column: string, values: unknown[]) {
        filters.push((row) => values.includes(row[column]));
        return api;
      },
      is(column: string, value: unknown) {
        filters.push((row) => (value === null ? row[column] == null : row[column] === value));
        return api;
      },
      limit() {
        return api;
      },
      order() {
        return api;
      },
      insert(row: Row) {
        const stored = { id: crypto.randomUUID(), ...row };
        ensure(table).push(stored);
        const result = { data: { ...stored }, error: null };
        return {
          select() {
            return { maybeSingle: async () => ({ data: { ...stored }, error: null }) };
          },
          then(resolve: (value: { data: Row; error: null }) => void) {
            resolve(result);
          },
        };
      },
      upsert(payload: Row, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
        const conflict = options?.onConflict;
        const existing = conflict ? ensure(table).find((row) => row[conflict] === payload[conflict]) : undefined;
        let stored: Row | null = null;
        if (existing && options?.ignoreDuplicates) stored = null;
        else if (existing) {
          Object.assign(existing, payload);
          stored = existing;
        } else {
          stored = { id: crypto.randomUUID(), ...payload };
          ensure(table).push(stored);
        }
        return {
          select() {
            return { maybeSingle: async () => ({ data: stored ? { ...stored } : null, error: null }) };
          },
        };
      },
      maybeSingle: async () => ({ data: matched()[0] ? { ...matched()[0] } : null, error: null }),
      then(resolve: (value: { data: Row[]; error: null }) => void) {
        resolve({ data: matched().map((row) => ({ ...row })), error: null });
      },
    };
    return api;
  }
  const supabase = {
    from,
    storage: {
      from() {
        return {
          async list(prefix: string, options: { search: string }) {
            const meta = files.get(`${prefix}/${options.search}`);
            return {
              data: meta ? [{ name: options.search, metadata: meta }] : [],
              error: null,
            };
          },
          async createSignedUploadUrl(path: string) {
            return { data: { path, token: "upload-token", signedUrl: `https://storage.example/upload/${path}` }, error: null };
          },
          async createSignedUrl(path: string) {
            return { data: { signedUrl: `https://storage.example/signed/${path.split("/").pop()}` }, error: null };
          },
        };
      },
    },
  } as unknown as SupabaseClient;
  return { supabase, tables, files };
}

function seed() {
  return memory({
    conversations: [
      {
        id: CONVERSATION,
        service_request_id: REQUEST,
        specialist_id: SPECIALIST,
        client_user_id: CLIENT,
        status: "open",
      },
    ],
    service_requests: [
      {
        id: REQUEST,
        public_id: "REQ-20260928-8MMQHF",
        client_user_id: CLIENT,
        client_email: EMAIL,
        client_phone: PHONE,
        telegram: "@hidden",
        requested_service: "коуч",
        category_text: "коуч",
        locale: "ru",
      },
    ],
    specialists: [{ id: SPECIALIST, user_id: SPECIALIST_USER, notification_locale: "ru" }],
    conversation_messages: [
      {
        id: "m-system",
        conversation_id: CONVERSATION,
        kind: "system",
        actor_type: "system",
        author_user_id: null,
        body: null,
        created_at: "2026-09-28T18:00:00.000Z",
        payload: { event: "connection_ready", service_label: "коуч" },
      },
    ],
    conversation_message_attachments: [],
    inbox_items: [],
    notification_outbox: [],
    notification_preferences: [],
    push_endpoints: [
      { id: "endpoint-client", user_id: CLIENT, enabled: true, invalidated_at: null, token: "ExponentPushToken[client]" },
      { id: "endpoint-specialist", user_id: SPECIALIST_USER, enabled: true, invalidated_at: null, token: "ExponentPushToken[specialist]" },
    ],
  });
}

const clientViewer: Viewer = { actorUserId: CLIENT, actorSpecialistId: null, anonymousRequestId: null };
const specialistViewer: Viewer = { actorUserId: SPECIALIST_USER, actorSpecialistId: SPECIALIST, anonymousRequestId: null };

function audioBody(path = AUDIO_PATH, extra?: Record<string, unknown>) {
  return {
    kind: "audio",
    attachment: {
      path,
      mime_type: "audio/mp4",
      size_bytes: 1200,
      duration_ms: 2000,
      ...extra,
    },
  };
}

test("participant may create text from a legacy body and an explicit kind", async () => {
  const legacy = seed();
  const posted = await postConversationMessage(legacy.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: { body: "hello" },
  });
  assert.equal("id" in posted, true);
  assert.equal(legacy.tables.conversation_messages.filter((row) => row.kind === "text" && row.body === "hello").length, 1);

  const explicit = seed();
  const second = await postConversationMessage(explicit.supabase, {
    conversationId: CONVERSATION,
    actor: "specialist",
    authorUserId: SPECIALIST_USER,
    raw: { kind: "text", body: "hello" },
  });
  assert.equal("id" in second, true);
  assert.equal(explicit.tables.conversation_messages.some((row) => row.kind === "text" && row.body === "hello"), true);
});

test("participant may create audio and location, and the other conversation cannot reuse the file", async () => {
  const db = seed();
  db.files.set(AUDIO_PATH, { size: 1200, mimetype: "audio/mp4" });
  const audio = await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "specialist",
    authorUserId: SPECIALIST_USER,
    raw: audioBody(),
  });
  assert.equal("error" in audio, false);
  const location = await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: { kind: "location", location: { latitude: 52.52, longitude: 13.405, label: "подъезд" } },
  });
  assert.equal("error" in location, false);
  assert.equal(db.tables.conversation_message_attachments.length, 1);
  assert.equal(db.tables.conversation_messages.some((row) => row.kind === "location"), true);

  const reused = await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: audioBody(),
  });
  assert.deepEqual(reused, { error: "wrong_conversation" });
  const foreign = await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: audioBody(`conversation/${OTHER}/${UPLOAD}.m4a`),
  });
  assert.deepEqual(foreign, { error: "wrong_conversation" });
  assert.equal(db.tables.conversation_message_attachments.length, 1);
});

test("unrelated and unauthenticated callers cannot create audio or location", async () => {
  const db = seed();
  const stranger = await loadConversationForViewer(db.supabase, {
    conversationId: CONVERSATION,
    viewer: { actorUserId: "stranger", actorSpecialistId: null, anonymousRequestId: null },
  });
  assert.equal(stranger, null);
  const anonymous = await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: null,
    raw: audioBody(),
  });
  assert.deepEqual(anonymous, { error: "invalid" });
  assert.equal(db.tables.conversation_messages.some((row) => row.kind === "audio"), false);

  const messages = readFileSync(new URL("../../app/api/conversations/[id]/messages/route.ts", import.meta.url), "utf8");
  const audio = readFileSync(new URL("../../app/api/conversations/[id]/audio/route.ts", import.meta.url), "utf8");
  assert.match(messages, /kind !== "text" && !resolved\.viewer\.actorUserId/);
  assert.match(audio, /!resolved\.viewer\.actorUserId/);
  assert.match(messages, /loadConversationForViewer/);
  assert.match(audio, /loadConversationForViewer/);
  assert.equal(messages.includes("recipient_user_id"), false);
  assert.equal(audio.includes("actor_type"), false);
});

test("native cannot create a system message", async () => {
  const db = seed();
  const before = db.tables.conversation_messages.length;
  const posted = await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: { kind: "system", body: "connected" },
  });
  assert.deepEqual(posted, { error: "system_forbidden" });
  assert.equal(db.tables.conversation_messages.length, before);
  assert.equal(db.tables.inbox_items.length, 0);
});

test("invalid location, audio MIME, size, and duration are rejected", () => {
  assert.equal(validateLocation({ latitude: 91, longitude: 0 }).ok, false);
  assert.equal(validateLocation({ latitude: 0, longitude: 181 }).ok, false);
  assert.equal(validateLocation({ latitude: "52.5", longitude: 13 }).ok, false);
  assert.deepEqual(parseConversationPost(CONVERSATION, { kind: "location", location: { latitude: -90, longitude: 180 } }).kind, "location");
  assert.equal(parseConversationPost(CONVERSATION, audioBody(AUDIO_PATH, { mime_type: "audio/wav" })).error, "unsupported_media");
  assert.equal(parseConversationPost(CONVERSATION, audioBody(AUDIO_PATH, { size_bytes: AUDIO_MAX_BYTES + 1 })).error, "too_large");
  assert.equal(parseConversationPost(CONVERSATION, audioBody(AUDIO_PATH, { duration_ms: AUDIO_MAX_DURATION_MS + 1 })).error, "too_long");
  assert.equal(parseConversationPost(CONVERSATION, { kind: "image", attachment: { path: AUDIO_PATH } }).error, "wrong_conversation");
});

test("missing or oversized stored audio is not saved", async () => {
  const missing = seed();
  const absent = await postConversationMessage(missing.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: audioBody(),
  });
  assert.deepEqual(absent, { error: "missing_upload" });
  assert.equal(missing.tables.conversation_messages.some((row) => row.kind === "audio"), false);

  const oversized = seed();
  oversized.files.set(AUDIO_PATH, { size: AUDIO_MAX_BYTES + 1, mimetype: "audio/mp4" });
  const posted = await postConversationMessage(oversized.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: audioBody(AUDIO_PATH, { size_bytes: AUDIO_MAX_BYTES }),
  });
  assert.deepEqual(posted, { error: "too_large" });
  assert.equal(oversized.tables.conversation_messages.some((row) => row.kind === "audio"), false);
});

test("transcript returns audio and location without contact fields, and still returns text and system", async () => {
  const db = seed();
  db.files.set(AUDIO_PATH, { size: 1200, mimetype: "audio/mp4" });
  db.tables.conversation_messages.push({
    id: "m-text",
    conversation_id: CONVERSATION,
    kind: "text",
    actor_type: "client",
    author_user_id: CLIENT,
    body: "hello",
    created_at: "2026-09-28T18:01:00.000Z",
    payload: {},
  });
  await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "specialist",
    authorUserId: SPECIALIST_USER,
    raw: audioBody(),
  });
  await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: { kind: "location", location: { latitude: 52.52, longitude: 13.405, label: "подъезд" }, address: EMAIL },
  });
  const loaded = await loadConversationForViewer(db.supabase, { conversationId: CONVERSATION, viewer: clientViewer });
  assert.ok(loaded);
  const response = toTranscriptResponse(loaded);
  assert.deepEqual(
    response.messages.map((message) => message.kind),
    ["system", "text", "audio", "location"],
  );
  const audio = response.messages.find((message) => message.kind === "audio");
  assert.equal(audio?.audio?.mime_type, "audio/mp4");
  assert.equal(audio?.audio?.duration_ms, 2000);
  assert.match(audio?.audio?.playback_url ?? "", /^https:\/\/storage\.example\/signed\//);
  assert.equal(JSON.stringify(audio?.audio).includes(AUDIO_PATH), false);
  const location = response.messages.find((message) => message.kind === "location");
  assert.deepEqual(location?.location, { latitude: 52.52, longitude: 13.405, label: "подъезд" });
  const serialized = JSON.stringify(response);
  assert.equal(serialized.includes(EMAIL), false);
  assert.equal(serialized.includes(PHONE), false);
  assert.equal(serialized.includes("author_user_id"), false);
  assert.equal(serialized.includes("@hidden"), false);
  assert.equal(serialized.includes("service_role"), false);
});

test("audio and location use conversation_message, skip quiet hours, and do not notify the author", async () => {
  const db = seed();
  db.files.set(AUDIO_PATH, { size: 1200, mimetype: "audio/mp4" });
  await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "specialist",
    authorUserId: SPECIALIST_USER,
    raw: audioBody(),
  });
  await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: { kind: "location", location: { latitude: 52.5, longitude: 13.4 } },
  });
  const notices = db.tables.inbox_items.filter((row) => row.type === "conversation_message");
  assert.equal(notices.length, 2);
  assert.equal(notices.every((row) => (row.payload as { event?: string }).event === "conversation_message"), true);
  assert.equal(notices.some((row) => row.recipient_user_id === CLIENT), true);
  assert.equal(notices.some((row) => row.recipient_user_id === SPECIALIST_USER), true);
  assert.equal(notices.filter((row) => row.actor_type === "specialist").every((row) => row.recipient_user_id !== SPECIALIST_USER), true);
  assert.equal(notices.filter((row) => row.actor_type === "client").every((row) => row.recipient_user_id !== CLIENT), true);
  const payload = JSON.stringify(notices);
  assert.equal(payload.includes("hello"), false);
  assert.equal(payload.includes("52.5"), false);
  assert.equal(payload.includes("audio/mp4"), false);
  assert.equal(quietHoursDeferralApplies("conversation_message"), false);
  assert.equal(quietHoursDeferralApplies("match_available"), true);
  assert.equal(db.tables.notification_outbox.filter((row) => row.channel === "push" && row.status === "pending").length, 2);
});

test("a failed immediate push does not remove the saved audio or location message", () => {
  const route = readFileSync(new URL("../../app/api/conversations/[id]/messages/route.ts", import.meta.url), "utf8");
  assert.match(route, /deliverOutboxById/);
  assert.match(route, /delivery failed/);
  assert.match(route, /ok: true, id: posted\.id/);
  const delivery = route.slice(route.indexOf("deliverOutboxById") - 80, route.indexOf("ok: true"));
  assert.match(delivery, /catch/);
});

test("a restarted read uses the saved server rows", async () => {
  const db = seed();
  db.files.set(AUDIO_PATH, { size: 1200, mimetype: "audio/mp4" });
  await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "specialist",
    authorUserId: SPECIALIST_USER,
    raw: audioBody(),
  });
  await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: { kind: "location", location: { latitude: 48.1, longitude: 11.5 } },
  });
  const restarted = memory(
    {
      conversations: db.tables.conversations,
      service_requests: db.tables.service_requests,
      specialists: db.tables.specialists,
      conversation_messages: db.tables.conversation_messages,
      conversation_message_attachments: db.tables.conversation_message_attachments,
    },
    new Map(),
  );
  const loaded = await loadConversationForViewer(restarted.supabase, { conversationId: CONVERSATION, viewer: specialistViewer });
  assert.ok(loaded);
  assert.equal(loaded.messages.some((message) => message.kind === "audio" && message.audio?.durationMs === 2000), true);
  assert.equal(loaded.messages.some((message) => message.kind === "location" && message.location?.latitude === 48.1), true);
  assert.match(loaded.messages.find((message) => message.kind === "audio")?.audio?.playbackUrl ?? "", /^https:\/\/storage\.example\/signed\//);
});

test("signed upload is conversation-scoped and the attachment schema already allows a later image", async () => {
  const db = seed();
  const signed = await authorizeConversationAudioUpload(db.supabase, {
    conversationId: CONVERSATION,
    mimeType: "audio/mp4",
    sizeBytes: 1000,
    durationMs: 1000,
  });
  assert.equal(signed.ok, true);
  if (signed.ok) {
    assert.match(signed.path, new RegExp(`^conversation/${CONVERSATION}/`));
    assert.equal(signed.path.endsWith(".m4a"), true);
    assert.equal(db.tables.conversation_messages.some((row) => row.kind === "audio"), false);
  }
  const sql = readFileSync(new URL("../../supabase/manual_migrations/2026-09-28_conversation_audio_location.sql", import.meta.url), "utf8");
  assert.match(sql, /kind IN \('system', 'text', 'audio', 'location'\)/);
  assert.match(sql, /media_type = 'audio'/);
  assert.match(sql, /media_type = 'image'/);
  assert.match(sql, /conversation-media/);
  assert.match(sql, /public = EXCLUDED.public/);
  assert.match(sql, /10485760/);
  assert.match(sql, /180000/);
  assert.equal(sql.includes("GRANT SELECT ON public.conversation_message_attachments TO authenticated"), false);
  assert.deepEqual(AUDIO_MIME_TYPES, ["audio/mp4", "audio/m4a", "audio/x-m4a", "audio/aac"]);
  assert.equal(AUDIO_CODEC, "aac");
  assert.equal(AUDIO_CONTAINER, "m4a");
  assert.equal(AUDIO_MAX_DURATION_MS, 180000);
  assert.equal(AUDIO_MAX_BYTES, 10485760);
});

const IMAGE_PATH = `conversation/${CONVERSATION}/${UPLOAD}.jpg`;

function imageBody(path = IMAGE_PATH, extra?: Record<string, unknown>) {
  return {
    kind: "image",
    attachment: {
      path,
      mime_type: "image/jpeg",
      size_bytes: 2400,
      ...extra,
    },
  };
}

test("a valid jpeg reference is accepted and other image types are not", () => {
  const valid = parseConversationPost(CONVERSATION, imageBody());
  assert.equal("error" in valid, false);
  assert.equal(parseConversationPost(CONVERSATION, imageBody(IMAGE_PATH, { mime_type: "image/png" })).error, "unsupported_media");
  assert.equal(parseConversationPost(CONVERSATION, imageBody(IMAGE_PATH, { mime_type: "image/webp" })).error, "unsupported_media");
  assert.equal(parseConversationPost(CONVERSATION, imageBody(IMAGE_PATH, { size_bytes: IMAGE_MAX_BYTES + 1 })).error, "too_large");
  assert.equal(parseConversationPost(CONVERSATION, imageBody("conversation/not-a-path.jpg")).error, "wrong_conversation");
  assert.equal(parseConversationPost(CONVERSATION, imageBody(`conversation/${OTHER}/${UPLOAD}.jpg`)).error, "wrong_conversation");
  assert.equal(parseConversationPost(CONVERSATION, imageBody(`conversation/${CONVERSATION}/${UPLOAD}.png`)).error, "wrong_conversation");
  assert.equal(IMAGE_MIME_TYPE, "image/jpeg");
  assert.equal(IMAGE_MAX_BYTES, 10485760);
});

test("missing, mismatched, oversized, and reused images are not saved", async () => {
  const missing = seed();
  const absent = await postConversationMessage(missing.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: imageBody(),
  });
  assert.deepEqual(absent, { error: "missing_upload" });
  assert.equal(missing.tables.conversation_messages.some((row) => row.kind === "image"), false);

  const mismatch = seed();
  mismatch.files.set(IMAGE_PATH, { size: 2400, mimetype: "image/png" });
  const wrongMime = await postConversationMessage(mismatch.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: imageBody(),
  });
  assert.deepEqual(wrongMime, { error: "unsupported_media" });

  const wrongSize = seed();
  wrongSize.files.set(IMAGE_PATH, { size: 100, mimetype: "image/jpeg" });
  const sizeMismatch = await postConversationMessage(wrongSize.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: imageBody(),
  });
  assert.deepEqual(sizeMismatch, { error: "too_large" });

  const oversized = seed();
  oversized.files.set(IMAGE_PATH, { size: IMAGE_MAX_BYTES + 1, mimetype: "image/jpeg" });
  const tooBig = await postConversationMessage(oversized.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: imageBody(IMAGE_PATH, { size_bytes: IMAGE_MAX_BYTES }),
  });
  assert.deepEqual(tooBig, { error: "too_large" });

  const db = seed();
  db.files.set(IMAGE_PATH, { size: 2400, mimetype: "image/jpeg" });
  const posted = await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "specialist",
    authorUserId: SPECIALIST_USER,
    raw: imageBody(),
  });
  assert.equal("error" in posted, false);
  assert.equal(db.tables.conversation_message_attachments.length, 1);
  const attachment = db.tables.conversation_message_attachments[0];
  assert.equal(attachment?.media_type, "image");
  assert.equal(attachment?.mime_type, "image/jpeg");
  assert.equal(attachment?.duration_ms, null);
  assert.equal(attachment?.size_bytes, 2400);
  const message = db.tables.conversation_messages.find((row) => row.kind === "image");
  assert.equal(message?.body, null);
  assert.equal(message?.author_user_id, SPECIALIST_USER);
  const reused = await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: imageBody(),
  });
  assert.deepEqual(reused, { error: "wrong_conversation" });
  assert.equal(db.tables.conversation_message_attachments.length, 1);
});

test("an unrelated or anonymous caller cannot send an image", async () => {
  const db = seed();
  db.files.set(IMAGE_PATH, { size: 2400, mimetype: "image/jpeg" });
  const stranger = await loadConversationForViewer(db.supabase, {
    conversationId: CONVERSATION,
    viewer: { actorUserId: "stranger", actorSpecialistId: null, anonymousRequestId: null },
  });
  assert.equal(stranger, null);
  const anonymous = await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: null,
    raw: imageBody(),
  });
  assert.deepEqual(anonymous, { error: "invalid" });
  assert.equal(db.tables.conversation_messages.some((row) => row.kind === "image"), false);
  const route = readFileSync(new URL("../../app/api/conversations/[id]/image/route.ts", import.meta.url), "utf8");
  assert.match(route, /!resolved\.viewer\.actorUserId/);
  assert.match(route, /loadConversationForViewer/);
  assert.equal(route.includes("actor_type"), false);
});

test("transcript signs an image url without the storage path, including after restart", async () => {
  const db = seed();
  db.files.set(IMAGE_PATH, { size: 2400, mimetype: "image/jpeg" });
  await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "client",
    authorUserId: CLIENT,
    raw: imageBody(),
  });
  const loaded = await loadConversationForViewer(db.supabase, { conversationId: CONVERSATION, viewer: clientViewer });
  assert.ok(loaded);
  const response = toTranscriptResponse(loaded);
  const image = response.messages.find((message) => message.kind === "image");
  assert.equal(image?.body, null);
  assert.equal(image?.image?.mime_type, "image/jpeg");
  assert.equal(image?.image?.size_bytes, 2400);
  assert.match(image?.image?.image_url ?? "", /^https:\/\/storage\.example\/signed\//);
  const serialized = JSON.stringify(response);
  assert.equal(serialized.includes(IMAGE_PATH), false);
  assert.equal(serialized.includes("storage_path"), false);
  assert.equal(serialized.includes("author_user_id"), false);
  assert.equal(serialized.includes(EMAIL), false);

  const restarted = memory(
    {
      conversations: db.tables.conversations,
      service_requests: db.tables.service_requests,
      specialists: db.tables.specialists,
      conversation_messages: db.tables.conversation_messages,
      conversation_message_attachments: db.tables.conversation_message_attachments,
    },
    new Map(),
  );
  const again = await loadConversationForViewer(restarted.supabase, { conversationId: CONVERSATION, viewer: specialistViewer });
  assert.ok(again);
  assert.equal(again.messages.some((message) => message.kind === "image" && message.image?.sizeBytes === 2400), true);
  assert.match(again.messages.find((message) => message.kind === "image")?.image?.imageUrl ?? "", /^https:\/\/storage\.example\/signed\//);
});

test("an image uses conversation_message, skips quiet hours, and does not notify the author", async () => {
  const db = seed();
  db.files.set(IMAGE_PATH, { size: 2400, mimetype: "image/jpeg" });
  await postConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    actor: "specialist",
    authorUserId: SPECIALIST_USER,
    raw: imageBody(),
  });
  const notices = db.tables.inbox_items.filter((row) => row.type === "conversation_message");
  assert.equal(notices.length, 1);
  assert.equal((notices[0]?.payload as { event?: string }).event, "conversation_message");
  assert.equal(notices[0]?.recipient_user_id, CLIENT);
  assert.notEqual(notices[0]?.recipient_user_id, SPECIALIST_USER);
  const payload = JSON.stringify(notices);
  assert.equal(payload.includes(IMAGE_PATH), false);
  assert.equal(payload.includes("image/jpeg"), false);
  assert.equal(payload.includes("image_url"), false);
  assert.equal(quietHoursDeferralApplies("conversation_message"), false);
  assert.equal(db.tables.notification_outbox.filter((row) => row.channel === "push" && row.status === "pending").length, 1);
});

test("image upload is conversation-scoped and the bucket keeps audio types", async () => {
  const db = seed();
  const signed = await authorizeConversationImageUpload(db.supabase, {
    conversationId: CONVERSATION,
    mimeType: "image/jpeg",
    sizeBytes: 1000,
  });
  assert.equal(signed.ok, true);
  if (signed.ok) {
    assert.match(signed.path, new RegExp(`^conversation/${CONVERSATION}/[0-9a-f-]{36}\\.jpg$`));
    assert.equal(signed.mimeType, "image/jpeg");
    assert.equal(db.tables.conversation_messages.some((row) => row.kind === "image"), false);
  }
  const rejected = await authorizeConversationImageUpload(db.supabase, {
    conversationId: CONVERSATION,
    mimeType: "image/png",
    sizeBytes: 1000,
  });
  assert.deepEqual(rejected, { ok: false, error: "unsupported_media" });
  const sql = readFileSync(new URL("../../supabase/manual_migrations/2026-09-29_conversation_image.sql", import.meta.url), "utf8");
  assert.match(sql, /kind IN \('system', 'text', 'audio', 'location', 'image'\)/);
  assert.match(sql, /kind = 'image' AND body IS NULL AND actor_type IN \('client', 'specialist'\) AND author_user_id IS NOT NULL/);
  assert.match(sql, /kind = 'audio' AND body IS NULL/);
  assert.match(sql, /kind = 'location'/);
  assert.equal(sql.includes("CREATE TABLE"), false);
  assert.match(sql, /audio\/mp4/);
  assert.match(sql, /audio\/m4a/);
  assert.match(sql, /audio\/x-m4a/);
  assert.match(sql, /audio\/aac/);
  assert.match(sql, /image\/jpeg/);
  assert.match(sql, /public = false/);
  assert.match(sql, /10485760/);
  assert.equal(sql.includes("GRANT SELECT ON public.conversation_message_attachments TO authenticated"), false);
  assert.equal(sql.includes("CREATE POLICY"), false);
});
