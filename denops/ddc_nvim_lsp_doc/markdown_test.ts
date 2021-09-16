import { assertEquals } from "./deps.ts";
import { convertInputToMarkdownLines } from "./markdown.ts";

Deno.test("convertInputToMarkdownLines", () => {
  assertEquals(convertInputToMarkdownLines("hoge\nfoo", ["var"]), [
    "var",
    "hoge",
    "foo",
  ]);
  assertEquals(
    convertInputToMarkdownLines({ kind: "plaintext", value: "hoge\nfoo" }, [
      "var",
    ]),
    [
      "var",
      "<text>",
      "hoge",
      "foo",
      "</text>",
    ],
  );
  assertEquals(
    convertInputToMarkdownLines({ language: "c", value: "hoge\nfoo" }, [
      "var",
    ]),
    [
      "var",
      "```c",
      "hoge",
      "foo",
      "```",
    ],
  );
});
