let s:root_dir = fnamemodify(expand('<sfile>'), ':h:h')
let s:is_enabled = 0

function! ddc_nvim_lsp_doc#enable() abort
  if denops#plugin#is_loaded('ddc_nvim_lsp_doc')
    return
  endif
  let s:is_enabled = 1

  augroup ddcNvimLspDoc
    autocmd!
  augroup END

  if exists('g:loaded_denops') && denops#server#status() ==# 'running'
    silent! call s:register()
  else
    autocmd ddcNvimLspDoc User DenopsReady silent! call s:register()
  endif
endfunction

function! ddc_nvim_lsp_doc#disable() abort
  let s:is_enabled = 0
  augroup ddcNvimLspDoc
    autocmd!
  augroup END
endfunction

function! s:register() abort
  call denops#plugin#register('ddc_nvim_lsp_doc',
        \ denops#util#join_path(s:root_dir, 'denops', 'ddc_nvim_lsp_doc', 'app.ts'))
endfunction

function! ddc_nvim_lsp_doc#is_enabled() abort
  return s:is_enabled
endfunction

function! s:denops_running() abort
  return exists('g:loaded_denops')
        \ && denops#server#status() ==# 'running'
        \ && denops#plugin#is_loaded('ddc_nvim_lsp_doc')
endfunction

function! ddc_nvim_lsp_doc#notify(method, arg) abort
  if s:denops_running()
    call denops#notify('ddc_nvim_lsp_doc', a:method, a:arg)
  endif
endfunction
