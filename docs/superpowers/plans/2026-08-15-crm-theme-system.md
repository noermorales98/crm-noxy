# CRM Personal Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ten accessible light themes that each authenticated user can select in Settings and persist across sessions and devices.

**Architecture:** A pure TypeScript theme registry owns metadata and semantic token values. `CrmThemeProvider` synchronizes the signed-in user's preference through a dedicated endpoint and applies runtime CSS variables to the authenticated dashboard root; public routes remain on canonical Noxy defaults. Prisma stores only the stable theme identifier on `User`.

**Tech Stack:** Next.js 16 App Router, React 19, NextAuth 5, Prisma 6/MySQL, Tailwind CSS 4 semantic variables, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-15-crm-theme-system-design.md`

## Global Constraints

- Themes are personal per user and synchronize between devices.
- Ship exactly ten curated light themes; no dark mode and no arbitrary color editor.
- Include `noxy-obsidian`: `#0B0B18` primary actions over a white application background.
- Public forms, schedules, quotes, shared documents, exported PDFs, semantic statuses, integration colors, chart colors, and user-saved colors remain canonical.
- Use only Noxy palette colors or accessible light/hover derivatives.
- A failed save rolls the UI back to the last server-confirmed theme and announces the failure.
- Apply schema changes with `npm run db:push`, never `prisma migrate dev`.
- Preserve the motion-free contract of `/form/:id`.

---

### Task 1: Accessible theme registry

**Files:**
- Create: `src/lib/crm-themes.ts`
- Create: `src/lib/crm-themes.test.ts`

**Interfaces:**
- Produces: `CrmThemeId`, `CrmThemeTokens`, `CrmThemeDefinition`, `CRM_THEMES`, `DEFAULT_CRM_THEME_ID`, `isCrmThemeId(value)`, `resolveCrmTheme(value)`, `crmThemeCssVariables(theme)`, and contrast utilities used only by tests.

- [ ] **Step 1: Write failing registry tests**

Test that the registry contains ten unique light identifiers, resolves unknown values to `noxy-indigo`, defines `noxy-obsidian` with action `#0B0B18` and application surface `#FFFFFF`, and provides a complete semantic token set for every entry. Test WCAG ratios of at least 4.5:1 for primary text over all three surfaces, secondary text over application/elevated surfaces, and action foreground over both primary and secondary action colors.

```ts
test("ships ten unique light themes including the requested Obsidian palette", () => {
  assert.equal(CRM_THEMES.length, 10);
  assert.equal(new Set(CRM_THEMES.map(({ id }) => id)).size, 10);
  const obsidian = resolveCrmTheme("noxy-obsidian");
  assert.equal(obsidian.tokens.actionPrimary, "#0B0B18");
  assert.equal(obsidian.tokens.surfaceApp, "#FFFFFF");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test src/lib/crm-themes.test.ts`

Expected: FAIL because `src/lib/crm-themes.ts` does not exist.

- [ ] **Step 3: Implement the registry**

Define these stable IDs: `noxy-indigo`, `noxy-obsidian`, `noxy-discord`, `noxy-memory`, `noxy-lime`, `noxy-lavender`, `noxy-jasmine`, `noxy-silver`, `noxy-soft-indigo`, and `noxy-monochrome`. Each entry includes Spanish label/description, `isDark: false`, four preview swatches, and the complete runtime tokens:

```ts
export type CrmThemeTokens = {
  surfaceApp: string;
  surfaceSidebar: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textPlaceholder: string;
  navActive: string;
  navHover: string;
  borderSubtle: string;
  actionPrimary: string;
  actionPrimaryForeground: string;
  actionSecondary: string;
  focus: string;
  highlight: string;
};
```

`crmThemeCssVariables()` returns both Tailwind runtime variables such as `--color-surface-app` and direct CSS variables such as `--surface-app`, so existing utilities and handwritten CSS respond together.

- [ ] **Step 4: Run the registry test and verify GREEN**

Run: `node --test src/lib/crm-themes.test.ts`

Expected: all registry and contrast tests PASS.

- [ ] **Step 5: Commit the registry**

```bash
git add src/lib/crm-themes.ts src/lib/crm-themes.test.ts
git commit -m "feat: add accessible CRM theme registry"
```

### Task 2: Dynamic foreground and global theme contract

**Files:**
- Modify: `app/globals.css`
- Modify: `src/lib/crm-ui.ts`
- Modify: first-party `app/**/*.tsx` and `src/**/*.tsx` files containing a `bg-action-primary` + `text-white` pairing
- Modify: `src/lib/noxy-brand-contract.test.ts`
- Create: `src/lib/crm-theme-integration-contract.test.ts`

**Interfaces:**
- Consumes: `--color-action-primary-foreground` emitted by Task 1.
- Produces: Tailwind utility `text-action-primary-foreground` used by every primary action.

- [ ] **Step 1: Write the failing integration contract**

Assert that `app/globals.css` exposes `--color-action-primary-foreground`, `.crm-btn-primary` consumes `text-action-primary-foreground`, and no first-party TypeScript/TSX source contains a primary-action background paired with fixed white text. Also assert that `/form/:id` still contains no motion utilities.

