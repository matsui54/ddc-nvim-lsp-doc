local vim = vim
local api = vim.api

local is_lsp_active = function()
  return #vim.lsp.get_active_clients() == 0
end

local respond = function(callback, item)
  api.nvim_call_function('denops#request', {'ddc_nvim_lsp_doc', callback, {item}})
end

local get_resolved_item = function(arg, callback)
  local item = arg[1]
  vim.lsp.buf_request(0, 'completionItem/resolve', item, function(_, _, res)
    -- print(vim.inspect(res))
    respond(callback, res)
  end)
end

local get_signature_help = function(_, callback)
  local params = vim.lsp.util.make_position_params()
  vim.lsp.buf_request(0, "textDocument/signatureHelp", params, function(_, _, res)
    local converted, hl = '', ''
    if res then
      local ft = api.nvim_buf_get_option(0, 'filetype')
      converted, hl = vim.lsp.util.convert_signature_help_to_markdown_lines(res, ft)
    end
    respond(callback, {help = res, lines = converted, hl = hl})
  end)
end

local close_win = function(win_name)
  local existing_float = vim.b[win_name]
  if existing_float and api.nvim_win_is_valid(existing_float) then
    api.nvim_win_close(existing_float, true)
  end
end

local show_float_win = function(opts)
  local floating_bufnr = api.nvim_create_buf(false, true)
  if floating_bufnr == 0 then return end
  if opts.syntax == "markdown" then
    vim.lsp.util.stylize_markdown(floating_bufnr, opts.lines)
  else
    api.nvim_buf_set_lines(floating_bufnr, 0, -1, true, opts.lines)
  end

  -- First, show window, then close remaining window to avoid flicker
  local floating_winnr = api.nvim_open_win(floating_bufnr, false, opts.floatOpt)
  close_win(opts.winName)

  api.nvim_buf_set_var(0, opts.winName, floating_winnr)
  if opts.syntax == "markdown" then
    api.nvim_win_set_var(floating_winnr, "conceallevel", 2);
    api.nvim_win_set_var(floating_winnr, "concealcursor", "n")
  end
  api.nvim_win_set_var(floating_winnr, "foldenable", false);
  api.nvim_win_set_var(floating_winnr, "modifiable", false);
  api.nvim_win_set_var(floating_winnr, "bufhidden", "wipe");
  vim.lsp.util.close_preview_autocmd(opts.events, floating_winnr)
  if opts.hl then
    api.nvim_buf_add_highlight(floating_bufnr, -1, "LspSignatureActiveParameter", 0, unpack(opts.hl))
  end
end

return {
  is_lsp_active = is_lsp_active,
  show_float_win = show_float_win,
  get_resolved_item = get_resolved_item,
  get_signature_help = get_signature_help,
  close_win = close_win,
}
