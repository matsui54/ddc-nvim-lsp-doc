# ddc-nvim-lsp-doc
Shows completion documentation and signature help from nvim-lsp.

![Peek 2021-08-20 13-21](https://user-images.githubusercontent.com/63794197/130178792-4173a7be-90f2-4130-a1c0-aeac8612ac1f.gif)

## features
- completion documentation
  - lsp information
  - vsnip snippets
  - `info` data of Vim completion item
If you want to add integration of other plugins, please create issue and let me know.

- Sinnature help
  - lsp information

## Required

### denops.vim
https://github.com/vim-denops/denops.vim

### ddc.vim
https://github.com/Shougo/ddc.vim

### ddc-nvim-lsp
https://github.com/Shougo/ddc-nvim-lsp

### neovim 0.5.0+

## Install
Use your favorite plugin manager.

## Configuration
For detail, please see help.
``` vim
call ddc_nvim_lsp_doc#enable()
```
