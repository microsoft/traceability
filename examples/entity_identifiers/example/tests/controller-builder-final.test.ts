import { test, expect } from "bun:test";
import { generatePrivateKey, exportPublicKey } from "../src/key/management";
import { createControllerBuilder } from "../src/controller/builder";

test("basic controller builder with assertion key", async () => {
  const assertionKey = await exportPublicKey(await generatePrivateKey("ES256"));

  const builder = createControllerBuilder()
    .id("https://manufacturer.example/supplier/123")
    .addAssertionKey(assertionKey, "primary-assertion");

  const controller = builder.build();
  expect(controller["@context"]).toEqual(["https://www.w3.org/ns/cid/v1"]);
  expect(controller.id).toBe("https://manufacturer.example/supplier/123");
  expect(controller.verificationMethod).toHaveLength(1);
  expect(controller.assertionMethod).toHaveLength(1);
  expect(controller.authentication).toHaveLength(0);
  expect(controller.type).toBeUndefined();
  expect(controller.features).toBeUndefined();
});

test("controller builder with generated keys", async () => {
  const builder = createControllerBuilder()
    .id("https://distributor.example/warehouse/west");

  await builder.generateAndAddAssertionKey("ES256", "quality-cert");
  await builder.generateAndAddAuthenticationKey("ES384", "shipping-auth");

  const controller = builder.build();
  const generatedKeys = builder.getGeneratedKeys();

  expect(controller.verificationMethod).toHaveLength(2);
  expect(controller.assertionMethod).toHaveLength(1);
  expect(controller.authentication).toHaveLength(1);

  expect(generatedKeys["quality-cert"]).toBeDefined();
  expect(generatedKeys["shipping-auth"]).toBeDefined();
  expect(generatedKeys["quality-cert"].privateKey).toBeDefined();
  expect(generatedKeys["quality-cert"].publicKey).toBeDefined();
});

test("controller builder with features", async () => {
  const assertionKey = await exportPublicKey(await generatePrivateKey("ES256"));

  const controller = createControllerBuilder()
    .id("https://textile-mill.example/facility/001")
    .addAssertionKey(assertionKey, "production-cert")
    .addFeature(
      { type: "Point", coordinates: [-84.3880, 33.7490] },
      {
        name: "Atlanta Manufacturing Facility",
        address: {
          streetAddress: "789 Textile Way",
          addressLocality: "Atlanta",
          addressRegion: "GA",
          postalCode: "30309",
          addressCountry: "US"
        }
      }
    )
    .build();

  expect(controller["@context"]).toEqual([
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ]);
  expect(controller.type).toBe("FeatureCollection");
  expect(controller.features).toHaveLength(1);
  expect(controller.features![0].geometry.type).toBe("Point");
  expect(controller.features![0].geometry.coordinates).toEqual([-84.3880, 33.7490]);
  expect(controller.features![0].properties.name).toBe("Atlanta Manufacturing Facility");
});

test("controller builder with additional contexts", async () => {
  const assertionKey = await exportPublicKey(await generatePrivateKey("ES256"));

  const controller = createControllerBuilder()
    .id("https://logistics.example/shipper/001")
    .context("https://example.org/supply-chain/v1")
    .context("https://w3id.org/traceability/v1")
    .addAssertionKey(assertionKey)
    .build();

  expect(controller["@context"]).toEqual([
    "https://www.w3.org/ns/cid/v1",
    "https://example.org/supply-chain/v1",
    "https://w3id.org/traceability/v1"
  ]);
});

test("controller builder with features and additional contexts", async () => {
  const assertionKey = await exportPublicKey(await generatePrivateKey("ES256"));

  const controller = createControllerBuilder()
    .id("https://retailer.example/store/001")
    .context("https://example.org/retail/v1")
    .addAssertionKey(assertionKey)
    .addFeature(
      { type: "Point", coordinates: [-74.0060, 40.7128] },
      { name: "NYC Flagship Store" }
    )
    .build();

  expect(controller["@context"]).toEqual([
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld",
    "https://example.org/retail/v1"
  ]);
  expect(controller.type).toBe("FeatureCollection");
});

test("controller builder deduplicates contexts", async () => {
  const assertionKey = await exportPublicKey(await generatePrivateKey("ES256"));

  const controller = createControllerBuilder()
    .id("https://test.example/entity/001")
    .context("https://www.w3.org/ns/cid/v1") // duplicate
    .context("https://example.org/custom/v1")
    .context("https://example.org/custom/v1") // duplicate
    .addAssertionKey(assertionKey)
    .build();

  expect(controller["@context"]).toEqual([
    "https://www.w3.org/ns/cid/v1",
    "https://example.org/custom/v1"
  ]);
});

test("controller builder serialize returns Uint8Array", async () => {
  const assertionKey = await exportPublicKey(await generatePrivateKey("ES256"));

  const serialized = createControllerBuilder()
    .id("https://test.example/entity/001")
    .addAssertionKey(assertionKey)
    .serialize("application/cid");

  expect(serialized).toBeInstanceOf(Uint8Array);

  // Verify it can be decoded back to JSON
  const jsonString = new TextDecoder().decode(serialized);
  const parsed = JSON.parse(jsonString);
  expect(parsed.id).toBe("https://test.example/entity/001");
});

