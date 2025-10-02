import { test, expect } from "bun:test";
import * as base64url from "../encoding/base64url";
import { parseJWS } from "../encoding/jws";

test("base64url encode and decode", () => {
  const testData = new TextEncoder().encode("Hello, World!");
  const encoded = base64url.encode(testData);
  const decoded = base64url.decode(encoded);

  expect(encoded).toBeDefined();
  expect(typeof encoded).toBe("string");
  expect(new TextDecoder().decode(decoded)).toBe("Hello, World!");
});

test("base64url encode handles special characters", () => {
  const testData = new TextEncoder().encode("Hello+World/Test=");
  const encoded = base64url.encode(testData);

  // base64url should not contain +, /, or = characters
  expect(encoded).not.toContain("+");
  expect(encoded).not.toContain("/");
  expect(encoded).not.toContain("=");

  const decoded = base64url.decode(encoded);
  expect(new TextDecoder().decode(decoded)).toBe("Hello+World/Test=");
});

test("base64url encode binary data", () => {
  const binaryData = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128]);
  const encoded = base64url.encode(binaryData);
  const decoded = base64url.decode(encoded);

  expect(encoded).toBeDefined();
  expect(typeof encoded).toBe("string");
  expect(decoded).toEqual(binaryData);
});

test("parseJWS with valid JWS", () => {
  const validJWS = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ";

  const parsed = parseJWS(validJWS);

  expect(parsed.header).toBeDefined();
  expect(parsed.payload).toBeDefined();
  expect(parsed.signature).toBeDefined();
  expect(parsed.header.alg).toBe("ES256");
  expect(parsed.header.typ).toBe("JWT");
  expect(parsed.payload.sub).toBe("1234567890");
  expect(parsed.payload.name).toBe("John Doe");
});

test("parseJWS with invalid format throws error", () => {
  expect(() => parseJWS("invalid")).toThrow("Invalid JWS format");
  expect(() => parseJWS("too.many.parts.here")).toThrow("Invalid JWS format");
  expect(() => parseJWS("")).toThrow("Invalid JWS format");
  expect(() => parseJWS("only.two")).toThrow("Invalid JWS format");
});

test.skip("createJWS not implemented", () => {
  // TODO: Implement createJWS function if needed
  expect(true).toBe(true);
});

test("base64url handles empty input", () => {
  const emptyData = new Uint8Array(0);
  const encoded = base64url.encode(emptyData);
  const decoded = base64url.decode(encoded);

  expect(encoded).toBe("");
  expect(decoded).toEqual(emptyData);
});

test("base64url handles unicode", () => {
  const unicodeText = "Hello 世界 🌍";
  const unicodeData = new TextEncoder().encode(unicodeText);
  const encoded = base64url.encode(unicodeData);
  const decoded = base64url.decode(encoded);

  expect(new TextDecoder().decode(decoded)).toBe(unicodeText);
});