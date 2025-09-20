import { test, expect } from "bun:test";
import { key } from "../src";

// This test demonstrates how the builder pattern could integrate with existing systems
// and shows potential factory methods for common use cases

interface KeyPairResult {
  privateKey: any;
  publicKey: any;
}

// Extended builder interface with key generation helpers
interface IntegratedControllerBuilder {
  // Core methods from refined version
  id(id: string): IntegratedControllerBuilder;
  alsoKnownAs(...aliases: string[]): IntegratedControllerBuilder;
  location(longitude: number, latitude: number): IntegratedControllerBuilder;
  address(addressData: any): IntegratedControllerBuilder;

  // Enhanced key methods with generation
  addAssertionKey(publicKey: any, keyId?: string): IntegratedControllerBuilder;
  addAuthenticationKey(publicKey: any, keyId?: string): IntegratedControllerBuilder;
  generateAndAddAssertionKey(algorithm?: string, keyId?: string): Promise<IntegratedControllerBuilder>;
  generateAndAddAuthenticationKey(algorithm?: string, keyId?: string): Promise<IntegratedControllerBuilder>;

  // Build and serialize
  build(): any;
  serialize(mediaType: string): string;

  // Access generated keys for signing
  getGeneratedKeys(): { [keyId: string]: KeyPairResult };
}

// Mock implementation showing integration possibilities
class IntegratedControllerBuilder implements IntegratedControllerBuilder {
  private data: any = {
    "@context": ["https://www.w3.org/ns/cid/v1", "https://geojson.org/geojson-ld/geojson-context.jsonld"],
    verificationMethod: [],
    assertionMethod: [],
    authentication: [],
  };

  private generatedKeys: { [keyId: string]: KeyPairResult } = {};

  id(id: string): IntegratedControllerBuilder {
    this.data.id = id;
    return this;
  }

  alsoKnownAs(...aliases: string[]): IntegratedControllerBuilder {
    this.data.alsoKnownAs = [...(this.data.alsoKnownAs || []), ...aliases];
    return this;
  }

  location(longitude: number, latitude: number): IntegratedControllerBuilder {
    this.data.geometry = {
      type: "Point",
      coordinates: [longitude, latitude]
    };
    return this;
  }

  address(addressData: any): IntegratedControllerBuilder {
    this.data.address = { ...this.data.address, ...addressData };
    return this;
  }

  addAssertionKey(publicKey: any, keyId?: string): IntegratedControllerBuilder {
    const finalKeyId = keyId || `assertion-key-${this.data.verificationMethod.length}`;
    const vmId = `${this.data.id}#${finalKeyId}`;

    this.data.verificationMethod.push({
      id: vmId,
      type: "JsonWebKey",
      controller: this.data.id,
      publicKeyJwk: publicKey
    });
    this.data.assertionMethod.push(vmId);
    return this;
  }

  addAuthenticationKey(publicKey: any, keyId?: string): IntegratedControllerBuilder {
    const finalKeyId = keyId || `auth-key-${this.data.verificationMethod.length}`;
    const vmId = `${this.data.id}#${finalKeyId}`;

    this.data.verificationMethod.push({
      id: vmId,
      type: "JsonWebKey",
      controller: this.data.id,
      publicKeyJwk: publicKey
    });
    this.data.authentication.push(vmId);
    return this;
  }

  async generateAndAddAssertionKey(algorithm = "ES256", keyId?: string): Promise<IntegratedControllerBuilder> {
    const privateKey = await key.generatePrivateKey(algorithm as any);
    const publicKey = await key.exportPublicKey(privateKey);

    const finalKeyId = keyId || `generated-assertion-${Object.keys(this.generatedKeys).length}`;

    // Store the key pair for later use
    this.generatedKeys[finalKeyId] = { privateKey, publicKey };

    // Add to controller
    this.addAssertionKey(publicKey, finalKeyId);
    return this;
  }

