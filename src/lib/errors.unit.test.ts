import { describe, it, expect } from "bun:test";
import { parseError, getFriendlyErrorMessage } from "./errors";

describe("parseError", () => {
  it("should parse connection error with hint", () => {
    const result = parseError("[ERR-1001] connection refused (check network)");
    expect(result.code).toBe(1001);
    expect(result.message).toBe("connection refused");
    expect(result.hint).toBe("check network");
    expect(result.category).toBe("connection");
  });

  it("should parse connection error without hint", () => {
    const result = parseError("[ERR-1002] connection timed out");
    expect(result.code).toBe(1002);
    expect(result.message).toBe("connection timed out");
    expect(result.hint).toBeUndefined();
    expect(result.category).toBe("connection");
  });

  it("should parse query error", () => {
    const result = parseError("[ERR-2001] syntax error near SELECT");
    expect(result.code).toBe(2001);
    expect(result.category).toBe("query");
  });

  it("should parse validation error", () => {
    const result = parseError("[ERR-3001] host cannot be empty");
    expect(result.code).toBe(3001);
    expect(result.category).toBe("validation");
  });

  it("should parse AI error", () => {
    const result = parseError("[ERR-4001] provider not configured");
    expect(result.code).toBe(4001);
    expect(result.category).toBe("ai");
  });

  it("should parse unsupported error", () => {
    const result = parseError("[ERR-5001] routines not supported");
    expect(result.code).toBe(5001);
    expect(result.category).toBe("unsupported");
  });

  it("should handle non-AppError strings", () => {
    const result = parseError("some random error");
    expect(result.code).toBe(0);
    expect(result.message).toBe("some random error");
    expect(result.category).toBe("internal");
  });

  it("should handle empty string", () => {
    const result = parseError("");
    expect(result.code).toBe(0);
    expect(result.message).toBe("");
    expect(result.category).toBe("internal");
  });
});

describe("getFriendlyErrorMessage", () => {
  it("should format connection error with hint", () => {
    const msg = getFriendlyErrorMessage("[ERR-1001] timeout (check network)");
    expect(msg).toBe("Connection failed: timeout. check network");
  });

  it("should format connection error without hint", () => {
    const msg = getFriendlyErrorMessage("[ERR-1002] connection timed out");
    expect(msg).toBe("Connection failed: connection timed out");
  });

  it("should format query error", () => {
    const msg = getFriendlyErrorMessage("[ERR-2001] syntax error");
    expect(msg).toBe("Query failed: syntax error");
  });

  it("should format validation error", () => {
    const msg = getFriendlyErrorMessage("[ERR-3001] invalid input");
    expect(msg).toBe("Validation error: invalid input");
  });

  it("should return original message for non-AppError", () => {
    const msg = getFriendlyErrorMessage("something went wrong");
    expect(msg).toBe("something went wrong");
  });
});
