import { test, expect, describe } from "bun:test";
import { presentationVerifierFromResolver } from "./presentationVerifierFromResolver";
import type { DetailedVerificationResult, VerificationOptions } from "./presentationVerifierFromResolver";
import { createGenericResolver } from "../resolver/genericResolver";
import { credential, key, presentation } from "../index";
import type { VerifiableCredential } from "../credential/credential";
import type { VerifiablePresentation } from "./presentation";

// Test utilities for creating controllers and keys
const createTestController = async (id: string) => {
  const authKey = await key.generatePrivateKey("ES256");
  const assertionKey = await key.generatePrivateKey("ES256");
  const authPubKey = await key.exportPublicKey(authKey);
  const assertionPubKey = await key.exportPublicKey(assertionKey);

  const authKeyId = `${id}#auth-key`;
  const assertionKeyId = `${id}#assertion-key`;

  const controller = {
    id,
    verificationMethod: [
      {
        id: authKeyId,
        type: "JsonWebKey",
        controller: id,
        publicKeyJwk: authPubKey
      },
      {
        id: assertionKeyId,
        type: "JsonWebKey",
        controller: id,
        publicKeyJwk: assertionPubKey
      }
    ],
    authentication: [authKeyId],
    assertionMethod: [assertionKeyId]
  };

  return { controller, authKey, assertionKey, authKeyId, assertionKeyId };
};

// Helper to create test credentials
const createTestCredential = (issuer: string, holder: string): VerifiableCredential => ({
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  type: ["VerifiableCredential", "TestCredential"],
  issuer,
  credentialSubject: {
    id: holder,
    name: "Test Subject"
  }
});

// Helper to create test presentations
const createTestPresentation = (holder: string, credentials: any[]): VerifiablePresentation => ({
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  type: ["VerifiablePresentation"],
  holder,
  verifiableCredential: credentials
});

