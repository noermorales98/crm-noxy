import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import {
  ALL_PERMISSIONS,
  canManageTeam,
  firstAllowedPath,
  hasPermission,
  isPublicApiPath,
  normalizePermissions,
  resolveRouteAccess,
  sanitizePermissions,
} from "./permissions.ts";

test("OWNER and ADMIN always have every module", () => {
  assert.deepEqual(normalizePermissions({ crm: false }, "OWNER"), ALL_PERMISSIONS);
  assert.deepEqual(normalizePermissions({ mail: false }, "ADMIN"), ALL_PERMISSIONS);
  assert.equal(hasPermission("OWNER", { crm: false }, "vault"), true);
  assert.equal(canManageTeam("ADMIN"), true);
  assert.equal(canManageTeam("MEMBER"), false);
});

test("MEMBER only gets explicit module flags", () => {
  const perms = sanitizePermissions({ content: true, vault: "yes" });
  assert.equal(perms.content, true);
  assert.equal(perms.vault, false);
  assert.equal(hasPermission("MEMBER", perms, "content"), true);
  assert.equal(hasPermission("MEMBER", perms, "mail"), false);
});

test("legacy sessions without role stay unblocked", () => {
  assert.equal(hasPermission(undefined, undefined, "mail"), true);
  assert.equal(canManageTeam(undefined), true);
});

test("route access maps pages and APIs to modules", () => {
  assert.deepEqual(resolveRouteAccess("/contenido"), { kind: "module", module: "content" });
  assert.deepEqual(resolveRouteAccess("/settings/equipo"), { kind: "team" });
  assert.deepEqual(resolveRouteAccess("/profile"), { kind: "auth" });
  assert.deepEqual(resolveRouteAccess("/api/content/clients"), { kind: "module", module: "content" });
  assert.deepEqual(resolveRouteAccess("/api/clients/abc/vault"), { kind: "module", module: "vault" });
  assert.deepEqual(resolveRouteAccess("/api/emails"), { kind: "module", module: "mail" });
  assert.deepEqual(resolveRouteAccess("/api/members"), { kind: "team" });
  assert.deepEqual(resolveRouteAccess("/api/cron/content-reminders"), { kind: "public" });
  assert.deepEqual(resolveRouteAccess("/login"), { kind: "public" });
  assert.equal(isPublicApiPath("/api/auth/register"), true);
});

test("first allowed path follows module order", () => {
  assert.equal(firstAllowedPath("MEMBER", { content: true }), "/contenido");
  assert.equal(firstAllowedPath("OWNER", ALL_PERMISSIONS), "/");
});
