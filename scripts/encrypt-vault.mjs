// Cifra las filas de ClientVaultEntry que aún guardan password (y notes, en las de tipo «credential») en texto plano.
//
//   node scripts/encrypt-vault.mjs            → simulacro: solo cuenta, no escribe nada (por defecto)
//   node scripts/encrypt-vault.mjs --dry-run  → igual que sin banderas
//   node scripts/encrypt-vault.mjs --apply    → escribe un respaldo y luego cifra
//
// Es idempotente: lo que ya empieza por «v1:» con el formato de secret-box se salta. Cada fila se comprueba
// (cifrar → descifrar == original) antes de escribirse, y la escritura solo prospera si la fila no cambió entre medias.
// Necesita DATABASE_URL y AUTH_SECRET (la misma clave que usa la app): ver el comando en el informe de la tarea.

import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { appSecretKey, decryptSecret, isEncryptedSecret } from "../src/lib/secret-box.ts";
import { notesAreEncrypted, sealValue } from "../src/lib/vault-crypto.ts";

const args = process.argv.slice(2);
const unknown = args.filter((a) => !["--apply", "--dry-run"].includes(a));
if (unknown.length || (args.includes("--apply") && args.includes("--dry-run"))) {
  console.error("Uso: node scripts/encrypt-vault.mjs [--dry-run | --apply]");
  process.exit(2);
}
const apply = args.includes("--apply");

const prisma = new PrismaClient();
const plain = (v) => typeof v === "string" && v !== "" && !isEncryptedSecret(v);

async function main() {
  const key = appSecretKey();
  const rows = await prisma.clientVaultEntry.findMany({ select: { id: true, type: true, password: true, notes: true, organizationId: true } });

  const pending = rows
    .map((r) => ({ ...r, sealPassword: plain(r.password), sealNotes: notesAreEncrypted(r.type) && plain(r.notes) }))
    .filter((r) => r.sealPassword || r.sealNotes);

  const stats = {
    total: rows.length,
    yaCifradas: rows.length - pending.length,
    sinCifrar: pending.length,
    passwordsSinCifrar: pending.filter((r) => r.sealPassword).length,
    notasSinCifrar: pending.filter((r) => r.sealNotes).length,
  };
  console.log(JSON.stringify(stats, null, 2));

  if (!apply) {
    console.log(pending.length ? "Simulacro: no se ha escrito nada. Para cifrar: --apply (hace respaldo antes)." : "Nada que cifrar.");
    return;
  }
  if (!pending.length) return console.log("Nada que cifrar.");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = resolve(process.env.VAULT_BACKUP_DIR || "backups", `vault-antes-de-cifrar-${stamp}.json`);
  mkdirSync(dirname(backup), { recursive: true });
  writeFileSync(backup, JSON.stringify(pending.map(({ id, type, password, notes }) => ({ id, type, password, notes })), null, 2), { mode: 0o600 });
  chmodSync(backup, 0o600);
  console.log(`Respaldo (texto plano, guárdalo bajo llave y bórralo cuando verifiques): ${backup}`);

  let done = 0;
  let skipped = 0;
  for (const r of pending) {
    const data = {};
    if (r.sealPassword) data.password = sealValue(r.password, key);
    if (r.sealNotes) data.notes = sealValue(r.notes, key);
    if ((data.password && decryptSecret(data.password, key) !== r.password) || (data.notes && decryptSecret(data.notes, key) !== r.notes)) {
      throw new Error(`La comprobación cifrar→descifrar falló en la fila ${r.id}; no se escribe nada más.`);
    }
    // updateMany con el valor antiguo en el filtro: si alguien editó la fila entre la lectura y ahora, se salta.
    const where = { id: r.id, ...(r.sealPassword ? { password: r.password } : {}), ...(r.sealNotes ? { notes: r.notes } : {}) };
    const res = await prisma.clientVaultEntry.updateMany({ where, data });
    res.count ? done++ : skipped++;
  }
  console.log(JSON.stringify({ cifradas: done, saltadasPorCambioConcurrente: skipped }, null, 2));
  if (skipped) console.log("Vuelve a ejecutar --apply para las saltadas (es idempotente).");
}

main()
  .catch((e) => {
    console.error(e.message || e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
