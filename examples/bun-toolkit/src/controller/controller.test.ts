import { test, expect } from "bun:test";
import { createController } from "./controller";

test("createController with minimal parameters", async () => {
  const geometry = {
    type: "Point" as const,
    coordinates: [-122.4194, 37.7749] as [number, number]
  };

  const address = {
    streetAddress: "123 Test Street",
    addressLocality: "San Francisco",
    addressRegion: "CA",
    postalCode: "94102",
    addressCountry: "US"
  };

  const result = await createController(
    "https://test.example/controller/001",
    ["https://test.example"],
    geometry,
    address,
    "ES256"
  );

  expect(result.controller.id).toBe("https://test.example/controller/001");
  expect(result.controller.alsoKnownAs).toEqual(["https://test.example"]);
  expect(result.controller.geometry).toEqual(geometry);
  expect(result.controller.address).toEqual(address);
  expect(result.controller.verificationMethod).toHaveLength(1);
  expect(result.controller.assertionMethod).toHaveLength(1);
  expect(result.controller.authentication).toHaveLength(1);
  expect(result.privateKey).toBeDefined();
  expect(result.privateKey.alg).toBe("ES256");
});

test("createController with ES384 algorithm", async () => {
  const geometry = {
    type: "Point" as const,
    coordinates: [-122.4194, 37.7749] as [number, number]
  };

  const address = {
    streetAddress: "123 Test Street",
    addressLocality: "San Francisco",
    addressRegion: "CA",
    postalCode: "94102",
    addressCountry: "US"
  };

  const result = await createController(
    "https://test.example/controller/002",
    ["https://test.example"],
    geometry,
    address,
    "ES384"
  );

  expect(result.controller.id).toBe("https://test.example/controller/002");
  expect(result.privateKey.alg).toBe("ES384");
  expect(result.controller.verificationMethod[0].publicKeyJwk.alg).toBe("ES384");
});

test("createController with multiple aliases", async () => {
  const geometry = {
    type: "Point" as const,
    coordinates: [-122.4194, 37.7749] as [number, number]
  };

  const address = {
    streetAddress: "123 Test Street",
    addressLocality: "San Francisco",
    addressRegion: "CA",
    postalCode: "94102",
    addressCountry: "US"
  };

  const result = await createController(
    "https://test.example/controller/003",
    ["https://test.example", "https://alias1.example", "https://alias2.example"],
    geometry,
    address,
    "ES256"
  );

  expect(result.controller.alsoKnownAs).toEqual([
    "https://test.example",
    "https://alias1.example",
    "https://alias2.example"
  ]);
});

test("createController with polygon geometry", async () => {
  const polygonGeometry = {
    type: "Polygon" as const,
    coordinates: [[
      [-122.4, 37.7],
      [-122.4, 37.8],
      [-122.3, 37.8],
      [-122.3, 37.7],
      [-122.4, 37.7]
    ]]
  };

  const address = {
    streetAddress: "123 Test Street",
    addressLocality: "San Francisco",
    addressRegion: "CA",
    postalCode: "94102",
    addressCountry: "US"
  };

  const result = await createController(
    "https://test.example/controller/004",
    ["https://test.example"],
    polygonGeometry,
    address,
    "ES256"
  );

  expect(result.controller.geometry).toEqual(polygonGeometry);
  expect(result.controller.geometry.type).toBe("Polygon");
});