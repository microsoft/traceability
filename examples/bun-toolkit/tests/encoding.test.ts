import { test, expect, describe } from "bun:test";
import { base64url } from "../src/encoding";

describe("Encoding Tests", () => {
  describe("string encoding with TextEncoder", () => {
    test("should encode string to base64url using TextEncoder", () => {
      const input = "Hellö Wörld, how are you doing today?!";
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const result = base64url.encode(data);
      const expected = "SGVsbMO2IFfDtnJsZCwgaG93IGFyZSB5b3UgZG9pbmcgdG9kYXk_IQ";
      
      expect(result).toBe(expected);
    });

    test("should encode string to regular base64 using TextEncoder", () => {
      const input = "Hello World!";
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const result = btoa(String.fromCharCode(...data));
      const expected = "SGVsbG8gV29ybGQh";
      
      expect(result).toBe(expected);
    });

    test("should handle empty string", () => {
      const input = "";
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const base64urlResult = base64url.encode(data);
      const base64Result = btoa(String.fromCharCode(...data));
      
      expect(base64urlResult).toBe("");
      expect(base64Result).toBe("");
    });

    test("should handle special characters and unicode", () => {
      const input = "🚀 Hello 世界! @#$%^&*()";
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const base64urlResult = base64url.encode(data);
      const base64Result = btoa(String.fromCharCode(...data));
      
      // Both should produce valid encodings
      expect(base64urlResult).toBeTruthy();
      expect(base64Result).toBeTruthy();
      
      // They should be different (base64url vs base64)
      expect(base64urlResult).not.toBe(base64Result);
    });

    test("should handle long strings", () => {
      const input = "A".repeat(1000);
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const base64urlResult = base64url.encode(data);
      const base64Result = btoa(String.fromCharCode(...data));
      
      expect(base64urlResult).toBeTruthy();
      expect(base64Result).toBeTruthy();
    });
  });

  describe("base64url encode/decode roundtrip", () => {
    test("should encode and decode Uint8Array correctly", () => {
      const original = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]);
      const encoded = base64url.encode(original);
      const decoded = base64url.decode(encoded);
      
      expect(decoded).toEqual(original);
    });

    test("should handle empty Uint8Array", () => {
      const original = new Uint8Array([]);
      const encoded = base64url.encode(original);
      const decoded = base64url.decode(encoded);
      
      expect(decoded).toEqual(original);
    });

    test("should handle single byte", () => {
      const original = new Uint8Array([65]); // 'A'
      const encoded = base64url.encode(original);
      const decoded = base64url.decode(encoded);
      
      expect(decoded).toEqual(original);
    });

    test("should handle two bytes", () => {
      const original = new Uint8Array([65, 66]); // 'AB'
      const encoded = base64url.encode(original);
      const decoded = base64url.decode(encoded);
      
      expect(decoded).toEqual(original);
    });

    test("should handle three bytes", () => {
      const original = new Uint8Array([65, 66, 67]); // 'ABC'
      const encoded = base64url.encode(original);
      const decoded = base64url.decode(encoded);
      
      expect(decoded).toEqual(original);
    });

    test("should handle four bytes (no padding needed)", () => {
      const original = new Uint8Array([65, 66, 67, 68]); // 'ABCD'
      const encoded = base64url.encode(original);
      const decoded = base64url.decode(encoded);
      
      expect(decoded).toEqual(original);
    });

    test("should handle binary data", () => {
      const original = new Uint8Array([0, 1, 2, 3, 255, 254, 253, 252]);
      const encoded = base64url.encode(original);
      const decoded = base64url.decode(encoded);
      
      expect(decoded).toEqual(original);
    });
  });

  describe("base64url vs base64 differences", () => {
    test("should use different character sets", () => {
      // Use a string that will produce + and / in base64 encoding
      const input = "Hello\xff\xfe\xfd";
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const base64urlResult = base64url.encode(data);
      const base64Result = btoa(String.fromCharCode(...data));
      
      // base64url should not contain +, /, or =
      expect(base64urlResult).not.toContain("+");
      expect(base64urlResult).not.toContain("/");
      expect(base64urlResult).not.toContain("=");
      
      // base64 should contain + and may contain = for padding
      expect(base64Result).toContain("+");
      expect(base64Result).toContain("/");
      expect(base64Result).toContain("=");
    });

    test("should produce different results for same input", () => {
      // Use a string that will produce + and / in base64 encoding
      const input = "Hello\xff\xfe\xfd";
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const base64urlResult = base64url.encode(data);
      const base64Result = btoa(String.fromCharCode(...data));
      
      expect(base64urlResult).not.toBe(base64Result);
    });
  });

  describe("integration with TextEncoder/TextDecoder and base64url", () => {
    test("should encode and decode strings correctly with TextEncoder/TextDecoder", () => {
      const input = "Hello World!";
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const encoded = base64url.encode(data);
      
      // Decode using base64url
      const decoded = base64url.decode(encoded);
      const decoder = new TextDecoder();
      const result = decoder.decode(decoded);
      
      expect(result).toBe(input);
    });

    test("should handle unicode strings correctly", () => {
      const input = "Hellö Wörld, how are you doing today?!";
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const encoded = base64url.encode(data);
      
      // Decode using base64url
      const decoded = base64url.decode(encoded);
      const decoder = new TextDecoder();
      const result = decoder.decode(decoded);
      
      expect(result).toBe(input);
    });
  });
});
