import { test, expect } from "bun:test";

import { credential, key, presentation, resolver } from "../src";
import { createController } from "../src/controller/controller";
import type { VerifiableCredential } from "../src/credential/credential";
import type { VerifiablePresentation } from "../src/presentation/presentation";

// Sample credential for testing
const sampleCredential: VerifiableCredential = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://www.w3.org/ns/credentials/examples/v2",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  type: ["VerifiableCredential", "RouteCredential"],
  issuer: "https://issuer.example/geo/9q8yyk",
  credentialSubject: {
    id: "https://issuer.example/routes/route-001",
    type: "Route",
    name: "Example Route",
    description: "A simple path between three points",
    geometry: {
      type: "LineString",
      coordinates: [
        [10.0, 20.0],
        [10.5, 20.5],
        [11.0, 21.0]
      ]
    },
    properties: {
      name: "Example Route",
      description: "A simple path between three points"
    }
  }
};

// Sample presentation for testing
const samplePresentation: VerifiablePresentation = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://www.w3.org/ns/credentials/examples/v2"
  ],
  type: ["VerifiablePresentation"],
  holder: "https://holder.example/geo/abc123",
  verifiableCredential: []
};

// Test data for controllers
const issuerGeometry = {
  type: "Point" as const,
  coordinates: [-122.4194, 37.7749] as [number, number]
};

const holderGeometry = {
  type: "Point" as const,
  coordinates: [-122.4094, 37.7849] as [number, number]
};

const issuerAddress = {
  streetAddress: "123 Issuer Street",
  addressLocality: "San Francisco",
  addressRegion: "CA",
  postalCode: "94102",
  addressCountry: "US"
};

const holderAddress = {
  streetAddress: "456 Holder Avenue",
  addressLocality: "Oakland",
  addressRegion: "CA",
  postalCode: "94601",
  addressCountry: "US"
};

test("create controller resolver with issuer and holder controllers", async () => {
  // Create issuer controller
  const issuerController = await createController(
    "https://issuer.example/geo/9q8yyk",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

  // Create holder controller
  const holderController = await createController(
    "https://holder.example/geo/abc123",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example/geo/9q8yyk", issuerController.controller],
    ["https://holder.example/geo/abc123", holderController.controller]
  ]);

  // Test resolving issuer controller
  const issuerResolvers = await controllerResolver.resolve("https://issuer.example/geo/9q8yyk");
  expect(issuerResolvers).toBeDefined();
  expect(issuerResolvers.assertion).toBeDefined();
  expect(issuerResolvers.authentication).toBeDefined();

  // Test resolving holder controller
  const holderResolvers = await controllerResolver.resolve("https://holder.example/geo/abc123");
  expect(holderResolvers).toBeDefined();
  expect(holderResolvers.assertion).toBeDefined();
  expect(holderResolvers.authentication).toBeDefined();
});

test("resolve non-existent controller throws error", async () => {
  const controllerResolver = await resolver.createControllerResolver([]);

  await expect(controllerResolver.resolve("https://nonexistent.example/geo/xyz")).rejects.toThrow(
    "Controller not found for id: https://nonexistent.example/geo/xyz"
  );
});

test("verify credential with issuer's assertion key through resolver", async () => {
  // Create issuer controller
  const issuerController = await createController(
    "https://issuer.example/geo/9q8yyk",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example/geo/9q8yyk", issuerController.controller]
  ]);

  // Get assertion key resolver for issuer
  const issuerResolvers = await controllerResolver.resolve("https://issuer.example/geo/9q8yyk");
  const assertionKeyResolver = await issuerResolvers.assertion;

  // Sign credential with issuer's private key
  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(sampleCredential, { kid: issuerController.privateKey.kid });

  // Get the verification method ID from the controller
  const verificationMethodId = issuerController.controller.verificationMethod[0]!.id;

  // Verify credential using assertion key resolver
  const assertionVerifier = await assertionKeyResolver.resolve(verificationMethodId);
  const verifiedCredential = await assertionVerifier.verify(signedCredential);

  // Assertions
  // Check core credential properties
  expect(verifiedCredential["@context"]).toEqual(sampleCredential["@context"]);
  expect(verifiedCredential.type).toEqual(sampleCredential.type);
  expect(verifiedCredential.issuer).toBe(sampleCredential.issuer);
  expect(verifiedCredential.credentialSubject).toEqual(sampleCredential.credentialSubject);
  // Check JWT claims are added
  expect(verifiedCredential.iat).toBeDefined();
  expect(typeof verifiedCredential.iat).toBe('number');
  expect(verifiedCredential.issuer).toBe("https://issuer.example/geo/9q8yyk");
});

