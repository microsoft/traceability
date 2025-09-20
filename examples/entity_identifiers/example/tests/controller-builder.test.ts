import { test, expect } from "bun:test";
import { key } from "../src";

// This test demonstrates the desired builder pattern interface for controllers
// We'll iterate on this design before implementing the full builder

interface ControllerBuilder {
  // Core identity
  id(id: string): ControllerBuilder;
  alsoKnownAs(...aliases: string[]): ControllerBuilder;

  // Keys - support adding multiple keys incrementally
  addAssertionKey(publicKey: any): ControllerBuilder;
  addAuthenticationKey(publicKey: any): ControllerBuilder;
  addKey(publicKey: any, capabilities: string[]): ControllerBuilder;

  // Location and address - support updating incrementally
  location(coordinates: [number, number]): ControllerBuilder;
  address(addressData: any): ControllerBuilder;

  // Build and serialize
  build(): any; // Returns the controller document
  serialize(mediaType: string): string; // Serializes to specific media type
}

// Mock implementation for testing the interface
class MockControllerBuilder implements ControllerBuilder {
  private data: any = {
    "@context": ["https://www.w3.org/ns/cid/v1", "https://geojson.org/geojson-ld/geojson-context.jsonld"],
    verificationMethod: [],
    assertionMethod: [],
    authentication: [],
  };

  id(id: string): ControllerBuilder {
    this.data.id = id;
    return this;
  }

  alsoKnownAs(...aliases: string[]): ControllerBuilder {
    this.data.alsoKnownAs = [...(this.data.alsoKnownAs || []), ...aliases];
    return this;
  }

  addAssertionKey(publicKey: any): ControllerBuilder {
    const vmId = `${this.data.id}#assertion-key-${this.data.verificationMethod.length}`;
    this.data.verificationMethod.push({
      id: vmId,
      type: "JsonWebKey",
      controller: this.data.id,
      publicKeyJwk: publicKey
    });
    this.data.assertionMethod.push(vmId);
    return this;
  }

  addAuthenticationKey(publicKey: any): ControllerBuilder {
    const vmId = `${this.data.id}#auth-key-${this.data.verificationMethod.length}`;
    this.data.verificationMethod.push({
      id: vmId,
      type: "JsonWebKey",
      controller: this.data.id,
      publicKeyJwk: publicKey
    });
    this.data.authentication.push(vmId);
    return this;
  }

  addKey(publicKey: any, capabilities: string[]): ControllerBuilder {
    const vmId = `${this.data.id}#key-${this.data.verificationMethod.length}`;
    this.data.verificationMethod.push({
      id: vmId,
      type: "JsonWebKey",
      controller: this.data.id,
      publicKeyJwk: publicKey
    });

    if (capabilities.includes("assertionMethod")) {
      this.data.assertionMethod.push(vmId);
    }
    if (capabilities.includes("authentication")) {
      this.data.authentication.push(vmId);
    }
    return this;
  }

  location(coordinates: [number, number]): ControllerBuilder {
    this.data.geometry = {
      type: "Point",
      coordinates: coordinates
    };
    return this;
  }

  address(addressData: any): ControllerBuilder {
    this.data.address = { ...this.data.address, ...addressData };
    return this;
  }

  build(): any {
    return { ...this.data };
  }

  serialize(mediaType: string): string {
    const controller = this.build();

    switch (mediaType) {
      case "application/cid":
        // Custom CID (Controller Identifier Document) format
        return JSON.stringify({
          mediaType: "application/cid",
          version: "1.0",
          controller: controller
        }, null, 2);

      case "application/json":
        return JSON.stringify(controller, null, 2);

      case "application/ld+json":
        return JSON.stringify(controller, null, 2);

      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }
  }
}

// Factory function to create builder
function createControllerBuilder(): ControllerBuilder {
  return new MockControllerBuilder();
}

