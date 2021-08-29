let s:root_dir = fnamemodify(expand('<sfile>'), ':h:h')

function! ddc_nvim_lsp_doc#enable() abort
  if exists('g:ddc_nvim_lsp_doc#_initialized')
    call denops#notify('ddc_nvim_lsp_doc', 'enable', [])
    return
  endif

  augroup ddcNvimLspDoc
    autocmd!
  augroup END

  if exists('g:loaded_denops')
    silent! call s:register()
  else
    autocmd ddcNvimLspDoc User DenopsReady silent! call s:register()
  endif
endfunction

function! ddc_nvim_lsp_doc#disable() abort
  augroup ddcNvimLspDoc
    autocmd!
  augroup END
endfunction

function! s:register() abort
  call denops#plugin#register('ddc_nvim_lsp_doc',
        \ denops#util#join_path(s:root_dir, 'denops', 'ddc_nvim_lsp_doc', 'app.ts'))
endfunction
