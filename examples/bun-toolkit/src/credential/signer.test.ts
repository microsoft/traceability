import { test, expect } from "bun:test";
import { credential, key } from "../index";
import type { VerifiableCredential } from "./credential";

const testCredential: VerifiableCredential = {
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  type: ["VerifiableCredential", "SignerTestCredential"],
  issuer: "https://signer.example/test/001",
  credentialSubject: {
    id: "https://subject.example/test/001",
    name: "Signer Test Subject"
  }
};

test("credential signer with ES256", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const signer = await credential.signer(privateKey);

  const signedCredential = await signer.sign(testCredential, { kid: privateKey.kid });

  expect(signedCredential).toBeDefined();
  expect(typeof signedCredential).toBe("string");
  expect(signedCredential.split(".")).toHaveLength(3);

  // Verify structure is JWS
  const parts = signedCredential.split(".");
  expect(parts[0]).toBeDefined(); // header
  expect(parts[1]).toBeDefined(); // payload
  expect(parts[2]).toBeDefined(); // signature
});

test("credential signer with ES384", async () => {
  const privateKey = await key.generatePrivateKey("ES384");
  const signer = await credential.signer(privateKey);

  const signedCredential = await signer.sign(testCredential, { kid: privateKey.kid });

  expect(signedCredential).toBeDefined();
  expect(typeof signedCredential).toBe("string");
  expect(signedCredential.split(".")).toHaveLength(3);
});

test("signer adds JWT claims", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);

  const signedCredential = await signer.sign(testCredential, { kid: privateKey.kid });
  const verifiedCredential = await verifier.verify(signedCredential);

  expect(verifiedCredential.iat).toBeDefined();
  expect(typeof verifiedCredential.iat).toBe('number');
  expect(verifiedCredential.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
});

test("signer handles validFrom and validUntil conversion", async () => {
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
  expect(verifiedCredential.validFrom).toBeUndefined();
  expect(verifiedCredential.validUntil).toBeUndefined();
});

test("signer with custom options", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const signer = await credential.signer(privateKey);

  const customOptions = {
    kid: "custom-key-id",
    additionalClaims: {
      iss: "https://custom.issuer.example",
      aud: "https://custom.audience.example"
    }
  };

  const signedCredential = await signer.sign(testCredential, customOptions);

  expect(signedCredential).toBeDefined();
  expect(typeof signedCredential).toBe("string");
});

test("signer preserves credential schema", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await credential.signer(privateKey);
  const verifier = await credential.verifier(publicKey);

  const credentialWithSchema: VerifiableCredential = {
    ...testCredential,
    credentialSchema: [
      {
        id: "https://schemas.example/test.json",
        type: "JsonSchema"
      }
    ]
  };

  const signedCredential = await signer.sign(credentialWithSchema, { kid: privateKey.kid });
  const verifiedCredential = await verifier.verify(signedCredential);

  expect(verifiedCredential.credentialSchema).toBeDefined();
  expect(verifiedCredential.credentialSchema).toHaveLength(1);
  expect(verifiedCredential.credentialSchema![0].id).toBe("https://schemas.example/test.json");
});