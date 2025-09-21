import { test, expect } from "bun:test";
import { key } from "../index";

// This focuses on testing the builder pattern design concepts
// Note: Currently tests a mock implementation since the full builder isn't implemented

interface ControllerBuilder {
  id(id: string): ControllerBuilder;
  alsoKnownAs(...aliases: string[]): ControllerBuilder;
  addAssertionKey(publicKey: any, keyId?: string): ControllerBuilder;
  addAuthenticationKey(publicKey: any, keyId?: string): ControllerBuilder;
  addVerificationMethod(publicKey: any, capabilities: string[], keyId?: string): ControllerBuilder;
  location(longitude: number, latitude: number): ControllerBuilder;
  address(addressData: any): ControllerBuilder;
  build(): any;
  serialize(mediaType: string): string;
}

class MockControllerBuilder implements ControllerBuilder {
  private data: any = {
    "@context": ["https://www.w3.org/ns/cid/v1"],
    verificationMethod: [],
    assertionMethod: [],
    authentication: []
  };

  id(id: string): ControllerBuilder {
    this.data.id = id;
    return this;
  }

  alsoKnownAs(...aliases: string[]): ControllerBuilder {
    this.data.alsoKnownAs = [...(this.data.alsoKnownAs || []), ...aliases];
    return this;
  }

  addAssertionKey(publicKey: any, keyId?: string): ControllerBuilder {
    return this.addVerificationMethod(publicKey, ["assertionMethod"], keyId);
  }

  addAuthenticationKey(publicKey: any, keyId?: string): ControllerBuilder {
    return this.addVerificationMethod(publicKey, ["authentication"], keyId);
  }

  addVerificationMethod(publicKey: any, capabilities: string[], keyId?: string): ControllerBuilder {
    const finalKeyId = keyId || publicKey.kid || `key-${this.data.verificationMethod.length}`;
    const vmId = finalKeyId.includes('#') ? finalKeyId : `${this.data.id}#${finalKeyId}`;

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

  location(longitude: number, latitude: number): ControllerBuilder {
    this.data.geometry = {
      type: "Point",
      coordinates: [longitude, latitude]
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
    switch (mediaType) {
      case "application/json":
        return JSON.stringify(this.build(), null, 2);
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }
  }
}

function createControllerBuilder(): ControllerBuilder {
  return new MockControllerBuilder();
}

test("builder pattern basic functionality", async () => {
  const testKey = await key.exportPublicKey(await key.generatePrivateKey("ES256"));

  const controller = createControllerBuilder()
    .id("https://test.example/builder/001")
    .alsoKnownAs("https://alias.example")
    .addAssertionKey(testKey)
    .location(-122.4194, 37.7749)
    .address({ streetAddress: "123 Builder St" })
    .build();

  expect(controller.id).toBe("https://test.example/builder/001");
  expect(controller.alsoKnownAs).toContain("https://alias.example");
  expect(controller.verificationMethod).toHaveLength(1);
  expect(controller.geometry.coordinates).toEqual([-122.4194, 37.7749]);
  expect(controller.address.streetAddress).toBe("123 Builder St");
});

test("builder method chaining", async () => {
  const key1 = await key.exportPublicKey(await key.generatePrivateKey("ES256"));
  const key2 = await key.exportPublicKey(await key.generatePrivateKey("ES384"));

  const controller = createControllerBuilder()
    .id("https://test.example/chain/001")
    .addAssertionKey(key1)
    .addAuthenticationKey(key2)
    .alsoKnownAs("https://chain1.example", "https://chain2.example")
    .location(0, 0)
    .build();

  expect(controller.verificationMethod).toHaveLength(2);
  expect(controller.assertionMethod).toHaveLength(1);
  expect(controller.authentication).toHaveLength(1);
  expect(controller.alsoKnownAs).toHaveLength(2);
});

test("builder serialization", async () => {
  const testKey = await key.exportPublicKey(await key.generatePrivateKey("ES256"));

  const builder = createControllerBuilder()
    .id("https://test.example/serialize/001")
    .addAssertionKey(testKey);

  const serialized = builder.serialize("application/json");
  const parsed = JSON.parse(serialized);

  expect(parsed.id).toBe("https://test.example/serialize/001");
  expect(parsed.verificationMethod).toHaveLength(1);
});