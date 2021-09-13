# ddc-nvim-lsp-doc
Shows completion documentation and signature help from nvim-lsp.


https://user-images.githubusercontent.com/63794197/132715049-a82dfc9f-df2d-49d8-934f-a59cd9e96fea.mp4

## features
- Completion documentation
  - lsp information
  - vsnip snippets
  - ultisnips snippets
  - `info` data of Vim completion item

If you want to add integration of other plugins, please create issue and let me know.

- Signature help
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
For detail, please see [help](doc/ddc_nvim_lsp_doc.txt).
``` vim
call ddc_nvim_lsp_doc#enable()
```
