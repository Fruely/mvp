import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  SPECIALIST_LEAD_REMINDER_TELEGRAM_TEXT,
  SPECIALIST_LEAD_TELEGRAM_TEXT,
  buildLeadMessagePreview,
  formatLeadPublicId,
  isLeadContactUnlocked,
  mapRowToDashboardLead,
  sanitizeLockedLeadPreview,
} from "./contactUnlock.ts";

test("locked lead is not contact-unlocked when status is new", () => {
  assert.equal(isLeadContactUnlocked({ status: "new", contact_unlocked_at: null }), false);
});

test("accepted/contacted/closed without timestamp remain locked", () => {
  assert.equal(isLeadContactUnlocked({ status: "accepted", contact_unlocked_at: null }), false);
  assert.equal(isLeadContactUnlocked({ status: "contacted", contact_unlocked_at: null }), false);
  assert.equal(isLeadContactUnlocked({ status: "closed", contact_unlocked_at: null }), false);
});

test("contact_unlocked_at unlocks lead", () => {
  assert.equal(
    isLeadContactUnlocked({ status: "new", contact_unlocked_at: "2026-08-05T12:00:00.000Z" }),
    true,
  );
});

test("redacted dashboard model omits contacts before unlock", () => {
  const lead = mapRowToDashboardLead({
    id: "11111111-2222-3333-4444-555555555555",
    status: "new",
    created_at: "2026-08-05T10:00:00.000Z",
    source: "specialist_profile",
    source_path: "/ru/specialist/test",
    contact_unlocked_at: null,
    client_name: "Secret Name",
    client_email: "secret@example.com",
    client_phone: "+49123456789",
    message: "Need help with taxes and bookkeeping for my small business in Berlin.",
  });

  assert.equal(lead.contacts_unlocked, false);
  assert.equal(lead.client_name, null);
  assert.equal(lead.client_email, null);
  assert.equal(lead.client_phone, null);
  assert.equal(lead.message, null);
  assert.ok(lead.message_preview);
  assert.equal(lead.public_id, "#11111111");
});

test("unlocked dashboard model includes contacts", () => {
  const lead = mapRowToDashboardLead({
    id: "11111111-2222-3333-4444-555555555555",
    status: "new",
    contact_unlocked_at: "2026-08-05T12:00:00.000Z",
    client_name: "Anna",
    client_email: "anna@example.com",
    client_phone: "+49123456789",
    message: "Hello",
  });

  assert.equal(lead.contacts_unlocked, true);
  assert.equal(lead.client_email, "anna@example.com");
  assert.equal(lead.message, "Hello");
});

test("message preview truncates long safe text", () => {
  const long = "a".repeat(200);
  const preview = sanitizeLockedLeadPreview(long);
  assert.ok(preview);
  assert.ok(preview.length <= 121);
  assert.match(preview, /…$/);
});

test("A: email inside message is absent from locked preview", () => {
  const preview = sanitizeLockedLeadPreview(
    "Please reply to secret.client@example.com about my tax return.",
  );
  assert.ok(preview);
  assert.doesNotMatch(preview, /secret\.client@example\.com/i);
  assert.match(preview, /\[контакт скрыт\]/);
});

test("B: German phone with +49 is absent from locked preview", () => {
  const preview = sanitizeLockedLeadPreview("Call me at +491701234567 today.");
  assert.ok(preview);
  assert.doesNotMatch(preview, /\+49/);
  assert.doesNotMatch(preview, /1701234567/);
  assert.match(preview, /\[контакт скрыт\]/);
});

test("C: phone with spaces, dashes and brackets is absent from locked preview", () => {
  const preview = sanitizeLockedLeadPreview("Reach me on (030) 123-456-78 after lunch.");
  assert.ok(preview);
  assert.doesNotMatch(preview, /123-456-78/);
  assert.doesNotMatch(preview, /\(030\)/);
  assert.match(preview, /\[контакт скрыт\]/);
});

