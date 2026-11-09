import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { confirmPreview, consumeApproval, issuePreview } from "./approval.ts";

const secret = "test-secret";
const now = 1_700_000_000;

function approvalFor(action: string) {
  const preview = issuePreview({ action, summary: "vista previa", client: "Claude" }, secret, now);
  const confirmed = confirmPreview(preview, secret, now);
  assert.equal(confirmed.ok, true);
  if (!confirmed.ok) throw new Error("confirm failed");
  return { preview, approvalToken: confirmed.approvalToken };
}

test("un token alterado o caducado no autoriza la escritura", () => {
  const { preview, approvalToken } = approvalFor("sync_lead_to_notion:deal-1");
  const [body, sig] = approvalToken.split("~");
  const tampered = `${body}.${sig.slice(0, -1)}${sig.endsWith("a") ? "b" : "a"}`;
  const broken = consumeApproval(tampered, "sync_lead_to_notion:deal-1", { secret, now });
  assert.equal(broken.ok, false);

  const previewAsApproval = consumeApproval(preview, "sync_lead_to_notion:deal-1", { secret, now });
  assert.equal(previewAsApproval.ok, false);

  const otherAction = consumeApproval(approvalToken, "sync_lead_to_notion:deal-2", {
    secret,
    used: new Map(),
    now,
  });
  assert.equal(otherAction.ok, false);

  const expired = consumeApproval(approvalToken, "sync_lead_to_notion:deal-1", {
    secret,
    used: new Map(),
    now: now + 601,
  });
  assert.equal(expired.ok, false);
});

test("la confirmación vale una vez y solo para esa acción", () => {
  const { approvalToken } = approvalFor("update_deal:deal-1");
  const used = new Map<string, number>();
  const first = consumeApproval(approvalToken, "update_deal:deal-1", { secret, used, now });
  const second = consumeApproval(approvalToken, "update_deal:deal-1", { secret, used, now });
  assert.equal(first.ok, true);
  if (first.ok) assert.equal(first.client, "Claude");
  assert.equal(second.ok, false);
});
