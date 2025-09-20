import { test, expect } from "bun:test";

import { credential, key } from "../src";
import type { VerifiableCredential } from "../src/credential/credential";

// Sample credential for testing with GeoJSON route
const sampleCredential: VerifiableCredential = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://www.w3.org/ns/credentials/examples/v2",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  type: ["VerifiableCredential", "RouteCredential"],
  issuer: "https://supplier.example/geo/9q8yyk",
  credentialSubject: {
    id: "https://supplier.example/routes/route-001",
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

test("sign and verify credential", async () => {
  // Generate key pair
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);
  
  // Create signer and verifier
  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);
  
  // Sign the credential
  const signedCredential = await signer.sign(sampleCredential);
  
  // Verify the credential
  const verifiedCredential = await verifier.verify(signedCredential);
  
  // Assertions
  expect(signedCredential).toBeDefined();
  expect(typeof signedCredential).toBe("string");
  expect(signedCredential.split(".")).toHaveLength(3); // JWS format: header.payload.signature
  
  expect(verifiedCredential).toEqual(sampleCredential);
  expect(verifiedCredential["@context"]).toEqual(sampleCredential["@context"]);
  expect(verifiedCredential.type).toEqual(sampleCredential.type);
  expect(verifiedCredential.issuer).toBe(sampleCredential.issuer);
  expect(verifiedCredential.credentialSubject).toEqual(sampleCredential.credentialSubject);
});

test("verify with wrong public key fails", async () => {
  // Generate two different key pairs
  const privateKey1 = await key.generatePrivateKey("ES256");
  const publicKey1 = await key.exportPublicKey(privateKey1);
  
  const privateKey2 = await key.generatePrivateKey("ES256");
  const publicKey2 = await key.exportPublicKey(privateKey2);
  
  // Sign with first key, verify with second key
  const signer = await credential.signer(privateKey1);
  const verifier = await credential.verifier(publicKey2);
  
  const signedCredential = await signer.sign(sampleCredential);
  
  // This should throw an error (either key ID mismatch or invalid signature)
  await expect(verifier.verify(signedCredential)).rejects.toThrow();
});

test("verify with algorithm mismatch fails", async () => {
  // Generate ES256 key pair
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);
  
  // Generate ES384 key pair
  const es384PrivateKey = await key.generatePrivateKey("ES384");
  const es384PublicKey = await key.exportPublicKey(es384PrivateKey);
  
  // Sign with ES256, verify with ES384 (different algorithm)
  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(es384PublicKey);
  
  const signedCredential = await signer.sign(sampleCredential);
  
  // This should throw an error
  await expect(verifier.verify(signedCredential)).rejects.toThrow("Algorithm mismatch");
});

test("verify with key ID mismatch fails", async () => {
  // Generate key pair
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);
  
  // Create a fake public key with different key ID
  const fakePublicKey = { ...publicKey, kid: "different-key-id" };
  
  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(fakePublicKey);
  
  const signedCredential = await signer.sign(sampleCredential);
  
  // This should throw an error
  await expect(verifier.verify(signedCredential)).rejects.toThrow("Key ID mismatch");
});

test("verify malformed JWS fails", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);
  
  const verifier = await credential.verifier(publicKey);
  
  // Test with invalid JWS formats
  await expect(verifier.verify("invalid.jws")).rejects.toThrow("Invalid JWS format");
  await expect(verifier.verify("too.many.parts.here")).rejects.toThrow("Invalid JWS format");
  await expect(verifier.verify("")).rejects.toThrow("Invalid JWS format");
});

test("sign and verify with ES384 algorithm", async () => {
  // Generate ES384 key pair
  const privateKey = await key.generatePrivateKey("ES384");
  const publicKey = await key.exportPublicKey(privateKey);
  
  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);
  
  const signedCredential = await signer.sign(sampleCredential);
  const verifiedCredential = await verifier.verify(signedCredential);
  
  expect(verifiedCredential).toEqual(sampleCredential);
});

test("sign and verify credential with different subject data", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);
  
  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);
  
  // Test with different credential subject - a more complex route
  const customCredential: VerifiableCredential = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2", 
      "https://www.w3.org/ns/credentials/examples/v2",
      "https://geojson.org/geojson-ld/geojson-context.jsonld"
    ],
    type: ["VerifiableCredential", "TransportationRouteCredential"],
    issuer: "https://supplier.example/geo/9q8yyk",
    validFrom: "2023-01-01T00:00:00Z",
    validUntil: "2028-01-01T00:00:00Z",
    credentialSubject: {
      id: "https://supplier.example/routes/transport-route-001",
      type: "TransportationRoute",
      name: "Coastal Highway Route",
      description: "A scenic coastal route with multiple waypoints",
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.4194, 37.7749],  // San Francisco
          [-122.4094, 37.7849],  // Waypoint 1
          [-122.3994, 37.7949],  // Waypoint 2
          [-122.3894, 37.8049],  // Waypoint 3
          [-122.3794, 37.8149]   // Final destination
        ]
      },
      properties: {
        name: "Coastal Highway Route",
        description: "A scenic coastal route with multiple waypoints",
        routeType: "highway",
        difficulty: "easy",
        estimatedDuration: "45 minutes"
      }
    }
  };
  
  const signedCredential = await signer.sign(customCredential);
  const verifiedCredential = await verifier.verify(signedCredential);
  
  expect(verifiedCredential).toEqual(customCredential);
  expect(verifiedCredential.credentialSubject.geometry).toEqual(customCredential.credentialSubject.geometry);
  expect(verifiedCredential.credentialSubject.properties).toEqual(customCredential.credentialSubject.properties);
});