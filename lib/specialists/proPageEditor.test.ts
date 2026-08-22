import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import {
  buildDraftInsertFromPublished,
  buildPublishedUpsertFromDraft,
  mapProPageRowToPublicContent,
} from "@/lib/specialists/proPage/rowMapping";
import { validateProPageForPublish } from "@/lib/specialists/proPage/validateProPageForPublish";
import { parseProPageEditorialImageSlot } from "@/lib/specialists/proPage/proPageImageSlots";
import {
  buildProPageEditorialStoragePath,
  parseManagedProPageImageStoragePath,
  PRO_PAGE_IMAGE_BUCKET,
  PRO_PAGE_IMAGE_MAX_BYTES,
  validateProPageImageFile,
} from "@/lib/specialists/proPage/proPageImageUpload";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const validDraft = {
  profession_label: "NLP-консультант",
  positioning: "Помогаю разобраться с конкретной ситуацией.",
  client_requests: [
    { title: "A", description: "" },
    { title: "B", description: "" },
    { title: "C", description: "" },
  ],
  work_process: [
    { title: "1", description: "" },
    { title: "2", description: "" },
    { title: "3", description: "" },
  ],
  why_me: [
    { title: "X", description: "" },
    { title: "Y", description: "" },
  ],
};

describe("validateProPageForPublish", () => {
  test("accepts a complete draft", () => {
    assert.deepEqual(validateProPageForPublish(validDraft), { ok: true });
  });

  test("rejects missing profession_label", () => {
    const result = validateProPageForPublish({ ...validDraft, profession_label: "  " });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.includes("profession_label_required"));
    }
  });

  test("rejects fewer than 3 client requests", () => {
    const result = validateProPageForPublish({
      ...validDraft,
      client_requests: validDraft.client_requests.slice(0, 2),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.includes("client_requests_min_3"));
    }
  });

  test("rejects fewer than 2 why_me items", () => {
    const result = validateProPageForPublish({
      ...validDraft,
      why_me: validDraft.why_me.slice(0, 1),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.includes("why_me_min_2"));
    }
  });
});

describe("copy-on-first-open and publish mapping", () => {
  test("buildDraftInsertFromPublished copies published snapshot without status fields", () => {
    const insert = buildDraftInsertFromPublished("spec-1", {
      display_name: "Ирина",
      profession_label: "NLP",
      positioning: "Help",
      client_requests: [{ title: "A", description: "d" }],
      work_process: [{ title: "B", description: "" }],
      why_me: [{ title: "C", description: "" }],
      story: "Story",
      client_language: "ru",
      why_me_image_url: null,
      final_cta_image_url: null,
    });
    assert.equal(insert.specialist_id, "spec-1");
    assert.equal(insert.profession_label, "NLP");
    assert.equal(insert.status, undefined);
    assert.deepEqual(insert.client_requests, [{ title: "A", description: "d" }]);
  });

  test("buildPublishedUpsertFromDraft sets published status and editorial image fields", () => {
    const upsert = buildPublishedUpsertFromDraft("spec-1", {
      specialist_id: "spec-1",
      display_name: null,
      profession_label: "Coach",
      positioning: "Pos",
      client_requests: [],
      work_process: [],
      why_me: [],
      story: null,
      client_language: null,
      why_me_image_url: "https://example.com/why.jpg",
      final_cta_image_url: null,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    });
    assert.equal(upsert.status, "published");
    assert.equal(upsert.why_me_image_url, "https://example.com/why.jpg");
    assert.equal(upsert.final_cta_image_url, null);
    assert.ok(typeof upsert.published_at === "string");
  });
});

describe("public editorial image mapping", () => {
  test("null editorial image fields remain null in public content", () => {
    const content = mapProPageRowToPublicContent({
      display_name: "Name",
      profession_label: "Pro",
      positioning: "Pos",
      client_requests: [],
      work_process: [],
      why_me: [],
      story: null,
      client_language: null,
      why_me_image_url: null,
      final_cta_image_url: null,
    });
    assert.equal(content.whyMeImageUrl, null);
    assert.equal(content.finalCtaImageUrl, null);
  });
});