test("verify presentation with holder's authentication key through resolver", async () => {
  // Create holder controller
  const holderController = await createController(
    "https://holder.example/geo/abc123",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://holder.example/geo/abc123", holderController.controller]
  ]);

  // Get authentication key resolver for holder
  const holderResolvers = await controllerResolver.resolve("https://holder.example/geo/abc123");
  const authenticationKeyResolver = await holderResolvers.authentication;

  // Sign presentation with holder's private key
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(samplePresentation, { kid: holderController.privateKey.kid });

  // Get the verification method ID from the controller
  const verificationMethodId = holderController.controller.verificationMethod[0]!.id;

  // Verify presentation using authentication key resolver
  const authenticationVerifier = await authenticationKeyResolver.resolve(verificationMethodId);
  const verifiedPresentation = await authenticationVerifier.verify(signedPresentation);

  // Assertions
  // Check core presentation properties
  expect(verifiedPresentation["@context"]).toEqual(samplePresentation["@context"]);
  expect(verifiedPresentation.type).toEqual(samplePresentation.type);
  expect(verifiedPresentation.holder).toBe(samplePresentation.holder);
  // Check JWT claims are added
  expect(verifiedPresentation.iat).toBeDefined();
  expect(verifiedPresentation.exp).toBeDefined();
  expect(typeof verifiedPresentation.iat).toBe('number');
  expect(typeof verifiedPresentation.exp).toBe('number');
  expect(verifiedPresentation.holder).toBe("https://holder.example/geo/abc123");
});