```ts
assert.match(globals, /--color-action-primary-foreground:\s*#FFFFFF/i);
assert.match(globals, /\.crm-btn-primary[\s\S]*text-action-primary-foreground/);
assert.doesNotMatch(uiSource, /bg-action-primary[^"'\n]*text-white|text-white[^"'\n]*bg-action-primary/);
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `node --test src/lib/crm-theme-integration-contract.test.ts`

Expected: FAIL on the missing foreground token and existing fixed-white classes.

- [ ] **Step 3: Add the foreground token and migrate primary actions**

Add `--color-action-primary-foreground: #FFFFFF` to `@theme` and `--action-primary-foreground: #FFFFFF` to `:root`. Change `.crm-btn-primary`, `PRIMARY_BUTTON`, and every class combination using `bg-action-primary text-white` or `text-white bg-action-primary` to `text-action-primary-foreground`. Do not replace white text on semantic, integration, chart, image-overlay, destructive, or user-color backgrounds.

- [ ] **Step 4: Run contracts and verify GREEN**

Run: `node --test src/lib/crm-theme-integration-contract.test.ts src/lib/noxy-brand-contract.test.ts`

Expected: PASS, including the existing public-form motion contract.

- [ ] **Step 5: Commit dynamic foreground support**

```bash
git add app src
git commit -m "feat: make primary action contrast theme-aware"
```

### Task 3: Per-user schema and settings validation

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/db.ts`
- Create: `src/lib/crm-theme-settings.ts`
- Create: `src/lib/crm-theme-settings.test.ts`
- Create: `app/api/settings/theme/route.ts`

**Interfaces:**
- Consumes: `CrmThemeId`, `DEFAULT_CRM_THEME_ID`, `isCrmThemeId` from Task 1.
- Produces: `parseCrmThemePatch(body): { ok: true; theme: CrmThemeId } | { ok: false; error: string }`; authenticated `GET` and `PATCH /api/settings/theme`.

- [ ] **Step 1: Write failing payload-validation tests**

Test a valid known theme, missing/non-string input, and unknown identifiers.

```ts
assert.deepEqual(parseCrmThemePatch({ theme: "noxy-obsidian" }), {
  ok: true,
  theme: "noxy-obsidian",
});
assert.equal(parseCrmThemePatch({ theme: "dark" }).ok, false);
```

- [ ] **Step 2: Run validation tests and verify RED**

Run: `node --test src/lib/crm-theme-settings.test.ts`

Expected: FAIL because the parser does not exist.

- [ ] **Step 3: Implement validation, schema, and endpoint**

Add `crmTheme String @default("noxy-indigo")` to `User`, bump `PRISMA_CLIENT_KEY`, implement the pure parser, and add the authenticated route. `GET` selects only `crmTheme`; `PATCH` parses JSON, rejects invalid payloads with `400`, updates only `session.user.id`, and returns `{ theme }`.

- [ ] **Step 4: Run tests and Prisma validation**

Run:

```bash
node --test src/lib/crm-theme-settings.test.ts
npx prisma validate
npx prisma generate
```

Expected: tests PASS and Prisma reports a valid schema/client generation.

- [ ] **Step 5: Inspect and apply the additive database diff**

Load `.env.local`, run `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script`, and confirm the output only adds `User.crmTheme` with default `noxy-indigo`. Then run `npm run db:push` from the main project path whose `.env.local` is available. Do not proceed if the diff contains a drop, destructive alteration, or unrelated column change.

- [ ] **Step 6: Commit persistence**

```bash
git add prisma/schema.prisma src/lib/db.ts src/lib/crm-theme-settings.ts src/lib/crm-theme-settings.test.ts app/api/settings/theme/route.ts
git commit -m "feat: persist CRM theme per user"
```

### Task 4: Theme preference state and authenticated provider

**Files:**
- Create: `src/lib/crm-theme-preference.ts`
- Create: `src/lib/crm-theme-preference.test.ts`
- Create: `src/context/CrmThemeContext.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/DashboardShell.tsx`

**Interfaces:**
- Consumes: registry functions from Task 1 and `/api/settings/theme` from Task 3.
- Produces: `CrmThemeProvider`, `useCrmTheme()`, user-scoped cache helpers, and a themed dashboard root.

- [ ] **Step 1: Write failing preference-state tests**

Test user-scoped storage keys, fallback from invalid cached values, optimistic selection, confirmation, rollback to the last confirmed theme, and rejection of stale request completions.

```ts
assert.equal(themeStorageKey("user-1"), "noxy-crm-theme:user-1");
const saving = beginThemeSelection(initialState, "noxy-obsidian", 2);
assert.equal(saving.activeThemeId, "noxy-obsidian");
assert.equal(rollbackThemeSelection(saving, 2).activeThemeId, "noxy-indigo");
```

- [ ] **Step 2: Run state tests and verify RED**

Run: `node --test src/lib/crm-theme-preference.test.ts`

Expected: FAIL because the state helpers do not exist.

- [ ] **Step 3: Implement pure state helpers and provider**

The provider reads a safe user-scoped cache after `useSession()` supplies the user ID, fetches the server preference, and exposes `{ themeId, theme, themes, saveStatus, message, selectTheme }`. Selection applies immediately, debounces persistence, aborts the previous request, confirms only the newest request, and rolls back on a current-request error. Local-storage access is wrapped in `try/catch`.

- [ ] **Step 4: Scope themes to authenticated CRM routes**

Wrap only the private `DashboardShell` branch in `CrmThemeProvider`. In `DashboardShell`, add `data-crm-theme={themeId}` and `style={crmThemeCssVariables(theme)}` to the full-height root. Leave the public-route branch untouched.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node --test src/lib/crm-theme-preference.test.ts src/lib/crm-theme-integration-contract.test.ts`

