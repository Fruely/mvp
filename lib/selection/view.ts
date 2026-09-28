import type { SupabaseClient } from "@supabase/supabase-js";
import { findAccessGrant } from "./accessGrant";
import { conversationRole } from "./policy";
import { toPublicSpecialistPreview, type PublicSpecialistPreview } from "./preview";

export type Viewer = {
  actorUserId: string | null;
  actorSpecialistId: string | null;
  anonymousRequestId: string | null;
};

export async function resolveViewer(
  supabase: SupabaseClient,
  input: { sessionUserId: string | null; accessToken: string | null; now?: Date },
): Promise<Viewer> {
  let actorSpecialistId: string | null = null;
  if (input.sessionUserId) {
    const specialist = await supabase
      .from("specialists")
      .select("id")
      .eq("user_id", input.sessionUserId)
      .maybeSingle();
    actorSpecialistId = specialist.data?.id ? String(specialist.data.id) : null;
  }
  let anonymousRequestId: string | null = null;
  if (input.accessToken) {
    const grant = await findAccessGrant(supabase, input.accessToken, input.now);
    if (grant.verdict === "valid") anonymousRequestId = grant.requestId;
  }
  return {
    actorUserId: input.sessionUserId,
    actorSpecialistId,
    anonymousRequestId,
  };
}

export type SpecialistCard = PublicSpecialistPreview & {
  matchStatus: "interested" | "selected";
};

export type OwnedRequestView = {
  requestId: string;
  publicId: string;
  status: string;
  serviceLabel: string;
  task: string;
  selectedSpecialistId: string | null;
  interestedCount: number;
  cards: SpecialistCard[];
  conversationId: string | null;
};

function ownsRequest(clientUserId: string | null, requestId: string, viewer: Viewer): boolean {
  if (clientUserId) return viewer.actorUserId === clientUserId;
  return viewer.anonymousRequestId === requestId;
}

function categoryLabel(row: Record<string, unknown> | undefined, locale: string): string {
  if (!row) return "";
  const pick = (key: string) => {
    const value = row[key];
    return typeof value === "string" ? value.trim() : "";
  };
  if (locale === "ru") return pick("title_ru") || pick("title");
  if (locale === "ua") return pick("title_ua") || pick("title");
  if (locale === "de") return pick("title_de") || pick("title");
  return pick("title");
}

