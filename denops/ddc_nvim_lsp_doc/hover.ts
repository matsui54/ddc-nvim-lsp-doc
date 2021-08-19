import { autocmd, Denops, fn, once } from "./deps.ts";
import {
  CompleteInfo,
  CompletionItem,
  FloatOption,
  MarkupContent,
  OpenFloatOptions,
  PopupPos,
  SignatureResponse,
  UserData,
} from "./types.ts";

const sighelpWinName = "ddc_nvim_lsp_doc_sighelp_winid";
const docWinName = "ddc_nvim_lsp_doc_document_winid";

export function trimLines(lines: string[]): string[] {
  let start = 0;
  let end = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().length) {
      start = i;
      break;
    }
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim().length) {
      end = i + 1;
      break;
    }
  }
  return lines.slice(start, end);
}

export function findParen(line: string): number {
  return line.search(/\((([^\(\)]*)|(\([^\(\)]*\)))*$/);
}

export class Hover {
  private timer: number = 0;
  private prevInput = "";

  private async luaAsyncRequest(
    denops: Denops,
    funcName: string,
    args: unknown[],
    callback: Function,
  ): Promise<void> {
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error("timeout"))
      }, 2000);
      denops.call("luaeval", `${funcName}(_A.args, _A.callback)`, {
        args: args,
        callback: once(denops, async (response) => {
          return resolve(callback(response));
        })[0],
      });
    }).catch((e) => console.error("ddc_nvim_lsp_doc", e));
  }

  private async closeWin(denops: Denops, name: string): Promise<void> {
    denops.call(
      "luaeval",
      "require('ddc_nvim_lsp_doc.hover').close_win(_A.arg)",
      { arg: name },
    );
  }

  private async getDecodedCompleteItem(
    denops: Denops,
  ): Promise<CompletionItem | null> {
    const info = await fn.complete_info(denops, [
      "mode",
      "selected",
      "items",
    ]) as CompleteInfo;
    if (
      info["mode"] != "eval" ||
      info["selected"] == -1
    ) {
      return null;
    }
    const item = info["items"][info["selected"]];
    if (!item.user_data || typeof item.user_data !== "string") return null;
    const decoded = JSON.parse(item.user_data) as UserData;
    if (!decoded["lspitem"]) return null;
    return decoded["lspitem"];
  }

  private async makeFloatingwinSize(
    lines: string[],
  ): Promise<[number, number]> {
    let maxWidth = 0;
    lines.map((line) => maxWidth = Math.max(maxWidth, line.length));
    return [maxWidth, lines.length];
  }

  private async showFloating(
    denops: Denops,
    opts: OpenFloatOptions,
  ): Promise<void> {
    denops.call(
      "luaeval",
      "require('ddc_nvim_lsp_doc.hover').show_float_win(_A.opts)",
      { opts: opts },
    );
  }

  private async openPreview(denops: Denops, item: CompletionItem) {
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
      this.closeWin(denops, docWinName);
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
      this.closeWin(denops, docWinName);
      return;
    }

    const pumInfo = await denops.call("pum_getpos") as PopupPos;
    // const align = "right";
    const [winWidth, winHeight] = await this.makeFloatingwinSize(lines);

    let floatingOpt: FloatOption = {
      relative: "win",
      anchor: "NW",
      width: winWidth,
      height: winHeight,
      style: "minimal",
      row: pumInfo.row - 1,
      col: pumInfo.col + pumInfo.width + (pumInfo.scrollbar ? 1 : 0),
    };
    this.showFloating(denops, {
      syntax: syntax,
      lines: lines,
      floatOpt: floatingOpt,
      events: ["InsertLeave", "CursorMovedI"],
      winName: docWinName,
    });
  }

  private async showSignatureHelp(
    denops: Denops,
    info: SignatureResponse,
    col: number,
  ): Promise<void> {
    if (!info.lines) {
      this.closeWin(denops, sighelpWinName);
      return;
    }
    info.lines = trimLines(info.lines);
    if (!info.lines.length) {
      this.closeWin(denops, sighelpWinName);
      return;
    }
    const [winWidth, winHeight] = await this.makeFloatingwinSize(info.lines);

    let floatingOpt: FloatOption = {
      relative: "win",
      anchor: "SW",
      width: winWidth,
      height: winHeight,
      style: "minimal",
      row: await fn.winline(denops) - 1,
      col: col,
    };
    this.showFloating(denops, {
      syntax: "markdown",
      lines: info.lines,
      floatOpt: floatingOpt,
      events: ["InsertLeave"],
      winName: sighelpWinName,
      hl: info.hl,
    });
  }

  private async onCompleteChanged(denops: Denops): Promise<void> {
    // debounce
    clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      const decoded = await this.getDecodedCompleteItem(denops);
      if (!decoded) {
        this.closeWin(denops, docWinName);
        return;
      }

      if (decoded.documentation) {
        this.openPreview(denops, decoded);
      } else {
        this.luaAsyncRequest(
          denops,
          "require('ddc_nvim_lsp_doc.hover').get_resolved_item",
          [decoded],
          (res: CompletionItem) => {
            if (res) {
              this.openPreview(denops, res);
            }
          },
        );
      }
    }, 100);
  }

  private async onInsertEnter(_denops: Denops): Promise<void> {
    this.prevInput = "";
  }

  private async onTextChanged(denops: Denops): Promise<void> {
    const cursorCol = await fn.col(denops, ".");
    const line = await fn.getline(denops, ".");
    const input = line.slice(0, cursorCol - 1);
    if (input == this.prevInput) return;

    const startPos = findParen(input);
    if (startPos != -1) {
      this.prevInput = input;
      this.luaAsyncRequest(
        denops,
        "require('ddc_nvim_lsp_doc.hover').get_signature_help",
        [],
        (res: SignatureResponse) => {
          if (res) {
            this.showSignatureHelp(denops, res, startPos);
          }
        },
      );
    } else {
      this.closeWin(denops, sighelpWinName);
    }
  }

  async onEvent(denops: Denops, event: autocmd.AutocmdEvent): Promise<void> {
    if (event == "CompleteChanged") {
      this.onCompleteChanged(denops);
    } else if (event == "InsertEnter") {
      this.onInsertEnter(denops);
    } else if (event == "TextChangedI" || event == "TextChangedP") {
      this.onTextChanged(denops);
    }
  }
}