test("verify credential with wrong assertion key fails", async () => {
  // Create two different issuer controllers
  const issuerController1 = await createController(
    "https://issuer1.example/geo/9q8yyk",
    ["https://issuer1.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

  const issuerController2 = await createController(
    "https://issuer2.example/geo/xyz789",
    ["https://issuer2.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

  // Create controller resolver with both controllers
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer1.example/geo/9q8yyk", issuerController1.controller],
    ["https://issuer2.example/geo/xyz789", issuerController2.controller]
  ]);

  // Sign credential with first issuer's private key
  const credentialSigner = await credential.signer(issuerController1.privateKey);
  const signedCredential = await credentialSigner.sign(sampleCredential, { kid: issuerController1.privateKey.kid });

  // Try to verify with second issuer's assertion key
  const issuer2Resolvers = await controllerResolver.resolve("https://issuer2.example/geo/xyz789");
  const assertionKeyResolver = await issuer2Resolvers.assertion;
  const verificationMethodId = issuerController2.controller.verificationMethod[0]!.id;

  const assertionVerifier = await assertionKeyResolver.resolve(verificationMethodId);

  // This should throw an error
  await expect(assertionVerifier.verify(signedCredential)).rejects.toThrow();
});

test("verify presentation with wrong authentication key fails", async () => {
  // Create two different holder controllers
  const holderController1 = await createController(
    "https://holder1.example/geo/abc123",
    ["https://holder1.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  const holderController2 = await createController(
    "https://holder2.example/geo/def456",
    ["https://holder2.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create controller resolver with both controllers
  const controllerResolver = await resolver.createControllerResolver([
    ["https://holder1.example/geo/abc123", holderController1.controller],
    ["https://holder2.example/geo/def456", holderController2.controller]
  ]);

  // Sign presentation with first holder's private key
  const presentationSigner = await presentation.signer(holderController1.privateKey);
  const signedPresentation = await presentationSigner.sign(samplePresentation, { kid: holderController1.privateKey.kid });

  // Try to verify with second holder's authentication key
  const holder2Resolvers = await controllerResolver.resolve("https://holder2.example/geo/def456");
  const authenticationKeyResolver = await holder2Resolvers.authentication;
  const verificationMethodId = holderController2.controller.verificationMethod[0]!.id;

  const authenticationVerifier = await authenticationKeyResolver.resolve(verificationMethodId);

  // This should throw an error
  await expect(authenticationVerifier.verify(signedPresentation)).rejects.toThrow();
});

test("verify credential with non-existent assertion key fails", async () => {
  // Create issuer controller
  const issuerController = await createController(
    "https://issuer.example/geo/9q8yyk",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example/geo/9q8yyk", issuerController.controller]
  ]);

  // Get assertion key resolver for issuer
  const issuerResolvers = await controllerResolver.resolve("https://issuer.example/geo/9q8yyk");
  const assertionKeyResolver = await issuerResolvers.assertion;

  // Sign credential with issuer's private key
  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(sampleCredential, { kid: issuerController.privateKey.kid });

  // Try to resolve non-existent assertion key
  await expect(assertionKeyResolver.resolve("https://issuer.example/geo/9q8yyk#non-existent-key")).rejects.toThrow(
    "Public key not found for id: https://issuer.example/geo/9q8yyk#non-existent-key"
  );
});

test("verify presentation with non-existent authentication key fails", async () => {
  // Create holder controller
  const holderController = await createController(
    "https://holder.example/geo/abc123",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://holder.example/geo/abc123", holderController.controller]
  ]);

  // Get authentication key resolver for holder
  const holderResolvers = await controllerResolver.resolve("https://holder.example/geo/abc123");
  const authenticationKeyResolver = await holderResolvers.authentication;

  // Sign presentation with holder's private key
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(samplePresentation, { kid: holderController.privateKey.kid });

  // Try to resolve non-existent authentication key
  await expect(authenticationKeyResolver.resolve("https://holder.example/geo/abc123#non-existent-key")).rejects.toThrow(
    "Public key not found for id: https://holder.example/geo/abc123#non-existent-key"
  );
});

test("verify credential with ES384 algorithm through resolver", async () => {
  // Create issuer controller with ES384
  const issuerController = await createController(
    "https://issuer.example/geo/9q8yyk",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES384"
  );

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example/geo/9q8yyk", issuerController.controller]
  ]);

  // Get assertion key resolver for issuer
  const issuerResolvers = await controllerResolver.resolve("https://issuer.example/geo/9q8yyk");
  const assertionKeyResolver = await issuerResolvers.assertion;

  // Sign credential with issuer's private key
  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(sampleCredential, { kid: issuerController.privateKey.kid });

  // Get the verification method ID from the controller
  const verificationMethodId = issuerController.controller.verificationMethod[0]!.id;

  // Verify credential using assertion key resolver
  const assertionVerifier = await assertionKeyResolver.resolve(verificationMethodId);
  const verifiedCredential = await assertionVerifier.verify(signedCredential);

  // Assertions
  // Check core credential properties
  expect(verifiedCredential["@context"]).toEqual(sampleCredential["@context"]);
  expect(verifiedCredential.type).toEqual(sampleCredential.type);
  expect(verifiedCredential.issuer).toBe(sampleCredential.issuer);
  expect(verifiedCredential.credentialSubject).toEqual(sampleCredential.credentialSubject);
  // Check JWT claims are added
  expect(verifiedCredential.iat).toBeDefined();
  expect(typeof verifiedCredential.iat).toBe('number');
  expect(verifiedCredential.issuer).toBe("https://issuer.example/geo/9q8yyk");
});

test("verify presentation with ES384 algorithm through resolver", async () => {
  // Create holder controller with ES384
  const holderController = await createController(
    "https://holder.example/geo/abc123",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES384"
  );

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://holder.example/geo/abc123", holderController.controller]
  ]);

  // Get authentication key resolver for holder
  const holderResolvers = await controllerResolver.resolve("https://holder.example/geo/abc123");
  const authenticationKeyResolver = await holderResolvers.authentication;

  // Sign presentation with holder's private key
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(samplePresentation, { kid: holderController.privateKey.kid });

  // Get the verification method ID from the controller
  const verificationMethodId = holderController.controller.verificationMethod[0]!.id;

  // Verify presentation using authentication key resolver
  const authenticationVerifier = await authenticationKeyResolver.resolve(verificationMethodId);
  const verifiedPresentation = await authenticationVerifier.verify(signedPresentation);

  // Assertions
  // Check core presentation properties
  expect(verifiedPresentation["@context"]).toEqual(samplePresentation["@context"]);
  expect(verifiedPresentation.type).toEqual(samplePresentation.type);
  expect(verifiedPresentation.holder).toBe(samplePresentation.holder);
  // Check JWT claims are added
  expect(verifiedPresentation.iat).toBeDefined();
  expect(verifiedPresentation.exp).toBeDefined();
  expect(typeof verifiedPresentation.iat).toBe('number');
  expect(typeof verifiedPresentation.exp).toBe('number');
  expect(verifiedPresentation.holder).toBe("https://holder.example/geo/abc123");
});

