import { test, expect } from "bun:test";
import yaml from "js-yaml";
import { createSchemaResolver } from "../src/resolver";

// YAML schema definition
const yamlSchema = `
type: object
properties:
  name:
    type: string
    minLength: 1
  age:
    type: integer
    minimum: 0
    maximum: 150
  email:
    type: string
    format: email
  address:
    type: object
    properties:
      street:
        type: string
      city:
        type: string
      country:
        type: string
    required: [street, city, country]
required: [name, age, email]
additionalProperties: false
`;

// Valid JSON instance
const validJsonInstance = {
  name: "John Doe",
  age: 30,
  email: "john.doe@example.com",
  address: {
    street: "123 Main St",
    city: "Anytown",
    country: "USA"
  }
};

// Invalid JSON instance (missing required field)
const invalidJsonInstance = {
  name: "Jane Doe",
  // age is missing (required)
  email: "jane.doe@example.com",
  address: {
    street: "456 Oak Ave",
    city: "Somewhere",
    country: "Canada"
  }
};

// Invalid JSON instance (wrong type)
const invalidTypeJsonInstance = {
  name: "Bob Smith",
  age: "thirty", // should be integer
  email: "bob.smith@example.com",
  address: {
    street: "789 Pine St",
    city: "Nowhere",
    country: "Mexico"
  }
};

test("schema validation with valid JSON instance succeeds", async () => {
  // Parse YAML schema
  const schema = yaml.load(yamlSchema) as any;
  
  // Create schema resolver with the parsed schema
  const schemaResolver = await createSchemaResolver([
    ["test-schema", schema]
  ]);
  
  // Get the compiled validator
  const validator = await schemaResolver.resolve("test-schema");
  
  // Validate the JSON instance
  const isValid = validator(validJsonInstance);
  
  expect(isValid).toBe(true);
  expect(validator.errors).toBeNull();
});

test("schema validation with invalid JSON instance (missing required field) fails", async () => {
  // Parse YAML schema
  const schema = yaml.load(yamlSchema) as any;
  
  // Create schema resolver with the parsed schema
  const schemaResolver = await createSchemaResolver([
    ["test-schema", schema]
  ]);
  
  // Get the compiled validator
  const validator = await schemaResolver.resolve("test-schema");
  
  // Validate the invalid JSON instance
  const isValid = validator(invalidJsonInstance);
  
  expect(isValid).toBe(false);
  expect(validator.errors).toBeDefined();
  expect(validator.errors?.length).toBeGreaterThan(0);
  
  // Check that the error is about missing required field
  const errorMessages = validator.errors?.map(error => error.message).filter((msg): msg is string => Boolean(msg)) || [];
  expect(errorMessages.some(msg => msg.includes("required"))).toBe(true);
});

test("schema validation with invalid JSON instance (wrong type) fails", async () => {
  // Parse YAML schema
  const schema = yaml.load(yamlSchema) as any;
  
  // Create schema resolver with the parsed schema
  const schemaResolver = await createSchemaResolver([
    ["test-schema", schema]
  ]);
  
  // Get the compiled validator
  const validator = await schemaResolver.resolve("test-schema");
  
  // Validate the invalid JSON instance
  const isValid = validator(invalidTypeJsonInstance);
  
  expect(isValid).toBe(false);
  expect(validator.errors).toBeDefined();
  expect(validator.errors?.length).toBeGreaterThan(0);
  
  // Check that the error is about wrong type
  const errorMessages = validator.errors?.map(error => error.message).filter((msg): msg is string => Boolean(msg)) || [];
  expect(errorMessages.some(msg => msg.includes("integer") || msg.includes("type"))).toBe(true);
});

test("schema validation with additional properties fails", async () => {
  // Parse YAML schema
  const schema = yaml.load(yamlSchema) as any;
  
  // Create schema resolver with the parsed schema
  const schemaResolver = await createSchemaResolver([
    ["test-schema", schema]
  ]);
  
  // Get the compiled validator
  const validator = await schemaResolver.resolve("test-schema");
  
  // Create instance with additional property
  const instanceWithExtraProperty = {
    ...validJsonInstance,
    extraField: "not allowed"
  };
  
  // Validate the JSON instance
  const isValid = validator(instanceWithExtraProperty);
  
  expect(isValid).toBe(false);
  expect(validator.errors).toBeDefined();
  expect(validator.errors?.length).toBeGreaterThan(0);
  
  // Check that the error is about additional properties
  const errorMessages = validator.errors?.map(error => error.message).filter((msg): msg is string => Boolean(msg)) || [];
  expect(errorMessages.some(msg => msg.includes("additional properties"))).toBe(true);
});

test("schema validation with invalid email format fails", async () => {
  // Parse YAML schema
  const schema = yaml.load(yamlSchema) as any;
  
  // Create schema resolver with the parsed schema
  const schemaResolver = await createSchemaResolver([
    ["test-schema", schema]
  ]);
  
  // Get the compiled validator
  const validator = await schemaResolver.resolve("test-schema");
  
  // Create instance with invalid email
  const instanceWithInvalidEmail = {
    ...validJsonInstance,
    email: "not-an-email"
  };
  
  // Validate the JSON instance
  const isValid = validator(instanceWithInvalidEmail);
  
  expect(isValid).toBe(false);
  expect(validator.errors).toBeDefined();
  expect(validator.errors?.length).toBeGreaterThan(0);
  
  // Check that the error is about email format
  const errorMessages = validator.errors?.map(error => error.message).filter((msg): msg is string => Boolean(msg)) || [];
  expect(errorMessages.some(msg => msg.includes("format") || msg.includes("email"))).toBe(true);
});

test("schema validation with age outside valid range fails", async () => {
  // Parse YAML schema
  const schema = yaml.load(yamlSchema) as any;
  
  // Create schema resolver with the parsed schema
  const schemaResolver = await createSchemaResolver([
    ["test-schema", schema]
  ]);
  
  // Get the compiled validator
  const validator = await schemaResolver.resolve("test-schema");
  
  // Create instance with age outside valid range
  const instanceWithInvalidAge = {
    ...validJsonInstance,
    age: 200 // exceeds maximum of 150
  };
  
  // Validate the JSON instance
  const isValid = validator(instanceWithInvalidAge);
  
  expect(isValid).toBe(false);
  expect(validator.errors).toBeDefined();
  expect(validator.errors?.length).toBeGreaterThan(0);
  
  // Check that the error is about age range
  const errorMessages = validator.errors?.map(error => error.message).filter((msg): msg is string => Boolean(msg)) || [];
  expect(errorMessages.some(msg => msg.includes("maximum") || msg.includes("150"))).toBe(true);
});

test("schema resolver throws error for unknown schema ID", async () => {
  // Parse YAML schema
  const schema = yaml.load(yamlSchema) as any;
  
  // Create schema resolver with the parsed schema
  const schemaResolver = await createSchemaResolver([
    ["test-schema", schema]
  ]);
  
  // Try to resolve unknown schema ID
  await expect(schemaResolver.resolve("unknown-schema")).rejects.toThrow("Schema not found for id: unknown-schema");
});
