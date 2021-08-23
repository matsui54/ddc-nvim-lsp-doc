import { autocmd, batch, Denops, vars } from "./deps.ts";
import { DocResponce, EventHandler, SighelpResponce } from "./hover.ts";
import { Logger } from "./logger.ts";

export type ResponceType = "doc" | "sighelp";

export async function main(denops: Denops) {
  const handler = new EventHandler();

  denops.dispatcher = {
    async enable(_): Promise<void> {
      registerAutocmd(denops);
    },

    async onEvent(arg1: unknown): Promise<void> {
      const event = arg1 as autocmd.AutocmdEvent;
      handler.onEvent(denops, event);
    },

    async respond(arg1: unknown, arg2: unknown): Promise<void> {
      const type = arg1 as ResponceType;
      if (type == "doc") {
        handler.onDocResponce(denops, arg2 as DocResponce);
      } else {
        handler.onSighelpResponce(denops, arg2 as SighelpResponce);
      }
    },
  };

  async function registerAutocmd(denops: Denops): Promise<void> {
    await autocmd.group(
      denops,
      "ddcNvimLspDoc",
      (helper: autocmd.GroupHelper) => {
        helper.remove("*");
        for (
          const event of [
            "CompleteChanged",
            "InsertEnter",
            "TextChangedI",
            "TextChangedP",
          ] as autocmd.AutocmdEvent[]
        ) {
          helper.define(
            event,
            "*",
            `call denops#notify('${denops.name}', 'onEvent',["${event}"])`,
          );
        }
      },
    );
  }

  registerAutocmd(denops);
  await batch(denops, async (denops) => {
    await vars.g.set(denops, "ddc_nvim_lsp_doc#_initialized", 1);
  });
}
