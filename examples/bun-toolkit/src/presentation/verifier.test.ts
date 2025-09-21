import { test, expect } from "bun:test";
import { presentation, key } from "../index";
import type { VerifiablePresentation } from "./presentation";

const testPresentation: VerifiablePresentation = {
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  type: ["VerifiablePresentation"],
  holder: "https://verifier.example/holder/001",
  verifiableCredential: []
};

test("presentation verifier with valid signature", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await presentation.signer(privateKey);
  const verifier = await presentation.verifier(publicKey);

  const signedPresentation = await signer.sign(testPresentation, { kid: privateKey.kid });
  const verifiedPresentation = await verifier.verify(signedPresentation);

  expect(verifiedPresentation).toBeDefined();
  expect(verifiedPresentation.holder).toBe(testPresentation.holder);
  expect(verifiedPresentation.verifiableCredential).toEqual(testPresentation.verifiableCredential);
});

test("verifier with invalid signature fails", async () => {
  const privateKey1 = await key.generatePrivateKey("ES256");
  const privateKey2 = await key.generatePrivateKey("ES256");
  const publicKey2 = await key.exportPublicKey(privateKey2);

  const signer = await presentation.signer(privateKey1);
  const verifier = await presentation.verifier(publicKey2);

  const signedPresentation = await signer.sign(testPresentation, { kid: privateKey1.kid });

  await expect(verifier.verify(signedPresentation)).rejects.toThrow();
});


test("verifier validates expiration time", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await presentation.signer(privateKey);
  const verifier = await presentation.verifier(publicKey);

  const signedPresentation = await signer.sign(testPresentation, { kid: privateKey.kid });
  const verifiedPresentation = await verifier.verify(signedPresentation);

  expect(verifiedPresentation.exp).toBeDefined();
  expect(typeof verifiedPresentation.exp).toBe('number');

  // Presentation should be valid now (exp is in the future)
  const currentTime = Math.floor(Date.now() / 1000);
  expect(verifiedPresentation.exp).toBeGreaterThan(currentTime);
});

test("verifier handles malformed JWS", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const verifier = await presentation.verifier(publicKey);

  await expect(verifier.verify("not.a.valid.jws")).rejects.toThrow("Invalid JWS format");
  await expect(verifier.verify("invalid")).rejects.toThrow("Invalid JWS format");
  await expect(verifier.verify("")).rejects.toThrow("Invalid JWS format");
});

test("verifier with ES384 algorithm", async () => {
  const privateKey = await key.generatePrivateKey("ES384");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await presentation.signer(privateKey);
  const verifier = await presentation.verifier(publicKey);

  const signedPresentation = await signer.sign(testPresentation, { kid: privateKey.kid });
  const verifiedPresentation = await verifier.verify(signedPresentation);

  expect(verifiedPresentation).toBeDefined();
  expect(verifiedPresentation.holder).toBe(testPresentation.holder);
});

test("verifier preserves verifiable credentials", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await presentation.signer(privateKey);
  const verifier = await presentation.verifier(publicKey);

  const mockCredentials = [
    {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      id: "urn:vc:test:001",
      type: ["EnvelopedVerifiableCredential"]
    },
    {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      id: "urn:vc:test:002",
      type: ["EnvelopedVerifiableCredential"]
    }
  ];

  const presentationWithCredentials: VerifiablePresentation = {
    ...testPresentation,
    verifiableCredential: mockCredentials
  };

  const signedPresentation = await signer.sign(presentationWithCredentials, { kid: privateKey.kid });
  const verifiedPresentation = await verifier.verify(signedPresentation);

  expect(verifiedPresentation.verifiableCredential).toHaveLength(2);
  expect(verifiedPresentation.verifiableCredential).toEqual(mockCredentials);
});

test("verifier with algorithm mismatch fails", async () => {
  const es256PrivateKey = await key.generatePrivateKey("ES256");
  const es384PrivateKey = await key.generatePrivateKey("ES384");
  const es384PublicKey = await key.exportPublicKey(es384PrivateKey);

  const signer = await presentation.signer(es256PrivateKey);
  const verifier = await presentation.verifier(es384PublicKey);

  const signedPresentation = await signer.sign(testPresentation, { kid: es256PrivateKey.kid });

  await expect(verifier.verify(signedPresentation)).rejects.toThrow("Algorithm mismatch");
});

test("verifier validates JWT structure", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await presentation.signer(privateKey);
  const verifier = await presentation.verifier(publicKey);

  const signedPresentation = await signer.sign(testPresentation, { kid: privateKey.kid });
  const verifiedPresentation = await verifier.verify(signedPresentation);

  // Should have standard JWT claims
  expect(verifiedPresentation.iat).toBeDefined();
  expect(verifiedPresentation.exp).toBeDefined();
  expect(typeof verifiedPresentation.iat).toBe('number');
  expect(typeof verifiedPresentation.exp).toBe('number');

  // Should preserve original presentation data
  expect(verifiedPresentation["@context"]).toEqual(testPresentation["@context"]);
  expect(verifiedPresentation.type).toEqual(testPresentation.type);
  expect(verifiedPresentation.holder).toBe(testPresentation.holder);
});