import { Float } from "./float.ts";
import { Denops, op, vars } from "./deps.ts";
import {
  CompletionItem,
  FloatOption,
  MarkupContent,
  PopupPos,
} from "./types.ts";
import { trimLines } from "./util.ts";

export class DocHandler {
  private float = new Float();
  private winName = "ddc_nvim_lsp_doc_document_winid";

  async closeWin(denops: Denops) {
    this.float.closeWin(denops);
  }

  async showCompleteDoc(denops: Denops, item: CompletionItem) {
    let detail = "";
    let syntax: string = "markdown";
    if (item.detail) {
      detail = item.detail;
    }
    let arg: string | MarkupContent;
    if (item.documentation) {
      const doc = item.documentation;
      if (typeof doc == "string") {
        arg = detail + (detail.length && doc.length ? "\n---\n" : "") + doc;
        syntax = "";
      } else {
        arg = {
          kind: syntax,
          value: detail + (detail.length && doc.value.length ? "\n---\n" : "") +
            doc.value,
        } as MarkupContent;
        syntax = doc.kind;
      }
    } else if (detail.length) {
      arg = detail;
    } else {
      this.closeWin(denops);
      return;
    }

    const lines = trimLines(
      await denops.call(
        "luaeval",
        "vim.lsp.util.convert_input_to_markdown_lines(_A.arg)",
        { arg: arg },
      ) as string[],
    );
    if (!lines.length) {
      this.closeWin(denops);
      return;
    }

    const pumInfo = await denops.call("pum_getpos") as PopupPos;
    if (!pumInfo || !pumInfo.col) {
      this.closeWin(denops);
      return;
    }
    // const align = "right";

    const col = pumInfo.col + pumInfo.width + (pumInfo.scrollbar ? 1 : 0);
    const maxWidth = Math.min(
      await op.columns.get(denops) - col,
      await vars.g.get(denops, "ddc_nvim_lsp_doc#max_winwidth", 80) as number,
    );
    const maxHeight = Math.min(
      await denops.eval("&lines") as number - pumInfo.row,
      await vars.g.get(denops, "ddc_nvim_lsp_doc#max_winheight", 30) as number,
    );
    let floatingOpt: FloatOption = {
      relative: "editor",
      anchor: "NW",
      style: "minimal",
      row: pumInfo.row,
      col: col,
      border: "rounded",
    };
    this.float.showFloating(denops, {
      syntax: syntax,
      lines: lines,
      floatOpt: floatingOpt,
      events: ["InsertLeave", "CursorMovedI"],
      winName: this.winName,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
    });
  }
}
