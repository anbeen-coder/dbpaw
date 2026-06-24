import { describe, test, expect } from "bun:test";
import { COMMANDS } from "./commands";
import { invokeMock } from "./mocks";

describe("api/mock contract", () => {
  test("every COMMANDS value has a mock handler", async () => {
    const allCommands = Object.values(COMMANDS);
    const unmocked: string[] = [];

    for (const cmd of allCommands) {
      try {
        await invokeMock(cmd, {});
      } catch (e) {
        if (e instanceof Error && e.message.includes("Unknown command")) {
          unmocked.push(cmd);
        }
      }
    }

    expect(unmocked).toEqual([]);
  });

  test("COMMANDS has no duplicate values", () => {
    const values = Object.values(COMMANDS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