test("controller builder clone and reset", async () => {
  const assertionKey = await exportPublicKey(await generatePrivateKey("ES256"));

  const original = createControllerBuilder()
    .id("https://original.example")
    .addAssertionKey(assertionKey)
    .context("https://example.org/original/v1");

  await original.generateAndAddAuthenticationKey("ES256", "auth-key");

  const cloned = original.clone()
    .id("https://cloned.example");

  const originalController = original.build();
  const clonedController = cloned.build();

  expect(originalController.id).toBe("https://original.example");
  expect(clonedController.id).toBe("https://cloned.example");
  expect(clonedController.verificationMethod).toHaveLength(2); // Cloned keys
  expect(cloned.getGeneratedKeys()["auth-key"]).toBeDefined(); // Cloned generated keys

  // Test reset
  const reset = original.reset().id("https://reset.example");
  const resetController = reset.build();

  expect(resetController.id).toBe("https://reset.example");
  expect(resetController.verificationMethod).toHaveLength(0);
  expect(Object.keys(reset.getGeneratedKeys())).toHaveLength(0);
});

test("controller builder validation errors", async () => {
  const testKey = await exportPublicKey(await generatePrivateKey("ES256"));

  // Invalid ID
  expect(() => createControllerBuilder().id("invalid-id")).toThrow("Controller ID must be a valid HTTPS URL");

  // Adding key without ID
  expect(() => createControllerBuilder().addAssertionKey(testKey)).toThrow("Controller ID must be set before adding verification methods");

  // Building without ID
  expect(() => createControllerBuilder().build()).toThrow("Controller ID is required");

  // Invalid geometry
  expect(() => createControllerBuilder()
    .id("https://test.example")
    .addFeature({ type: "Point" }, {}) // missing coordinates
  ).toThrow("Geometry must have 'type' and 'coordinates' properties");
});

test("supply chain end-to-end scenario", async () => {
  // Manufacturer
  const manufacturer = createControllerBuilder()
    .id("https://textile-mill.example/facility/001")
    .context("https://w3id.org/traceability/v1")
    .alsoKnownAs("https://acme-textiles.example", "https://organic-cotton-mill.example");

  await manufacturer.generateAndAddAssertionKey("ES256", "quality-cert");
  await manufacturer.generateAndAddAssertionKey("ES384", "origin-cert");

  manufacturer.addFeature(
    { type: "Point", coordinates: [-84.3880, 33.7490] },
    {
      name: "Organic Cotton Mill",
      address: {
        streetAddress: "789 Textile Way",
        addressLocality: "Atlanta",
        addressRegion: "GA",
        postalCode: "30309",
        addressCountry: "US"
      },
      certifications: ["GOTS", "OEKO-TEX"]
    }
  );

  // Distributor
  const distributor = createControllerBuilder()
    .id("https://supply-network.example/hub/central")
    .context("https://w3id.org/traceability/v1");

  await distributor.generateAndAddAuthenticationKey("ES256", "logistics-auth");

  distributor.addFeature(
    { type: "Point", coordinates: [-87.6298, 41.8781] },
    {
      name: "Chicago Distribution Hub",
      address: {
        streetAddress: "456 Distribution Center Dr",
        addressLocality: "Chicago",
        addressRegion: "IL"
      },
      warehouseCapacity: "50000 sqft"
    }
  );

  // Retailer
  const retailer = createControllerBuilder()
    .id("https://fashion-store.example/location/nyc")
    .context("https://w3id.org/traceability/v1")
    .addFeature(
      { type: "Point", coordinates: [-74.0060, 40.7128] },
      {
        name: "NYC Flagship Store",
        address: {
          streetAddress: "123 Fashion Ave",
          addressLocality: "New York",
          addressRegion: "NY",
          postalCode: "10001",
          addressCountry: "US"
        }
      }
    );

  // Build all controllers
  const mfgController = manufacturer.build();
  const distController = distributor.build();
  const retailController = retailer.build();

  // Verify manufacturer
  expect(mfgController.id).toBe("https://textile-mill.example/facility/001");
  expect(mfgController.alsoKnownAs).toHaveLength(2);
  expect(mfgController.assertionMethod).toHaveLength(2); // Two assertion keys
  expect(mfgController.features![0].properties.certifications).toEqual(["GOTS", "OEKO-TEX"]);
  expect(manufacturer.getGeneratedKeys()["quality-cert"]).toBeDefined();

  // Verify distributor
  expect(distController.geometry).toBeUndefined(); // No top-level geometry
  expect(distController.features![0].geometry.coordinates[1]).toBeCloseTo(41.8781); // Chicago latitude
  expect(distributor.getGeneratedKeys()["logistics-auth"]).toBeDefined();

  // Verify retailer
  expect(retailController.features![0].properties.name).toBe("NYC Flagship Store");
  expect(retailController.authentication).toHaveLength(0); // No auth keys

  // All should have correct contexts
  expect(mfgController["@context"]).toEqual([
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld",
    "https://w3id.org/traceability/v1"
  ]);
});