import { test, expect } from "bun:test";
import { key, credential, presentation, resolver } from "../src";
import { createController } from "../src/controller/controller";
import type { VerifiableCredential } from "../src/credential/credential";
import type { VerifiablePresentation } from "../src/presentation/presentation";
import type { Schema } from "ajv";

// Simple JSON schema for testing
const simpleSchema: Schema = {
  type: "object",
  required: ["@context", "type", "issuer", "credentialSubject"],
  properties: {
    "@context": { type: "array" },
    "type": { type: "array" },
    "issuer": { type: "string" },
    "credentialSubject": {
      type: "object",
      required: ["id"],
      properties: {
        "id": { type: "string" }
      }
    }
  }
};

test("create generic resolver with initial data", async () => {
  // Create controllers
  const issuerController = await createController(
    "https://university.example/issuer/123",
    [],
    { type: "Point", coordinates: [-122.4194, 37.7749] },
    {}
  );

  const holderController = await createController(
    "https://student.example/students/alice",
    [],
    { type: "Point", coordinates: [-122.4094, 37.7849] },
    {}
  );

  // Create generic resolver with controllers and schemas
  const genericResolver = resolver.createGenericResolver(
    [
      ["https://university.example/issuer/123", issuerController.controller],
      ["https://student.example/students/alice", holderController.controller]
    ],
    [
      ["https://example.org/schemas/simple.json", simpleSchema]
    ]
  );

  // Test controller resolution
  const resolvedIssuer = await genericResolver.resolveController("https://university.example/issuer/123");
  expect(resolvedIssuer).toBeDefined();
  expect(resolvedIssuer.assertion).toBeDefined();

  const resolvedHolder = await genericResolver.resolveController("https://student.example/students/alice");
  expect(resolvedHolder).toBeDefined();
  expect(resolvedHolder.authentication).toBeDefined();

  // Test schema resolution
  const schemaValidator = await genericResolver.resolveSchema("https://example.org/schemas/simple.json");
  expect(schemaValidator).toBeDefined();
  expect(typeof schemaValidator).toBe('function');
});

test("generic resolver throws error for missing resources", async () => {
  const genericResolver = resolver.createGenericResolver();

  await expect(
    genericResolver.resolveController("https://nonexistent.example/issuer")
  ).rejects.toThrow("Controller not found for id: https://nonexistent.example/issuer");

  await expect(
    genericResolver.resolveSchema("https://nonexistent.example/schema.json")
  ).rejects.toThrow("Schema not found for id: https://nonexistent.example/schema.json");
});

test("add resources dynamically", async () => {
  const genericResolver = resolver.createGenericResolver();

  // Create controller
  const controller = await createController(
    "https://dynamic.example/issuer",
    [],
    { type: "Point", coordinates: [-122.4194, 37.7749] },
    {}
  );

  // Add controller and schema dynamically
  genericResolver.addController("https://dynamic.example/issuer", controller.controller);
  genericResolver.addSchema("https://dynamic.example/schema.json", simpleSchema);

  // Test that they can now be resolved
  const resolvedController = await genericResolver.resolveController("https://dynamic.example/issuer");
  expect(resolvedController).toBeDefined();

  const schemaValidator = await genericResolver.resolveSchema("https://dynamic.example/schema.json");
  expect(schemaValidator).toBeDefined();
});

test("credential verification with generic resolver", async () => {
  // Create controller
  const issuerController = await createController(
    "https://university.example/issuer/123",
    [],
    { type: "Point", coordinates: [-122.4194, 37.7749] },
    {}
  );

  // Create generic resolver
  const genericResolver = resolver.createGenericResolver([
    ["https://university.example/issuer/123", issuerController.controller]
  ]);

  // Create credential
  const testCredential: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential", "TestCredential"],
    issuer: "https://university.example/issuer/123",
    credentialSubject: {
      id: "https://student.example/students/alice",
      name: "Alice Smith"
    }
  };

  // Sign credential using controller's private key
  const signer = await credential.signer(issuerController.privateKey);
  const signedCredential = await signer.sign(testCredential);

  // Verify with generic resolver
  const verifier = await credential.verifierWithGenericResolver(genericResolver);
  const verifiedCredential = await verifier.verify(signedCredential);

  // Check core credential properties
  expect(verifiedCredential["@context"]).toEqual(testCredential["@context"]);
  expect(verifiedCredential.type).toEqual(testCredential.type);
  expect(verifiedCredential.issuer).toBe(testCredential.issuer);
  expect(verifiedCredential.credentialSubject).toEqual(testCredential.credentialSubject);
  expect(verifiedCredential.iat).toBeDefined();
});

