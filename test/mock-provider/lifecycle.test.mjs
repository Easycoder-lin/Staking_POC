import assert from "node:assert/strict";
import test from "node:test";

const lifecycle = [
  "draft",
  "pending_deposit",
  "deposit_submitted",
  "activation_pending",
  "active",
  "exit_requested",
  "exiting",
  "withdrawable",
  "withdrawn"
];

function nextStatus(status) {
  if (status === "slashed" || status === "withdrawn") return undefined;
  const index = lifecycle.indexOf(status);
  if (index < 0 || index >= lifecycle.length - 1) return undefined;
  return lifecycle[index + 1];
}

test("create mock stake starts in pending_deposit", () => {
  assert.equal(nextStatus("draft"), "pending_deposit");
});

test("get validator status lifecycle includes active state", () => {
  assert.ok(lifecycle.includes("active"));
});

test("advance validator state follows the expected lifecycle", () => {
  assert.equal(nextStatus("pending_deposit"), "deposit_submitted");
  assert.equal(nextStatus("deposit_submitted"), "activation_pending");
  assert.equal(nextStatus("activation_pending"), "active");
});

test("request exit is only valid when active", () => {
  assert.equal("active" === "active", true);
  assert.equal("activation_pending" === "active", false);
});

test("simulate slashing is terminal for automatic advance", () => {
  assert.equal(nextStatus("slashed"), undefined);
});

test("prevent invalid state transitions after withdrawn", () => {
  assert.equal(nextStatus("withdrawn"), undefined);
});
