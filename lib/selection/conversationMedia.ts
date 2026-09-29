import type { SupabaseClient } from "@supabase/supabase-js";

export const CONVERSATION_MEDIA_BUCKET = "conversation-media";
export const AUDIO_MAX_BYTES = 10 * 1024 * 1024;
export const AUDIO_MAX_DURATION_MS = 3 * 60 * 1000;
export const AUDIO_MIME_TYPES = ["audio/mp4", "audio/m4a", "audio/x-m4a", "audio/aac"] as const;
export const IMAGE_MIME_TYPE = "image/jpeg";
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const AUDIO_CODEC = "aac";
export const AUDIO_CONTAINER = "m4a";
export const PLAYBACK_TTL_SECONDS = 10 * 60;
export const LOCATION_LABEL_MAX = 80;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUDIO_PATH = /^conversation\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.m4a$/i;
const IMAGE_PATH = /^conversation\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.jpg$/i;

export type ConversationWriteError =
  | "invalid"
  | "system_forbidden"
  | "unsupported_media"
  | "too_large"
  | "too_long"
  | "invalid_location"
  | "wrong_conversation"
  | "missing_upload";

export type AudioReference = {
  path: string;
  uploadId: string;
  mimeType: (typeof AUDIO_MIME_TYPES)[number];
  sizeBytes: number;
  durationMs: number;
};

export type ImageReference = {
  path: string;
  uploadId: string;
  mimeType: typeof IMAGE_MIME_TYPE;
  sizeBytes: number;
};

export type LocationPoint = {
  latitude: number;
  longitude: number;
  label: string | null;
};

export type ConversationPost =
  | { kind: "text"; body: string }
  | { kind: "audio"; audio: AudioReference }
  | { kind: "location"; location: LocationPoint }
  | { kind: "image"; image: ImageReference };

type StorageListItem = {
  name?: string;
  metadata?: { size?: number; mimetype?: string } | null;
};

type StorageApi = {
  from: (bucket: string) => {
    list: (
      prefix: string,
      options: { search: string; limit: number },
    ) => Promise<{ data: StorageListItem[] | null; error: { message?: string } | null }>;
    createSignedUploadUrl: (
      path: string,
      options: { upsert: boolean },
    ) => Promise<{ data: { signedUrl?: string; token?: string; path?: string } | null; error: { message?: string } | null }>;
    createSignedUrl: (
      path: string,
      expiresIn: number,
    ) => Promise<{ data: { signedUrl?: string } | null; error: { message?: string } | null }>;
  };
};

export function conversationWriteStatus(error: ConversationWriteError): number {
  if (error === "unsupported_media") return 415;
  if (error === "too_large") return 413;
  return 400;
}

export function audioStoragePath(conversationId: string, uploadId: string): string {
  return `conversation/${conversationId}/${uploadId}.m4a`;
}

export function parseAudioStoragePath(path: string): { conversationId: string; uploadId: string } | null {
  const match = AUDIO_PATH.exec(path);
  if (!match) return null;
  const conversationId = match[1] ?? "";
  const uploadId = match[2] ?? "";
  if (!UUID.test(conversationId) || !UUID.test(uploadId)) return null;
  if (path !== audioStoragePath(conversationId, uploadId)) return null;
  return { conversationId, uploadId };
}

function mimeType(value: unknown): (typeof AUDIO_MIME_TYPES)[number] | null {
  if (typeof value !== "string") return null;
  const mime = value.trim().toLowerCase();
  return (AUDIO_MIME_TYPES as readonly string[]).includes(mime) ? (mime as (typeof AUDIO_MIME_TYPES)[number]) : null;
}

function wholeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export function validateAudioReference(
  conversationId: string,
  raw: unknown,
): { ok: true; audio: AudioReference } | { ok: false; error: ConversationWriteError } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "invalid" };
  const row = raw as Record<string, unknown>;
  const path = typeof row.path === "string" ? row.path : "";
  const parsed = parseAudioStoragePath(path);
  if (!parsed) return { ok: false, error: "wrong_conversation" };
  if (parsed.conversationId !== conversationId) return { ok: false, error: "wrong_conversation" };
  const mime = mimeType(row.mime_type);
  if (!mime) return { ok: false, error: "unsupported_media" };
  const sizeBytes = wholeNumber(row.size_bytes);
  if (sizeBytes === null || sizeBytes < 1) return { ok: false, error: "invalid" };
  if (sizeBytes > AUDIO_MAX_BYTES) return { ok: false, error: "too_large" };
  const durationMs = wholeNumber(row.duration_ms);
  if (durationMs === null || durationMs < 1) return { ok: false, error: "invalid" };
  if (durationMs > AUDIO_MAX_DURATION_MS) return { ok: false, error: "too_long" };
  return {
    ok: true,
    audio: { path, uploadId: parsed.uploadId, mimeType: mime, sizeBytes, durationMs },
  };
}

