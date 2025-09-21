import { test, expect } from "bun:test";
import { key, credential, presentation } from "../src";
import type { VerifiableCredential } from "../src/credential/credential";
import type { VerifiablePresentation } from "../src/presentation/presentation";

test("credential includes iat claim", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const testCredential: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://subject.example",
      name: "Test Subject"
    }
  };

  const signer = await credential.signer(privateKey);
  const signedCredential = await signer.sign(testCredential, { kid: privateKey.kid });

  const verifier = await credential.verifier(publicKey);
  const verifiedCredential = await verifier.verify(signedCredential);

  // Check that iat is present and is a recent timestamp
  expect(verifiedCredential.iat).toBeDefined();
  expect(typeof verifiedCredential.iat).toBe('number');

  const now = Math.floor(Date.now() / 1000);
  expect(verifiedCredential.iat).toBeLessThanOrEqual(now);
  expect(verifiedCredential.iat).toBeGreaterThan(now - 10); // Created within last 10 seconds
});

test("credential with validFrom converts to nbf", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const futureDate = new Date();
  futureDate.setSeconds(futureDate.getSeconds() - 60); // 1 minute ago (valid)

  const testCredential: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    validFrom: futureDate.toISOString(),
    credentialSubject: {
      id: "https://subject.example",
      name: "Test Subject"
    }
  };

  const signer = await credential.signer(privateKey);
  const signedCredential = await signer.sign(testCredential, { kid: privateKey.kid });

  const verifier = await credential.verifier(publicKey);
  const verifiedCredential = await verifier.verify(signedCredential);

  // Check that nbf is present
  expect(verifiedCredential.nbf).toBeDefined();
  expect(typeof verifiedCredential.nbf).toBe('number');
  expect(verifiedCredential.nbf).toBe(Math.floor(futureDate.getTime() / 1000));
});

test("credential with validUntil converts to exp", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + 1); // 1 hour from now

  const testCredential: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    validUntil: futureDate.toISOString(),
    credentialSubject: {
      id: "https://subject.example",
      name: "Test Subject"
    }
  };

  const signer = await credential.signer(privateKey);
  const signedCredential = await signer.sign(testCredential, { kid: privateKey.kid });

  const verifier = await credential.verifier(publicKey);
  const verifiedCredential = await verifier.verify(signedCredential);

  // Check that exp is present
  expect(verifiedCredential.exp).toBeDefined();
  expect(typeof verifiedCredential.exp).toBe('number');
  expect(verifiedCredential.exp).toBe(Math.floor(futureDate.getTime() / 1000));
});

test("credential not yet valid (nbf in future) fails verification", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const futureDate = new Date();
  futureDate.setMinutes(futureDate.getMinutes() + 5); // 5 minutes from now

  const testCredential: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    validFrom: futureDate.toISOString(),
    credentialSubject: {
      id: "https://subject.example",
      name: "Test Subject"
    }
  };

  const signer = await credential.signer(privateKey);
  const signedCredential = await signer.sign(testCredential, { kid: privateKey.kid });

  const verifier = await credential.verifier(publicKey);

  await expect(verifier.verify(signedCredential))
    .rejects.toThrow(/Credential is not yet valid/);
});

test("expired credential (exp in past) fails verification", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const pastDate = new Date();
  pastDate.setSeconds(pastDate.getSeconds() - 10); // 10 seconds ago

  const testCredential: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    validUntil: pastDate.toISOString(),
    credentialSubject: {
      id: "https://subject.example",
      name: "Test Subject"
    }
  };

  const signer = await credential.signer(privateKey);
  const signedCredential = await signer.sign(testCredential, { kid: privateKey.kid });

  const verifier = await credential.verifier(publicKey);

  await expect(verifier.verify(signedCredential))
    .rejects.toThrow(/Credential has expired/);
});

test("presentation includes iat and exp claims", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const testPresentation: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example"
  };

  const signer = await presentation.signer(privateKey);
  const signedPresentation = await signer.sign(testPresentation, { kid: privateKey.kid });

  const verifier = await presentation.verifier(publicKey);
  const verifiedPresentation = await verifier.verify(signedPresentation);

  // Check that iat is present
  expect(verifiedPresentation.iat).toBeDefined();
  expect(typeof verifiedPresentation.iat).toBe('number');

  // Check that exp is present and is 1 hour from iat
  expect(verifiedPresentation.exp).toBeDefined();
  expect(typeof verifiedPresentation.exp).toBe('number');
  expect(verifiedPresentation.exp).toBe(verifiedPresentation.iat! + 3600);
});

test("expired presentation fails verification", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const testPresentation: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example"
  };

  const signer = await presentation.signer(privateKey);

  // Create a presentation that was issued 2 hours ago (should be expired since exp is 1 hour)
  const twoHoursAgo = new Date(Date.now() - 7200000);
  const signedPresentation = await signer.sign(testPresentation, {
    kid: privateKey.kid,
    issuanceTime: twoHoursAgo
  });

  const verifier = await presentation.verifier(publicKey);

  await expect(verifier.verify(signedPresentation))
    .rejects.toThrow(/Presentation has expired/);
});

test("presentation issued in future fails verification", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const testPresentation: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example"
  };

  const signer = await presentation.signer(privateKey);

  // Create a presentation that appears to be issued in the future (beyond 60 second clock skew)
  const futureTime = new Date(Date.now() + 120000); // 120 seconds in the future
  const signedPresentation = await signer.sign(testPresentation, {
    kid: privateKey.kid,
    issuanceTime: futureTime
  });

  const verifier = await presentation.verifier(publicKey);

  await expect(verifier.verify(signedPresentation))
    .rejects.toThrow(/presentation issued in the future/);
});

test("JWT claims are preserved after verification", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const validFromDate = new Date();
  validFromDate.setMinutes(validFromDate.getMinutes() - 5); // 5 minutes ago

  const validUntilDate = new Date();
  validUntilDate.setHours(validUntilDate.getHours() + 1); // 1 hour from now

  const testCredential: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    validFrom: validFromDate.toISOString(),
    validUntil: validUntilDate.toISOString(),
    credentialSubject: {
      id: "https://subject.example",
      name: "Test Subject"
    }
  };

  const signer = await credential.signer(privateKey);
  const signedCredential = await signer.sign(testCredential, { kid: privateKey.kid });

  const verifier = await credential.verifier(publicKey);
  const verifiedCredential = await verifier.verify(signedCredential);

  // All JWT claims should be present
  expect(verifiedCredential.iat).toBeDefined();
  expect(verifiedCredential.nbf).toBeDefined();
  expect(verifiedCredential.exp).toBeDefined();

  // Original properties should NOT be removed
  expect(verifiedCredential.issuer).toBe("https://issuer.example");
  expect(verifiedCredential.credentialSubject).toBeDefined();
  expect(verifiedCredential.credentialSubject.name).toBe("Test Subject");
});