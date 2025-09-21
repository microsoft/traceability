import { test, expect } from "bun:test";

import { credential, key, presentation } from "../src";
import type { VerifiableCredential } from "../src/credential/credential";
import type { VerifiablePresentation } from "../src/presentation/presentation";

// Sample route credential for testing
const sampleRouteCredential: VerifiableCredential = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://www.w3.org/ns/credentials/examples/v2",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  type: ["VerifiableCredential", "RouteCredential"],
  issuer: "https://issuer.example/geo/9q8yyk", // Different from holder URL
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

test("create and verify presentation with enveloped route credential", async () => {
  // Generate different key pairs for issuer and holder
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const issuerPublicKey = await key.exportPublicKey(issuerPrivateKey);
  
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);
  
  // Verify keys are different
  expect(issuerPrivateKey.kid).not.toBe(holderPrivateKey.kid);
  expect(issuerPublicKey.kid).not.toBe(holderPublicKey.kid);
  
  // Create credential signer and sign the credential
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential = await credentialSigner.sign(sampleRouteCredential, { kid: issuerPrivateKey.kid });
  
  // Create enveloped verifiable credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);
  
  // Create presentation with enveloped credential
  const presentationData: VerifiablePresentation = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2"
    ],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example/geo/abc123", // Different from issuer URL
    verifiableCredential: [envelopedCredential]
  };
  
  // Verify URLs are different
  expect(presentationData.holder).not.toBe(sampleRouteCredential.issuer);
  
  // Create presentation signer and sign the presentation
  const presentationSigner = await presentation.signer(holderPrivateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, { kid: holderPrivateKey.kid });
  
  // Create presentation verifier and verify the presentation
  const presentationVerifier = await presentation.verifier(holderPublicKey);
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation);
  
  // Assertions
  expect(signedPresentation).toBeDefined();
  expect(typeof signedPresentation).toBe("string");
  expect(signedPresentation.split(".")).toHaveLength(3); // JWS format
  
  // Check core presentation properties
  expect(verifiedPresentation["@context"]).toEqual(presentationData["@context"]);
  expect(verifiedPresentation.type).toEqual(presentationData.type);
  expect(verifiedPresentation.holder).toBe(presentationData.holder);
  expect(verifiedPresentation.verifiableCredential).toHaveLength(1);
  expect(verifiedPresentation.verifiableCredential![0]).toEqual(envelopedCredential);
  // Check JWT claims are added
  expect(verifiedPresentation.iat).toBeDefined();
  expect(verifiedPresentation.exp).toBeDefined();
  expect(typeof verifiedPresentation.iat).toBe('number');
  expect(typeof verifiedPresentation.exp).toBe('number');
});

test("verify presentation with wrong holder key fails", async () => {
  // Generate different key pairs
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const issuerPublicKey = await key.exportPublicKey(issuerPrivateKey);
  
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const wrongHolderPrivateKey = await key.generatePrivateKey("ES256");
  const wrongHolderPublicKey = await key.exportPublicKey(wrongHolderPrivateKey);
  
  // Create and sign credential
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential = await credentialSigner.sign(sampleRouteCredential, { kid: issuerPrivateKey.kid });
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);
  
  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example/geo/abc123",
    verifiableCredential: [envelopedCredential]
  };
  
  // Sign with holder key
  const presentationSigner = await presentation.signer(holderPrivateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, { kid: holderPrivateKey.kid });
  
  // Try to verify with wrong holder key
  const wrongVerifier = await presentation.verifier(wrongHolderPublicKey);
  
  // This should throw an error
  await expect(wrongVerifier.verify(signedPresentation)).rejects.toThrow();
});

test("verify presentation with algorithm mismatch fails", async () => {
  // Generate ES256 key for holder
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  
  // Generate ES384 key for verification
  const es384PrivateKey = await key.generatePrivateKey("ES384");
  const es384PublicKey = await key.exportPublicKey(es384PrivateKey);
  
  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example/geo/abc123",
    verifiableCredential: []
  };
  
  // Sign with ES256
  const presentationSigner = await presentation.signer(holderPrivateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, { kid: holderPrivateKey.kid });
  
  // Try to verify with ES384
  const wrongVerifier = await presentation.verifier(es384PublicKey);
  
  // This should throw an error
  await expect(wrongVerifier.verify(signedPresentation)).rejects.toThrow("Algorithm mismatch");
});

