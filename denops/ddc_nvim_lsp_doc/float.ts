import { autocmd, batch, Denops, fn, nvimFn, once, vars } from "./deps.ts";
import { FloatOption, OpenFloatOptions, PopupPos, WinKind } from "./types.ts";

export class Float {
  private kind: WinKind;

  constructor(kind: WinKind) {
    this.kind = kind;
  }

  async closeWin(denops: Denops): Promise<void> {
    await denops.call(
      "ddc_nvim_lsp_doc#helper#close_floating",
      { kind: this.kind },
    );
  }

  async showFloating(
    denops: Denops,
    opts: OpenFloatOptions,
  ): Promise<void> {
    opts.kind = this.kind;
    await denops.call("ddc_nvim_lsp_doc#helper#show_floating", opts);
  }
}