  async generateAndAddAuthenticationKey(algorithm = "ES256", keyId?: string): Promise<IntegratedControllerBuilder> {
    const privateKey = await key.generatePrivateKey(algorithm as any);
    const publicKey = await key.exportPublicKey(privateKey);

    const finalKeyId = keyId || `generated-auth-${Object.keys(this.generatedKeys).length}`;

    // Store the key pair for later use
    this.generatedKeys[finalKeyId] = { privateKey, publicKey };

    // Add to controller
    this.addAuthenticationKey(publicKey, finalKeyId);
    return this;
  }

  build(): any {
    return { ...this.data };
  }

  serialize(mediaType: string): string {
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

      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }
  }

  getGeneratedKeys(): { [keyId: string]: KeyPairResult } {
    return { ...this.generatedKeys };
  }
}

// Factory functions for common use cases
function createSupplyChainManufacturer(id: string): IntegratedControllerBuilder {
  return new IntegratedControllerBuilder()
    .id(id)
    .alsoKnownAs(`${id}/public`);
}

function createSupplyChainDistributor(id: string, warehouseLocation: [number, number]): IntegratedControllerBuilder {
  return new IntegratedControllerBuilder()
    .id(id)
    .location(warehouseLocation[0], warehouseLocation[1]);
}

function createSupplyChainRetailer(id: string, storeAddress: any): IntegratedControllerBuilder {
  return new IntegratedControllerBuilder()
    .id(id)
    .address(storeAddress);
}

test("integrated builder with key generation", async () => {
  const builder = new IntegratedControllerBuilder()
    .id("https://manufacturer.example/supplier/123")
    .alsoKnownAs("https://acme-manufacturing.example");

  // Generate keys automatically
  await builder.generateAndAddAssertionKey("ES256", "primary-assertion");
  await builder.generateAndAddAuthenticationKey("ES384", "primary-auth");

  const controller = builder.build();
  const generatedKeys = builder.getGeneratedKeys();

  // Verify controller structure
  expect(controller.verificationMethod).toHaveLength(2);
  expect(controller.assertionMethod).toHaveLength(1);
  expect(controller.authentication).toHaveLength(1);

  // Verify we can access the generated keys
  expect(generatedKeys["primary-assertion"]).toBeDefined();
  expect(generatedKeys["primary-auth"]).toBeDefined();
  expect(generatedKeys["primary-assertion"].privateKey).toBeDefined();
  expect(generatedKeys["primary-assertion"].publicKey).toBeDefined();
});

test("supply chain factory functions", async () => {
  // Create a manufacturer
  const manufacturer = createSupplyChainManufacturer("https://acme-corp.example/facility/main");
  await manufacturer.generateAndAddAssertionKey("ES256", "production-cert");
  manufacturer.address({
    streetAddress: "123 Industrial Blvd",
    addressLocality: "Detroit",
    addressRegion: "MI",
    addressCountry: "US"
  });

  // Create a distributor
  const distributor = createSupplyChainDistributor(
    "https://logistics-hub.example/warehouse/west",
    [-122.4194, 37.7749] // San Francisco
  );
  await distributor.generateAndAddAuthenticationKey("ES256", "shipping-auth");

  // Create a retailer
  const retailer = createSupplyChainRetailer(
    "https://retail-chain.example/store/001",
    {
      streetAddress: "456 Main St",
      addressLocality: "Portland",
      addressRegion: "OR",
      postalCode: "97201"
    }
  );

  // Verify manufacturer
  const mfgController = manufacturer.build();
  expect(mfgController.id).toBe("https://acme-corp.example/facility/main");
  expect(mfgController.address.streetAddress).toBe("123 Industrial Blvd");
  expect(manufacturer.getGeneratedKeys()["production-cert"]).toBeDefined();

  // Verify distributor
  const distController = distributor.build();
  expect(distController.geometry.coordinates).toEqual([-122.4194, 37.7749]);
  expect(distributor.getGeneratedKeys()["shipping-auth"]).toBeDefined();

  // Verify retailer
  const retailController = retailer.build();
  expect(retailController.address.addressLocality).toBe("Portland");
});