test("D: URL is absent from locked preview", () => {
  const preview = sanitizeLockedLeadPreview("More info at https://example.com/contact please.");
  assert.ok(preview);
  assert.doesNotMatch(preview, /https?:\/\//i);
  assert.doesNotMatch(preview, /example\.com/i);
  assert.match(preview, /\[контакт скрыт\]/);
});

test("E: Telegram link and @username are absent from locked preview", () => {
  const linkPreview = sanitizeLockedLeadPreview("Message me on t.me/mysecretchannel");
  assert.ok(linkPreview);
  assert.doesNotMatch(linkPreview, /t\.me/i);
  assert.match(linkPreview, /\[контакт скрыт\]/);

  const usernamePreview = sanitizeLockedLeadPreview("My Telegram is @secretuser123");
  assert.ok(usernamePreview);
  assert.doesNotMatch(usernamePreview, /@secretuser123/);
  assert.match(usernamePreview, /\[контакт скрыт\]/);
});

test("F: normal task description remains readable in locked preview", () => {
  const text =
    "Need help with taxes and bookkeeping for my small business in Berlin.";
  const preview = sanitizeLockedLeadPreview(text);
  assert.equal(preview, text);
});

test("G: original message remains unchanged after sanitization", () => {
  const original = "Contact me at test@example.com please";
  sanitizeLockedLeadPreview(original);
  assert.equal(original, "Contact me at test@example.com please");
});

test("H: unlocked lead returns original full message", () => {
  const fullMessage = "Call +491701234567 or email secret@example.com";
  const lead = mapRowToDashboardLead({
    id: "11111111-2222-3333-4444-555555555555",
    status: "new",
    contact_unlocked_at: "2026-08-05T12:00:00.000Z",
    client_name: "Anna",
    client_email: "anna@example.com",
    client_phone: "+49123456789",
    message: fullMessage,
  });

  assert.equal(lead.contacts_unlocked, true);
  assert.equal(lead.message, fullMessage);
  assert.equal(lead.message_preview, null);
});

test("I: locked preview remains at most 120 characters after masking", () => {
  const preview = sanitizeLockedLeadPreview(
    `Please email ${"very.long.alias.part@example.com"} ${"and ".repeat(40)}`,
  );
  assert.ok(preview);
  assert.ok(preview.length <= 121);
});

test("create route uses safe specialist telegram template", () => {
  const src = readFileSync(
    new URL("../../app/api/leads/create/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /SPECIALIST_LEAD_TELEGRAM_TEXT/);
  assert.doesNotMatch(src, /Телефон:/);
  assert.doesNotMatch(src, /client_name \|\| "—"/);
});

test("cron reminder does not include phone in template", () => {
  const src = readFileSync(
    new URL("../../app/api/cron/remind-leads/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /SPECIALIST_LEAD_REMINDER_TELEGRAM_TEXT/);
  assert.doesNotMatch(src, /client_phone/);
});

test("unlock-contacts route exists", () => {
  const src = readFileSync(
    new URL("../../app/api/specialist/leads/[id]/unlock-contacts/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /unlockSpecialistLeadContacts/);
  assert.match(src, /CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN/);
});

test("unlock-contacts sends client email only on first persisted unlock", () => {
  const src = readFileSync(
    new URL("../specialistLeads/service.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /didPersistFirstUnlock/);
  assert.match(src, /if \(didPersistFirstUnlock && resultMapped\.client_email\)/);
  assert.match(src, /\.is\("contact_unlocked_at", null\)/);
  const earlyReturn = src.indexOf("if (mapped.contacts_unlocked)");
  const sendEmail = src.indexOf("await sendEmail");
  assert.ok(earlyReturn >= 0);
  assert.ok(sendEmail > earlyReturn);
  assert.doesNotMatch(
    src.slice(earlyReturn, sendEmail),
    /await sendEmail/,
  );
});

test("locked preview sanitizer is not used in specialist telegram or cron paths", () => {
  const createSrc = readFileSync(
    new URL("../../app/api/leads/create/route.ts", import.meta.url),
    "utf8",
  );
  const cronSrc = readFileSync(
    new URL("../../app/api/cron/remind-leads/route.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(createSrc, /sanitizeLockedLeadPreview/);
  assert.doesNotMatch(createSrc, /message_preview/);
  assert.doesNotMatch(cronSrc, /sanitizeLockedLeadPreview/);
  assert.doesNotMatch(cronSrc, /message_preview/);
});

test("public lead id formatter is stable", () => {
  assert.equal(formatLeadPublicId("abcdef12-3456-7890-abcd-ef1234567890"), "#ABCDEF12");
});

test("specialist telegram copy has no contact placeholders", () => {
  assert.doesNotMatch(SPECIALIST_LEAD_TELEGRAM_TEXT, /телефон|email|@/i);
  assert.doesNotMatch(SPECIALIST_LEAD_REMINDER_TELEGRAM_TEXT, /телефон|email|@/i);
});