test("verify presentation with key ID mismatch fails", async () => {
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);
  
  // Create fake public key with different key ID
  const fakePublicKey = { ...holderPublicKey, kid: "different-key-id" };
  
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example/geo/abc123",
    verifiableCredential: []
  };
  
  const presentationSigner = await presentation.signer(holderPrivateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, { kid: holderPrivateKey.kid });
  
  const wrongVerifier = await presentation.verifier(fakePublicKey);
  
  // This should throw an error
  await expect(wrongVerifier.verify(signedPresentation)).rejects.toThrow("Key ID mismatch");
});

test("verify malformed presentation JWS fails", async () => {
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);
  
  const verifier = await presentation.verifier(holderPublicKey);
  
  // Test with invalid JWS formats
  await expect(verifier.verify("invalid.jws")).rejects.toThrow("Invalid JWS format");
  await expect(verifier.verify("too.many.parts.here")).rejects.toThrow("Invalid JWS format");
  await expect(verifier.verify("")).rejects.toThrow("Invalid JWS format");
});

test("create and verify presentation with multiple enveloped credentials", async () => {
  // Generate different key pairs
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);
  
  // Create multiple route credentials
  const routeCredential1: VerifiableCredential = {
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
      name: "Route 1",
      geometry: {
        type: "LineString",
        coordinates: [[10.0, 20.0], [10.5, 20.5]]
      }
    }
  };
  
  const routeCredential2: VerifiableCredential = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2",
      "https://geojson.org/geojson-ld/geojson-context.jsonld"
    ],
    type: ["VerifiableCredential", "RouteCredential"],
    issuer: "https://issuer.example/geo/9q8yyk",
    credentialSubject: {
      id: "https://issuer.example/routes/route-002",
      type: "Route",
      name: "Route 2",
      geometry: {
        type: "LineString",
        coordinates: [[11.0, 21.0], [11.5, 21.5]]
      }
    }
  };
  
  // Sign both credentials
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential1 = await credentialSigner.sign(routeCredential1, { kid: issuerPrivateKey.kid });
  const signedCredential2 = await credentialSigner.sign(routeCredential2, { kid: issuerPrivateKey.kid });
  
  // Create enveloped credentials
  const envelopedCredential1 = credential.createEnvelopedVerifiableCredential(signedCredential1);
  const envelopedCredential2 = credential.createEnvelopedVerifiableCredential(signedCredential2);
  
  // Create presentation with multiple credentials
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example/geo/abc123",
    verifiableCredential: [envelopedCredential1, envelopedCredential2]
  };
  
  // Sign and verify presentation
  const presentationSigner = await presentation.signer(holderPrivateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, { kid: holderPrivateKey.kid });
  
  const presentationVerifier = await presentation.verifier(holderPublicKey);
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation);
  
  // Assertions
  expect(verifiedPresentation.verifiableCredential).toHaveLength(2);
  expect(verifiedPresentation.verifiableCredential![0]).toEqual(envelopedCredential1);
  expect(verifiedPresentation.verifiableCredential![1]).toEqual(envelopedCredential2);
});

test("create and verify presentation with ES384 algorithm", async () => {
  // Generate ES384 key pairs
  const issuerPrivateKey = await key.generatePrivateKey("ES384");
  const holderPrivateKey = await key.generatePrivateKey("ES384");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);
  
  // Create and sign credential
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential = await credentialSigner.sign(sampleRouteCredential, { kid: issuerPrivateKey.kid });
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);
  
  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example/geo/abc123",
    verifiableCredential: [envelopedCredential]
  };
  
  // Sign and verify
  const presentationSigner = await presentation.signer(holderPrivateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, { kid: holderPrivateKey.kid });
  
  const presentationVerifier = await presentation.verifier(holderPublicKey);
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation);

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
});

