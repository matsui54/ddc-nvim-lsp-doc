import { autocmd, batch, Denops, fn, nvimFn, once, vars } from "./deps.ts";
import { FloatOption, OpenFloatOptions, PopupPos } from "./types.ts";

export class Float {
  async closeWin(denops: Denops, name: string): Promise<void> {
    denops.call(
      "luaeval",
      "require('ddc_nvim_lsp_doc.hover').close_win(_A.arg)",
      { arg: name },
    );
  }

  async makeFloatingwinSize(
    lines: string[],
    opts: OpenFloatOptions,
  ): Promise<[number, number]> {
    let maxWidth = 0, height = 0;
    for (const line of lines) {
      const len = line.length;
      maxWidth = Math.max(maxWidth, len);
      if (len > opts.maxWidth) {
        height += Math.floor(len / opts.maxWidth);
      } else height++;
    }
    maxWidth = Math.min(opts.maxWidth, maxWidth);
    height = Math.min(opts.maxHeight, height);
    return [maxWidth, height];
  }

  async setBuf(
    denops: Denops,
    opts: OpenFloatOptions,
  ): Promise<[number, number, number]> {
    const floatBufnr = await nvimFn.nvim_create_buf(
      denops,
      false,
      true,
    ) as number;
    let width: number, height: number;
    if (opts.syntax == "markdown") {
      const contents = await denops.call(
        "luaeval",
        "vim.lsp.util.stylize_markdown(_A.buf, _A.line, _A.opts)",
        {
          buf: floatBufnr,
          line: opts.lines,
          opts: {
            max_height: opts.maxWidth,
            max_width: opts.maxHeight,
            wrap_at: opts.wrapAt,
            pad_right: 3,
          },
        },
      ) as string[];
      [width, height] = await this.makeFloatingwinSize(contents, opts);
    } else {
      await nvimFn.nvim_buf_set_lines(
        denops,
        floatBufnr,
        0,
        -1,
        true,
        opts.lines,
      );
      [width, height] = await this.makeFloatingwinSize(opts.lines, opts);
    }
    return [floatBufnr, width, height];
  }

  async showFloating(
    denops: Denops,
    opts: OpenFloatOptions,
  ): Promise<void> {
    const [floatBufnr, width, height] = await this.setBuf(denops, opts);
    opts.floatOpt.width = width;
    opts.floatOpt.height = height;

    const floatWinnr = await nvimFn.nvim_open_win(
      denops,
      floatBufnr,
      false,
      opts.floatOpt,
    );
    await this.closeWin(denops, opts.winName);

    batch(denops, async (denops) => {
      vars.buffers.set(denops, opts.winName, floatWinnr);
      if (opts.syntax == "markdown") {
        await nvimFn.nvim_win_set_option(denops, floatWinnr, "conceallevel", 2);
        await nvimFn.nvim_win_set_option(
          denops,
          floatWinnr,
          "concealcursor",
          "n",
        );
      }
      await nvimFn.nvim_win_set_option(denops, floatWinnr, "wrap", true);
      await nvimFn.nvim_win_set_option(denops, floatWinnr, "foldenable", false);

      await nvimFn.nvim_buf_set_option(denops, floatBufnr, "modifiable", false);
      await nvimFn.nvim_buf_set_option(denops, floatBufnr, "bufhidden", "wipe");
      await denops.call(
        "luaeval",
        "vim.lsp.util.close_preview_autocmd(_A.events, _A.win)",
        { events: opts.events, win: floatWinnr },
      );
      if (opts.hl) {
        console.log(opts.hl);
        await nvimFn.nvim_buf_add_highlight(
          denops,
          floatBufnr,
          -1,
          "LspSignatureActiveParameter",
          0,
          ...opts.hl,
        );
      }
    });
    // denops.call(
    //   "luaeval",
    //   "require('ddc_nvim_lsp_doc.hover').show_float_win(_A.opts)",
    //   { opts: opts },
    // );
  }
}
