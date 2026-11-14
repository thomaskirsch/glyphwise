// SPDX-License-Identifier: MPL-2.0
/**
 * Checks all script packs and the repository for common mistakes:
 *  - every glyph has the required fields in every UI language
 *  - strokes only use the allowed commands (absolute M L H V Q C Z, or "P x y")
 *  - units only reference existing glyphs
 *  - every script pack has a license and a CREDITS.md
 *  - no e-mail addresses slip into source, data or docs
 * Run: npm run check:data
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scriptsDir = join(root, "src", "data", "scripts");
const langs = ["de", "en"];
const problems = [];
const warn = (where, msg) => problems.push(`${where}: ${msg}`);

const strokeOk = (s) =>
  /^P\s*-?\d*\.?\d+[\s,]+-?\d*\.?\d+$/.test(s.trim()) || /^M[\sMLHVQCZ\d.,-]*$/.test(s.trim());

let glyphCount = 0, unverified = 0;
for (const id of readdirSync(scriptsDir)) {
  const dir = join(scriptsDir, id);
  if (!statSync(dir).isDirectory()) continue;
  const meta = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
  const glyphs = JSON.parse(readFileSync(join(dir, "glyphs.json"), "utf8"));
  if (!meta.license) warn(id, "script.json has no license");
  if (!existsSync(join(dir, "CREDITS.md"))) warn(id, "CREDITS.md is missing");
  if (!["rtl", "ltr"].includes(meta.direction)) warn(id, "direction must be rtl or ltr");
  if (meta.frame?.viewBox?.length !== 4) warn(id, "frame.viewBox needs 4 numbers");

  for (const [gid, g] of Object.entries(glyphs)) {
    glyphCount++;
    const where = `${id}/${gid}`;
    for (const f of ["char", "say"]) if (!g[f]) warn(where, `missing ${f}`);
    if (!g.name?.native || !g.name?.translit) warn(where, "name needs native and translit");
    for (const f of ["sound", "mnemonic"]) for (const l of langs) if (!g[f]?.[l]) warn(where, `missing ${f}.${l}`);
    if (!g.example?.text || !g.example?.translit) warn(where, "example needs text and translit");
    for (const l of langs) if (!g.example?.meaning?.[l]) warn(where, `missing example.meaning.${l}`);
    if (!Array.isArray(g.strokes) || g.strokes.length === 0) warn(where, "no strokes");
    else g.strokes.forEach((s, i) => strokeOk(s) || warn(where, `stroke ${i + 1} uses unsupported commands: ${s}`));
    if (typeof g.verified !== "boolean") warn(where, "verified must be true or false");
    if (!g.verified) unverified++;
  }
  // Units: every glyph exactly once; words only use glyphs learned up to that unit.
  const seen = new Set();
  const learned = new Set();
  const stripMarks = (s) => s.replace(/[֑-ׇ]/g, ""); // Hebrew points and cantillation
  for (const u of meta.units ?? []) {
    for (const gid of u.glyphs) {
      if (!glyphs[gid]) warn(`${id}/units/${u.id}`, `unknown glyph "${gid}"`);
      else learned.add(glyphs[gid].char);
      if (seen.has(gid)) warn(`${id}/units/${u.id}`, `glyph "${gid}" appears in more than one unit`);
      seen.add(gid);
    }
    for (const w of u.words ?? []) {
      const unknown = [...stripMarks(w.text)].filter((c) => !learned.has(c));
      if (unknown.length) warn(`${id}/units/${u.id}`, `word ${w.text} uses letters not learned yet: ${unknown.join(" ")}`);
      for (const l of langs) if (!w.meaning?.[l]) warn(`${id}/units/${u.id}`, `word ${w.text} misses meaning.${l}`);
    }
  }
  for (const gid of Object.keys(glyphs)) if (!seen.has(gid)) warn(`${id}/${gid}`, "is not part of any unit");
}

// No personal e-mail addresses in the repository (GitHub noreply addresses are fine).
const skip = new Set(["node_modules", "dist", ".git", "LICENSE", "LICENSE-content", "package-lock.json"]);
const email = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
function scan(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) scan(p);
    else if (/\.(ts|js|mjs|svelte|json|md|html|css|txt)$/.test(name)) {
      for (const m of readFileSync(p, "utf8").match(email) ?? []) {
        if (!/noreply|example\.(com|org)/i.test(m)) warn(p.slice(root.length + 1), `contains an e-mail address (${m})`);
      }
    }
  }
}
scan(root);

console.log(`${glyphCount} glyphs checked, ${unverified} not yet verified by a native speaker.`);
if (problems.length) {
  console.error(problems.map((p) => "  ✗ " + p).join("\n"));
  process.exit(1);
}
console.log("All good.");
