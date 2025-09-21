import { test, expect } from "bun:test";
import { presentation, key } from "../index";
import type { VerifiablePresentation } from "./presentation";

const testPresentation: VerifiablePresentation = {
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  type: ["VerifiablePresentation"],
  holder: "https://signer.example/holder/001",
  verifiableCredential: []
};

test("presentation signer with ES256", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const signer = await presentation.signer(privateKey);

  const signedPresentation = await signer.sign(testPresentation, { kid: privateKey.kid });

  expect(signedPresentation).toBeDefined();
  expect(typeof signedPresentation).toBe("string");
  expect(signedPresentation.split(".")).toHaveLength(3);

  // Verify structure is JWS
  const parts = signedPresentation.split(".");
  expect(parts[0]).toBeDefined(); // header
  expect(parts[1]).toBeDefined(); // payload
  expect(parts[2]).toBeDefined(); // signature
});

test("presentation signer with ES384", async () => {
  const privateKey = await key.generatePrivateKey("ES384");
  const signer = await presentation.signer(privateKey);

  const signedPresentation = await signer.sign(testPresentation, { kid: privateKey.kid });

  expect(signedPresentation).toBeDefined();
  expect(typeof signedPresentation).toBe("string");
  expect(signedPresentation.split(".")).toHaveLength(3);
});

test("signer adds JWT claims with expiration", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await presentation.signer(privateKey);
  const verifier = await presentation.verifier(publicKey);

  const signedPresentation = await signer.sign(testPresentation, { kid: privateKey.kid });
  const verifiedPresentation = await verifier.verify(signedPresentation);

  expect(verifiedPresentation.iat).toBeDefined();
  expect(verifiedPresentation.exp).toBeDefined();
  expect(typeof verifiedPresentation.iat).toBe('number');
  expect(typeof verifiedPresentation.exp).toBe('number');

  // exp should be after iat (presentation expires in the future)
  expect(verifiedPresentation.exp).toBeGreaterThan(verifiedPresentation.iat);
});

test("signer preserves verifiable credentials", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await presentation.signer(privateKey);
  const verifier = await presentation.verifier(publicKey);

  // Create presentation with mock credential
  const mockCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    id: "urn:vc:test:001",
    type: ["EnvelopedVerifiableCredential"]
  };

  const presentationWithCredential: VerifiablePresentation = {
    ...testPresentation,
    verifiableCredential: [mockCredential]
  };

  const signedPresentation = await signer.sign(presentationWithCredential, { kid: privateKey.kid });
  const verifiedPresentation = await verifier.verify(signedPresentation);

  expect(verifiedPresentation.verifiableCredential).toBeDefined();
  expect(verifiedPresentation.verifiableCredential).toHaveLength(1);
  expect(verifiedPresentation.verifiableCredential![0]).toEqual(mockCredential);
});

test("signer with custom options", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const signer = await presentation.signer(privateKey);

  const customOptions = {
    kid: "custom-holder-key-id",
    additionalClaims: {
      aud: "https://custom.verifier.example",
      jti: "unique-presentation-id"
    }
  };

  const signedPresentation = await signer.sign(testPresentation, customOptions);

  expect(signedPresentation).toBeDefined();
  expect(typeof signedPresentation).toBe("string");
});

test("signer handles empty credentials array", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await presentation.signer(privateKey);
  const verifier = await presentation.verifier(publicKey);

  const emptyPresentation: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example/empty/001",
    verifiableCredential: []
  };

  const signedPresentation = await signer.sign(emptyPresentation, { kid: privateKey.kid });
  const verifiedPresentation = await verifier.verify(signedPresentation);

  expect(verifiedPresentation.verifiableCredential).toEqual([]);
});

test("signer maintains presentation context and type", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await presentation.signer(privateKey);
  const verifier = await presentation.verifier(publicKey);

  const customPresentation: VerifiablePresentation = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://custom.context.example/v1"
    ],
    type: ["VerifiablePresentation", "CustomPresentation"],
    holder: "https://holder.example/custom/001",
    verifiableCredential: []
  };

  const signedPresentation = await signer.sign(customPresentation, { kid: privateKey.kid });
  const verifiedPresentation = await verifier.verify(signedPresentation);

  expect(verifiedPresentation["@context"]).toEqual(customPresentation["@context"]);
  expect(verifiedPresentation.type).toEqual(customPresentation.type);
  expect(verifiedPresentation.holder).toBe(customPresentation.holder);
});