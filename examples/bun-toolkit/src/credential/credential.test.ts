import { test, expect } from "bun:test";
import { credential, key } from "../index";
import type { VerifiableCredential } from "./credential";

const sampleCredential: VerifiableCredential = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://www.w3.org/ns/credentials/examples/v2"
  ],
  type: ["VerifiableCredential", "TestCredential"],
  issuer: "https://issuer.example/test/001",
  credentialSubject: {
    id: "https://subject.example/test/001",
    name: "Test Subject",
    value: "Test Value"
  }
};

test("sign and verify basic credential", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);

  const signedCredential = await signer.sign(sampleCredential, { kid: privateKey.kid });
  const verifiedCredential = await verifier.verify(signedCredential);

  expect(signedCredential).toBeDefined();
  expect(typeof signedCredential).toBe("string");
  expect(signedCredential.split(".")).toHaveLength(3); // JWS format

  expect(verifiedCredential["@context"]).toEqual(sampleCredential["@context"]);
  expect(verifiedCredential.type).toEqual(sampleCredential.type);
  expect(verifiedCredential.issuer).toBe(sampleCredential.issuer);
  expect(verifiedCredential.credentialSubject).toEqual(sampleCredential.credentialSubject);
  expect(verifiedCredential.iat).toBeDefined();
  expect(typeof verifiedCredential.iat).toBe('number');
});

test("verify with wrong public key fails", async () => {
  const privateKey1 = await key.generatePrivateKey("ES256");
  const privateKey2 = await key.generatePrivateKey("ES256");
  const publicKey2 = await key.exportPublicKey(privateKey2);

  const signer = await credential.signer(privateKey1);
  const verifier = await credential.verifier(publicKey2);

  const signedCredential = await signer.sign(sampleCredential, { kid: privateKey1.kid });

  await expect(verifier.verify(signedCredential)).rejects.toThrow();
});

test("verify with algorithm mismatch fails", async () => {
  const es256PrivateKey = await key.generatePrivateKey("ES256");
  const es384PrivateKey = await key.generatePrivateKey("ES384");
  const es384PublicKey = await key.exportPublicKey(es384PrivateKey);

  const signer = await credential.signer(es256PrivateKey);
  const verifier = await credential.verifier(es384PublicKey);

  const signedCredential = await signer.sign(sampleCredential, { kid: es256PrivateKey.kid });

  await expect(verifier.verify(signedCredential)).rejects.toThrow("Algorithm mismatch");
});

test("verify malformed JWS fails", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const verifier = await credential.verifier(publicKey);

  await expect(verifier.verify("invalid.jws")).rejects.toThrow("Invalid JWS format");
  await expect(verifier.verify("too.many.parts.here")).rejects.toThrow("Invalid JWS format");
  await expect(verifier.verify("")).rejects.toThrow("Invalid JWS format");
});

test("credential with validFrom and validUntil", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);

  const now = new Date();
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const timedCredential: VerifiableCredential = {
    ...sampleCredential,
    validFrom: pastDate,
    validUntil: futureDate
  };

  const signedCredential = await signer.sign(timedCredential, { kid: privateKey.kid });
  const verifiedCredential = await verifier.verify(signedCredential);

  expect(verifiedCredential.iat).toBeDefined();
  expect(verifiedCredential.nbf).toBeDefined();
  expect(verifiedCredential.exp).toBeDefined();
  expect(verifiedCredential.validFrom).toBeUndefined(); // Converted to nbf
  expect(verifiedCredential.validUntil).toBeUndefined(); // Converted to exp
});

test("expired credential fails verification", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);

  const now = new Date();
  const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const expiredDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const expiredCredential: VerifiableCredential = {
    ...sampleCredential,
    validFrom: pastDate,
    validUntil: expiredDate
  };

  const signedCredential = await signer.sign(expiredCredential, { kid: privateKey.kid });

  await expect(verifier.verify(signedCredential)).rejects.toThrow("Credential has expired");
});

test("not yet valid credential fails verification", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);

  const now = new Date();
  const futureValidFrom = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const futureValidUntil = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

  const futureCredential: VerifiableCredential = {
    ...sampleCredential,
    validFrom: futureValidFrom,
    validUntil: futureValidUntil
  };

  const signedCredential = await signer.sign(futureCredential, { kid: privateKey.kid });

  await expect(verifier.verify(signedCredential)).rejects.toThrow("Credential is not yet valid");
});