Expected: state tests PASS and the contract confirms public routes are outside the provider.

- [ ] **Step 6: Commit provider integration**

```bash
git add src/lib/crm-theme-preference.ts src/lib/crm-theme-preference.test.ts src/context/CrmThemeContext.tsx src/components/AppShell.tsx src/components/DashboardShell.tsx
git commit -m "feat: apply personal theme across authenticated CRM"
```

### Task 5: Appearance selector in Settings

**Files:**
- Create: `src/components/settings/ThemeSelector.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `src/lib/crm-theme-integration-contract.test.ts`

**Interfaces:**
- Consumes: `useCrmTheme()` and theme metadata from Task 4.
- Produces: accessible auto-saving Appearance section.

- [ ] **Step 1: Extend the failing UI contract**

Assert that Settings renders `ThemeSelector`; the selector uses real buttons, `aria-pressed`, `role="status"`, theme labels, and responsive `grid-cols-1 sm:grid-cols-2` layout.

- [ ] **Step 2: Run contract and verify RED**

Run: `node --test src/lib/crm-theme-integration-contract.test.ts`

Expected: FAIL because the selector does not exist.

- [ ] **Step 3: Implement the selector**

Create a section headed “Apariencia” with concise explanatory copy and ten preview buttons. Each preview renders a miniature sidebar/content/action composition plus four token swatches. Selected state includes a check icon, border, `aria-pressed="true"`, and text. Render save feedback in a reserved-height `role="status" aria-live="polite"` region to avoid layout shift.

- [ ] **Step 4: Insert it at the top of Settings**

Render `<ThemeSelector />` before interaction sounds, separated by the existing divider rhythm. Keep the settings form and external integration behavior unchanged.

- [ ] **Step 5: Run contracts and scoped lint**

Run:

```bash
node --test src/lib/crm-theme-integration-contract.test.ts
npx eslint src/components/settings/ThemeSelector.tsx src/context/CrmThemeContext.tsx src/lib/crm-theme*.ts app/api/settings/theme/route.ts
```

Expected: PASS with no errors.

- [ ] **Step 6: Commit Settings UI**

```bash
git add src/components/settings/ThemeSelector.tsx app/settings/page.tsx src/lib/crm-theme-integration-contract.test.ts
git commit -m "feat: add theme picker to CRM settings"
```

### Task 6: Final verification and live handoff

**Files:**
- Modify: `PRODUCT.md`
- Modify: `DESIGN.md`
- Modify: `src/lib/noxy-brand-contract.test.ts` if documentation contracts need expansion

**Interfaces:**
- Consumes: the completed theme system.
- Produces: documented, production-built and browser-verified feature running on the redesign branch.

- [ ] **Step 1: Document the preference model and theme catalog**

Update product/design docs to state that themes are personal, light-only, synchronized, and scoped to authenticated CRM surfaces. Record the foreground token and the ten stable identifiers.

- [ ] **Step 2: Run the complete automated suite**

Run:

```bash
rg --files -0 -g '*.test.ts' -g '*.test.tsx' | xargs -0 node --test
git diff --check
npm run build
```

Expected: all tests PASS, no whitespace errors, and production build exits 0. Record the repository-wide lint count separately because the branch inherited existing lint debt; require scoped lint for every new file to pass.

- [ ] **Step 3: Restart the live development server**

Restart `npm run dev` from the worktree with the main checkout's `.env.local`. If port 3000 is occupied, retain port 3001 and report the exact URL.

- [ ] **Step 4: Browser-verify the complete interaction**

At 390, 768, and 1440 px, select at least Noxy Índigo, Obsidiana, Recuerdo, and Lima from Settings. Confirm immediate application on Settings, dashboard, sidebar, assistant, and an internal form; reload and confirm persistence. Verify public `/form/:id` remains canonical and motion-free. Run accessibility checks on Settings and dashboard, test keyboard selection/focus, ensure no horizontal overflow, and verify button contrast.

- [ ] **Step 5: Final implementation commit**

```bash
git add PRODUCT.md DESIGN.md src/lib/noxy-brand-contract.test.ts
git commit -m "docs: document personal CRM themes"
```

