import { Float } from "./float.ts";
import { Denops, fn, isLike, op } from "./deps.ts";
import {
  CompleteInfo,
  CompletionItem,
  FloatOption,
  JsonUserData,
  PopupPos,
  UltisnipsData,
  VimCompleteItem,
} from "./types.ts";
import { DocConfig } from "./config.ts";
import { convertInputToMarkdownLines } from "./markdown.ts";

function stylizeSnippet(lines: string[]): string[] {
  lines = lines.flatMap((line) => line.split("\n"));
  return lines.map((line) =>
    line.replace(/\${(\d:)?(\w+)}/g, "$2").replace(/\$(\d)+/g, "$1")
  );
}

function getUltisnipsSnippets(
  item: UltisnipsData,
): string[] | null {
  const [filePath, lineNr] = item.ultisnips.location.split(":");

  const lines = Deno.readTextFileSync(filePath).split("\n");
  let text: string[] = [];
  for (const line of lines.slice(Number(lineNr))) {
    if (line === "endsnippet" || line.search(/^snippet\s\S+/) != -1) {
      break;
    }
    text = text.concat(line);
  }
  if (!text.length) return null;
  return stylizeSnippet(text);
}

export class DocHandler {
  private float = new Float();
  private winName = "ddc_nvim_lsp_doc_document_winid";

  private async parseLspItem(
    denops: Denops,
    item: CompletionItem,
  ): Promise<[string[], string] | null> {
    let lines: string[] = [];
    if (item.detail) {
      lines = convertInputToMarkdownLines({
        language: await op.filetype.getLocal(denops),
        value: item.detail,
      }, []);
    }
    if (item.documentation) {
      const docLines = convertInputToMarkdownLines(item.documentation, []);
      if (lines.length && docLines.length) lines.push("---");
      lines = lines.concat(docLines);
    }

    if (!lines.length) {
      return null;
    }
    return [lines, "markdown"];
  }

  private async showInfoField(
    denops: Denops,
    item: VimCompleteItem,
    config: DocConfig,
  ): Promise<void> {
    if (config.supportInfo && item.info && item.info.length) {
      await this.showFloating(
        denops,
        item.info.split("\n"),
        "plaintext",
        config,
      );
    } else {
      await this.closeWin(denops);
    }
  }

  private async showFoundDoc(
    denops: Denops,
    item: VimCompleteItem,
    config: DocConfig,
  ): Promise<void> {
    if (!item.user_data) {
      this.showInfoField(denops, item, config);
      return;
    }
    let decoded: JsonUserData = null;
    if (isLike({ lspitem: "" }, item.user_data)) {
      decoded = {
        lspitem: JSON.parse(item.user_data.lspitem) as CompletionItem,
      };
    } else if (typeof item.user_data == "string") {
      try {
        decoded = JSON.parse(item.user_data) as JsonUserData;
      } catch (e) {
        if (e instanceof SyntaxError) {
          decoded = null;
        }
      }
      // plain string
      if (!decoded) {
        this.showFloating(
          denops,
          item.user_data.split("\n"),
          "plaintext",
          config,
        );
        return;
      }
    }

    // neither json nor string
    if (!decoded) {
      this.showInfoField(denops, item, config);
      return;
    }

    // nvim-lsp + ddc
    if ("lspitem" in decoded) {
      if (decoded.lspitem.documentation) {
        this.showLspDoc(denops, decoded.lspitem, config);
      } else {
        denops.call(
          "luaeval",
          "require('ddc_nvim_lsp_doc.helper').get_resolved_item(_A.arg)",
          { arg: { decoded: decoded.lspitem } },
        );
      }
      return;
    }

    // vsnip
    if (config.supportVsnip && "vsnip" in decoded) {
      this.showFloating(
        denops,
        stylizeSnippet(decoded.vsnip.snippet),
        await op.filetype.getLocal(denops),
        config,
      );
      return;
    }

    if (config.supportUltisnips && "ultisnips" in decoded) {
      const texts = getUltisnipsSnippets(decoded);
      if (texts) {
        this.showFloating(
          denops,
          texts,
          await op.filetype.getLocal(denops),
          config,
        );
      }
      return;
    }

    // unknown object. search for info item
    this.showInfoField(denops, item, config);
  }

  private async showFloating(
    denops: Denops,
    lines: string[],
    syntax: string,
    config: DocConfig,
  ) {
    const pumInfo = await denops.call("pum_getpos") as PopupPos;
    if (!pumInfo || !pumInfo.col) {
      this.closeWin(denops);
      return;
    }
    // const align = "right";

    const col = pumInfo.col + pumInfo.width + (pumInfo.scrollbar ? 1 : 0);
    const maxWidth = Math.min(
      await op.columns.get(denops) - col,
      config.maxWidth,
    );
    const maxHeight = Math.min(
      await denops.eval("&lines") as number - pumInfo.row,
      config.maxHeight,
    );
    const floatingOpt: FloatOption = {
      relative: "editor",
      anchor: "NW",
      style: "minimal",
      row: pumInfo.row,
      col: col,
      border: config.border,
    };
    this.float.showFloating(denops, {
      syntax: syntax,
      lines: lines,
      floatOpt: floatingOpt,
      events: ["InsertLeave", "CursorMovedI"],
      winName: this.winName,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
      blend: config.winblend,
    });
  }

  async showCompleteDoc(
    denops: Denops,
    config: DocConfig,
  ) {
    if (!config.enable) return;
    const info = await fn.complete_info(denops, [
      "mode",
      "selected",
      "items",
    ]) as CompleteInfo;
    if (
      info["mode"] != "eval" ||
      info["selected"] == -1
    ) {
      this.closeWin(denops);
      return;
    }
    const item = info["items"][info["selected"]];
    this.showFoundDoc(denops, item, config);
  }

  async showLspDoc(denops: Denops, item: CompletionItem, config: DocConfig) {
    const maybe = await this.parseLspItem(denops, item);
    if (!maybe) return;
    const [lines, syntax] = maybe;
    this.showFloating(denops, lines, syntax, config);
  }

  async closeWin(denops: Denops) {
    await this.float.closeWin(denops);
  }
}