test("controller builder basic usage", async () => {
  // Generate some test keys
  const assertionKey = await key.exportPublicKey(await key.generatePrivateKey("ES256"));
  const authKey = await key.exportPublicKey(await key.generatePrivateKey("ES256"));

  // Build a controller using the builder pattern
  const builder = createControllerBuilder()
    .id("https://manufacturer.example/supplier/123")
    .alsoKnownAs("https://manufacturer.example", "https://acme-corp.example")
    .addAssertionKey(assertionKey)
    .addAuthenticationKey(authKey)
    .location([-122.4194, 37.7749])
    .address({
      streetAddress: "123 Manufacturing Way",
      addressLocality: "San Francisco",
      addressRegion: "CA",
      postalCode: "94102",
      addressCountry: "US"
    });

  const controller = builder.build();

  // Verify the built controller
  expect(controller.id).toBe("https://manufacturer.example/supplier/123");
  expect(controller.alsoKnownAs).toEqual([
    "https://manufacturer.example",
    "https://acme-corp.example"
  ]);
  expect(controller.verificationMethod).toHaveLength(2);
  expect(controller.assertionMethod).toHaveLength(1);
  expect(controller.authentication).toHaveLength(1);
  expect(controller.geometry).toEqual({
    type: "Point",
    coordinates: [-122.4194, 37.7749]
  });
  expect(controller.address.streetAddress).toBe("123 Manufacturing Way");
});

test("controller builder incremental key addition", async () => {
  const key1 = await key.exportPublicKey(await key.generatePrivateKey("ES256"));
  const key2 = await key.exportPublicKey(await key.generatePrivateKey("ES384"));
  const key3 = await key.exportPublicKey(await key.generatePrivateKey("ES256"));

  const builder = createControllerBuilder()
    .id("https://distributor.example/warehouse/west")
    .addAssertionKey(key1)
    .addAssertionKey(key2) // Second assertion key
    .addKey(key3, ["authentication", "assertionMethod"]); // Multi-capability key

  const controller = builder.build();

  expect(controller.verificationMethod).toHaveLength(3);
  expect(controller.assertionMethod).toHaveLength(3); // All keys can assert
  expect(controller.authentication).toHaveLength(1); // Only one auth key
});

test("controller builder address incremental updates", async () => {
  const builder = createControllerBuilder()
    .id("https://retailer.example/store/001")
    .address({ streetAddress: "456 Retail Blvd" })
    .address({ addressLocality: "Portland" })
    .address({ addressRegion: "OR", postalCode: "97201" });

  const controller = builder.build();

  expect(controller.address).toEqual({
    streetAddress: "456 Retail Blvd",
    addressLocality: "Portland",
    addressRegion: "OR",
    postalCode: "97201"
  });
});

test("controller serialization to application/cid", async () => {
  const testKey = await key.exportPublicKey(await key.generatePrivateKey("ES256"));

  const builder = createControllerBuilder()
    .id("https://logistics.example/shipper/001")
    .addAssertionKey(testKey)
    .location([-122.3, 37.8]);

  const cidSerialized = builder.serialize("application/cid");
  const parsed = JSON.parse(cidSerialized);

  expect(parsed.mediaType).toBe("application/cid");
  expect(parsed.version).toBe("1.0");
  expect(parsed.controller).toBeDefined();
  expect(parsed.controller.id).toBe("https://logistics.example/shipper/001");
});

test("controller serialization to different media types", async () => {
  const testKey = await key.exportPublicKey(await key.generatePrivateKey("ES256"));

  const builder = createControllerBuilder()
    .id("https://test.example/entity/001")
    .addAssertionKey(testKey);

  // Test different serialization formats
  const jsonSerialized = builder.serialize("application/json");
  const jsonParsed = JSON.parse(jsonSerialized);
  expect(jsonParsed.id).toBe("https://test.example/entity/001");

  const ldJsonSerialized = builder.serialize("application/ld+json");
  const ldJsonParsed = JSON.parse(ldJsonSerialized);
  expect(ldJsonParsed["@context"]).toBeDefined();

  // Test unsupported media type
  expect(() => builder.serialize("application/xml")).toThrow("Unsupported media type: application/xml");
});

test("controller builder fluent chaining", async () => {
  const key1 = await key.exportPublicKey(await key.generatePrivateKey("ES256"));

  // Test that all methods return the builder for chaining
  const result = createControllerBuilder()
    .id("https://test.example")
    .alsoKnownAs("https://alias.example")
    .addAssertionKey(key1)
    .location([0, 0])
    .address({ country: "US" })
    .build();

  expect(result.id).toBe("https://test.example");
  expect(result.alsoKnownAs).toContain("https://alias.example");
});

test("controller builder multiple aliases", async () => {
  const builder = createControllerBuilder()
    .id("https://multi.example")
    .alsoKnownAs("https://alias1.example", "https://alias2.example")
    .alsoKnownAs("https://alias3.example"); // Additional call

  const controller = builder.build();

  expect(controller.alsoKnownAs).toEqual([
    "https://alias1.example",
    "https://alias2.example",
    "https://alias3.example"
  ]);
});