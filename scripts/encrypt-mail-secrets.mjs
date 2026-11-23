// Cifra las contraseñas SMTP/IMAP de Company que aún están en texto plano.
//
//   node --env-file=.env scripts/encrypt-mail-secrets.mjs            → simulacro: solo cuenta (por defecto)
//   node --env-file=.env scripts/encrypt-mail-secrets.mjs --apply    → respaldo (0600) y luego cifra
//
// Idempotente: lo que ya está cifrado se salta. Cada valor se comprueba (cifrar → descifrar == original) antes de
// escribirse, y la escritura solo prospera si la fila no cambió desde que se leyó.
// IMPORTANTE: córrelo DESPUÉS de desplegar el código que lee contraseñas cifradas; si no, el código viejo
// intentaría usar el texto cifrado como contraseña.

import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { appSecretKey, decryptSecret, isEncryptedSecret } from "../src/lib/secret-box.ts";
import { sealMailSecret } from "../src/lib/mail-secret.ts";

const args = process.argv.slice(2);
if (args.some((a) => !["--apply", "--dry-run"].includes(a)) || (args.includes("--apply") && args.includes("--dry-run"))) {
  console.error("Uso: node scripts/encrypt-mail-secrets.mjs [--dry-run | --apply]");
  process.exit(2);
}
const apply = args.includes("--apply");
const prisma = new PrismaClient();
const plain = (v) => typeof v === "string" && v !== "" && !isEncryptedSecret(v);

async function main() {
  const key = appSecretKey();
  const rows = await prisma.company.findMany({
    where: { OR: [{ smtpPass: { not: null } }, { imapPass: { not: null } }] },
    select: { id: true, name: true, smtpPass: true, imapPass: true },
  });
  const pending = rows.map((r) => ({ ...r, sealSmtp: plain(r.smtpPass), sealImap: plain(r.imapPass) })).filter((r) => r.sealSmtp || r.sealImap);

  console.log(JSON.stringify({
    empresasConContraseña: rows.length,
    yaCifradas: rows.length - pending.length,
    conTextoPlano: pending.length,
    smtpSinCifrar: pending.filter((r) => r.sealSmtp).length,
    imapSinCifrar: pending.filter((r) => r.sealImap).length,
    empresas: pending.map((r) => r.name),
  }, null, 2));

  if (!apply) return console.log(pending.length ? "Simulacro: no se escribió nada. Para cifrar: --apply (hace respaldo antes)." : "Nada que cifrar.");
  if (!pending.length) return console.log("Nada que cifrar.");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = resolve(process.env.MAIL_BACKUP_DIR || "backups", `mail-antes-de-cifrar-${stamp}.json`);
  mkdirSync(dirname(backup), { recursive: true });
  writeFileSync(backup, JSON.stringify(pending.map(({ id, smtpPass, imapPass }) => ({ id, smtpPass, imapPass })), null, 2), { mode: 0o600 });
  chmodSync(backup, 0o600);
  console.log(`Respaldo (texto plano; guárdalo bajo llave y bórralo cuando verifiques): ${backup}`);

  let done = 0, skipped = 0;
  for (const r of pending) {
    const data = {};
    if (r.sealSmtp) data.smtpPass = sealMailSecret(r.smtpPass, key);
    if (r.sealImap) data.imapPass = sealMailSecret(r.imapPass, key);
    if ((data.smtpPass && decryptSecret(data.smtpPass, key) !== r.smtpPass) || (data.imapPass && decryptSecret(data.imapPass, key) !== r.imapPass)) {
      throw new Error(`La comprobación cifrar→descifrar falló en la empresa ${r.id}; no se escribe nada más.`);
    }
    const where = { id: r.id, ...(r.sealSmtp ? { smtpPass: r.smtpPass } : {}), ...(r.sealImap ? { imapPass: r.imapPass } : {}) };
    const res = await prisma.company.updateMany({ where, data });
    res.count ? done++ : skipped++;
  }
  console.log(JSON.stringify({ cifradas: done, saltadasPorCambioConcurrente: skipped }, null, 2));
  if (skipped) console.log("Vuelve a ejecutar --apply para las saltadas (es idempotente).");
}

main().catch((e) => { console.error(e.message || e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
