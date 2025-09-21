import { test, expect } from "bun:test";
import { createGenericResolver } from "./genericResolver";
import { createController } from "../controller/controller";

test("createGenericResolver with no initial data", () => {
  const resolver = createGenericResolver();

  expect(resolver).toBeDefined();
  expect(typeof resolver.resolveController).toBe("function");
  expect(typeof resolver.resolveSchema).toBe("function");
  expect(typeof resolver.addController).toBe("function");
  expect(typeof resolver.addSchema).toBe("function");
});

test("generic resolver controller resolution", async () => {
  const geometry = {
    type: "Point" as const,
    coordinates: [-122.4194, 37.7749] as [number, number]
  };

  const address = {
    streetAddress: "123 Generic Street",
    addressLocality: "San Francisco",
    addressRegion: "CA",
    postalCode: "94102",
    addressCountry: "US"
  };

  // Create test controller
  const { controller } = await createController(
    "https://issuer.example/generic/001",
    ["https://issuer.example"],
    geometry,
    address,
    "ES256"
  );

  // Create resolver with initial data
  const resolver = createGenericResolver([
    ["https://issuer.example/generic/001", controller]
  ]);

  // Test controller resolution
  const resolved = await resolver.resolveController("https://issuer.example/generic/001");

  expect(resolved).toBeDefined();
  expect(resolved.assertion).toBeDefined();
  expect(resolved.authentication).toBeDefined();
  expect(typeof resolved.assertion.resolve).toBe("function");
  expect(typeof resolved.authentication.resolve).toBe("function");
});

test("generic resolver schema resolution", async () => {
  const testSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" }
    },
    required: ["id", "name"]
  };

  const resolver = createGenericResolver(undefined, [
    ["https://test.example/schemas/test.json", testSchema]
  ]);

  const validator = await resolver.resolveSchema("https://test.example/schemas/test.json");

  expect(validator).toBeDefined();
  expect(typeof validator).toBe("function");

  // Test validation
  const validData = { id: "test-001", name: "Test Name" };
  const result = validator(validData);
  expect(result).toBe(true);

  const invalidData = { id: "test-001" }; // missing name
  const invalidResult = validator(invalidData);
  expect(invalidResult).toBe(false);
});

test("addController functionality", async () => {
  const geometry = {
    type: "Point" as const,
    coordinates: [-122.4194, 37.7749] as [number, number]
  };

  const address = {
    streetAddress: "123 Add Street",
    addressLocality: "San Francisco",
    addressRegion: "CA",
    postalCode: "94102",
    addressCountry: "US"
  };

  const resolver = createGenericResolver();

  // Should throw error initially
  await expect(resolver.resolveController("https://new.example/controller/001"))
    .rejects.toThrow("Controller not found for id: https://new.example/controller/001");

  // Add controller
  const { controller } = await createController(
    "https://new.example/controller/001",
    ["https://new.example"],
    geometry,
    address,
    "ES256"
  );

  resolver.addController("https://new.example/controller/001", controller);

  // Should work now
  const resolved = await resolver.resolveController("https://new.example/controller/001");
  expect(resolved).toBeDefined();
});

test("addSchema functionality", async () => {
  const resolver = createGenericResolver();

  // Should throw error initially
  await expect(resolver.resolveSchema("https://new.example/schema.json"))
    .rejects.toThrow("Schema not found for id: https://new.example/schema.json");

  // Add schema
  const testSchema = {
    type: "object",
    properties: {
      value: { type: "string" }
    },
    required: ["value"]
  };

  resolver.addSchema("https://new.example/schema.json", testSchema);

  // Should work now
  const validator = await resolver.resolveSchema("https://new.example/schema.json");
  expect(validator).toBeDefined();
  expect(validator({ value: "test" })).toBe(true);
});

test("schema caching functionality", async () => {
  const testSchema = {
    type: "object",
    properties: {
      id: { type: "string" }
    }
  };

  const resolver = createGenericResolver(undefined, [
    ["https://test.example/cached.json", testSchema]
  ]);

  // First resolution
  const validator1 = await resolver.resolveSchema("https://test.example/cached.json");

  // Second resolution should return same cached function
  const validator2 = await resolver.resolveSchema("https://test.example/cached.json");

  expect(validator1).toBe(validator2); // Same function reference
});

test("error handling for missing controller", async () => {
  const resolver = createGenericResolver();

  await expect(resolver.resolveController("https://missing.example/controller/001"))
    .rejects.toThrow("Controller not found for id: https://missing.example/controller/001");
});

test("error handling for missing schema", async () => {
  const resolver = createGenericResolver();

  await expect(resolver.resolveSchema("https://missing.example/schema.json"))
    .rejects.toThrow("Schema not found for id: https://missing.example/schema.json");
});

test("mixed controller and schema resolver", async () => {
  const geometry = {
    type: "Point" as const,
    coordinates: [-122.4194, 37.7749] as [number, number]
  };

  const address = {
    streetAddress: "123 Mixed Street",
    addressLocality: "San Francisco",
    addressRegion: "CA",
    postalCode: "94102",
    addressCountry: "US"
  };

  const { controller } = await createController(
    "https://mixed.example/controller/001",
    ["https://mixed.example"],
    geometry,
    address,
    "ES256"
  );

  const testSchema = {
    type: "object",
    properties: {
      test: { type: "boolean" }
    }
  };

  const resolver = createGenericResolver(
    [["https://mixed.example/controller/001", controller]],
    [["https://mixed.example/schema.json", testSchema]]
  );

  // Test both functionalities work
  const resolvedController = await resolver.resolveController("https://mixed.example/controller/001");
  const schemaValidator = await resolver.resolveSchema("https://mixed.example/schema.json");

  expect(resolvedController).toBeDefined();
  expect(schemaValidator).toBeDefined();
  expect(schemaValidator({ test: true })).toBe(true);
});