test("end-to-end supply chain scenario", async () => {
  // Scenario: Create a complete supply chain with manufacturer, distributor, and retailer

  const manufacturer = createSupplyChainManufacturer("https://textile-mill.example/facility/001");
  await manufacturer.generateAndAddAssertionKey("ES256", "quality-cert");
  await manufacturer.generateAndAddAssertionKey("ES384", "origin-cert");
  manufacturer.location(-84.3880, 33.7490); // Atlanta, GA
  manufacturer.address({
    streetAddress: "789 Textile Way",
    addressLocality: "Atlanta",
    addressRegion: "GA",
    postalCode: "30309",
    addressCountry: "US"
  });

  const distributor = createSupplyChainDistributor(
    "https://supply-network.example/hub/central",
    [-87.6298, 41.8781] // Chicago, IL
  );
  await distributor.generateAndAddAuthenticationKey("ES256", "logistics-auth");
  distributor.address({
    streetAddress: "456 Distribution Center Dr",
    addressLocality: "Chicago",
    addressRegion: "IL"
  });

  const retailer = createSupplyChainRetailer(
    "https://fashion-store.example/location/nyc",
    {
      streetAddress: "123 Fashion Ave",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10001",
      addressCountry: "US"
    }
  );

  // Serialize all to application/cid format
  const mfgCid = manufacturer.serialize("application/cid");
  const distCid = distributor.serialize("application/cid");
  const retailCid = retailer.serialize("application/json"); // Different format

  // Verify the serialization
  const mfgParsed = JSON.parse(mfgCid);
  expect(mfgParsed.mediaType).toBe("application/cid");
  expect(mfgParsed.controller.assertionMethod).toHaveLength(2); // Two assertion keys

  const distParsed = JSON.parse(distCid);
  expect(distParsed.controller.geometry.coordinates[1]).toBeCloseTo(41.8781); // Chicago latitude

  const retailParsed = JSON.parse(retailCid);
  expect(retailParsed.address.addressLocality).toBe("New York");

  // Verify access to generated keys for signing operations
  const mfgKeys = manufacturer.getGeneratedKeys();
  const distKeys = distributor.getGeneratedKeys();

  expect(Object.keys(mfgKeys)).toEqual(["quality-cert", "origin-cert"]);
  expect(Object.keys(distKeys)).toEqual(["logistics-auth"]);

  // Keys should be usable for actual signing (basic check)
  expect(mfgKeys["quality-cert"].privateKey.kid).toBeDefined();
  expect(mfgKeys["quality-cert"].publicKey.kid).toBeDefined();
});

test("builder pattern backward compatibility check", async () => {
  // Verify that the builder can create controllers compatible with existing code

  const builder = new IntegratedControllerBuilder()
    .id("https://test.example/entity/001");

  await builder.generateAndAddAssertionKey("ES256", "test-key");

  const controller = builder.build();
  const keys = builder.getGeneratedKeys();

  // This should match the structure expected by existing resolver code
  expect(controller).toHaveProperty("@context");
  expect(controller).toHaveProperty("id");
  expect(controller).toHaveProperty("verificationMethod");
  expect(controller).toHaveProperty("assertionMethod");
  expect(controller).toHaveProperty("authentication");

  // Verification method should have the expected structure
  const vm = controller.verificationMethod[0];
  expect(vm).toHaveProperty("id");
  expect(vm).toHaveProperty("type", "JsonWebKey");
  expect(vm).toHaveProperty("controller", controller.id);
  expect(vm).toHaveProperty("publicKeyJwk");

  // Keys should be compatible with existing signing code
  const testKey = keys["test-key"];
  expect(testKey.privateKey).toHaveProperty("kid");
  expect(testKey.publicKey).toHaveProperty("kid");
  expect(testKey.publicKey).toHaveProperty("alg");
});