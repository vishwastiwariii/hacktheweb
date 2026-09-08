import crypto from "node:crypto";

// Verifies GitHub's `x-hub-signature-256` HMAC against the RAW request body.
// A parsed-then-restringified body will not verify. The comparison is
// constant-time.
export function verifyGithubWebhook(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) {
    return false;
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("GITHUB_WEBHOOK_SECRET is not configured");
  }

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  // timingSafeEqual throws when the buffers differ in length, so a malformed or
  // truncated signature has to be rejected before we get there.
  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
