let s:Buffer = vital#ddc_nvim_lsp_doc#import('VS.Vim.Buffer')
let s:MarkupContent = vital#ddc_nvim_lsp_doc#import('VS.LSP.MarkupContent')
let s:Markdown = vital#ddc_nvim_lsp_doc#import('VS.Vim.Syntax.Markdown')
let s:FloatingWindow = vital#ddc_nvim_lsp_doc#import('VS.Vim.Window.FloatingWindow')

function! s:init() abort
  let s:doc_win = s:FloatingWindow.new()
  let s:sighelp_win = s:FloatingWindow.new()
  let s:match = -1
  call s:doc_win.set_bufnr(s:Buffer.create())
  call s:sighelp_win.set_bufnr(s:Buffer.create())
  call setbufvar(s:doc_win.get_bufnr(), '&buflisted', 0)
  call setbufvar(s:sighelp_win.get_bufnr(), '&buflisted', 0)
endfunction

function! s:get_win(kind) abort
  if a:kind == 'doc'
    return s:doc_win
  elseif a:kind == 'sighelp'
    return s:sighelp_win
  endif
endfunction

function! s:get_buf() abort
  let buf = s:Buffer.create()
  call setbufvar(buf., '&buflisted', 0)
endfunction

function! ddc_nvim_lsp_doc#helper#normalize_markdown(contents) abort
  let lines = s:MarkupContent.normalize(a:contents)
  return map(split(lines, "\n"), 'v:val !=# "" ? " " . v:val . " " : ""')
endfunction

" kind: "doc" | "sighelp"
function! ddc_nvim_lsp_doc#helper#close_floating(opts) abort
  let win = s:get_win(a:opts.kind)
  call win.close()
endfunction

" kind: "doc" | "sighelp"
" syntax: string;
" lines: string[];
" floatOpt: FloatOption;
" events: autocmd.AutocmdEvent[];
" winName: string;
" hl?: [number, number];
" wrapAt?: number;
" maxWidth: number;
" maxHeight: number;
function! ddc_nvim_lsp_doc#helper#show_floating(opts) abort
  let opts = a:opts
  let win = s:get_win(opts.kind)
  call win.set_bufnr(s:Buffer.create())
  let bufnr = win.get_bufnr()
  call setbufline(bufnr, 1, opts.lines)
  if s:match != -1
    call matchdelete(s:match)
    let s:match = -1
  endif
  if opts.syntax == 'markdown'
    call s:Buffer.do(bufnr, { -> s:apply_highlight(opts) })
  endif
  call setbufvar(bufnr, '&modified', 0)
  call setbufvar(bufnr, '&buflisted', 0)
  call setbufvar(bufnr, '&buftype', 'nofile')
  call setbufvar(bufnr, '&bufhidden', 'hide')
  call setbufvar(bufnr, '&swapfile', 0)

  let size = win.get_size({ 'wrap': v:true, 'maxwidth': opts.maxWidth, 'maxheight': opts.maxHeight})
  let win_opts = opts.floatOpt
  let win_opts.width = size.width
  let win_opts.height = size.height
  let win_opts.border = v:false
  if win_opts.relative == 'win'
    let win_opts.row = max([win_opts.row - size.height, 0])
  endif
  " echomsg opts.kind opts.floatOpt.col opts.floatOpt.row

  call win.open(win_opts)
  call win.set_var("&conceallevel", 2)
  call win.set_var("&wrap", 1)
  call win.set_var("&foldenable", 0)
  if len(opts.events)
    execute printf("autocmd %s <buffer> ++once call ddc_nvim_lsp_doc#helper#close_floating({'kind': '%s'})",
          \ join(opts.events, ','), opts.kind)
  endif
endfunction

call s:init()

function! s:apply_highlight(opts) abort
  let opts = a:opts
  call s:Markdown.apply({ 'text': getline('^', '$') })
  if has_key(opts, 'hl')
    echomsg opts.hl
    let s:match = matchaddpos('LspSignatureActiveParameter', [[2, opts.hl[0] + 1, opts.hl[1]-opts.hl[0] + 1]])
  endif
endfunction
