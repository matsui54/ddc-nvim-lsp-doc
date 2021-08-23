import { log } from "./deps.ts";

await log.setup({
  handlers: {
    file: new log.handlers.FileHandler("DEBUG", {
      filename: "/home/denjo/work/denops/log.txt",
      // you can change format of output message using any keys in `LogRecord`.
      formatter: "{levelName} {msg}",
    }),
  },

  loggers: {
    // configure default logger available via short-hand methods above.
    default: {
      level: "DEBUG",
      handlers: ["file"],
    },
  },
});
const Logger = log.getLogger();
Logger.info("foo");
export { Logger };
