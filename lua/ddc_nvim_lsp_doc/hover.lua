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
    if res then
    -- print(vim.inspect(res))
      respond(callback, res)
    end
  end)
end

local get_signature_help = function(_, callback)
  local params = vim.lsp.util.make_position_params()
  vim.lsp.buf_request(0, "textDocument/signatureHelp", params, function(_, _, res)
    if res then
      local ft = api.nvim_buf_get_option(0, 'filetype')
      local converted, hl = vim.lsp.util.convert_signature_help_to_markdown_lines(res, ft)
      respond(callback, {help = res, lines = converted, hl = hl})
    end
  end)
end

local close_win = function(win_name)
  local existing_float = vim.b[win_name]
  if existing_float and api.nvim_win_is_valid(existing_float) then
    api.nvim_win_close(existing_float, true)
  end
end

return {
  is_lsp_active = is_lsp_active,
  get_resolved_item = get_resolved_item,
  get_signature_help = get_signature_help,
  close_win = close_win,
}
