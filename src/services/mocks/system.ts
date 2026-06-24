import { COMMANDS } from "../commands";
import type { CommandMap, CommandArgs, CommandReturn } from "../commands";

type SystemCommand = Extract<keyof CommandMap, "list_system_fonts">;

export function handleSystem<T extends SystemCommand>(
  cmd: T,
  _args: CommandArgs<T>,
): Promise<CommandReturn<T>> | null {
  switch (cmd) {
    case COMMANDS.LIST_SYSTEM_FONTS:
      return Promise.resolve([
        "Arial",
        "Helvetica",
        "Times New Roman",
        "Courier New",
        "Georgia",
        "Verdana",
        "Trebuchet MS",
        "Arial Black",
        "Impact",
        "Lucida Console",
        "Monaco",
        "Menlo",
        "SF Pro Text",
        "SF Mono",
        "PingFang SC",
        "Microsoft YaHei",
        "SimSun",
        "SimHei",
      ]) as Promise<CommandReturn<T>>;
    default:
      return null;
  }
}
