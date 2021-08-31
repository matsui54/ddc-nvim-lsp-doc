import { assertEquals } from "./deps.ts";
import { trimLines } from "./util.ts";
import { findLabel, getFunctionName } from "./signature.ts";

Deno.test("findLabel", () => {
  assertEquals(findLabel("ho", "ho", "("), -1);
  assertEquals(findLabel("hoge(", "hoge", "("), 0);
  assertEquals(findLabel("hoge(foo", "hoge", "("), 0);
  assertEquals(findLabel("hoge(foo, abc()", "hoge", "("), 0);
  assertEquals(findLabel("hoge()", "ho", "("), -1);
  assertEquals(findLabel("hoge(1, 2, 3", "hoge", "("), 0);
  assertEquals(findLabel("hoge(1, 2, foo(", "foo", "("), 11);
  assertEquals(findLabel("hoge(1); foo(", "foo", "("), 9);
  assertEquals(findLabel("   Promise<string, ", "Promise", "<"), 3);
  assertEquals(
    findLabel(
      "  assertEquals(findLabel('hoge(1, 2, 3)', 'hoge', '('), -1",
      "assertEquals",
      "(",
    ),
    2,
  );
});

Deno.test("findLabel", () => {
});

Deno.test("trimLines", () => {
  assertEquals(trimLines(["   ", "foo", "hoge", ""]), ["foo", "hoge"]);
  assertEquals(trimLines(["foo", "hoge", ""]), ["foo", "hoge"]);
  assertEquals(trimLines(["", "foo", "hoge"]), ["foo", "hoge"]);
});
