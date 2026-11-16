import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { validateReceipt } from "../receipts/validate.mjs";

const checkout = "d032db6c3a78a9378f35bd9fbd0b520a9fcc171c";
const head = "1005eb966499413658b157f1c7dbda6bfd5137a7";
const primary = "Library regressions";
const browser = "Required browser scenario";
const required = [primary, browser];
const result = (name, outcome = "success", checkoutSha = checkout) => ({ name, outcome, checkoutSha });
const receipt = (results) => ({ runId: 43913978673, latestAttempt: 1, attempts: [{ number: 1, results }] });

describe("CI receipt validation", () => {
  it("accepts only named passing results on the expected checkout", () => {
    const evidence = receipt([result(primary), result(browser), result("Optional check", "skipped")]);
    assert.deepEqual(validateReceipt(checkout, required, evidence), { ok: true, problems: [] });
  });

  it("rejects an otherwise successful result on the PR head instead of the expected merge checkout", () => {
    const evidence = receipt([result(primary, "success", head), result(browser)]);
    assert.deepEqual(validateReceipt(checkout, required, evidence).problems, [
      { code: "WRONG_CHECKOUT", check: primary, attempt: 1 },
    ]);
  });

  for (const [outcome, code] of [
    ["skipped", "SKIPPED"],
    ["cancelled", "CANCELED"],
    ["canceled", "CANCELED"],
    ["flaky", "FLAKY"],
    ["failure", "FAILED"],
    ["missing", "MISSING_RESULT"],
    ["in_progress", "MISSING_OR_UNKNOWN_OUTCOME"],
  ]) {
    it(`rejects a required ${outcome} result when the rest passed`, () => {
      const verdict = validateReceipt(checkout, required, receipt([result(primary), { name: browser, outcome }]));
      assert.equal(verdict.ok, false);
      assert.deepEqual(verdict.problems, [{ code, check: browser, attempt: 1 }]);
    });
  }

  it("rejects an absent required result despite additional passing checks", () => {
    const evidence = receipt([result(primary), result("Different browser scenario")]);
    assert.deepEqual(validateReceipt(checkout, required, evidence).problems, [
      { code: "MISSING_RESULT", check: browser, attempt: 1 },
    ]);
  });

  it("rejects a reported pass with a missing or abbreviated tested commit", () => {
    for (const item of [{ name: browser, outcome: "success" }, result(browser, "success", checkout.slice(0, 7))]) {
      const verdict = validateReceipt(checkout, required, receipt([result(primary), item]));
      assert.deepEqual(verdict.problems, [{ code: "MISSING_OR_INVALID_CHECKOUT", check: browser, attempt: 1 }]);
    }
  });

  it("rejects duplicate results for a required check", () => {
    const evidence = receipt([result(primary), result(browser), result(browser)]);
    assert.deepEqual(validateReceipt(checkout, required, evidence).problems, [
      { code: "DUPLICATE_RESULT", check: browser, attempt: 1 },
    ]);
  });

  it("keeps an earlier failure visible and treats a same-checkout success on retry as flaky", () => {
    const evidence = {
      runId: 43913978673, latestAttempt: 2,
      attempts: [
        { number: 2, results: [result(primary), result(browser)] },
        { number: 1, results: [result(primary), result(browser, "failure")] },
      ],
    };
    assert.deepEqual(validateReceipt(checkout, required, evidence).problems, [
      { code: "FAILED", check: browser, attempt: 1 },
      { code: "FLAKY", check: browser, attempt: 2 },
    ]);
    assert.deepEqual(validateReceipt(checkout, required, { ...evidence, attempts: evidence.attempts.slice(0, 1) }).problems, [
      { code: "INCOMPLETE_ATTEMPT_HISTORY" },
    ]);
  });

  it("rejects an earlier wrong-checkout failure without classifying it as a same-checkout retry", () => {
    const evidence = {
      runId: 43913978673, latestAttempt: 2,
      attempts: [
        { number: 1, results: [result(primary), result(browser, "failure", head)] },
        { number: 2, results: [result(primary), result(browser)] },
      ],
    };
    assert.deepEqual(validateReceipt(checkout, required, evidence).problems, [
      { code: "FAILED", check: browser, attempt: 1 },
      { code: "WRONG_CHECKOUT", check: browser, attempt: 1 },
    ]);
  });

  it("rejects missing results in an earlier attempt even when the latest attempt passed", () => {
    const successful = receipt([result(primary), result(browser)]);
    const evidence = {
      ...successful, latestAttempt: 2,
      attempts: [{ number: 1, results: [result(primary)] }, { ...successful.attempts[0], number: 2 }],
    };
    assert.deepEqual(validateReceipt(checkout, required, evidence).problems, [
      { code: "MISSING_RESULT", check: browser, attempt: 1 },
    ]);
  });

  it("rejects a passing earlier result omitted from the latest attempt", () => {
    const successful = receipt([result(primary), result(browser)]);
    const evidence = {
      ...successful, latestAttempt: 2,
      attempts: [...successful.attempts, { number: 2, results: [result(primary)] }],
    };
    assert.deepEqual(validateReceipt(checkout, required, evidence).problems, [
      { code: "MISSING_RESULT", check: browser, attempt: 2 },
    ]);
  });

  it("rejects invalid invocation metadata", () => {
    const evidence = receipt([result(primary), result(browser)]);
    assert.deepEqual(validateReceipt("main", required, evidence).problems, [{ code: "INVALID_EXPECTED_CHECKOUT" }]);
    assert.deepEqual(validateReceipt(checkout, [], evidence).problems, [{ code: "INVALID_REQUIRED_CHECKS" }]);
    assert.deepEqual(validateReceipt(checkout, [primary, primary], evidence).problems, [{ code: "INVALID_REQUIRED_CHECKS" }]);
    assert.deepEqual(validateReceipt(checkout, required, null).problems, [{ code: "INVALID_RECEIPT" }]);
  });

  it("returns a nonzero CLI status for an invalid receipt or unreadable input", () => {
    const directory = mkdtempSync(join(tmpdir(), "aldervale-ci-receipt-"));
    try {
      const command = fileURLToPath(new URL("../receipts/validate.mjs", import.meta.url));
      const checksPath = join(directory, "required.json");
      const receiptPath = join(directory, "receipt.json");
      writeFileSync(checksPath, JSON.stringify(required));
      const run = () => spawnSync(process.execPath, [command, checkout, checksPath, receiptPath], { encoding: "utf8" });

      writeFileSync(receiptPath, JSON.stringify(receipt([result(primary), result(browser)])));
      const accepted = run();
      assert.equal(accepted.status, 0, accepted.stderr);
      assert.deepEqual(JSON.parse(accepted.stdout), { ok: true, problems: [] });

      writeFileSync(receiptPath, JSON.stringify(receipt([result(primary), result(browser, "cancelled")])));
      const rejected = run();
      assert.equal(rejected.status, 1, rejected.stderr);
      assert.equal(JSON.parse(rejected.stdout).problems[0].code, "CANCELED");

      rmSync(receiptPath);
      const unreadable = run();
      assert.equal(unreadable.status, 2, unreadable.stderr);
      assert.match(unreadable.stderr, /Cannot read CI receipt inputs/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
