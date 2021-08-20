function! ddc_nvim_lsp_doc#enable() abort
  call denops#notify('ddc_nvim_lsp_doc', 'enable', [])
endfunction

function! ddc_nvim_lsp_doc#disable() abort
  augroup ddcNvimLspDoc
    autocmd!
  augroup END
endfunction
