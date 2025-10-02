import { test, expect } from "bun:test";
import { credential, key, presentation } from "../index";
import type { VerifiableCredential } from "../credential/credential";
import type { VerifiablePresentation } from "./presentation";

const sampleCredential: VerifiableCredential = {
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  type: ["VerifiableCredential", "TestCredential"],
  issuer: "https://issuer.example/test/001",
  credentialSubject: {
    id: "https://subject.example/test/001",
    name: "Test Subject"
  }
};

const samplePresentation: VerifiablePresentation = {
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  type: ["VerifiablePresentation"],
  holder: "https://holder.example/test/001",
  verifiableCredential: []
};

test("create and verify basic presentation", async () => {
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);

  const presentationSigner = await presentation.signer(holderPrivateKey);
  const presentationVerifier = await presentation.verifier(holderPublicKey);

  const signedPresentation = await presentationSigner.sign(samplePresentation, { kid: holderPrivateKey.kid });
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation);

  expect(signedPresentation).toBeDefined();
  expect(typeof signedPresentation).toBe("string");
  expect(signedPresentation.split(".")).toHaveLength(3); // JWS format

  expect(verifiedPresentation["@context"]).toEqual(samplePresentation["@context"]);
  expect(verifiedPresentation.type).toEqual(samplePresentation.type);
  expect(verifiedPresentation.holder).toBe(samplePresentation.holder);
  expect(verifiedPresentation.iat).toBeDefined();
  expect(verifiedPresentation.exp).toBeDefined();
  expect(typeof verifiedPresentation.iat).toBe('number');
  expect(typeof verifiedPresentation.exp).toBe('number');
});

test("presentation with enveloped credential", async () => {
  // Create and sign credential
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential = await credentialSigner.sign(sampleCredential, { kid: issuerPrivateKey.kid });

  // Create enveloped credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Create presentation with enveloped credential
  const presentationData: VerifiablePresentation = {
    ...samplePresentation,
    verifiableCredential: [envelopedCredential]
  };

  // Sign and verify presentation
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);

  const presentationSigner = await presentation.signer(holderPrivateKey);
  const presentationVerifier = await presentation.verifier(holderPublicKey);

  const signedPresentation = await presentationSigner.sign(presentationData, { kid: holderPrivateKey.kid });
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation);

  expect(verifiedPresentation.verifiableCredential).toHaveLength(1);
  expect(verifiedPresentation.verifiableCredential![0]).toEqual(envelopedCredential);
});

test("verify presentation with wrong holder key fails", async () => {
  const holderPrivateKey1 = await key.generatePrivateKey("ES256");
  const holderPrivateKey2 = await key.generatePrivateKey("ES256");
  const holderPublicKey2 = await key.exportPublicKey(holderPrivateKey2);

  const presentationSigner = await presentation.signer(holderPrivateKey1);
  const presentationVerifier = await presentation.verifier(holderPublicKey2);

  const signedPresentation = await presentationSigner.sign(samplePresentation, { kid: holderPrivateKey1.kid });

  await expect(presentationVerifier.verify(signedPresentation)).rejects.toThrow();
});

test("verify presentation with algorithm mismatch fails", async () => {
  const es256PrivateKey = await key.generatePrivateKey("ES256");
  const es384PrivateKey = await key.generatePrivateKey("ES384");
  const es384PublicKey = await key.exportPublicKey(es384PrivateKey);

  const presentationSigner = await presentation.signer(es256PrivateKey);
  const presentationVerifier = await presentation.verifier(es384PublicKey);

  const signedPresentation = await presentationSigner.sign(samplePresentation, { kid: es256PrivateKey.kid });

  await expect(presentationVerifier.verify(signedPresentation)).rejects.toThrow("Algorithm mismatch");
});

test("extract credential from enveloped format", async () => {
  // Create and sign credential
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential = await credentialSigner.sign(sampleCredential, { kid: issuerPrivateKey.kid });

  // Create enveloped credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Extract back to JWS format
  const extractedJWS = credential.createJsonWebSignatureFromEnvelopedVerifiableCredential(envelopedCredential);

  expect(extractedJWS).toBe(signedCredential);
  expect(typeof extractedJWS).toBe("string");
  expect(extractedJWS.split(".")).toHaveLength(3);
});

test("presentation with ES384 algorithm", async () => {
  const holderPrivateKey = await key.generatePrivateKey("ES384");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);

  const presentationSigner = await presentation.signer(holderPrivateKey);
  const presentationVerifier = await presentation.verifier(holderPublicKey);

  const signedPresentation = await presentationSigner.sign(samplePresentation, { kid: holderPrivateKey.kid });
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation);

  expect(verifiedPresentation.holder).toBe(samplePresentation.holder);
  expect(verifiedPresentation.iat).toBeDefined();
  expect(verifiedPresentation.exp).toBeDefined();
});

test("presentation with multiple credentials", async () => {
  // Create multiple credentials
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const credentialSigner = await credential.signer(issuerPrivateKey);

  const credential1 = await credentialSigner.sign(sampleCredential, { kid: issuerPrivateKey.kid });
  const credential2 = await credentialSigner.sign({
    ...sampleCredential,
    credentialSubject: { id: "subject-2", name: "Second Subject" }
  }, { kid: issuerPrivateKey.kid });

  const enveloped1 = credential.createEnvelopedVerifiableCredential(credential1);
  const enveloped2 = credential.createEnvelopedVerifiableCredential(credential2);

  // Create presentation with multiple credentials
  const presentationData: VerifiablePresentation = {
    ...samplePresentation,
    verifiableCredential: [enveloped1, enveloped2]
  };

  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);

  const presentationSigner = await presentation.signer(holderPrivateKey);
  const presentationVerifier = await presentation.verifier(holderPublicKey);

  const signedPresentation = await presentationSigner.sign(presentationData, { kid: holderPrivateKey.kid });
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation);

  expect(verifiedPresentation.verifiableCredential).toHaveLength(2);
  expect(verifiedPresentation.verifiableCredential![0]).toEqual(enveloped1);
  expect(verifiedPresentation.verifiableCredential![1]).toEqual(enveloped2);
});