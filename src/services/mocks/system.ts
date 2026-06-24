import { COMMANDS } from "../commands";

export function handleSystem(cmd: string, _args?: any): Promise<any> | null {
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
      ]);
    default:
      return null;
  }
}
