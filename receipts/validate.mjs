import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const isSha = (value) => typeof value === "string" && value.length === 40 && /^[a-f0-9]{40}$/i.test(value);
const isName = (value) => typeof value === "string" && value.length > 0 && value === value.trim();
const isPositiveInteger = (value) => Number.isSafeInteger(value) && value > 0;
const outcomes = new Map([
  ["success", null],
  ["failure", "FAILED"],
  ["skipped", "SKIPPED"],
  ["cancelled", "CANCELED"],
  ["canceled", "CANCELED"],
  ["flaky", "FLAKY"],
  ["missing", "MISSING_RESULT"],
]);

function reject(code, details = {}) {
  return { ok: false, problems: [{ code, ...details }] };
}

export function validateReceipt(expectedSha, requiredChecks, receipt) {
  if (!isSha(expectedSha)) return reject("INVALID_EXPECTED_CHECKOUT");
  if (!Array.isArray(requiredChecks) || requiredChecks.length === 0 ||
      !requiredChecks.every(isName) || new Set(requiredChecks).size !== requiredChecks.length) {
    return reject("INVALID_REQUIRED_CHECKS");
  }
  if (!isPositiveInteger(receipt?.runId) || !isPositiveInteger(receipt.latestAttempt) ||
      !Array.isArray(receipt.attempts)) {
    return reject("INVALID_RECEIPT");
  }

  const attempts = [...receipt.attempts].sort((left, right) => (left?.number ?? 0) - (right?.number ?? 0));
  if (attempts.length !== receipt.latestAttempt || attempts.some((attempt, index) => attempt?.number !== index + 1)) {
    return reject("INCOMPLETE_ATTEMPT_HISTORY");
  }

  const required = new Set(requiredChecks);
  const problems = [];
  const failedBefore = new Set();
  for (const attempt of attempts) {
    if (!Array.isArray(attempt.results)) return reject("MISSING_ATTEMPT_RESULTS", { attempt: attempt.number });
    const seen = new Set();
    for (const result of attempt.results) {
      if (!isName(result?.name)) return reject("INVALID_RESULT", { attempt: attempt.number });
      if (!required.has(result.name)) continue;

      const details = { check: result.name, attempt: attempt.number };
      if (seen.has(result.name)) {
        problems.push({ code: "DUPLICATE_RESULT", ...details });
        continue;
      }
      seen.add(result.name);
      const outcome = outcomes.get(result.outcome);
      if (outcome === undefined) {
        problems.push({ code: "MISSING_OR_UNKNOWN_OUTCOME", ...details });
      } else if (outcome !== null) {
        problems.push({ code: outcome, ...details });
        if (outcome === "FAILED" && isSha(result.checkoutSha) &&
            result.checkoutSha.toLowerCase() === expectedSha.toLowerCase()) {
          failedBefore.add(result.name);
        }
      } else if (failedBefore.has(result.name)) {
        problems.push({ code: "FLAKY", ...details });
      }
      if (outcome === null || result.checkoutSha !== undefined) {
        if (!isSha(result.checkoutSha)) {
          problems.push({ code: "MISSING_OR_INVALID_CHECKOUT", ...details });
        } else if (result.checkoutSha.toLowerCase() !== expectedSha.toLowerCase()) {
          problems.push({ code: "WRONG_CHECKOUT", ...details });
        }
      }
    }

    for (const check of required) {
      if (!seen.has(check)) problems.push({ code: "MISSING_RESULT", check, attempt: attempt.number });
    }
  }

  return { ok: problems.length === 0, problems };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [expectedSha, checksPath, receiptPath, ...extra] = process.argv.slice(2);
  if (!expectedSha || !checksPath || !receiptPath || extra.length) {
    console.error("Usage: node receipts/validate.mjs <expected-checkout-sha> <required-checks.json> <receipt.json>");
    process.exitCode = 2;
  } else {
    try {
      const checks = JSON.parse(readFileSync(checksPath, "utf8"));
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
      const result = validateReceipt(expectedSha, checks, receipt);
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.ok ? 0 : 1;
    } catch (error) {
      console.error(`Cannot read CI receipt inputs: ${error.message}`);
      process.exitCode = 2;
    }
  }
}
