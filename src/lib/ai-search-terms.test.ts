import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { searchTerms } from "./ai-search-terms.ts";

test("searchTerms: sin acentos, sin muletillas, únicas y con tope", () => {
  assert.deepEqual(searchTerms("Dame el guión del reel de Cafetería Ñandú sobre café"), ["guion", "reel", "cafeteria", "nandu", "cafe"]);
  assert.deepEqual(searchTerms("hola"), []);
  assert.equal(searchTerms("reel reel REEL").length, 1);
});