test("presentation verification with generic resolver", async () => {
  // Create controllers
  const issuerController = await createController(
    "https://university.example/issuer/123",
    [],
    { type: "Point", coordinates: [-122.4194, 37.7749] },
    {}
  );

  const holderController = await createController(
    "https://student.example/students/alice",
    [],
    { type: "Point", coordinates: [-122.4094, 37.7849] },
    {}
  );

  // Create generic resolver
  const genericResolver = resolver.createGenericResolver([
    ["https://university.example/issuer/123", issuerController.controller],
    ["https://student.example/students/alice", holderController.controller]
  ]);

  // Create and sign credential
  const testCredential: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential", "TestCredential"],
    issuer: "https://university.example/issuer/123",
    credentialSubject: {
      id: "https://student.example/students/alice",
      name: "Alice Smith"
    }
  };

  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(testCredential);

  // Create enveloped credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://student.example/students/alice",
    verifiableCredential: [envelopedCredential]
  };

  // Sign presentation
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Verify with generic resolver
  const presentationVerifier = await presentation.verifierWithGenericResolver(genericResolver);
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation);

  // Check core presentation properties
  expect(verifiedPresentation["@context"]).toEqual(presentationData["@context"]);
  expect(verifiedPresentation.type).toEqual(presentationData.type);
  expect(verifiedPresentation.holder).toBe(presentationData.holder);
  expect(verifiedPresentation.verifiableCredential).toEqual(presentationData.verifiableCredential);
  expect(verifiedPresentation.iat).toBeDefined();
  expect(verifiedPresentation.exp).toBeDefined();
});

test("credential schema validation with generic resolver", async () => {
  // Create controller
  const issuerController = await createController(
    "https://university.example/issuer/123",
    [],
    { type: "Point", coordinates: [-122.4194, 37.7749] },
    {}
  );

  // Create generic resolver with schema
  const genericResolver = resolver.createGenericResolver(
    [["https://university.example/issuer/123", issuerController.controller]],
    [["https://example.org/schemas/simple.json", simpleSchema]]
  );

  // Create credential with schema
  const testCredentialWithSchema: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential", "TestCredential"],
    issuer: "https://university.example/issuer/123",
    credentialSchema: [
      {
        "id": "https://example.org/schemas/simple.json",
        "type": "JsonSchema"
      }
    ],
    credentialSubject: {
      id: "https://student.example/students/alice",
      name: "Alice Smith"
    }
  };

  // Sign credential
  const signer = await credential.signer(issuerController.privateKey);
  const signedCredential = await signer.sign(testCredentialWithSchema);

  // Verify with schema validation
  const verifier = await credential.verifierWithGenericResolver(genericResolver);
  const verifiedCredential = await verifier.verify(signedCredential, { validateSchema: true });

  expect(verifiedCredential.credentialSchema).toBeDefined();
  expect(verifiedCredential.credentialSchema![0].id).toBe("https://example.org/schemas/simple.json");
});

test("default generic resolver works", async () => {
  // Create controller
  const controller = await createController(
    "https://default.example/issuer",
    [],
    { type: "Point", coordinates: [-122.4194, 37.7749] },
    {}
  );

  // Add to default resolver
  resolver.defaultGenericResolver.addController("https://default.example/issuer", controller.controller);

  // Test that it works
  const resolved = await resolver.defaultGenericResolver.resolveController("https://default.example/issuer");
  expect(resolved).toBeDefined();
  expect(resolved.assertion).toBeDefined();
});