import { autocmd, Denops, fn, vars } from "./deps.ts";
import { CompletionItem, SignatureHelp } from "./types.ts";
import { DocHandler } from "./documentation.ts";
import { SigHelpHandler } from "./signature.ts";
import { Config, makeConfig } from "./config.ts";

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
  private config: Config = {} as Config;
  private sighelpHandler = new SigHelpHandler();
  private docHandler = new DocHandler();
  private docTimer = 0;
  private capabilities = {} as ServerCapabilities;

  private async getCapabilities(denops: Denops) {
    this.capabilities = await denops.call(
      "luaeval",
      "require('ddc_nvim_lsp_doc.helper').get_capabilities()",
    ) as ServerCapabilities;
  }

  private onCompleteChanged(denops: Denops): void {
    // debounce
    clearTimeout(this.docTimer);
    this.docTimer = setTimeout(async () => {
      await this.docHandler.showCompleteDoc(denops, this.config.documentation);
    }, this.config.documentation.delay);
  }

  private async onInsertEnter(denops: Denops): Promise<void> {
    await this.getConfig(denops);
    if (!this.config.signature.enable) {
      return;
    }
    this.sighelpHandler.onInsertEnter();
    await this.getCapabilities(denops);
    if (this.capabilities && this.capabilities.signatureHelpProvider) {
      this.sighelpHandler.requestSighelp(denops, defaultTriggerCharacters);
    }
  }

  private async onInsertLeave(denops: Denops): Promise<void> {
    await this.sighelpHandler.closeWin(denops);
  }

  private async onTextChanged(denops: Denops): Promise<void> {
    if (
      !this.config.signature.enable ||
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

  async getConfig(denops: Denops): Promise<void> {
    const users = await vars.g.get(
      denops,
      "ddc_nvim_lsp_doc_config",
      {},
    ) as Config;
    this.config = makeConfig(users);
  }

  async onEvent(denops: Denops, event: autocmd.AutocmdEvent): Promise<void> {
    if (event == "InsertEnter") {
      this.onInsertEnter(denops);
    } else if (event == "InsertLeave") {
      this.onInsertLeave(denops);
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
    await this.docHandler.showLspDoc(
      denops,
      arg.item,
      this.config.documentation,
    );
  }

  async onSighelpResponce(denops: Denops, arg: SighelpResponce) {
    await this.sighelpHandler.showSignatureHelp(
      denops,
      arg,
      this.config.signature,
    );
  }
}