export async function loadOwnedRequestView(
  supabase: SupabaseClient,
  input: {
    publicId: string;
    viewer: Viewer;
    locale: string;
    categoryTitle?: (category: Record<string, unknown>, locale: string) => string;
  },
): Promise<OwnedRequestView | { error: "not_found" | "forbidden" }> {
  const request = await supabase
    .from("service_requests")
    .select("id, public_id, client_user_id, status, selected_specialist_id, requested_service, category_text, description, locale")
    .eq("public_id", input.publicId)
    .maybeSingle();
  if (request.error || !request.data?.id) return { error: "not_found" };
  const requestId = String(request.data.id);
  const clientUserId = typeof request.data.client_user_id === "string" ? request.data.client_user_id : null;
  if (!ownsRequest(clientUserId, requestId, input.viewer)) return { error: "forbidden" };

  const matches = await supabase
    .from("service_request_matches")
    .select("id, specialist_id, status, service_request_id")
    .eq("service_request_id", requestId);
  const rows = (matches.data ?? []).filter(
    (row) => row.status === "interested" || row.status === "selected",
  );
  const specialistIds = rows
    .map((row) => (typeof row.specialist_id === "string" ? row.specialist_id : ""))
    .filter((id) => id.length > 0);
  const specialists = specialistIds.length
    ? await supabase
        .from("specialists")
        .select("id, name, avatar_url, languages, work_format, status, category_id")
        .in("id", specialistIds)
    : { data: [] as Array<Record<string, unknown>> };
  const profiles = specialistIds.length
    ? await supabase.from("specialist_profiles").select("specialist_id, city").in("specialist_id", specialistIds)
    : { data: [] as Array<Record<string, unknown>> };
  const categoryIds = (specialists.data ?? [])
    .map((row) => (typeof row.category_id === "string" ? row.category_id : ""))
    .filter((id) => id.length > 0);
  const categories = categoryIds.length
    ? await supabase.from("categories").select("id, slug, title, title_ru, title_ua, title_de").in("id", categoryIds)
    : { data: [] as Array<Record<string, unknown>> };
  const conversation = await supabase
    .from("conversations")
    .select("id")
    .eq("service_request_id", requestId)
    .maybeSingle();

  const cards: SpecialistCard[] = [];
  for (const match of rows) {
    const specialistId = typeof match.specialist_id === "string" ? match.specialist_id : "";
    const specialist = (specialists.data ?? []).find((row) => row.id === specialistId);
    if (!specialist) continue;
    const profile = (profiles.data ?? []).find((row) => row.specialist_id === specialistId);
    const categoryRow = (categories.data ?? []).find((row) => row.id === specialist.category_id);
    const category = categoryRow
      ? (input.categoryTitle ?? categoryLabel)(categoryRow, input.locale)
      : "";
    const languages = Array.isArray(specialist.languages)
      ? specialist.languages.filter((item): item is string => typeof item === "string")
      : [];
    const preview = toPublicSpecialistPreview({
      id: specialistId,
      name: typeof specialist.name === "string" ? specialist.name : null,
      avatarUrl: typeof specialist.avatar_url === "string" ? specialist.avatar_url : null,
      category: category || null,
      languages,
      workFormat: typeof specialist.work_format === "string" ? specialist.work_format : null,
      city: typeof profile?.city === "string" ? profile.city : null,
      status: typeof specialist.status === "string" ? specialist.status : null,
      locale: input.locale,
    });
    cards.push({
      ...preview,
      matchStatus: match.status === "selected" ? "selected" : "interested",
    });
  }

  const serviceLabel =
    (typeof request.data.requested_service === "string" && request.data.requested_service) ||
    (typeof request.data.category_text === "string" && request.data.category_text) ||
    "";
  return {
    requestId,
    publicId: String(request.data.public_id ?? input.publicId),
    status: String(request.data.status ?? ""),
    serviceLabel,
    task: typeof request.data.description === "string" ? request.data.description : serviceLabel,
    selectedSpecialistId:
      typeof request.data.selected_specialist_id === "string" ? request.data.selected_specialist_id : null,
    interestedCount: rows.filter((row) => row.status === "interested" || row.status === "selected").length,
    cards,
    conversationId: conversation.data?.id ? String(conversation.data.id) : null,
  };
}

export type ConversationMessageView = {
  id: string;
  kind: "system" | "text";
  actor: "system" | "client" | "specialist";
  body: string | null;
  createdAt: string | null;
  serviceLabel: string | null;
  systemEvent: "connection_ready" | null;
};

export type ConversationTranscript = {
  id: string;
  requestId: string;
  publicId: string;
  serviceLabel: string;
  role: "client" | "specialist";
  messages: ConversationMessageView[];
};

function safeSystemEvent(value: unknown): ConversationMessageView["systemEvent"] {
  return value === "connection_ready" ? "connection_ready" : null;
}

export function toTranscriptResponse(conversation: ConversationTranscript): {
  conversation_id: string;
  service_request_id: string;
  public_id: string;
  service_label: string;
  role: "client" | "specialist";
  messages: Array<{
    id: string;
    kind: "system" | "text";
    actor_type: "system" | "client" | "specialist";
    body: string | null;
    created_at: string | null;
    system_payload?: { event?: "connection_ready"; service_label?: string };
  }>;
} {
  return {
    conversation_id: conversation.id,
    service_request_id: conversation.requestId,
    public_id: conversation.publicId,
    service_label: conversation.serviceLabel,
    role: conversation.role,
    messages: conversation.messages.map((message) => {
      const systemPayload: { event?: "connection_ready"; service_label?: string } = {};
      if (message.kind === "system" && message.systemEvent) systemPayload.event = message.systemEvent;
      if (message.kind === "system" && message.serviceLabel) systemPayload.service_label = message.serviceLabel;
      return {
        id: message.id,
        kind: message.kind,
        actor_type: message.actor,
        body: message.kind === "text" ? message.body : null,
        created_at: message.createdAt,
        ...(message.kind === "system" && Object.keys(systemPayload).length ? { system_payload: systemPayload } : {}),
      };
    }),
  };
}