export function validateLocation(raw: unknown): { ok: true; location: LocationPoint } | { ok: false; error: "invalid_location" } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "invalid_location" };
  const row = raw as Record<string, unknown>;
  const latitude = row.latitude;
  const longitude = row.longitude;
  if (typeof latitude !== "number" || typeof longitude !== "number") return { ok: false, error: "invalid_location" };
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return { ok: false, error: "invalid_location" };
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return { ok: false, error: "invalid_location" };
  let label: string | null = null;
  if (row.label !== undefined && row.label !== null) {
    if (typeof row.label !== "string") return { ok: false, error: "invalid_location" };
    const trimmed = row.label.trim();
    if (trimmed.length > LOCATION_LABEL_MAX) return { ok: false, error: "invalid_location" };
    label = trimmed || null;
  }
  return { ok: true, location: { latitude, longitude, label } };
}

export function parseConversationPost(
  conversationId: string,
  raw: unknown,
): ConversationPost | { error: ConversationWriteError } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "invalid" };
  const row = raw as Record<string, unknown>;
  const kind = typeof row.kind === "string" ? row.kind : "text";
  if (kind === "system") return { error: "system_forbidden" };
  if (kind === "text") {
    return typeof row.body === "string" ? { kind: "text", body: row.body } : { error: "invalid" };
  }
  if (kind === "audio") {
    const audio = validateAudioReference(conversationId, row.attachment);
    return audio.ok ? { kind: "audio", audio: audio.audio } : { error: audio.error };
  }
  if (kind === "location") {
    const location = validateLocation(row.location);
    return location.ok ? { kind: "location", location: location.location } : { error: location.error };
  }
  if (kind === "image") {
    const image = validateImageReference(conversationId, row.attachment);
    return image.ok ? { kind: "image", image: image.image } : { error: image.error };
  }
  return { error: "invalid" };
}

export function readStoredLocation(payload: unknown): LocationPoint | null {
  const parsed = validateLocation(payload);
  return parsed.ok ? parsed.location : null;
}

function storageOf(supabase: SupabaseClient): StorageApi["from"] | null {
  const storage = (supabase as SupabaseClient & { storage?: StorageApi }).storage;
  return storage && typeof storage.from === "function" ? storage.from.bind(storage) : null;
}

export async function authorizeConversationAudioUpload(
  supabase: SupabaseClient,
  input: { conversationId: string; mimeType: unknown; sizeBytes: unknown; durationMs: unknown },
): Promise<
  | { ok: true; path: string; token: string; signedUrl: string; mimeType: string }
  | { ok: false; error: ConversationWriteError | "sign_failed" }
> {
  const uploadId = crypto.randomUUID();
  const path = audioStoragePath(input.conversationId, uploadId);
  const audio = validateAudioReference(input.conversationId, {
    path,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    duration_ms: input.durationMs,
  });
  if (!audio.ok) return audio;
  const from = storageOf(supabase);
  if (!from) return { ok: false, error: "sign_failed" };
  const signed = await from(CONVERSATION_MEDIA_BUCKET).createSignedUploadUrl(path, { upsert: false });
  if (signed.error || !signed.data?.signedUrl || !signed.data.token || !signed.data.path) {
    return { ok: false, error: "sign_failed" };
  }
  const signedPath = signed.data.path;
  if (signedPath !== path && signedPath !== `${CONVERSATION_MEDIA_BUCKET}/${path}`) {
    return { ok: false, error: "sign_failed" };
  }
  return {
    ok: true,
    path,
    token: signed.data.token,
    signedUrl: signed.data.signedUrl,
    mimeType: audio.audio.mimeType,
  };
}

export async function uploadedAudioMatches(
  supabase: SupabaseClient,
  audio: AudioReference,
): Promise<{ ok: true } | { ok: false; error: ConversationWriteError }> {
  const from = storageOf(supabase);
  if (!from) return { ok: false, error: "missing_upload" };
  const listed = await from(CONVERSATION_MEDIA_BUCKET).list(`conversation/${parseAudioStoragePath(audio.path)?.conversationId}`, {
    search: `${audio.uploadId}.m4a`,
    limit: 5,
  });
  if (listed.error) return { ok: false, error: "missing_upload" };
  const object = (listed.data ?? []).find((item) => item.name === `${audio.uploadId}.m4a`);
  if (!object) return { ok: false, error: "missing_upload" };
  const size = object.metadata?.size;
  if (typeof size === "number" && (size < 1 || size > AUDIO_MAX_BYTES || size !== audio.sizeBytes)) {
    return { ok: false, error: "too_large" };
  }
  const storedMime = object.metadata?.mimetype;
  if (typeof storedMime === "string" && storedMime.trim().toLowerCase() !== audio.mimeType) {
    return { ok: false, error: "unsupported_media" };
  }
  return { ok: true };
}

export function imageStoragePath(conversationId: string, uploadId: string): string {
  return `conversation/${conversationId}/${uploadId}.jpg`;
}

export function parseImageStoragePath(path: string): { conversationId: string; uploadId: string } | null {
  const match = IMAGE_PATH.exec(path);
  if (!match) return null;
  const conversationId = match[1] ?? "";
  const uploadId = match[2] ?? "";
  if (!UUID.test(conversationId) || !UUID.test(uploadId)) return null;
  if (path !== imageStoragePath(conversationId, uploadId)) return null;
  return { conversationId, uploadId };
}

