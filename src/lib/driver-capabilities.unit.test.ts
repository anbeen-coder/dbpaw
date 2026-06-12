import { describe, it, expect } from "bun:test";
import {
  decodeCapabilities,
  EMPTY_CAPABILITIES,
  CAPABILITY_FLAGS,
} from "./driver-capabilities";

describe("decodeCapabilities", () => {
  it("decodes 0 to all false", () => {
    expect(decodeCapabilities(0)).toEqual(EMPTY_CAPABILITIES);
  });

  it("decodes single ROUTINES flag", () => {
    const result = decodeCapabilities(CAPABILITY_FLAGS.routines);
    expect(result.routines).toBe(true);
    expect(result.events).toBe(false);
    expect(result.sequences).toBe(false);
    expect(result.types).toBe(false);
    expect(result.synonyms).toBe(false);
    expect(result.packages).toBe(false);
    expect(result.foreignKeys).toBe(false);
    expect(result.queryWithId).toBe(false);
  });

  it("decodes multiple flags", () => {
    const bits =
      CAPABILITY_FLAGS.routines |
      CAPABILITY_FLAGS.events |
      CAPABILITY_FLAGS.sequences;
    const result = decodeCapabilities(bits);
    expect(result.routines).toBe(true);
    expect(result.events).toBe(true);
    expect(result.sequences).toBe(true);
    expect(result.types).toBe(false);
    expect(result.synonyms).toBe(false);
    expect(result.packages).toBe(false);
    expect(result.foreignKeys).toBe(false);
    expect(result.queryWithId).toBe(false);
  });

  it("decodes all flags", () => {
    const allBits =
      CAPABILITY_FLAGS.routines |
      CAPABILITY_FLAGS.events |
      CAPABILITY_FLAGS.sequences |
      CAPABILITY_FLAGS.types |
      CAPABILITY_FLAGS.synonyms |
      CAPABILITY_FLAGS.packages |
      CAPABILITY_FLAGS.foreignKeys |
      CAPABILITY_FLAGS.queryWithId;
    expect(decodeCapabilities(allBits)).toEqual({
      routines: true,
      events: true,
      sequences: true,
      types: true,
      synonyms: true,
      packages: true,
      foreignKeys: true,
      queryWithId: true,
    });
  });
});