export async function resolveOwnedConversation(
  supabase: SupabaseClient,
  input: { publicId: string; viewer: Viewer },
): Promise<
  | { status: "absent" }
  | { status: "forbidden" }
  | {
      status: "ready";
      requestId: string;
      publicId: string;
      serviceLabel: string;
      conversationId: string | null;
    }
> {
  const request = await supabase
    .from("service_requests")
    .select("id, public_id, client_user_id, requested_service, category_text")
    .eq("public_id", input.publicId)
    .maybeSingle();
  if (request.error || !request.data?.id) return { status: "absent" };
  const requestId = String(request.data.id);
  const clientUserId = typeof request.data.client_user_id === "string" ? request.data.client_user_id : null;
  if (!ownsRequest(clientUserId, requestId, input.viewer)) return { status: "forbidden" };
  const conversation = await supabase
    .from("conversations")
    .select("id")
    .eq("service_request_id", requestId)
    .maybeSingle();
  const serviceLabel =
    (typeof request.data.requested_service === "string" && request.data.requested_service) ||
    (typeof request.data.category_text === "string" && request.data.category_text) ||
    "";
  return {
    status: "ready",
    requestId,
    publicId: String(request.data.public_id ?? input.publicId),
    serviceLabel,
    conversationId: conversation.data?.id ? String(conversation.data.id) : null,
  };
}

export async function loadConversationForViewer(
  supabase: SupabaseClient,
  input: { conversationId: string; viewer: Viewer },
): Promise<ConversationTranscript | null> {
  const conversation = await supabase
    .from("conversations")
    .select("id, service_request_id, specialist_id, client_user_id, status")
    .eq("id", input.conversationId)
    .maybeSingle();
  if (conversation.error || !conversation.data?.id) return null;
  const requestId = String(conversation.data.service_request_id ?? "");
  const role = conversationRole({
    clientUserId: typeof conversation.data.client_user_id === "string" ? conversation.data.client_user_id : null,
    specialistId: String(conversation.data.specialist_id ?? ""),
    requestId,
    actorUserId: input.viewer.actorUserId,
    actorSpecialistId: input.viewer.actorSpecialistId,
    anonymousRequestId: input.viewer.anonymousRequestId,
  });
  if (!role) return null;
  const request = await supabase
    .from("service_requests")
    .select("id, public_id, requested_service, category_text")
    .eq("id", requestId)
    .maybeSingle();
  const messages = await supabase
    .from("conversation_messages")
    .select("id, kind, actor_type, body, payload, created_at")
    .eq("conversation_id", input.conversationId)
    .order("created_at", { ascending: true });
  const serviceLabel =
    (typeof request.data?.requested_service === "string" && request.data.requested_service) ||
    (typeof request.data?.category_text === "string" && request.data.category_text) ||
    "";
  const rows = [...(messages.data ?? [])].sort((left, right) =>
    String(left.created_at ?? "") < String(right.created_at ?? "") ? -1 : String(left.created_at ?? "") > String(right.created_at ?? "") ? 1 : 0,
  );
  return {
    id: String(conversation.data.id),
    requestId,
    publicId: typeof request.data?.public_id === "string" ? request.data.public_id : "",
    serviceLabel,
    role,
    messages: rows.map((row) => {
      const payload = row.payload && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {};
      const kind = row.kind === "system" ? "system" : "text";
      return {
        id: String(row.id),
        kind,
        actor: row.actor_type === "system" || row.actor_type === "specialist" ? row.actor_type : "client",
        body: kind === "text" && typeof row.body === "string" ? row.body : null,
        createdAt: typeof row.created_at === "string" ? row.created_at : null,
        serviceLabel: typeof payload.service_label === "string" ? payload.service_label : null,
        systemEvent: kind === "system" ? safeSystemEvent(payload.event) : null,
      };
    }),
  };
}
