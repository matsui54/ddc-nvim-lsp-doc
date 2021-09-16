type MarkedString = string | { language: string; value: string };
export type MarkupKind = "plaintext" | "markdown";
export type MarkupContent = {
  kind: MarkupKind;
  value: string;
};

// --- Converts any of `MarkedString` | `MarkedString[]` | `MarkupContent` into
// --- a list of lines containing valid markdown. Useful to populate the hover
// --- window for `textDocument/hover`, for parsing the result of
// --- `textDocument/signatureHelp`, and potentially others.
// ---
// --@param input (`MarkedString` | `MarkedString[]` | `MarkupContent`)
// --@param contents (table, optional, default `{}`) List of strings to extend with converted lines
// --@returns {contents}, extended with lines of converted markdown.
// --@see https://microsoft.github.io/language-server-protocol/specifications/specification-current/#textDocument_hover
export function convertInputToMarkdownLines(
  input: MarkedString | MarkedString[] | MarkupContent,
  contents: string[],
): string[] {
  if (typeof input == "string") {
    contents = contents.concat(input.split("\n"));
  } else {
    if ("kind" in input) {
      let value = input.value.replace(/(?<=```)\s*ts/, "typescript");
      if (input.kind == "plaintext") {
        value = "<text>\n" + input.value + "\n</text>";
      }
      contents = contents.concat(value.split("\n"));
    } else if ("language" in input) {
      // MarkedString
      contents.push("```" + input.language);
      contents = contents.concat(input.value.split("\n"));
      contents.push("```");
    } else {
      contents = input.flatMap((mstr) =>
        convertInputToMarkdownLines(mstr, contents)
      );
    }
  }
  if (contents.length == 1 && contents[0] == "") {
    return [];
  }

  return contents;
}
