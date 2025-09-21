import { test, expect } from "bun:test";
import { credential, key } from "../index";
import type { VerifiableCredential } from "./credential";

const testCredential: VerifiableCredential = {
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  type: ["VerifiableCredential", "VerifierTestCredential"],
  issuer: "https://verifier.example/test/001",
  credentialSubject: {
    id: "https://subject.example/test/001",
    name: "Verifier Test Subject"
  }
};

test("credential verifier with valid signature", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);

  const signedCredential = await signer.sign(testCredential, { kid: privateKey.kid });
  const verifiedCredential = await verifier.verify(signedCredential);

  expect(verifiedCredential).toBeDefined();
  expect(verifiedCredential.issuer).toBe(testCredential.issuer);
  expect(verifiedCredential.credentialSubject).toEqual(testCredential.credentialSubject);
});

test("verifier with invalid signature fails", async () => {
  const privateKey1 = await key.generatePrivateKey("ES256");
  const privateKey2 = await key.generatePrivateKey("ES256");
  const publicKey2 = await key.exportPublicKey(privateKey2);

  const signer = await credential.signer(privateKey1);
  const verifier = await credential.verifier(publicKey2);

  const signedCredential = await signer.sign(testCredential, { kid: privateKey1.kid });

  await expect(verifier.verify(signedCredential)).rejects.toThrow();
});


test("verifier validates time claims", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);

  const now = new Date();
  const validFrom = new Date(now.getTime() - 60000).toISOString(); // 1 minute ago
  const validUntil = new Date(now.getTime() + 60000).toISOString(); // 1 minute from now

  const timedCredential: VerifiableCredential = {
    ...testCredential,
    validFrom,
    validUntil
  };

  const signedCredential = await signer.sign(timedCredential, { kid: privateKey.kid });
  const verifiedCredential = await verifier.verify(signedCredential);

  expect(verifiedCredential.nbf).toBeDefined();
  expect(verifiedCredential.exp).toBeDefined();
});

test("verifier rejects expired credentials", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);

  const now = new Date();
  const expiredDate = new Date(now.getTime() - 60000).toISOString(); // 1 minute ago

  const expiredCredential: VerifiableCredential = {
    ...testCredential,
    validUntil: expiredDate
  };

  const signedCredential = await signer.sign(expiredCredential, { kid: privateKey.kid });

  await expect(verifier.verify(signedCredential)).rejects.toThrow("Credential has expired");
});

test("verifier rejects not yet valid credentials", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);

  const now = new Date();
  const futureDate = new Date(now.getTime() + 60000).toISOString(); // 1 minute from now

  const futureCredential: VerifiableCredential = {
    ...testCredential,
    validFrom: futureDate
  };

  const signedCredential = await signer.sign(futureCredential, { kid: privateKey.kid });

  await expect(verifier.verify(signedCredential)).rejects.toThrow("Credential is not yet valid");
});

test("verifier handles malformed JWS", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const verifier = await credential.verifier(publicKey);

  await expect(verifier.verify("not.a.valid.jws")).rejects.toThrow("Invalid JWS format");
  await expect(verifier.verify("invalid")).rejects.toThrow("Invalid JWS format");
  await expect(verifier.verify("")).rejects.toThrow("Invalid JWS format");
});

test("verifier with ES384 algorithm", async () => {
  const privateKey = await key.generatePrivateKey("ES384");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);

  const signedCredential = await signer.sign(testCredential, { kid: privateKey.kid });
  const verifiedCredential = await verifier.verify(signedCredential);

  expect(verifiedCredential).toBeDefined();
  expect(verifiedCredential.issuer).toBe(testCredential.issuer);
});