local vim = vim
local api = vim.api

local is_new_handler = function(arg)
  -- For neovim 0.6 breaking changes
  -- https://github.com/neovim/neovim/pull/15504
  return vim.fn.has('nvim-0.6') and type(arg) == 'table'
end

local respond = function(type, item)
  api.nvim_call_function('denops#notify', {'ddc_nvim_lsp_doc', 'respond', {type, item}})
            -- `call denops#notify('${denops.name}', 'onEvent',["${event}"])`,
end

local get_resolved_item = function(arg)
  local item = arg.decoded
  vim.lsp.buf_request(0, 'completionItem/resolve', item, function(_, arg1, arg2)
    local res = is_new_handler(arg1) and arg1 or arg2
    if res then
    -- print(vim.inspect(res))
      respond("doc", {item = res, selected = arg.selected})
    end
  end)
end

local get_signature_help = function(arg)
  local params = vim.lsp.util.make_position_params()
  vim.lsp.buf_request(0, "textDocument/signatureHelp", params, function(_, arg1, arg2)
    local res = is_new_handler(arg1) and arg1 or arg2
    if res and res ~= 0 and res.signatures and res.signatures[1] then
      local ft = api.nvim_buf_get_option(0, 'filetype')
      local converted, hl = vim.lsp.util.convert_signature_help_to_markdown_lines(res, ft)
      respond("sighelp", {help = res, lines = converted, hl = hl, triggers = arg.triggers})
    else
      respond("sighelp", {help = res})
    end
  end)
end

local get_capabilities = function()
  for id, client in pairs(vim.lsp.buf_get_clients()) do
    if client.server_capabilities then
      return client.server_capabilities
    end
  end
  return nil
end

return {
  get_resolved_item = get_resolved_item,
  get_signature_help = get_signature_help,
  get_capabilities = get_capabilities,
}
