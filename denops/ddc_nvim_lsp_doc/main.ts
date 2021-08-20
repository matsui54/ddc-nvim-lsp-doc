import { autocmd, Denops } from "./deps.ts";
import { Hover } from "./hover.ts";

export async function main(denops: Denops) {
  const hover = new Hover();

  denops.dispatcher = {
    async enable(_): Promise<void> {
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
    },

    async onEvent(arg1: unknown): Promise<void> {
      const event = arg1 as autocmd.AutocmdEvent;
      hover.onEvent(denops, event);
    },
  };
}