export function validateImageReference(
  conversationId: string,
  raw: unknown,
): { ok: true; image: ImageReference } | { ok: false; error: ConversationWriteError } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "invalid" };
  const row = raw as Record<string, unknown>;
  const path = typeof row.path === "string" ? row.path : "";
  const parsed = parseImageStoragePath(path);
  if (!parsed) return { ok: false, error: "wrong_conversation" };
  if (parsed.conversationId !== conversationId) return { ok: false, error: "wrong_conversation" };
  if (typeof row.mime_type !== "string" || row.mime_type.trim().toLowerCase() !== IMAGE_MIME_TYPE) {
    return { ok: false, error: "unsupported_media" };
  }
  const sizeBytes = wholeNumber(row.size_bytes);
  if (sizeBytes === null || sizeBytes < 1) return { ok: false, error: "invalid" };
  if (sizeBytes > IMAGE_MAX_BYTES) return { ok: false, error: "too_large" };
  return {
    ok: true,
    image: { path, uploadId: parsed.uploadId, mimeType: IMAGE_MIME_TYPE, sizeBytes },
  };
}

export async function authorizeConversationImageUpload(
  supabase: SupabaseClient,
  input: { conversationId: string; mimeType: unknown; sizeBytes: unknown },
): Promise<
  | { ok: true; path: string; token: string; signedUrl: string; mimeType: string }
  | { ok: false; error: ConversationWriteError | "sign_failed" }
> {
  const uploadId = crypto.randomUUID();
  const path = imageStoragePath(input.conversationId, uploadId);
  const image = validateImageReference(input.conversationId, {
    path,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
  });
  if (!image.ok) return image;
  const from = storageOf(supabase);
  if (!from) return { ok: false, error: "sign_failed" };
  const signed = await from(CONVERSATION_MEDIA_BUCKET).createSignedUploadUrl(path, { upsert: false });
  if (signed.error || !signed.data?.signedUrl || !signed.data.token || !signed.data.path) {
    return { ok: false, error: "sign_failed" };
  }
  const signedPath = signed.data.path;
  if (signedPath !== path && signedPath !== `${CONVERSATION_MEDIA_BUCKET}/${path}`) {
    return { ok: false, error: "sign_failed" };
  }
  return {
    ok: true,
    path,
    token: signed.data.token,
    signedUrl: signed.data.signedUrl,
    mimeType: image.image.mimeType,
  };
}

export async function uploadedImageMatches(
  supabase: SupabaseClient,
  image: ImageReference,
): Promise<{ ok: true } | { ok: false; error: ConversationWriteError }> {
  const parsed = parseImageStoragePath(image.path);
  const from = storageOf(supabase);
  if (!from || !parsed) return { ok: false, error: "missing_upload" };
  const listed = await from(CONVERSATION_MEDIA_BUCKET).list(`conversation/${parsed.conversationId}`, {
    search: `${image.uploadId}.jpg`,
    limit: 5,
  });
  if (listed.error) return { ok: false, error: "missing_upload" };
  const object = (listed.data ?? []).find((item) => item.name === `${image.uploadId}.jpg`);
  if (!object) return { ok: false, error: "missing_upload" };
  const size = object.metadata?.size;
  if (typeof size === "number" && (size < 1 || size > IMAGE_MAX_BYTES || size !== image.sizeBytes)) {
    return { ok: false, error: "too_large" };
  }
  const storedMime = object.metadata?.mimetype;
  if (typeof storedMime === "string" && storedMime.trim().toLowerCase() !== image.mimeType) {
    return { ok: false, error: "unsupported_media" };
  }
  return { ok: true };
}

export async function signConversationPlayback<
  T extends {
    kind: string;
    audio: { path: string; playbackUrl: string | null } | null;
    image: { path: string; imageUrl: string | null } | null;
  },
>(supabase: SupabaseClient, messages: T[]): Promise<T[]> {
  const from = storageOf(supabase);
  if (!from) return messages;
  return Promise.all(
    messages.map(async (message) => {
      if (message.kind === "audio" && message.audio?.path) {
        try {
          const signed = await from(CONVERSATION_MEDIA_BUCKET).createSignedUrl(message.audio.path, PLAYBACK_TTL_SECONDS);
          if (signed.error || !signed.data?.signedUrl) return message;
          return { ...message, audio: { ...message.audio, playbackUrl: signed.data.signedUrl } };
        } catch {
          return message;
        }
      }
      if (message.kind === "image" && message.image?.path) {
        try {
          const signed = await from(CONVERSATION_MEDIA_BUCKET).createSignedUrl(message.image.path, PLAYBACK_TTL_SECONDS);
          if (signed.error || !signed.data?.signedUrl) return message;
          return { ...message, image: { ...message.image, imageUrl: signed.data.signedUrl } };
        } catch {
          return message;
        }
      }
      return message;
    }),
  );
}
