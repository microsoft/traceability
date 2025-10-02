import { test, expect } from "bun:test";
import { createSchemaResolver } from "./schemaResolver";

const validJsonSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    age: { type: "integer", minimum: 0, maximum: 150 },
    email: { type: "string", format: "email" }
  },
  required: ["name", "age", "email"],
  additionalProperties: false
};

const validInstance = {
  name: "John Doe",
  age: 30,
  email: "john.doe@example.com"
};

const invalidInstance = {
  name: "Jane Doe",
  age: -5, // Invalid age
  email: "invalid-email" // Invalid email format
};

test("createSchemaResolver with single schema", async () => {
  const schemaId = "https://test.example/schemas/person.json";
  const resolver = await createSchemaResolver([[schemaId, validJsonSchema]]);

  const validator = await resolver.resolve(schemaId);
  expect(validator).toBeDefined();
  expect(typeof validator).toBe("function");
});

test("schema validation with valid instance", async () => {
  const schemaId = "https://test.example/schemas/person-valid.json";
  const resolver = await createSchemaResolver([[schemaId, validJsonSchema]]);

  const validator = await resolver.resolve(schemaId);
  const result = validator(validInstance);

  expect(result).toBe(true);
  expect(validator.errors).toBeNull();
});

test("schema validation with invalid instance", async () => {
  const schemaId = "https://test.example/schemas/person-invalid.json";
  const resolver = await createSchemaResolver([[schemaId, validJsonSchema]]);

  const validator = await resolver.resolve(schemaId);
  const result = validator(invalidInstance);

  expect(result).toBe(false);
  expect(validator.errors).toBeDefined();
  expect(validator.errors!.length).toBeGreaterThan(0);
});

test("schemaResolver throws error for non-existent schema", async () => {
  const resolver = await createSchemaResolver([]);

  await expect(resolver.resolve("https://nonexistent.example/schemas/missing.json"))
    .rejects.toThrow("Schema not found for id: https://nonexistent.example/schemas/missing.json");
});

test("createSchemaResolver with multiple schemas", async () => {
  const personSchema = validJsonSchema;
  const productSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      price: { type: "number", minimum: 0 }
    },
    required: ["id", "name", "price"]
  };

  const resolver = await createSchemaResolver([
    ["https://test.example/schemas/person.json", personSchema],
    ["https://test.example/schemas/product.json", productSchema]
  ]);

  const personValidator = await resolver.resolve("https://test.example/schemas/person.json");
  const productValidator = await resolver.resolve("https://test.example/schemas/product.json");

  expect(personValidator).toBeDefined();
  expect(productValidator).toBeDefined();

  // Test person validation
  const personResult = personValidator(validInstance);
  expect(personResult).toBe(true);

  // Test product validation
  const productResult = productValidator({
    id: "prod-001",
    name: "Test Product",
    price: 29.99
  });
  expect(productResult).toBe(true);
});

test("schema validation with format validation", async () => {
  const emailSchema = {
    type: "object",
    properties: {
      email: { type: "string", format: "email" }
    },
    required: ["email"]
  };

  const resolver = await createSchemaResolver([
    ["https://test.example/schemas/email.json", emailSchema]
  ]);

  const validator = await resolver.resolve("https://test.example/schemas/email.json");

  // Valid email
  expect(validator({ email: "test@example.com" })).toBe(true);

  // Invalid email
  expect(validator({ email: "not-an-email" })).toBe(false);
  expect(validator.errors).toBeDefined();
  expect(validator.errors![0].message).toContain("format");
});