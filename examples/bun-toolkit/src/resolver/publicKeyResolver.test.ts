import { test, expect } from "bun:test";
import { createPublicKeyResolver } from "./publicKeyResolver";
import { key } from "../index";

test("createPublicKeyResolver with single key", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const keyId = "https://test.example/keys/001#key-1";
  const resolver = await createPublicKeyResolver([[keyId, publicKey]]);

  const resolvedVerifier = await resolver.resolve(keyId);
  expect(resolvedVerifier).toBeDefined();
  expect(typeof resolvedVerifier.verify).toBe("function");
});

test("createPublicKeyResolver with multiple keys", async () => {
  const privateKey1 = await key.generatePrivateKey("ES256");
  const publicKey1 = await key.exportPublicKey(privateKey1);

  const privateKey2 = await key.generatePrivateKey("ES384");
  const publicKey2 = await key.exportPublicKey(privateKey2);

  const keyId1 = "https://test.example/keys/001#key-1";
  const keyId2 = "https://test.example/keys/001#key-2";

  const resolver = await createPublicKeyResolver([
    [keyId1, publicKey1],
    [keyId2, publicKey2]
  ]);

  const resolvedVerifier1 = await resolver.resolve(keyId1);
  const resolvedVerifier2 = await resolver.resolve(keyId2);

  expect(resolvedVerifier1).toBeDefined();
  expect(resolvedVerifier2).toBeDefined();
});

test("publicKeyResolver throws error for non-existent key", async () => {
  const resolver = await createPublicKeyResolver([]);

  await expect(resolver.resolve("https://nonexistent.example/keys/001#missing"))
    .rejects.toThrow("Public key not found for id: https://nonexistent.example/keys/001#missing");
});

test("resolved verifier can verify signatures", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const keyId = "https://test.example/keys/verify/001#key-1";
  const resolver = await createPublicKeyResolver([[keyId, publicKey]]);

  // Create a test credential
  const testCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://test.example/issuer",
    credentialSubject: { id: "test-subject", name: "Test" }
  };

  // Sign with the private key
  const { credential } = await import("../index");
  const signer = await credential.signer(privateKey);
  const signedCredential = await signer.sign(testCredential, { kid: privateKey.kid });

  // Verify with resolved verifier
  const resolvedVerifier = await resolver.resolve(keyId);
  const verifiedCredential = await resolvedVerifier.verify(signedCredential);

  expect(verifiedCredential.issuer).toBe("https://test.example/issuer");
  expect(verifiedCredential.credentialSubject.name).toBe("Test");
});