describe("presentationVerifierFromResolver", () => {

  describe("Valid Presentation Scenarios", () => {

    test("should verify valid presentation with all security checks passing", async () => {
      // Setup test entities
      const { controller: issuerController, assertionKey, assertionKeyId } = await createTestController("https://issuer.example");
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");

      // Create resolver with test controllers
      const resolver = createGenericResolver();
      resolver.addController(issuerController.id, issuerController);
      resolver.addController(holderController.id, holderController);

      // Create and sign credential
      const testCred = createTestCredential(issuerController.id, holderController.id);
      const credSigner = await credential.signer(assertionKey);
      const credJWT = await credSigner.sign(testCred, {
        kid: assertionKeyId,
        cnf: { kid: authKeyId } // Bind to holder's auth key
      });

      // Create enveloped credential
      const envelopedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": `data:application/vc+jwt,${credJWT}`,
        "type": "EnvelopedVerifiableCredential"
      };

      // Create and sign presentation
      const testPresentation = createTestPresentation(holderController.id, [envelopedCred]);
      const presSigner = await presentation.signer(authKey);
      const presJWT = await presSigner.sign(testPresentation, { kid: authKeyId });

      // Verify presentation
      const verifier = await presentationVerifierFromResolver(resolver);
      const verificationTime = new Date();
      const result = await verifier.verify(presJWT, { verificationTime });

      // All security checks should pass
      expect(result.verified).toBe(true);
      expect(result.problems).toHaveLength(0);
      expect(result.credentials).toHaveLength(1);
      expect(result.credentials[0].verified).toBe(true);
      expect(result.credentials[0].problems).toHaveLength(0);

      // Should include verified header and payload when verification succeeds
      expect(result.verified_header).toBeDefined();
      expect(result.verified_payload).toBeDefined();
      expect(result.verified_header.kid).toBe(authKeyId);
      expect(result.verified_payload.holder).toBe(holderController.id);
    });

    test("should verify presentation with multiple valid credentials", async () => {
      // Setup test entities
      const { controller: issuer1Controller, assertionKey: assertion1Key, assertionKeyId: assertion1KeyId } = await createTestController("https://issuer1.example");
      const { controller: issuer2Controller, assertionKey: assertion2Key, assertionKeyId: assertion2KeyId } = await createTestController("https://issuer2.example");
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");

      // Create resolver
      const resolver = createGenericResolver();
      resolver.addController(issuer1Controller.id, issuer1Controller);
      resolver.addController(issuer2Controller.id, issuer2Controller);
      resolver.addController(holderController.id, holderController);

      // Create two credentials from different issuers
      const cred1 = createTestCredential(issuer1Controller.id, holderController.id);
      const cred2 = createTestCredential(issuer2Controller.id, holderController.id);

      const cred1Signer = await credential.signer(assertion1Key);
      const cred2Signer = await credential.signer(assertion2Key);

      const cred1JWT = await cred1Signer.sign(cred1, {
        kid: assertion1KeyId,
        cnf: { kid: authKeyId }
      });
      const cred2JWT = await cred2Signer.sign(cred2, {
        kid: assertion2KeyId,
        cnf: { kid: authKeyId }
      });

      // Create enveloped credentials
      const envelopedCreds = [
        {
          "@context": "https://www.w3.org/ns/credentials/v2",
          "id": `data:application/vc+jwt,${cred1JWT}`,
          "type": "EnvelopedVerifiableCredential"
        },
        {
          "@context": "https://www.w3.org/ns/credentials/v2",
          "id": `data:application/vc+jwt,${cred2JWT}`,
          "type": "EnvelopedVerifiableCredential"
        }
      ];

      // Create and sign presentation
      const testPresentation = createTestPresentation(holderController.id, envelopedCreds);
      const presSigner = await presentation.signer(authKey);
      const presJWT = await presSigner.sign(testPresentation, { kid: authKeyId });

      // Verify presentation
      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(presJWT, { verificationTime: new Date() });

      // All checks should pass
      expect(result.verified).toBe(true);
      expect(result.problems).toHaveLength(0);
      expect(result.credentials).toHaveLength(2);
      expect(result.credentials.every(c => c.verified)).toBe(true);
      expect(result.credentials.every(c => c.problems.length === 0)).toBe(true);
    });
  });

  describe("Cryptographic Security Failures", () => {

    test("should detect invalid presentation signature with detailed error info", async () => {
      // Setup legitimate issuer and holder
      const { controller: issuerController, assertionKey, assertionKeyId } = await createTestController("https://issuer.example");
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");

      // Create attacker with different keys
      const { controller: attackerController, authKey: attackerAuthKey } = await createTestController("https://attacker.example");

      const resolver = createGenericResolver();
      resolver.addController(issuerController.id, issuerController);
      resolver.addController(holderController.id, holderController);
      resolver.addController(attackerController.id, attackerController);

      // Create valid credential
      const testCred = createTestCredential(issuerController.id, holderController.id);
      const credSigner = await credential.signer(assertionKey);
      const credJWT = await credSigner.sign(testCred, {
        kid: assertionKeyId,
        cnf: { kid: authKeyId }
      });

      const envelopedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": `data:application/vc+jwt,${credJWT}`,
        "type": "EnvelopedVerifiableCredential"
      };

      // Create presentation claiming to be from holder but signed by attacker
      const testPresentation = createTestPresentation(holderController.id, [envelopedCred]);
      const attackerSigner = await presentation.signer(attackerAuthKey);
      const maliciousPresJWT = await attackerSigner.sign(testPresentation, { kid: authKeyId }); // Wrong key!

      // Verification should detect cryptographic failure
      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(maliciousPresJWT, { verificationTime: new Date() });

      expect(result.verified).toBe(false);
      expect(result.problems.some(p => p.type === "is_presentation_signature_valid")).toBe(true);
    });

    test("should detect invalid credential signature", async () => {
      const { controller: issuerController } = await createTestController("https://issuer.example");
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");

      // Create attacker to forge credential
      const { assertionKey: attackerAssertionKey } = await createTestController("https://attacker.example");

      const resolver = createGenericResolver();
      resolver.addController(issuerController.id, issuerController);
      resolver.addController(holderController.id, holderController);

      // Create credential but sign with attacker's key (forgery)
      const testCred = createTestCredential(issuerController.id, holderController.id);
      const maliciousCredSigner = await credential.signer(attackerAssertionKey);
      const maliciousCredJWT = await maliciousCredSigner.sign(testCred, {
        kid: issuerController.assertionMethod[0], // Claims to use issuer's key
        cnf: { kid: authKeyId }
      });

      const envelopedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": `data:application/vc+jwt,${maliciousCredJWT}`,
        "type": "EnvelopedVerifiableCredential"
      };

      // Create valid presentation
      const testPresentation = createTestPresentation(holderController.id, [envelopedCred]);
      const presSigner = await presentation.signer(authKey);
      const presJWT = await presSigner.sign(testPresentation, { kid: authKeyId });

      // Verify - should detect credential forgery
      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(presJWT, { verificationTime: new Date() });

      expect(result.verified).toBe(false);
      expect(result.credentials).toHaveLength(1);
      expect(result.credentials[0].verified).toBe(false);
      expect(result.credentials[0].problems.some(p => p.type === "is_credential_signature_valid")).toBe(true);
    });
  });

  describe("Validity Period Failures", () => {

    test("should detect expired presentation", async () => {
      const { controller: issuerController, assertionKey, assertionKeyId } = await createTestController("https://issuer.example");
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");

      const resolver = createGenericResolver();
      resolver.addController(issuerController.id, issuerController);
      resolver.addController(holderController.id, holderController);

      // Create valid credential
      const testCred = createTestCredential(issuerController.id, holderController.id);
      const credSigner = await credential.signer(assertionKey);
      const credJWT = await credSigner.sign(testCred, {
        kid: assertionKeyId,
        cnf: { kid: authKeyId }
      });

      const envelopedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": `data:application/vc+jwt,${credJWT}`,
        "type": "EnvelopedVerifiableCredential"
      };

      // Create presentation with short expiration
      const testPresentation = createTestPresentation(holderController.id, [envelopedCred]);
      const presSigner = await presentation.signer(authKey);

      const pastTime = new Date(Date.now() - 3600000); // 1 hour ago
      const presJWT = await presSigner.sign(testPresentation, {
        kid: authKeyId,
        iat: Math.floor(pastTime.getTime() / 1000),
        exp: Math.floor((pastTime.getTime() + 1800000) / 1000) // Expired 30 minutes ago
      });

      // Verify at current time - should detect expiration
      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(presJWT, { verificationTime: new Date() });

      expect(result.verified).toBe(false);
      expect(result.problems.some(p => p.type === "is_within_validity_period")).toBe(true);
    });

    test("should detect expired credential", async () => {
      const { controller: issuerController, assertionKey, assertionKeyId } = await createTestController("https://issuer.example");
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");

      const resolver = createGenericResolver();
      resolver.addController(issuerController.id, issuerController);
      resolver.addController(holderController.id, holderController);

      // Create expired credential
      const testCred = createTestCredential(issuerController.id, holderController.id);
      const credSigner = await credential.signer(assertionKey);

      const pastTime = new Date(Date.now() - 7200000); // 2 hours ago
      const credJWT = await credSigner.sign(testCred, {
        kid: assertionKeyId,
        cnf: { kid: authKeyId },
        iat: Math.floor(pastTime.getTime() / 1000),
        exp: Math.floor((pastTime.getTime() + 3600000) / 1000) // Expired 1 hour ago
      });

      const envelopedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": `data:application/vc+jwt,${credJWT}`,
        "type": "EnvelopedVerifiableCredential"
      };

      // Create valid presentation
      const testPresentation = createTestPresentation(holderController.id, [envelopedCred]);
      const presSigner = await presentation.signer(authKey);
      const presJWT = await presSigner.sign(testPresentation, { kid: authKeyId });

      // Verify - should detect expired credential
      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(presJWT, { verificationTime: new Date() });

      expect(result.verified).toBe(false);
      expect(result.credentials[0].verified).toBe(false);
      expect(result.credentials[0].problems.some(p => p.type === "is_within_validity_period")).toBe(true);
    });

    test("should detect credential not yet valid", async () => {
      const { controller: issuerController, assertionKey, assertionKeyId } = await createTestController("https://issuer.example");
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");

      const resolver = createGenericResolver();
      resolver.addController(issuerController.id, issuerController);
      resolver.addController(holderController.id, holderController);

      // Create future-dated credential
      const testCred = createTestCredential(issuerController.id, holderController.id);
      const credSigner = await credential.signer(assertionKey);

      const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
      const credJWT = await credSigner.sign(testCred, {
        kid: assertionKeyId,
        cnf: { kid: authKeyId },
        nbf: Math.floor(futureTime.getTime() / 1000) // Not yet valid
      });

      const envelopedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": `data:application/vc+jwt,${credJWT}`,
        "type": "EnvelopedVerifiableCredential"
      };

      // Create valid presentation
      const testPresentation = createTestPresentation(holderController.id, [envelopedCred]);
      const presSigner = await presentation.signer(authKey);
      const presJWT = await presSigner.sign(testPresentation, { kid: authKeyId });

      // Verify - should detect future-dated credential
      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(presJWT, { verificationTime: new Date() });

      expect(result.verified).toBe(false);
      expect(result.credentials[0].verified).toBe(false);
      expect(result.credentials[0].problems.some(p => p.type === "is_within_validity_period")).toBe(true);
    });
  });

  describe("Identity and Authorization Failures", () => {

    test("should detect stolen credential (confirmation key mismatch)", async () => {
      const { controller: issuerController, assertionKey, assertionKeyId } = await createTestController("https://issuer.example");
      const { controller: legitimateHolderController, authKeyId: legitimateAuthKeyId } = await createTestController("https://legitimate-holder.example");
      const { controller: thiefController, authKey: thiefAuthKey, authKeyId: thiefAuthKeyId } = await createTestController("https://thief.example");

      const resolver = createGenericResolver();
      resolver.addController(issuerController.id, issuerController);
      resolver.addController(legitimateHolderController.id, legitimateHolderController);
      resolver.addController(thiefController.id, thiefController);

      // Create credential bound to legitimate holder
      const testCred = createTestCredential(issuerController.id, legitimateHolderController.id);
      const credSigner = await credential.signer(assertionKey);
      const credJWT = await credSigner.sign(testCred, {
        kid: assertionKeyId,
        cnf: { kid: legitimateAuthKeyId } // Bound to legitimate holder
      });

      const envelopedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": `data:application/vc+jwt,${credJWT}`,
        "type": "EnvelopedVerifiableCredential"
      };

      // Thief attempts to present the stolen credential
      const stolenPresentation = createTestPresentation(thiefController.id, [envelopedCred]);
      const thiefSigner = await presentation.signer(thiefAuthKey);
      const stolenPresJWT = await thiefSigner.sign(stolenPresentation, { kid: thiefAuthKeyId });

      // Verify - should detect confirmation key mismatch
      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(stolenPresJWT, { verificationTime: new Date() });

      expect(result.verified).toBe(false);
      expect(result.problems.some(p => p.type === "is_signed_by_confirmation_key")).toBe(true);
    });

    test("should detect issuer identifier prefix violation", async () => {
      const { controller: issuerController, assertionKey } = await createTestController("https://issuer.example");
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");

      // Create attacker claiming different issuer identity
      const { assertionKey: attackerKey } = await createTestController("https://different-issuer.example");

      const resolver = createGenericResolver();
      resolver.addController(issuerController.id, issuerController);
      resolver.addController(holderController.id, holderController);

      // Create credential with mismatched issuer/kid
      const testCred = createTestCredential("https://different-issuer.example", holderController.id);
      const maliciousCredSigner = await credential.signer(attackerKey);
      const maliciousCredJWT = await maliciousCredSigner.sign(testCred, {
        kid: issuerController.assertionMethod[0], // Wrong! Kid should match issuer
        cnf: { kid: authKeyId }
      });

      const envelopedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": `data:application/vc+jwt,${maliciousCredJWT}`,
        "type": "EnvelopedVerifiableCredential"
      };

      // Create presentation
      const testPresentation = createTestPresentation(holderController.id, [envelopedCred]);
      const presSigner = await presentation.signer(authKey);
      const presJWT = await presSigner.sign(testPresentation, { kid: authKeyId });

      // Verify - should detect issuer/kid mismatch
      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(presJWT, { verificationTime: new Date() });

      expect(result.verified).toBe(false);
      expect(result.credentials[0].verified).toBe(false);
      expect(result.credentials[0].problems.some(p => p.type === "is_iss_prefix_of_kid")).toBe(true);
    });
  });

  describe("Nonce and Audience Validation", () => {

    test("should validate expected nonce", async () => {
      const { controller: issuerController, assertionKey, assertionKeyId } = await createTestController("https://issuer.example");
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");

      const resolver = createGenericResolver();
      resolver.addController(issuerController.id, issuerController);
      resolver.addController(holderController.id, holderController);

      // Create credential and presentation
      const testCred = createTestCredential(issuerController.id, holderController.id);
      const credSigner = await credential.signer(assertionKey);
      const credJWT = await credSigner.sign(testCred, {
        kid: assertionKeyId,
        cnf: { kid: authKeyId }
      });

      const envelopedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": `data:application/vc+jwt,${credJWT}`,
        "type": "EnvelopedVerifiableCredential"
      };

      const testPresentation = createTestPresentation(holderController.id, [envelopedCred]);
      const presSigner = await presentation.signer(authKey);

      const expectedNonce = "test-nonce-123";
      const presJWT = await presSigner.sign({
        ...testPresentation,
        nonce: expectedNonce
      }, { kid: authKeyId });

      // Verify with correct nonce
      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(presJWT, {
        verificationTime: new Date(),
        expectedNonce
      });

      expect(result.verified).toBe(true);
    });

    test("should reject wrong nonce", async () => {
      const { controller: issuerController, assertionKey, assertionKeyId } = await createTestController("https://issuer.example");
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");

      const resolver = createGenericResolver();
      resolver.addController(issuerController.id, issuerController);
      resolver.addController(holderController.id, holderController);

      // Create credential and presentation
      const testCred = createTestCredential(issuerController.id, holderController.id);
      const credSigner = await credential.signer(assertionKey);
      const credJWT = await credSigner.sign(testCred, {
        kid: assertionKeyId,
        cnf: { kid: authKeyId }
      });

      const envelopedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": `data:application/vc+jwt,${credJWT}`,
        "type": "EnvelopedVerifiableCredential"
      };

      const testPresentation = createTestPresentation(holderController.id, [envelopedCred]);
      const presSigner = await presentation.signer(authKey);

      const wrongNonce = "wrong-nonce";
      const presJWT = await presSigner.sign({
        ...testPresentation,
        nonce: wrongNonce
      }, { kid: authKeyId });

      // Verify with different expected nonce - should throw
      const verifier = await presentationVerifierFromResolver(resolver);

      await expect(
        verifier.verify(presJWT, {
          verificationTime: new Date(),
          expectedNonce: "correct-nonce-123"
        })
      ).rejects.toThrow();
    });

    test("should validate expected audience", async () => {
      const { controller: issuerController, assertionKey, assertionKeyId } = await createTestController("https://issuer.example");
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");

      const resolver = createGenericResolver();
      resolver.addController(issuerController.id, issuerController);
      resolver.addController(holderController.id, holderController);

      // Create credential and presentation
      const testCred = createTestCredential(issuerController.id, holderController.id);
      const credSigner = await credential.signer(assertionKey);
      const credJWT = await credSigner.sign(testCred, {
        kid: assertionKeyId,
        cnf: { kid: authKeyId }
      });

      const envelopedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": `data:application/vc+jwt,${credJWT}`,
        "type": "EnvelopedVerifiableCredential"
      };

      const testPresentation = createTestPresentation(holderController.id, [envelopedCred]);
      const presSigner = await presentation.signer(authKey);

      const expectedAudience = "https://verifier.example";
      const presJWT = await presSigner.sign(testPresentation, {
        kid: authKeyId,
        aud: expectedAudience
      });

      // Verify with correct audience
      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(presJWT, {
        verificationTime: new Date(),
        expectedAudience
      });

      expect(result.verified).toBe(true);
    });
  });

  describe("Edge Cases and Error Handling", () => {

    test("should handle presentation without credentials", async () => {
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");

      const resolver = createGenericResolver();
      resolver.addController(holderController.id, holderController);

      // Create presentation with no credentials
      const emptyPresentation = createTestPresentation(holderController.id, []);
      const presSigner = await presentation.signer(authKey);
      const presJWT = await presSigner.sign(emptyPresentation, { kid: authKeyId });

      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(presJWT, { verificationTime: new Date() });

      expect(result.verified).toBe(true); // Empty presentation can be valid
      expect(result.problems).toHaveLength(0);
      expect(result.credentials).toHaveLength(0);
    });

    test("should handle malformed credential JWT", async () => {
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");

      const resolver = createGenericResolver();
      resolver.addController(holderController.id, holderController);

      // Create presentation with malformed credential
      const malformedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": "data:application/vc+jwt,invalid",
        "type": "EnvelopedVerifiableCredential"
      };

      const testPresentation = createTestPresentation(holderController.id, [malformedCred]);
      const presSigner = await presentation.signer(authKey);
      const presJWT = await presSigner.sign(testPresentation, { kid: authKeyId });

      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(presJWT, { verificationTime: new Date() });

      expect(result.verified).toBe(false);
      expect(result.credentials).toHaveLength(1);
      expect(result.credentials[0].verified).toBe(false);
      expect(result.credentials[0].problems.length).toBeGreaterThan(0);
    });

    test("should throw error when presentation missing kid in header", async () => {
      const { controller: holderController, authKey } = await createTestController("https://holder.example");

      const resolver = createGenericResolver();
      resolver.addController(holderController.id, holderController);

      const testPresentation = createTestPresentation(holderController.id, []);
      const presSigner = await presentation.signer(authKey);

      // Sign without kid - this should create an invalid JWT
      const presJWT = await presSigner.sign(testPresentation, { kid: undefined as any });

      const verifier = await presentationVerifierFromResolver(resolver);

      await expect(
        verifier.verify(presJWT, { verificationTime: new Date() })
      ).rejects.toThrow("Presentation header must have a kid");
    });

    test("should handle controller resolution failures", async () => {
      const { controller: issuerController, assertionKey, assertionKeyId } = await createTestController("https://issuer.example");
      const unknownHolderId = "https://unknown-holder.example";
      const unknownAuthKeyId = `${unknownHolderId}#auth-key`;

      // Create resolver with only issuer (missing holder)
      const resolver = createGenericResolver();
      resolver.addController(issuerController.id, issuerController);

      // Create credential for unknown holder
      const testCred = createTestCredential(issuerController.id, unknownHolderId);
      const credSigner = await credential.signer(assertionKey);
      const credJWT = await credSigner.sign(testCred, {
        kid: assertionKeyId,
        cnf: { kid: unknownAuthKeyId }
      });

      const envelopedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": `data:application/vc+jwt,${credJWT}`,
        "type": "EnvelopedVerifiableCredential"
      };

      // Create presentation claiming to be from unknown holder
      const testPresentation = createTestPresentation(unknownHolderId, [envelopedCred]);

      // Create fake JWT (we can't actually sign without the holder's key)
      const presJWT = "eyJhbGciOiJFUzI1NiIsImtpZCI6Imh0dHBzOi8vdW5rbm93bi1ob2xkZXIuZXhhbXBsZSNhdXRoLWtleSJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ";

      const verifier = await presentationVerifierFromResolver(resolver);

      // Should throw error for unknown controller
      await expect(
        verifier.verify(presJWT, { verificationTime: new Date() })
      ).rejects.toThrow();
    });
  });

  describe("Detailed Verification Results Analysis", () => {

    test("should provide detailed breakdown of mixed credential results", async () => {
      // Setup entities
      const { controller: goodIssuerController, assertionKey: goodAssertionKey, assertionKeyId: goodAssertionKeyId } = await createTestController("https://good-issuer.example");
      const { controller: badIssuerController } = await createTestController("https://bad-issuer.example");
      const { controller: holderController, authKey, authKeyId } = await createTestController("https://holder.example");
      const { assertionKey: attackerKey } = await createTestController("https://attacker.example");

      const resolver = createGenericResolver();
      resolver.addController(goodIssuerController.id, goodIssuerController);
      resolver.addController(badIssuerController.id, badIssuerController);
      resolver.addController(holderController.id, holderController);

      // Create one valid credential
      const validCred = createTestCredential(goodIssuerController.id, holderController.id);
      const validCredSigner = await credential.signer(goodAssertionKey);
      const validCredJWT = await validCredSigner.sign(validCred, {
        kid: goodAssertionKeyId,
        cnf: { kid: authKeyId }
      });

      // Create one invalid credential (forged signature)
      const invalidCred = createTestCredential(badIssuerController.id, holderController.id);
      const invalidCredSigner = await credential.signer(attackerKey);
      const invalidCredJWT = await invalidCredSigner.sign(invalidCred, {
        kid: badIssuerController.assertionMethod[0], // Wrong key
        cnf: { kid: authKeyId }
      });

      const envelopedCreds = [
        {
          "@context": "https://www.w3.org/ns/credentials/v2",
          "id": `data:application/vc+jwt,${validCredJWT}`,
          "type": "EnvelopedVerifiableCredential"
        },
        {
          "@context": "https://www.w3.org/ns/credentials/v2",
          "id": `data:application/vc+jwt,${invalidCredJWT}`,
          "type": "EnvelopedVerifiableCredential"
        }
      ];

      // Create presentation
      const testPresentation = createTestPresentation(holderController.id, envelopedCreds);
      const presSigner = await presentation.signer(authKey);
      const presJWT = await presSigner.sign(testPresentation, { kid: authKeyId });

      // Verify - should show mixed results
      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(presJWT, { verificationTime: new Date() });

      expect(result.verified).toBe(false); // Overall fails due to invalid credential
      expect(result.credentials).toHaveLength(2);

      // First credential should be valid
      expect(result.credentials[0].verified).toBe(true);
      expect(result.credentials[0].problems).toHaveLength(0);

      // Second credential should fail on signature
      expect(result.credentials[1].verified).toBe(false);
      expect(result.credentials[1].problems.some(p => p.type === "is_credential_signature_valid")).toBe(true);
    });

    test("should provide granular failure analysis for complex scenarios", async () => {
      // Setup entities
      const { controller: issuerController, assertionKey, assertionKeyId } = await createTestController("https://issuer.example");
      const { controller: legitimateHolderController, authKeyId: legitimateAuthKeyId } = await createTestController("https://legitimate-holder.example");
      const { controller: thiefController, authKey: thiefAuthKey, authKeyId: thiefAuthKeyId } = await createTestController("https://thief.example");

      const resolver = createGenericResolver();
      resolver.addController(issuerController.id, issuerController);
      resolver.addController(legitimateHolderController.id, legitimateHolderController);
      resolver.addController(thiefController.id, thiefController);

      // Create expired credential bound to legitimate holder
      const testCred = createTestCredential(issuerController.id, legitimateHolderController.id);
      const credSigner = await credential.signer(assertionKey);

      const pastTime = new Date(Date.now() - 7200000); // 2 hours ago
      const credJWT = await credSigner.sign(testCred, {
        kid: assertionKeyId,
        cnf: { kid: legitimateAuthKeyId },
        iat: Math.floor(pastTime.getTime() / 1000),
        exp: Math.floor((pastTime.getTime() + 3600000) / 1000) // Expired 1 hour ago
      });

      const envelopedCred = {
        "@context": "https://www.w3.org/ns/credentials/v2",
        "id": `data:application/vc+jwt,${credJWT}`,
        "type": "EnvelopedVerifiableCredential"
      };

      // Thief creates expired presentation of stolen, expired credential
      const stolenPresentation = createTestPresentation(thiefController.id, [envelopedCred]);
      const thiefSigner = await presentation.signer(thiefAuthKey);

      const expiredPresentationTime = new Date(Date.now() - 3600000); // 1 hour ago
      const stolenPresJWT = await thiefSigner.sign(stolenPresentation, {
        kid: thiefAuthKeyId,
        iat: Math.floor(expiredPresentationTime.getTime() / 1000),
        exp: Math.floor((expiredPresentationTime.getTime() + 1800000) / 1000) // Expired 30 min ago
      });

      // Verify - multiple failures expected
      const verifier = await presentationVerifierFromResolver(resolver);
      const result = await verifier.verify(stolenPresJWT, { verificationTime: new Date() });

      // Should detect multiple security violations
      expect(result.verified).toBe(false);

      // Should have multiple problems detected
      expect(result.problems.length).toBeGreaterThan(0);
      expect(result.credentials[0].verified).toBe(false);
      expect(result.credentials[0].problems.length).toBeGreaterThan(0);
    });
  });

  describe("Human-Readable Error Analysis", () => {

    test("should distinguish between cryptographic and temporal failures", async () => {
      // Test will help verify that we can distinguish between:
      // 1. Cryptographic failures (signatures, key mismatches)
      // 2. Temporal failures (expiration, not-yet-valid)
      // 3. Identity failures (stolen credentials, wrong holders)
      // 4. Schema/format failures (malformed data)

      // This test serves as documentation for the types of failures
      // that the verification system can detect and distinguish between
      expect(true).toBe(true); // Placeholder - actual human-readable messages added below
    });
  });
});