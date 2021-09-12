import { Float } from "./float.ts";
import { trimLines } from "./util.ts";
import { SighelpResponce } from "./event.ts";
import { Denops, fn, op } from "./deps.ts";
import { FloatOption, SignatureHelp } from "./types.ts";
import { SignatureConfig } from "./config.ts";

export function findLabel(line: string, name: string, trigger: string): number {
  const pairs = {
    "(": ")",
    "<": ">",
    "{": "}",
  };
  if (!(trigger in pairs)) {
    return -1;
  }
  const left = "\\" + trigger;
  const right = "\\" + pairs[trigger as "(" | "<" | "{"];
  const expStr =
    `${name}${left}(([^${left}${right}]*)|(${left}[^${left}${right}]*${right}))*$`;
  const pos = line.search(expStr);
  if (pos != -1) {
    return pos;
  }
  return line.search(name + left);
}

export function getFunctionName(
  triggers: string[],
  label: string,
): [string, string] | null {
  // make regexp from triggerCharacters
  const triggerExp = triggers.map((c) => "\\" + c).join("|");
  const newExp = "^(\\w*)(" + triggerExp + ")";

  const matches = label.match(newExp);
  if (matches && matches.length == 3) {
    return [matches[1], matches[2]];
  } else {
    return null;
  }
}

export class SigHelpHandler {
  private float = new Float();
  private winName = "ddc_nvim_lsp_doc_sighelp_winid";
  private prevItem: SignatureHelp = {} as SignatureHelp;

  onInsertEnter() {
    this.prevItem = {} as SignatureHelp;
  }

  async requestSighelp(denops: Denops, triggers: string[]) {
    denops.call(
      "luaeval",
      "require('ddc_nvim_lsp_doc.helper').get_signature_help(_A.arg)",
      { arg: { triggers: triggers } },
    );
  }

  async closeWin(denops: Denops) {
    this.float.closeWin(denops);
  }

  private isSameSignature(item: SignatureHelp) {
    if (!this.prevItem || !this.prevItem.signatures) return false;
    return this.prevItem.signatures[0].label == item.signatures[0].label;
  }

  private isSamePosition(item: SignatureHelp) {
    const isSame = item.activeSignature == this.prevItem.activeSignature &&
      item.activeParameter == this.prevItem.activeParameter;
    return isSame;
  }

  // return floating windows column offset from cursor position
  private async calcWinPos(
    denops: Denops,
    info: SighelpResponce,
  ): Promise<number> {
    const label = info.help.signatures[0].label;
    const cursorCol = await fn.col(denops, ".");
    const match = getFunctionName(info.triggers, label);
    if (!match) {
      return 0;
    }
    const [name, trigger] = match;
    const input = (await fn.getline(denops, ".")).slice(0, cursorCol - 1);
    const labelIdx = findLabel(input, name, trigger);
    if (labelIdx == -1) {
      return 0;
    }
    return labelIdx - input.length;
  }

  async showSignatureHelp(
    denops: Denops,
    info: SighelpResponce,
    config: SignatureConfig,
  ): Promise<void> {
    info.lines = trimLines(info.lines);
    const mode = await fn.mode(denops);
    // if allow select mode, vsnip's jump becomes unavailable
    if (!info.lines.length || mode.search(/^i/) == -1) {
      this.closeWin(denops);
      return;
    }

    if (this.isSameSignature(info.help)) {
      if (this.isSamePosition(info.help)) {
        return;
      } else {
        this.float.changeHighlight(denops, info.hl);
        this.prevItem = info.help;
        return;
      }
    }
    this.prevItem = info.help;

    const maxWidth = Math.min(
      await op.columns.get(denops),
      config.maxWidth,
    );
    const maxHeight = Math.min(
      (await fn.screenrow(denops) as number) - 1,
      config.maxHeight,
    );
    const col = await this.calcWinPos(denops, info);
    let floatingOpt: FloatOption = {
      relative: "cursor",
      anchor: "SW",
      style: "minimal",
      row: -2,
      col: col - 1,
      border: config.border,
    };
    this.float.showFloating(denops, {
      syntax: "markdown",
      lines: info.lines,
      floatOpt: floatingOpt,
      events: ["InsertLeave", "CursorMoved"],
      winName: this.winName,
      hl: info.hl,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
    });
  }
}
