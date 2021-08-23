local vim = vim
local api = vim.api

local is_lsp_active = function()
  return #vim.lsp.get_active_clients() == 0
end

local respond = function(type, item)
  api.nvim_call_function('denops#notify', {'ddc_nvim_lsp_doc', 'respond', {type, item}})
            -- `call denops#notify('${denops.name}', 'onEvent',["${event}"])`,
end

local get_resolved_item = function(arg)
  local item = arg.decoded
  vim.lsp.buf_request(0, 'completionItem/resolve', item, function(_, _, res)
    if res then
    -- print(vim.inspect(res))
      respond("doc", {item = res, selected = arg.selected})
    end
  end)
end

local get_signature_help = function(arg)
  local params = vim.lsp.util.make_position_params()
  vim.lsp.buf_request(0, "textDocument/signatureHelp", params, function(_, _, res)
    if res then
      local ft = api.nvim_buf_get_option(0, 'filetype')
      local converted, hl = vim.lsp.util.convert_signature_help_to_markdown_lines(res, ft)
      respond("sighelp", {help = res, lines = converted, hl = hl, startpos = arg.col})
    end
  end)
end

local close_win = function(winid)
  if winid ~= -1 and api.nvim_win_is_valid(winid) then
    api.nvim_win_close(winid, true)
  end
end

local get_capabilities = function()
  for id, client in pairs(vim.lsp.buf_get_clients()) do
    if client.resolved_capabilities then
      return client.resolved_capabilities
    end
  end
  return nil
end

return {
  is_lsp_active = is_lsp_active,
  get_resolved_item = get_resolved_item,
  get_signature_help = get_signature_help,
  close_win = close_win,
  get_capabilities = get_capabilities,
}