test("end-to-end: issuer creates credential, holder creates presentation, both verified through resolvers", async () => {
  // Create issuer controller
  const issuerController = await createController(
    "https://issuer.example/geo/9q8yyk",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

  // Create holder controller
  const holderController = await createController(
    "https://holder.example/geo/abc123",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create controller resolver with both controllers
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example/geo/9q8yyk", issuerController.controller],
    ["https://holder.example/geo/abc123", holderController.controller]
  ]);

  // Step 1: Issuer creates and signs credential
  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(sampleCredential, { kid: issuerController.privateKey.kid });

  // Step 2: Verify credential using issuer's assertion key through resolver
  const issuerResolvers = await controllerResolver.resolve("https://issuer.example/geo/9q8yyk");
  const assertionKeyResolver = await issuerResolvers.assertion;
  const issuerVerificationMethodId = issuerController.controller.verificationMethod[0]!.id;
  const assertionVerifier = await assertionKeyResolver.resolve(issuerVerificationMethodId);
  const verifiedCredential = await assertionVerifier.verify(signedCredential);

  // Check core credential properties
  expect(verifiedCredential["@context"]).toEqual(sampleCredential["@context"]);
  expect(verifiedCredential.type).toEqual(sampleCredential.type);
  expect(verifiedCredential.issuer).toBe(sampleCredential.issuer);
  expect(verifiedCredential.credentialSubject).toEqual(sampleCredential.credentialSubject);
  // Check JWT claims are added
  expect(verifiedCredential.iat).toBeDefined();
  expect(typeof verifiedCredential.iat).toBe('number');

  // Step 3: Create enveloped credential for presentation
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Step 4: Create presentation with enveloped credential
  const presentationData: VerifiablePresentation = {
    ...samplePresentation,
    verifiableCredential: [envelopedCredential]
  };

  // Step 5: Holder signs presentation
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, { kid: holderController.privateKey.kid });

  // Step 6: Verify presentation using holder's authentication key through resolver
  const holderResolvers = await controllerResolver.resolve("https://holder.example/geo/abc123");
  const authenticationKeyResolver = await holderResolvers.authentication;
  const holderVerificationMethodId = holderController.controller.verificationMethod[0]!.id;
  const authenticationVerifier = await authenticationKeyResolver.resolve(holderVerificationMethodId);
  const verifiedPresentation = await authenticationVerifier.verify(signedPresentation);

  // Assertions
  // Check core presentation properties
  expect(verifiedPresentation["@context"]).toEqual(presentationData["@context"]);
  expect(verifiedPresentation.type).toEqual(presentationData.type);
  expect(verifiedPresentation.holder).toBe(presentationData.holder);
  expect(verifiedPresentation.verifiableCredential).toEqual(presentationData.verifiableCredential);
  // Check JWT claims are added
  expect(verifiedPresentation.iat).toBeDefined();
  expect(verifiedPresentation.exp).toBeDefined();
  expect(typeof verifiedPresentation.iat).toBe('number');
  expect(typeof verifiedPresentation.exp).toBe('number');
  expect(verifiedPresentation.holder).toBe("https://holder.example/geo/abc123");
  expect(verifiedPresentation.verifiableCredential).toHaveLength(1);
  expect(verifiedPresentation.verifiableCredential![0]).toEqual(envelopedCredential);
});

test("verify credential with algorithm mismatch through resolver fails", async () => {
  // Create issuer controller with ES256
  const issuerController = await createController(
    "https://issuer.example/geo/9q8yyk",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

  // Create holder controller with ES384
  const holderController = await createController(
    "https://holder.example/geo/abc123",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES384"
  );

  // Create controller resolver with both controllers
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example/geo/9q8yyk", issuerController.controller],
    ["https://holder.example/geo/abc123", holderController.controller]
  ]);

  // Sign credential with ES256 issuer key
  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(sampleCredential, { kid: issuerController.privateKey.kid });

  // Try to verify with ES384 holder's authentication key (wrong algorithm)
  const holderResolvers = await controllerResolver.resolve("https://holder.example/geo/abc123");
  const authenticationKeyResolver = await holderResolvers.authentication;
  const holderVerificationMethodId = holderController.controller.verificationMethod[0]!.id;
  const authenticationVerifier = await authenticationKeyResolver.resolve(holderVerificationMethodId);

  // This should throw an error due to algorithm mismatch
  await expect(authenticationVerifier.verify(signedCredential)).rejects.toThrow("Algorithm mismatch");
});

