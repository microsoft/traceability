import { test, expect } from "bun:test";
import { key, credential, presentation } from "../src";
import type { VerifiableCredential } from "../src/credential/credential";
import type { VerifiablePresentation } from "../src/presentation/presentation";

test("presentation with cnf claim must be signed by the specified key", async () => {
  // Create issuer key
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const issuerPublicKey = await key.exportPublicKey(issuerPrivateKey);

  // Create holder key
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);

  // Create credential with cnf claim pointing to holder's key
  const credentialWithCnf: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      name: "Test Holder"
    },
    cnf: {
      kid: holderPublicKey.kid // Holder's key as confirmation (top-level)
    }
  };

  // Sign credential with issuer's key
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential = await credentialSigner.sign(credentialWithCnf);

  // Create enveloped credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example",
    verifiableCredential: [envelopedCredential]
  };

  // Sign presentation with holder's key (correct key)
  const presentationSigner = await presentation.signer(holderPrivateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create verifiers
  const credentialVerifiers = new Map();
  credentialVerifiers.set(issuerPublicKey.kid, await credential.verifier(issuerPublicKey));

  // Verify presentation with credential validation
  const presentationVerifier = await presentation.verifierWithCredentialValidation(holderPublicKey);
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation, credentialVerifiers);

  expect(verifiedPresentation).toBeDefined();
  expect(verifiedPresentation.holder).toBe("https://holder.example");
});

test("presentation with cnf claim fails when signed by wrong key", async () => {
  // Create issuer key
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const issuerPublicKey = await key.exportPublicKey(issuerPrivateKey);

  // Create holder key
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);

  // Create another key (wrong key)
  const wrongPrivateKey = await key.generatePrivateKey("ES256");
  const wrongPublicKey = await key.exportPublicKey(wrongPrivateKey);

  // Create credential with cnf claim pointing to holder's key
  const credentialWithCnf: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      name: "Test Holder"
    },
    cnf: {
      kid: holderPublicKey.kid // Requires holder's key (top-level)
    }
  };

  // Sign credential with issuer's key
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential = await credentialSigner.sign(credentialWithCnf);

  // Create enveloped credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example",
    verifiableCredential: [envelopedCredential]
  };

  // Sign presentation with WRONG key
  const presentationSigner = await presentation.signer(wrongPrivateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create verifiers
  const credentialVerifiers = new Map();
  credentialVerifiers.set(issuerPublicKey.kid, await credential.verifier(issuerPublicKey));

  // Try to verify presentation with wrong key
  const presentationVerifier = await presentation.verifierWithCredentialValidation(wrongPublicKey);

  // This should fail because presentation is signed with wrong key
  await expect(presentationVerifier.verify(signedPresentation, credentialVerifiers))
    .rejects.toThrow(`Presentation key mismatch: credential requires key ${holderPublicKey.kid} but presentation was signed with ${wrongPublicKey.kid}`);
});

test("presentation without cnf claim can be signed by any key", async () => {
  // Create issuer key
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const issuerPublicKey = await key.exportPublicKey(issuerPrivateKey);

  // Create any holder key
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);

  // Create credential WITHOUT cnf claim
  const credentialWithoutCnf: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://subject.example",
      name: "Test Subject"
      // No cnf claim
    }
  };

  // Sign credential with issuer's key
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential = await credentialSigner.sign(credentialWithoutCnf);

  // Create enveloped credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example",
    verifiableCredential: [envelopedCredential]
  };

  // Sign presentation with any holder key (should work without cnf)
  const presentationSigner = await presentation.signer(holderPrivateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create verifiers
  const credentialVerifiers = new Map();
  credentialVerifiers.set(issuerPublicKey.kid, await credential.verifier(issuerPublicKey));

  // Verify presentation should succeed
  const presentationVerifier = await presentation.verifierWithCredentialValidation(holderPublicKey);
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation, credentialVerifiers);

  expect(verifiedPresentation).toBeDefined();
  expect(verifiedPresentation.holder).toBe("https://holder.example");
});

test("multiple credentials with different cnf claims all must match presentation signer", async () => {
  // Create issuer key
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const issuerPublicKey = await key.exportPublicKey(issuerPrivateKey);

  // Create holder key
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);

  // Create first credential with cnf claim
  const credential1: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      role: "admin"
    },
    cnf: {
      kid: holderPublicKey.kid
    }
  };

  // Create second credential with same cnf claim
  const credential2: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      role: "developer"
    },
    cnf: {
      kid: holderPublicKey.kid
    }
  };

  // Sign both credentials
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential1 = await credentialSigner.sign(credential1);
  const signedCredential2 = await credentialSigner.sign(credential2);

  // Create enveloped credentials
  const envelopedCredential1 = credential.createEnvelopedVerifiableCredential(signedCredential1);
  const envelopedCredential2 = credential.createEnvelopedVerifiableCredential(signedCredential2);

  // Create presentation with both credentials
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example",
    verifiableCredential: [envelopedCredential1, envelopedCredential2]
  };

  // Sign presentation with holder's key
  const presentationSigner = await presentation.signer(holderPrivateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create verifiers
  const credentialVerifiers = new Map();
  credentialVerifiers.set(issuerPublicKey.kid, await credential.verifier(issuerPublicKey));

  // Verify presentation with both credentials
  const presentationVerifier = await presentation.verifierWithCredentialValidation(holderPublicKey);
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation, credentialVerifiers);

  expect(verifiedPresentation).toBeDefined();
  expect(verifiedPresentation.verifiableCredential).toHaveLength(2);
});

test("mixed credentials with and without cnf claims", async () => {
  // Create issuer key
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const issuerPublicKey = await key.exportPublicKey(issuerPrivateKey);

  // Create holder key
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);

  // Create credential WITH cnf claim
  const credentialWithCnf: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      role: "admin"
    },
    cnf: {
      kid: holderPublicKey.kid
    }
  };

  // Create credential WITHOUT cnf claim
  const credentialWithoutCnf: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      role: "user"
      // No cnf claim
    }
  };

  // Sign both credentials
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential1 = await credentialSigner.sign(credentialWithCnf);
  const signedCredential2 = await credentialSigner.sign(credentialWithoutCnf);

  // Create enveloped credentials
  const envelopedCredential1 = credential.createEnvelopedVerifiableCredential(signedCredential1);
  const envelopedCredential2 = credential.createEnvelopedVerifiableCredential(signedCredential2);

  // Create presentation with both credentials
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example",
    verifiableCredential: [envelopedCredential1, envelopedCredential2]
  };

  // Sign presentation with holder's key (matches cnf in first credential)
  const presentationSigner = await presentation.signer(holderPrivateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create verifiers
  const credentialVerifiers = new Map();
  credentialVerifiers.set(issuerPublicKey.kid, await credential.verifier(issuerPublicKey));

  // Verify presentation should succeed
  const presentationVerifier = await presentation.verifierWithCredentialValidation(holderPublicKey);
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation, credentialVerifiers);

  expect(verifiedPresentation).toBeDefined();
  expect(verifiedPresentation.verifiableCredential).toHaveLength(2);
});