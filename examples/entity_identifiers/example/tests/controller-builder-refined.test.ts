import { test, expect } from "bun:test";
import { key } from "../src";
import type { PublicKey } from "../src/types";

// Refined builder interface based on initial testing
interface ControllerBuilder {
  // Core identity
  id(id: string): ControllerBuilder;
  alsoKnownAs(...aliases: string[]): ControllerBuilder;

  // Keys - with better naming and key ID management
  addAssertionKey(publicKey: PublicKey, keyId?: string): ControllerBuilder;
  addAuthenticationKey(publicKey: PublicKey, keyId?: string): ControllerBuilder;
  addVerificationMethod(publicKey: PublicKey, capabilities: string[], keyId?: string): ControllerBuilder;

  // Location and address with better type safety
  location(longitude: number, latitude: number): ControllerBuilder;
  geometry(geometry: any): ControllerBuilder; // For more complex geometries
  address(addressData: Partial<AddressInfo>): ControllerBuilder;

  // Build and serialize with better return types
  build(): ControllerDocument;
  serialize(mediaType: "application/cid" | "application/json" | "application/ld+json"): string;

  // Utility methods
  clone(): ControllerBuilder; // For creating variations
  reset(): ControllerBuilder; // Start over
}

interface AddressInfo {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

interface ControllerDocument {
  "@context": string[];
  id: string;
  alsoKnownAs?: string[];
  verificationMethod: any[];
  assertionMethod: string[];
  authentication: string[];
  geometry?: any;
  address?: AddressInfo;
}

// Enhanced implementation with better key ID generation and validation
class EnhancedControllerBuilder implements ControllerBuilder {
  private data: ControllerDocument = {
    "@context": ["https://www.w3.org/ns/cid/v1", "https://geojson.org/geojson-ld/geojson-context.jsonld"],
    id: "",
    verificationMethod: [],
    assertionMethod: [],
    authentication: [],
  };

  id(id: string): ControllerBuilder {
    if (!id || !id.startsWith('https://')) {
      throw new Error("Controller ID must be a valid HTTPS URL");
    }
    this.data.id = id;
    return this;
  }

  alsoKnownAs(...aliases: string[]): ControllerBuilder {
    this.data.alsoKnownAs = [...(this.data.alsoKnownAs || []), ...aliases];
    return this;
  }

  addAssertionKey(publicKey: PublicKey, keyId?: string): ControllerBuilder {
    return this.addVerificationMethod(publicKey, ["assertionMethod"], keyId);
  }

  addAuthenticationKey(publicKey: PublicKey, keyId?: string): ControllerBuilder {
    return this.addVerificationMethod(publicKey, ["authentication"], keyId);
  }

  addVerificationMethod(publicKey: PublicKey, capabilities: string[], keyId?: string): ControllerBuilder {
    if (!this.data.id) {
      throw new Error("Controller ID must be set before adding verification methods");
    }

    // Use provided keyId, publicKey.kid, or generate one
    const finalKeyId = keyId || publicKey.kid || `key-${this.data.verificationMethod.length}`;
    const vmId = finalKeyId.includes('#') ? finalKeyId : `${this.data.id}#${finalKeyId}`;

    // Check for duplicate key IDs
    const existingIds = this.data.verificationMethod.map(vm => vm.id);
    if (existingIds.includes(vmId)) {
      throw new Error(`Verification method with ID ${vmId} already exists`);
    }

    this.data.verificationMethod.push({
      id: vmId,
      type: "JsonWebKey",
      controller: this.data.id,
      publicKeyJwk: publicKey
    });

    // Add to capability arrays
    if (capabilities.includes("assertionMethod")) {
      this.data.assertionMethod.push(vmId);
    }
    if (capabilities.includes("authentication")) {
      this.data.authentication.push(vmId);
    }

    return this;
  }

  location(longitude: number, latitude: number): ControllerBuilder {
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      throw new Error("Invalid coordinates: longitude must be [-180,180], latitude must be [-90,90]");
    }

    this.data.geometry = {
      type: "Point",
      coordinates: [longitude, latitude]
    };
    return this;
  }

  geometry(geometry: any): ControllerBuilder {
    // Basic validation for GeoJSON geometry
    if (!geometry.type || !geometry.coordinates) {
      throw new Error("Geometry must have 'type' and 'coordinates' properties");
    }
    this.data.geometry = geometry;
    return this;
  }

  address(addressData: Partial<AddressInfo>): ControllerBuilder {
    this.data.address = { ...this.data.address, ...addressData };
    return this;
  }

  build(): ControllerDocument {
    if (!this.data.id) {
      throw new Error("Controller ID is required");
    }

    // Clean up empty arrays
    const result = { ...this.data };
    if (result.alsoKnownAs && result.alsoKnownAs.length === 0) {
      delete result.alsoKnownAs;
    }

    return result;
  }

  serialize(mediaType: "application/cid" | "application/json" | "application/ld+json"): string {
    const controller = this.build();

    switch (mediaType) {
      case "application/cid":
        return JSON.stringify({
          mediaType: "application/cid",
          version: "1.0",
          timestamp: new Date().toISOString(),
          controller: controller
        }, null, 2);

      case "application/json":
        return JSON.stringify(controller, null, 2);

      case "application/ld+json":
        // Same as JSON for now, but could add JSON-LD specific processing
        return JSON.stringify(controller, null, 2);

      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }
  }

  clone(): ControllerBuilder {
    const newBuilder = new EnhancedControllerBuilder();
    newBuilder.data = JSON.parse(JSON.stringify(this.data));
    return newBuilder;
  }

  reset(): ControllerBuilder {
    this.data = {
      "@context": ["https://www.w3.org/ns/cid/v1", "https://geojson.org/geojson-ld/geojson-context.jsonld"],
      id: "",
      verificationMethod: [],
      assertionMethod: [],
      authentication: [],
    };
    return this;
  }
}