test("verify presentation with complex route credential", async () => {
  // Generate different key pairs
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);
  
  // Create complex route credential
  const complexRouteCredential: VerifiableCredential = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2",
      "https://geojson.org/geojson-ld/geojson-context.jsonld"
    ],
    type: ["VerifiableCredential", "TransportationRouteCredential"],
    issuer: "https://logistics.example/geo/xyz789", // Different from holder
    validFrom: "2023-01-01T00:00:00Z",
    validUntil: "2028-01-01T00:00:00Z",
    credentialSubject: {
      id: "https://logistics.example/routes/complex-route-001",
      type: "TransportationRoute",
      name: "Multi-Modal Transportation Route",
      description: "A complex route involving multiple transportation modes",
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [-122.4194, 37.7749],  // Start: San Francisco
            [-122.4094, 37.7849],  // Waypoint 1
            [-122.3994, 37.7949]   // End of first segment
          ],
          [
            [-122.3894, 37.8049],  // Start of second segment
            [-122.3794, 37.8149],  // Waypoint 2
            [-122.3694, 37.8249]   // End: Final destination
          ]
        ]
      },
      properties: {
        name: "Multi-Modal Transportation Route",
        description: "A complex route involving multiple transportation modes",
        routeType: "multi-modal",
        difficulty: "moderate",
        estimatedDuration: "2 hours",
        transportationModes: ["truck", "ship", "rail"],
        waypoints: [
          { name: "Port of Oakland", type: "port" },
          { name: "Rail Terminal", type: "rail" },
          { name: "Final Destination", type: "warehouse" }
        ]
      }
    }
  };
  
  // Create and sign credential
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential = await credentialSigner.sign(complexRouteCredential, { kid: issuerPrivateKey.kid });
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);
  
  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2"
    ],
    type: ["VerifiablePresentation"],
    holder: "https://carrier.example/geo/def456", // Different from issuer
    verifiableCredential: [envelopedCredential]
  };
  
  // Verify URLs are different
  expect(presentationData.holder).not.toBe(complexRouteCredential.issuer);
  
  // Sign and verify presentation
  const presentationSigner = await presentation.signer(holderPrivateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, { kid: holderPrivateKey.kid });
  
  const presentationVerifier = await presentation.verifier(holderPublicKey);
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation);
  
  // Check core presentation properties
  expect(verifiedPresentation["@context"]).toEqual(presentationData["@context"]);
  expect(verifiedPresentation.type).toEqual(presentationData.type);
  expect(verifiedPresentation.holder).toBe(presentationData.holder);
  expect(verifiedPresentation.verifiableCredential).toHaveLength(1);
  expect(verifiedPresentation.verifiableCredential).toEqual(presentationData.verifiableCredential);
  // Check JWT claims are added
  expect(verifiedPresentation.iat).toBeDefined();
  expect(verifiedPresentation.exp).toBeDefined();
  expect(typeof verifiedPresentation.iat).toBe('number');
  expect(typeof verifiedPresentation.exp).toBe('number');
  
  // Verify the enveloped credential structure
  const envelopedCred = verifiedPresentation.verifiableCredential![0];
  expect(envelopedCred["@context"]).toBe("https://www.w3.org/ns/credentials/v2");
  expect(envelopedCred.type).toBe("EnvelopedVerifiableCredential");
  expect(envelopedCred.id).toMatch(/^data:application\/vc\+jwt,/);
});

test("extract JWS from enveloped credential", async () => {
  // Generate key pair
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const issuerPublicKey = await key.exportPublicKey(issuerPrivateKey);
  
  // Create and sign credential
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential = await credentialSigner.sign(sampleRouteCredential, { kid: issuerPrivateKey.kid });
  
  // Create enveloped credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);
  
  // Extract JWS from enveloped credential
  const extractedJws = credential.createJsonWebSignatureFromEnvelopedVerifiableCredential(envelopedCredential);
  
  // Verify the extracted JWS is the same as the original
  expect(extractedJws).toBe(signedCredential);
  
  // Verify the extracted JWS can be verified
  const credentialVerifier = await credential.verifier(issuerPublicKey);
  const verifiedCredential = await credentialVerifier.verify(extractedJws);

  // Check core credential properties
  expect(verifiedCredential["@context"]).toEqual(sampleRouteCredential["@context"]);
  expect(verifiedCredential.type).toEqual(sampleRouteCredential.type);
  expect(verifiedCredential.issuer).toBe(sampleRouteCredential.issuer);
  expect(verifiedCredential.credentialSubject).toEqual(sampleRouteCredential.credentialSubject);
  // Check JWT claims are added
  expect(verifiedCredential.iat).toBeDefined();
  expect(typeof verifiedCredential.iat).toBe('number');
});

test("extract JWS from invalid enveloped credential fails", async () => {
  const invalidEnvelopedCredential = {
    "@context": "https://www.w3.org/ns/credentials/v2",
    id: "invalid-format",
    type: "EnvelopedVerifiableCredential"
  };
  
  // This should throw an error
  expect(() => {
    credential.createJsonWebSignatureFromEnvelopedVerifiableCredential(invalidEnvelopedCredential);
  }).toThrow("Invalid enveloped verifiable credential");
});