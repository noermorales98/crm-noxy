---
author: Noeli
branch: feat/citas-ux-contactos
status: done
merged: 2026-11-18
pr: #8
---
# Citas minimalistas y contacto solo al ganar

## Intent
Simplificar `/appointments/[id]` (modelo compacto, preview markdown, título desde `#`, sin Pasos/Tareas duplicados), poner «Todas» por defecto en el listado, y crear Contact solo al ganar un deal.

## Scope
- In: UI citas, listado tabs, form submit sin contact, ensureContact al ganar.
- Out: booking genérico, sugerencias IA tipo CONTACT explícitas, rediseño global del CRM.

## Checklist
- [x] Worktree + FTD — check: `.worktrees/feat-citas-ux-contactos`
- [x] Tabs Todas primero / default — check: `page.tsx` TABS + `useState("all")`
- [x] Selector modelo compacto — check: `AppointmentSuggestions` header `text-[11px]`
- [x] Preview + título `#` + quitar Pasos/Tareas — check: `NoteEditor` + `extractMarkdownTitle` + panel sin items
- [x] Form sin Contact — check: submit sin `contact.create`
- [x] ensureContactForWonDeal — check: `deal-won.ts` + PATCH deals + MCP
- [x] Tests + risk — check: 5 pass; risk tier 1

## Evidence
- `node --test src/lib/markdown-title.test.ts src/lib/lead-person.test.ts` → 6 pass
- `npx @ericrisco/rsc risk` → tier 1 (default, docs)
- Revisión tier 1: should-fix título vacío corregido (`resolveNoteContent` + preview)

## Next
Fusionado en main el 2026-11-18 (02e2b13).
