import { autocmd, Denops, fn, vars } from "./deps.ts";
import {
  CompleteInfo,
  CompletionItem,
  SignatureHelp,
  UserData,
} from "./types.ts";
import { DocHandler } from "./documentation.ts";
import { SigHelpHandler } from "./signature.ts";

interface ServerCapabilities {
  signatureHelpProvider?: SignatureHelpOptions;
}

export type SignatureHelpOptions = {
  triggerCharacters?: string[];
  retriggerCharacters?: string[];
};

export type DocResponce = {
  item: CompletionItem;
  selected: number;
};

export type SighelpResponce = {
  help: SignatureHelp;
  lines?: string[];
  hl?: [number, number];
  triggers: string[];
};

const defaultTriggerCharacters = [",", "(", "<", "["];
const triggerCloseCharacters = [")", ">", "]"];

export class EventHandler {
  private sighelpHandler = new SigHelpHandler();
  private docHandler = new DocHandler();
  private capabilities = {} as ServerCapabilities;
  private selected = -1;

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
    this.selected = info.selected;
    return decoded["lspitem"];
  }

  private async getCapabilities(denops: Denops) {
    this.capabilities = await denops.call(
      "luaeval",
      "require('ddc_nvim_lsp_doc.helper').get_capabilities()",
    ) as ServerCapabilities;
  }

  private async onCompleteChanged(denops: Denops): Promise<void> {
    if (
      !(await vars.g.get(denops, "ddc_nvim_lsp_doc#enable_documentation", 1))
    ) {
      return;
    }
    const decoded = await this.getDecodedCompleteItem(denops);
    if (!decoded) {
      this.docHandler.closeWin(denops);
      return;
    }

    if (decoded.documentation) {
      this.docHandler.showCompleteDoc(denops, decoded);
    } else {
      denops.call(
        "luaeval",
        "require('ddc_nvim_lsp_doc.helper').get_resolved_item(_A.arg)",
        { arg: { decoded: decoded } },
      );
    }
  }

  private async onInsertEnter(denops: Denops): Promise<void> {
    await this.getCapabilities(denops);
    if (this.capabilities && this.capabilities.signatureHelpProvider) {
      this.sighelpHandler.requestSighelp(denops, defaultTriggerCharacters);
    }
  }

  private async onTextChanged(denops: Denops): Promise<void> {
    if (
      !(await vars.g.get(denops, "ddc_nvim_lsp_doc#enable_signaturehelp", 1)) ||
      !this.capabilities || !this.capabilities.signatureHelpProvider
    ) {
      return;
    }
    let triggerCharacters = defaultTriggerCharacters;
    if (this.capabilities.signatureHelpProvider?.triggerCharacters) {
      triggerCharacters =
        this.capabilities.signatureHelpProvider.triggerCharacters;
    }
    const allTriggerChars = triggerCharacters.concat(triggerCloseCharacters);

    const cursorCol = await fn.col(denops, ".");
    const line = await fn.getline(denops, ".");
    if (
      allTriggerChars.includes(line[cursorCol - 2])
    ) {
      this.sighelpHandler.requestSighelp(denops, triggerCharacters);
    }
  }

  async onEvent(denops: Denops, event: autocmd.AutocmdEvent): Promise<void> {
    if (event == "InsertEnter") {
      this.onInsertEnter(denops);
      this.sighelpHandler.onInsertEnter();
    } else {
      if (!this.capabilities) {
        await this.getCapabilities(denops);
      }
      if (event == "CompleteChanged") {
        this.onCompleteChanged(denops);
      } else if (event == "TextChangedI" || event == "TextChangedP") {
        this.onTextChanged(denops);
      }
    }
  }

  async onDocResponce(denops: Denops, arg: DocResponce) {
    if (arg.selected != this.selected) {
      this.docHandler.showCompleteDoc(denops, arg.item);
    }
  }

  async onSighelpResponce(denops: Denops, arg: SighelpResponce) {
    this.sighelpHandler.showSignatureHelp(denops, arg);
  }
}
