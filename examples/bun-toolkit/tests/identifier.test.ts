import { test, expect, describe } from "bun:test";
import { createController } from "../src/controller/controller";
import type { Controller, ControllerWithKeys, VerificationMethod, Point, Address } from "../src/controller/controller";
import type { ES256, ES384 } from "../src/types";

// Helper functions for test data
const createTestGeometry = (): Point => ({
  type: "Point",
  coordinates: [-122.4194, 37.7749] // San Francisco coordinates
});

const createTestAddress = (): Address => ({
  streetAddress: "123 Main Street",
  addressLocality: "San Francisco",
  addressRegion: "CA",
  postalCode: "94102",
  addressCountry: "US"
});

describe("Controller Tests", () => {
  describe("createController with ES256", () => {
    test("should create a controller with valid structure", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs = ["https://supplier.example/geo/9q8yyk1", "https://supplier.example/geo/9q8yyk2"];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      // Test the returned structure
      expect(result).toHaveProperty("controller");
      expect(result).toHaveProperty("privateKey");
      expect(result).toHaveProperty("publicKey");
      
      // Test controller structure
      expect(result.controller).toHaveProperty("@context");
      expect(result.controller).toHaveProperty("id");
      expect(result.controller).toHaveProperty("alsoKnownAs");
      expect(result.controller).toHaveProperty("verificationMethod");
      expect(result.controller).toHaveProperty("assertionMethod");
      expect(result.controller).toHaveProperty("geometry");
      expect(result.controller).toHaveProperty("address");
    });

    test("should set correct context and id", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      expect(result.controller["@context"]).toEqual(["https://www.w3.org/ns/cid/v1", "https://geojson.org/geojson-ld/geojson-context.jsonld"]);
      expect(result.controller.id).toBe(id);
    });

    test("should set alsoKnownAs correctly", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs = ["https://supplier.example/geo/9q8yyk1", "https://supplier.example/geo/9q8yyk2", "https://supplier.example/geo/9q8yyk3"];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      expect(result.controller.alsoKnownAs).toEqual(alsoKnownAs);
    });

    test("should handle empty alsoKnownAs array", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      expect(result.controller.alsoKnownAs).toEqual([]);
    });

    test("should generate valid verification method", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      expect(result.controller.verificationMethod).toHaveLength(1);
      
      const verificationMethod = result.controller.verificationMethod[0]!;
      expect(verificationMethod).toHaveProperty("id");
      expect(verificationMethod).toHaveProperty("type");
      expect(verificationMethod).toHaveProperty("controller");
      expect(verificationMethod).toHaveProperty("publicKeyJwk");
      
      expect(verificationMethod.type).toBe("JsonWebKey");
      expect(verificationMethod.controller).toBe(id);
      expect(verificationMethod.id).toContain(id);
      expect(verificationMethod.id).toContain("#");
    });

    test("should set assertion method to verification method id", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      expect(result.controller.assertionMethod).toHaveLength(1);
      expect(result.controller.assertionMethod[0]).toBe(result.controller.verificationMethod[0]!.id);
    });

    test("should generate valid ES256 keys", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      // Test private key structure
      expect(result.privateKey).toHaveProperty("kid");
      expect(result.privateKey).toHaveProperty("kty", "EC");
      expect(result.privateKey).toHaveProperty("crv", "P-256");
      expect(result.privateKey).toHaveProperty("alg", "ES256");
      expect(result.privateKey).toHaveProperty("x");
      expect(result.privateKey).toHaveProperty("y");
      expect(result.privateKey).toHaveProperty("d");
      expect(result.privateKey).toHaveProperty("key_ops", ["sign"]);
      
      // Test public key structure
      expect(result.publicKey).toHaveProperty("kid");
      expect(result.publicKey).toHaveProperty("kty", "EC");
      expect(result.publicKey).toHaveProperty("crv", "P-256");
      expect(result.publicKey).toHaveProperty("alg", "ES256");
      expect(result.publicKey).toHaveProperty("x");
      expect(result.publicKey).toHaveProperty("y");
      expect(result.publicKey).toHaveProperty("key_ops", ["verify"]);
      
      // Keys should have same coordinates
      expect(result.privateKey.x).toBe(result.publicKey.x);
      expect(result.privateKey.y).toBe(result.publicKey.y);
      expect(result.privateKey.crv).toBe(result.publicKey.crv);
    });

    test("should use thumbprint in verification method id", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      const verificationMethod = result.controller.verificationMethod[0]!;
      const expectedId = `${id}#${result.publicKey.kid}`;
      
      expect(verificationMethod.id).toBe(expectedId);
    });
  });

  describe("createController with ES384", () => {
    test("should create a controller with ES384 algorithm", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES384");
      
      // Test private key structure for ES384
      expect(result.privateKey).toHaveProperty("crv", "P-384");
      expect(result.privateKey).toHaveProperty("alg", "ES384");
      
      // Test public key structure for ES384
      expect(result.publicKey).toHaveProperty("crv", "P-384");
      expect(result.publicKey).toHaveProperty("alg", "ES384");
    });

    test("should generate different keys for different calls", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result1 = await createController(id, alsoKnownAs, geometry, address, "ES384");
      const result2 = await createController(id, alsoKnownAs, geometry, address, "ES384");
      
      // Keys should be different
      expect(result1.privateKey.x).not.toBe(result2.privateKey.x);
      expect(result1.privateKey.y).not.toBe(result2.privateKey.y);
      expect(result1.privateKey.d).not.toBe(result2.privateKey.d);
      expect(result1.publicKey.kid).not.toBe(result2.publicKey.kid);
    });
  });

  describe("createController with default algorithm", () => {
    test("should default to ES256 when no algorithm specified", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address);
      
      expect(result.privateKey.alg).toBe("ES256");
      expect(result.privateKey.crv).toBe("P-256");
      expect(result.publicKey.alg).toBe("ES256");
      expect(result.publicKey.crv).toBe("P-256");
    });
  });

  describe("verification method validation", () => {
    test("should have valid JWK structure in verification method", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      const verificationMethod = result.controller.verificationMethod[0]!;
      const publicKeyJwk = verificationMethod.publicKeyJwk;
      
      // Should match the exported public key
      expect(publicKeyJwk).toEqual(result.publicKey);
    });

    test("should have unique verification method id", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result1 = await createController(id, alsoKnownAs, geometry, address, "ES256");
      const result2 = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      expect(result1.controller.verificationMethod[0]!.id).not.toBe(
        result2.controller.verificationMethod[0]!.id
      );
    });
  });

  describe("edge cases and error handling", () => {
    test("should handle special characters in id", async () => {
      const id = "https://supplier.example/geo/9q8yyk-special-chars_123";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      expect(result.controller.id).toBe(id);
      expect(result.controller.verificationMethod[0]!.controller).toBe(id);
    });

    test("should handle long alsoKnownAs arrays", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs = Array.from({ length: 100 }, (_, i) => `https://supplier.example/geo/9q8yyk${i.toString().padStart(2, '0')}`);
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      expect(result.controller.alsoKnownAs).toEqual(alsoKnownAs);
      expect(result.controller.alsoKnownAs).toHaveLength(100);
    });

    test("should handle unicode characters in alsoKnownAs", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs = ["https://supplier.example/geo/9q8yyk-测试", "https://supplier.example/geo/9q8yyk-тест", "https://supplier.example/geo/9q8yyk-🎯"];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      expect(result.controller.alsoKnownAs).toEqual(alsoKnownAs);
    });
  });

  describe("geometry and address functionality", () => {
    test("should include GeoJSON-LD context", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      expect(result.controller["@context"]).toContain("https://geojson.org/geojson-ld/geojson-context.jsonld");
    });

    test("should include valid Point geometry", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry: Point = {
        type: "Point",
        coordinates: [-74.0060, 40.7128] // New York coordinates
      };
      const address = createTestAddress();
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      expect(result.controller.geometry).toEqual(geometry);
      expect(result.controller.geometry.type).toBe("Point");
      expect(result.controller.geometry.coordinates).toHaveLength(2);
      expect(result.controller.geometry.coordinates[0]).toBe(-74.0060); // longitude
      expect(result.controller.geometry.coordinates[1]).toBe(40.7128);  // latitude
    });

    test("should include valid address information", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address: Address = {
        streetAddress: "456 Oak Avenue",
        addressLocality: "New York",
        addressRegion: "NY",
        postalCode: "10001",
        addressCountry: "US"
      };
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      expect(result.controller.address).toEqual(address);
      expect(result.controller.address.streetAddress).toBe("456 Oak Avenue");
      expect(result.controller.address.addressLocality).toBe("New York");
      expect(result.controller.address.addressRegion).toBe("NY");
      expect(result.controller.address.postalCode).toBe("10001");
      expect(result.controller.address.addressCountry).toBe("US");
    });

    test("should handle partial address information", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address: Address = {
        addressLocality: "San Francisco",
        addressCountry: "US"
      };
      
      const result = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      expect(result.controller.address).toEqual(address);
      expect(result.controller.address.addressLocality).toBe("San Francisco");
      expect(result.controller.address.addressCountry).toBe("US");
      expect(result.controller.address.streetAddress).toBeUndefined();
    });
  });

  describe("type safety", () => {
    test("should return correct TypeScript types", async () => {
      const id = "https://supplier.example/geo/9q8yyk";
      const alsoKnownAs: string[] = [];
      const geometry = createTestGeometry();
      const address = createTestAddress();
      
      const result: ControllerWithKeys = await createController(id, alsoKnownAs, geometry, address, "ES256");
      
      // These should compile without TypeScript errors
      const controller: Controller = result.controller;
      const verificationMethod: VerificationMethod = controller.verificationMethod[0]!;
      
      expect(typeof controller.id).toBe("string");
      expect(Array.isArray(controller.alsoKnownAs)).toBe(true);
      expect(Array.isArray(controller.verificationMethod)).toBe(true);
      expect(Array.isArray(controller.assertionMethod)).toBe(true);
      expect(controller.geometry.type).toBe("Point");
      expect(Array.isArray(controller.geometry.coordinates)).toBe(true);
      expect(controller.geometry.coordinates).toHaveLength(2);
    });
  });
});