// Factory function
function createControllerBuilder(): ControllerBuilder {
  return new EnhancedControllerBuilder();
}

test("enhanced controller builder with validation", async () => {
  const assertionKey = await key.exportPublicKey(await key.generatePrivateKey("ES256"));

  const builder = createControllerBuilder()
    .id("https://manufacturer.example/supplier/123")
    .addAssertionKey(assertionKey, "primary-assertion")
    .location(-122.4194, 37.7749);

  const controller = builder.build();

  expect(controller.id).toBe("https://manufacturer.example/supplier/123");
  expect(controller.verificationMethod[0].id).toBe("https://manufacturer.example/supplier/123#primary-assertion");
  expect(controller.geometry.coordinates).toEqual([-122.4194, 37.7749]);
});

test("builder validation errors", async () => {
  const testKey = await key.exportPublicKey(await key.generatePrivateKey("ES256"));

  // Test invalid ID
  expect(() => createControllerBuilder().id("invalid-id")).toThrow("Controller ID must be a valid HTTPS URL");

  // Test adding key without ID
  expect(() => createControllerBuilder().addAssertionKey(testKey)).toThrow("Controller ID must be set before adding verification methods");

  // Test invalid coordinates
  expect(() => createControllerBuilder().id("https://test.example").location(200, 100)).toThrow("Invalid coordinates");

  // Test building without ID
  expect(() => createControllerBuilder().build()).toThrow("Controller ID is required");
});

test("builder clone and reset functionality", async () => {
  const testKey = await key.exportPublicKey(await key.generatePrivateKey("ES256"));

  const originalBuilder = createControllerBuilder()
    .id("https://original.example")
    .addAssertionKey(testKey);

  // Clone and modify
  const clonedBuilder = originalBuilder.clone()
    .id("https://cloned.example");

  const original = originalBuilder.build();
  const cloned = clonedBuilder.build();

  expect(original.id).toBe("https://original.example");
  expect(cloned.id).toBe("https://cloned.example");
  expect(cloned.verificationMethod).toHaveLength(1); // Cloned the key

  // Test reset
  const resetBuilder = originalBuilder.reset().id("https://reset.example");
  const reset = resetBuilder.build();

  expect(reset.id).toBe("https://reset.example");
  expect(reset.verificationMethod).toHaveLength(0); // Reset cleared keys
});

test("duplicate key ID prevention", async () => {
  const key1 = await key.exportPublicKey(await key.generatePrivateKey("ES256"));
  const key2 = await key.exportPublicKey(await key.generatePrivateKey("ES384"));

  const builder = createControllerBuilder()
    .id("https://test.example")
    .addAssertionKey(key1, "duplicate-id");

  // Should throw when adding second key with same ID
  expect(() => builder.addAuthenticationKey(key2, "duplicate-id"))
    .toThrow("Verification method with ID https://test.example#duplicate-id already exists");
});

test("complex geometry support", async () => {
  const testKey = await key.exportPublicKey(await key.generatePrivateKey("ES256"));

  const polygonGeometry = {
    type: "Polygon",
    coordinates: [[
      [-122.4, 37.7],
      [-122.4, 37.8],
      [-122.3, 37.8],
      [-122.3, 37.7],
      [-122.4, 37.7]
    ]]
  };

  const builder = createControllerBuilder()
    .id("https://facility.example")
    .addAssertionKey(testKey)
    .geometry(polygonGeometry);

  const controller = builder.build();
  expect(controller.geometry.type).toBe("Polygon");
  expect(controller.geometry.coordinates[0]).toHaveLength(5); // Closed polygon
});

test("application/cid serialization format", async () => {
  const testKey = await key.exportPublicKey(await key.generatePrivateKey("ES256"));

  const builder = createControllerBuilder()
    .id("https://test.example")
    .addAssertionKey(testKey);

  const cidSerialized = builder.serialize("application/cid");
  const parsed = JSON.parse(cidSerialized);

  expect(parsed.mediaType).toBe("application/cid");
  expect(parsed.version).toBe("1.0");
  expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/); // ISO timestamp
  expect(parsed.controller.id).toBe("https://test.example");
});

test("builder method chaining comprehensive example", async () => {
  const assertionKey1 = await key.exportPublicKey(await key.generatePrivateKey("ES256"));
  const assertionKey2 = await key.exportPublicKey(await key.generatePrivateKey("ES384"));
  const authKey = await key.exportPublicKey(await key.generatePrivateKey("ES256"));

  const controller = createControllerBuilder()
    .id("https://comprehensive.example/entity/001")
    .alsoKnownAs("https://alias1.example", "https://alias2.example")
    .alsoKnownAs("https://alias3.example")
    .addAssertionKey(assertionKey1, "primary-assertion")
    .addAssertionKey(assertionKey2, "backup-assertion")
    .addAuthenticationKey(authKey, "primary-auth")
    .location(-122.4194, 37.7749)
    .address({ streetAddress: "123 Main St" })
    .address({ addressLocality: "San Francisco", addressRegion: "CA" })
    .address({ postalCode: "94102", addressCountry: "US" })
    .build();

  // Verify all aspects
  expect(controller.id).toBe("https://comprehensive.example/entity/001");
  expect(controller.alsoKnownAs).toHaveLength(3);
  expect(controller.verificationMethod).toHaveLength(3);
  expect(controller.assertionMethod).toHaveLength(2);
  expect(controller.authentication).toHaveLength(1);
  expect(controller.geometry.coordinates).toEqual([-122.4194, 37.7749]);
  expect(controller.address.streetAddress).toBe("123 Main St");
  expect(controller.address.addressCountry).toBe("US");
});