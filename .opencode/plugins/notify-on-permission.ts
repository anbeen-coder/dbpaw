import type { Plugin } from "@opencode-ai/plugin"
import { execFile } from "child_process"

function notify(title: string, message: string) {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  execFile("osascript", [
    "-e",
    `display notification "${esc(message)}" with title "${esc(title)}" sound name "Submarine"`,
  ])
}

export default (async () => {
  return {
    "permission.ask": async (input) => {
      const { type, pattern, title } = input
      const detail = pattern
        ? ` [${Array.isArray(pattern) ? pattern.join(", ") : pattern}]`
        : ""
      notify("opencode - 需要授权", `${title || type}${detail}`)
    },
  }
}) satisfies Plugin
