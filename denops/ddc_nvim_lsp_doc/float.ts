import { batch, Denops, nvimFn } from "./deps.ts";
import { OpenFloatOptions } from "./types.ts";
import Mutex from "./mutex.ts";

export class Float {
  private winid = -1;
  private bufnr = -1;
  private mutex = new Mutex();

  async closeWin(denops: Denops): Promise<void> {
    const id = await this.mutex.acquire();
    if (!id) return;
    if (await this.winExists(denops)) {
      await nvimFn.nvim_win_close(denops, this.winid, true);
    }
    this.winid = -1;
    this.mutex.release(id);
  }

  private async winExists(denops: Denops): Promise<boolean> {
    return this.winid != -1 &&
      await nvimFn.nvim_win_is_valid(denops, this.winid) as boolean;
  }

  private async bufExists(denops: Denops): Promise<boolean> {
    return this.bufnr != -1 &&
      await nvimFn.nvim_buf_is_valid(denops, this.bufnr) as boolean;
  }

  private makeFloatingwinSize(
    lines: string[],
    opts: OpenFloatOptions,
  ): [number, number] {
    let maxWidth = 0, height = 0;
    lines.map((line) => maxWidth = Math.max(maxWidth, line.length));
    const width = Math.min(maxWidth, opts.maxWidth);

    for (const line of lines) {
      height += Math.floor(line.length / width) + 1;
    }
    height = Math.min(opts.maxHeight, height);
    return [width, height];
  }

  private async getNamespace(denops: Denops): Promise<number> {
    return await nvimFn.nvim_create_namespace(
      denops,
      "ddc_nvim_lsp_doc",
    ) as number;
  }

  async changeHighlight(
    denops: Denops,
    newHl: [number, number] | undefined,
  ) {
    const id = await this.mutex.acquire();
    if (!id) return;
    if (!(await this.bufExists(denops))) {
      this.mutex.release(id);
      return;
    }
    await nvimFn.nvim_buf_clear_namespace(
      denops,
      this.bufnr,
      await this.getNamespace(denops),
      0,
      -1,
    );
    if (newHl) {
      await nvimFn.nvim_buf_add_highlight(
        denops,
        this.bufnr,
        await this.getNamespace(denops),
        "LspSignatureActiveParameter",
        0,
        ...newHl,
      );
    }
    this.mutex.release(id);
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
          },
        },
      ) as string[];
      [width, height] = this.makeFloatingwinSize(contents, opts);
    } else {
      await batch(denops, async (helper: Denops) => {
        await nvimFn.nvim_buf_set_lines(
          helper,
          floatBufnr,
          0,
          -1,
          true,
          opts.lines,
        );
        if (opts.syntax && opts.syntax != "plaintext") {
          await nvimFn.nvim_buf_set_option(
            denops,
            floatBufnr,
            "syntax",
            opts.syntax,
          );
        }
      });
      [width, height] = this.makeFloatingwinSize(opts.lines, opts);
    }
    return [floatBufnr, width, height];
  }

  async showFloating(
    denops: Denops,
    opts: OpenFloatOptions,
  ): Promise<void> {
    if (opts.floatOpt.border != "none") {
      opts.maxWidth -= 2;
      opts.maxHeight -= 2;
    }
    if (opts.maxWidth < 1 || opts.maxHeight < 1) {
      this.closeWin(denops);
      return;
    }

    const id = await this.mutex.acquire();
    if (!id) return;

    const [floatBufnr, width, height] = await this.setBuf(denops, opts);
    this.bufnr = floatBufnr;
    opts.floatOpt.width = width;
    opts.floatOpt.height = height;

    if (await this.winExists(denops)) {
      await nvimFn.nvim_win_set_config(denops, this.winid, opts.floatOpt);
      await nvimFn.nvim_win_set_buf(denops, this.winid, floatBufnr);
    } else {
      const winid = await nvimFn.nvim_open_win(
        denops,
        floatBufnr,
        false,
        opts.floatOpt,
      ) as number;
      if (!winid) {
        this.mutex.release(id);
        return;
      }
      this.winid = winid;
    }

    const nsId = await this.getNamespace(denops);
    const floatWinnr = this.winid;
    await batch(denops, async (denops) => {
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
        await nvimFn.nvim_buf_clear_namespace(denops, floatBufnr, nsId, 0, -1);
        await nvimFn.nvim_buf_add_highlight(
          denops,
          floatBufnr,
          nsId,
          "LspSignatureActiveParameter",
          0,
          ...opts.hl,
        );
      }
    });
    this.mutex.release(id);
  }
}
