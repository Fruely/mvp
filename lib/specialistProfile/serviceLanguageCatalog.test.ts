import assert from "node:assert/strict";
import test from "node:test";

import { SPECIALIST_PROFILE_ALLOWED_LANGUAGE_CODES } from "./types.ts";

test("specialist service-language catalogue matches MP1-S3", () => {
  assert.deepEqual([...SPECIALIST_PROFILE_ALLOWED_LANGUAGE_CODES], [
    "de",
    "en",
    "ru",
    "uk",
    "pl",
    "ar",
    "ro",
    "fr",
    "es",
    "it",
    "tr",
    "hr",
    "sr",
    "bs",
  ]);
});