describe("draft save isolation", () => {
  test("saveProPageDraft writes only to specialist_pro_page_drafts", () => {
    const source = readFileSync(join(root, "lib/specialists/proPage/saveProPageDraft.ts"), "utf8");
    assert.match(source, /from\("specialist_pro_page_drafts"\)/);
    assert.doesNotMatch(source, /specialist_pro_pages/);
  });

  test("requireProPageEditorAccess checks entitlement, not plan_code", () => {
    const source = readFileSync(join(root, "lib/specialists/proPage/requireProPageEditorAccess.ts"), "utf8");
    assert.match(source, /loadSpecialistProEntitlement/);
    assert.match(source, /hasActiveProEntitlement/);
    assert.doesNotMatch(source, /plan_code/);
    assert.doesNotMatch(source, /specialist_plan/);
  });

  test("Pro page client uses explicit editorial URLs, not gallery", () => {
    const source = readFileSync(
      join(root, "components/specialist/pro/SpecialistProPageClient.tsx"),
      "utf8",
    );
    assert.match(source, /proContent\.whyMeImageUrl/);
    assert.match(source, /proContent\.finalCtaImageUrl/);
    assert.doesNotMatch(source, /gallery_urls\[0\]/);
    assert.doesNotMatch(source, /gallery_urls\[1\]/);
  });

  test("Pro page client uses neutral localized template copy", () => {
    const source = readFileSync(
      join(root, "components/specialist/pro/SpecialistProPageClient.tsx"),
      "utf8",
    );
    assert.match(source, /proPage\.template\.issuesIntro/);
    assert.match(source, /proPage\.template\.processIntro/);
    assert.match(source, /proPage\.template\.pricingIntro/);
    assert.doesNotMatch(source, /вернули контроль над своей жизнью/);
    assert.doesNotMatch(source, /конфиденциальной атмосфере/);
  });
});

describe("pro page editorial image upload", () => {
  test("parseProPageEditorialImageSlot accepts only why_me and final_cta", () => {
    assert.equal(parseProPageEditorialImageSlot("why_me"), "why_me");
    assert.equal(parseProPageEditorialImageSlot("final_cta"), "final_cta");
    assert.equal(parseProPageEditorialImageSlot("gallery"), null);
  });

  test("buildProPageEditorialStoragePath uses specialist-owned pro folders", () => {
    const whyPath = buildProPageEditorialStoragePath("spec-1", "why_me", "photo.JPG");
    const ctaPath = buildProPageEditorialStoragePath("spec-1", "final_cta", "cta.webp");
    assert.match(whyPath, /^spec-1\/pro\/why-me\/.+\.jpg$/);
    assert.match(ctaPath, /^spec-1\/pro\/final-cta\/.+\.webp$/);
  });

  test("parseManagedProPageImageStoragePath only accepts owned pro paths", () => {
    const url = `https://example.supabase.co/storage/v1/object/public/${PRO_PAGE_IMAGE_BUCKET}/spec-1/pro/why-me/test.jpg`;
    assert.equal(parseManagedProPageImageStoragePath(url, "spec-1"), "spec-1/pro/why-me/test.jpg");
    assert.equal(parseManagedProPageImageStoragePath(url, "other"), null);
  });

  test("validateProPageImageFile rejects invalid type and oversize files", () => {
    assert.equal(validateProPageImageFile({ type: "image/png", size: 1024 } as File).ok, true);
    assert.equal(validateProPageImageFile({ type: "application/pdf", size: 1024 } as File).ok, false);
    assert.equal(
      validateProPageImageFile({ type: "image/png", size: PRO_PAGE_IMAGE_MAX_BYTES + 1 } as File).ok,
      false,
    );
  });

  test("upload module writes only specialist_pro_page_drafts", () => {
    const source = readFileSync(join(root, "lib/specialists/proPage/proPageImageUpload.ts"), "utf8");
    assert.match(source, /from\("specialist_pro_page_drafts"\)/);
    assert.doesNotMatch(source, /specialist_pro_pages/);
  });

  test("upload route requires auth and Pro entitlement", () => {
    const source = readFileSync(
      join(root, "app/api/specialist/pro-page/images/upload/route.ts"),
      "utf8",
    );
    assert.match(source, /requireProPageEditorAccess/);
    assert.doesNotMatch(source, /plan_code/);
    assert.match(source, /invalid_slot/);
    assert.match(source, /removeProPageEditorialImage/);
  });

  test("remove sets draft image URL to null in update patch", () => {
    const source = readFileSync(join(root, "lib/specialists/proPage/proPageImageUpload.ts"), "utf8");
    assert.match(source, /updateDraftImageUrl\(service, specialistId, slot, null\)/);
  });
});