test("verify presentation with algorithm mismatch through resolver fails", async () => {
  // Create issuer controller with ES384
  const issuerController = await createController(
    "https://issuer.example/geo/9q8yyk",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES384"
  );

  // Create holder controller with ES256
  const holderController = await createController(
    "https://holder.example/geo/abc123",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create controller resolver with both controllers
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example/geo/9q8yyk", issuerController.controller],
    ["https://holder.example/geo/abc123", holderController.controller]
  ]);

  // Sign presentation with ES256 holder key
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(samplePresentation, { kid: holderController.privateKey.kid });

  // Try to verify with ES384 issuer's assertion key (wrong algorithm)
  const issuerResolvers = await controllerResolver.resolve("https://issuer.example/geo/9q8yyk");
  const assertionKeyResolver = await issuerResolvers.assertion;
  const issuerVerificationMethodId = issuerController.controller.verificationMethod[0]!.id;
  const assertionVerifier = await assertionKeyResolver.resolve(issuerVerificationMethodId);

  // This should throw an error due to algorithm mismatch
  await expect(assertionVerifier.verify(signedPresentation)).rejects.toThrow("Algorithm mismatch");
});

test("credential with holder as subject and cnf claim", async () => {
  // Create issuer controller
  const issuerController = await createController(
    "https://issuer.example/geo/9q8yyk",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

  // Create holder controller
  const holderController = await createController(
    "https://holder.example/geo/abc123",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Get holder's authentication key ID
  const holderAuthKeyId = holderController.controller.verificationMethod.find(
    vm => holderController.controller.authentication.includes(vm.id)
  )?.id;

  // Create credential with holder as subject and cnf claim
  const credentialWithCnf: VerifiableCredential = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2",
      "https://geojson.org/geojson-ld/geojson-context.jsonld"
    ],
    type: ["VerifiableCredential", "RouteCredential"],
    issuer: "https://issuer.example/geo/9q8yyk",
    credentialSubject: {
      id: "https://holder.example/geo/abc123", // Holder as subject
      type: "Route",
      name: "Holder's Route",
      description: "A route assigned to the holder",
      geometry: holderGeometry,
      properties: {
        name: "Holder's Route",
        description: "A route assigned to the holder"
      }
    },
    cnf: {
      kid: holderAuthKeyId // Holder's authentication key as confirmation (top-level)
    }
  };

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example/geo/9q8yyk", issuerController.controller],
    ["https://holder.example/geo/abc123", holderController.controller]
  ]);

  // Sign credential with issuer's private key
  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(credentialWithCnf, { kid: issuerController.privateKey.kid });

  // Verify credential using issuer's assertion key through resolver
  const issuerResolvers = await controllerResolver.resolve("https://issuer.example/geo/9q8yyk");
  const assertionKeyResolver = await issuerResolvers.assertion;
  const issuerVerificationMethodId = issuerController.controller.verificationMethod[0]!.id;
  const assertionVerifier = await assertionKeyResolver.resolve(issuerVerificationMethodId);
  const verifiedCredential = await assertionVerifier.verify(signedCredential);

  // Verify the credential content
  expect(verifiedCredential.credentialSubject.id).toBe("https://holder.example/geo/abc123");
  expect(verifiedCredential.cnf?.kid).toBe(holderAuthKeyId);

  // Create presentation with the credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);
  const presentationData: VerifiablePresentation = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2"
    ],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example/geo/abc123",
    verifiableCredential: [envelopedCredential]
  };

  // Sign presentation with holder's private key
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, { kid: holderController.privateKey.kid });

  // Verify presentation using holder's authentication key through resolver
  const holderResolvers = await controllerResolver.resolve("https://holder.example/geo/abc123");
  const authenticationKeyResolver = await holderResolvers.authentication;
  const holderVerificationMethodId = holderController.controller.verificationMethod[0]!.id;
  const authenticationVerifier = await authenticationKeyResolver.resolve(holderVerificationMethodId);
  const verifiedPresentation = await authenticationVerifier.verify(signedPresentation);

  // Verify the presentation and contained credential
  expect(verifiedPresentation.holder).toBe("https://holder.example/geo/abc123");
  expect(verifiedPresentation.verifiableCredential).toHaveLength(1);

  // Extract and verify the credential from the presentation
  const credentialFromPresentation = credential.createJsonWebSignatureFromEnvelopedVerifiableCredential(
    verifiedPresentation.verifiableCredential[0] as any
  );
  const reVerifiedCredential = await assertionVerifier.verify(credentialFromPresentation);

  expect(reVerifiedCredential.credentialSubject.id).toBe("https://holder.example/geo/abc123");
  expect(reVerifiedCredential.cnf?.kid).toBe(holderAuthKeyId);
});