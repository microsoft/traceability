import { test, expect, describe, beforeAll } from "bun:test";
import { key, credential, presentation, resolver } from "../../../src/index";

interface DetailedVerificationResult {
  verified: boolean; // Logical AND of all security checks
  is_presentation_signature_valid: boolean;
  is_within_validity_period: boolean;
  is_signed_by_confirmation_key: boolean;
  is_credential_verified: boolean;
  credentials: CredentialVerificationResult[];
}

interface CredentialVerificationResult {
  verified: boolean; // Logical AND of credential security checks
  is_credential_signature_valid: boolean;
  is_within_validity_period: boolean;
}

describe("Enhanced Presentation Verifier", () => {
  let issuerController: any;
  let holderController: any;
  let wrongHolderController: any;
  let genericResolver: any;
  let testCredential: any;

  beforeAll(async () => {
    // Create issuer controller
    const issuerPrivateKey = await key.generatePrivateKey("ES256");
    const issuerPublicKey = await key.exportPublicKey(issuerPrivateKey);
    const issuerKeyId = `https://issuer.example#${issuerPrivateKey.kid}`;
    issuerController = {
      "@context": ["https://www.w3.org/ns/did/v1"],
      "id": "https://issuer.example",
      "verificationMethod": [
        {
          "id": issuerKeyId,
          "type": "JsonWebKey",
          "controller": "https://issuer.example",
          "publicKeyJwk": issuerPublicKey
        }
      ],
      "authentication": [issuerKeyId],
      "assertionMethod": [issuerKeyId],
      _privateKey: issuerPrivateKey
    };

    // Create legitimate holder controller
    const holderPrivateKey = await key.generatePrivateKey("ES256");
    const holderPublicKey = await key.exportPublicKey(holderPrivateKey);
    const holderKeyId = `https://holder.example#${holderPrivateKey.kid}`;
    holderController = {
      "@context": ["https://www.w3.org/ns/did/v1"],
      "id": "https://holder.example",
      "verificationMethod": [
        {
          "id": holderKeyId,
          "type": "JsonWebKey",
          "controller": "https://holder.example",
          "publicKeyJwk": holderPublicKey
        }
      ],
      "authentication": [holderKeyId],
      _privateKey: holderPrivateKey
    };

    // Create wrong holder controller (for stolen credential test)
    const wrongHolderPrivateKey = await key.generatePrivateKey("ES256");
    const wrongHolderPublicKey = await key.exportPublicKey(wrongHolderPrivateKey);
    const wrongHolderKeyId = `https://wrong-holder.example#${wrongHolderPrivateKey.kid}`;
    wrongHolderController = {
      "@context": ["https://www.w3.org/ns/did/v1"],
      "id": "https://wrong-holder.example",
      "verificationMethod": [
        {
          "id": wrongHolderKeyId,
          "type": "JsonWebKey",
          "controller": "https://wrong-holder.example",
          "publicKeyJwk": wrongHolderPublicKey
        }
      ],
      "authentication": [wrongHolderKeyId],
      _privateKey: wrongHolderPrivateKey
    };

    // Setup resolver
    genericResolver = resolver.createGenericResolver();
    genericResolver.addController("https://issuer.example", issuerController);
    genericResolver.addController("https://holder.example", holderController);
    genericResolver.addController("https://wrong-holder.example", wrongHolderController);

    // Create a test credential
    const credentialSigner = await credential.signer(issuerController._privateKey);
    const credentialData = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      "type": ["VerifiableCredential", "TestCredential"],
      "issuer": "https://issuer.example",
      "cnf": {
        "kid": holderController.authentication[0] // Bind to legitimate holder's authentication key
      },
      "credentialSubject": {
        "id": "https://subject.example",
        "test": "data"
      }
    };

    const signedCredentialJWT = await credentialSigner.sign(credentialData, { kid: issuerController._privateKey.kid });
    testCredential = {
      "@context": "https://www.w3.org/ns/credentials/v2",
      "id": `data:application/vc+jwt,${signedCredentialJWT}`,
      "type": "EnvelopedVerifiableCredential"
    };
  });

  test("legitimate presentation should pass all verification checks", async () => {
    // Create legitimate presentation - use kid option to match authentication key
    const authKeyId = holderController.authentication[0];
    // Extract just the thumbprint part (after the #)
    const keyThumbprint = authKeyId.split('#')[1];
    const presentationSigner = await presentation.signer(holderController._privateKey);
    const presentationData = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      "type": ["VerifiablePresentation"],
      "holder": "https://holder.example",
      "verifiableCredential": [testCredential]
    };

    const signedPresentation = await presentationSigner.sign(presentationData, {
      kid: keyThumbprint // Use just the key thumbprint in the header
    });

    // Verify with detailed breakdown
    const result = await verifyPresentationDetailed(signedPresentation, genericResolver);

    expect(result.verified).toBe(true);
    expect(result.is_presentation_signature_valid).toBe(true);
    expect(result.is_within_validity_period).toBe(true);
    expect(result.is_signed_by_confirmation_key).toBe(true);
    expect(result.is_credential_verified).toBe(true);
    expect(result.credentials).toHaveLength(1);
    expect(result.credentials[0].verified).toBe(true);
    expect(result.credentials[0].is_credential_signature_valid).toBe(true);
    expect(result.credentials[0].is_within_validity_period).toBe(true);
  });

  test("stolen credential presentation should fail confirmation key check", async () => {
    // Create fraudulent presentation where wrong holder presents the credential
    const wrongAuthKeyId = wrongHolderController.authentication[0];
    const wrongPresentationSigner = await presentation.signer(wrongHolderController._privateKey);
    const fraudulentPresentationData = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      "type": ["VerifiablePresentation"],
      "holder": "https://wrong-holder.example", // Wrong holder!
      "verifiableCredential": [testCredential] // Credential bound to different holder
    };

    const fraudulentPresentation = await wrongPresentationSigner.sign(fraudulentPresentationData, {
      kid: wrongAuthKeyId // Use wrong holder's authentication key ID
    });

    // Verify with detailed breakdown
    const result = await verifyPresentationDetailed(fraudulentPresentation, genericResolver);

    expect(result.verified).toBe(false); // Overall verification fails
    expect(result.is_presentation_signature_valid).toBe(true); // Signature itself is valid
    expect(result.is_within_validity_period).toBe(true); // Time is valid
    expect(result.is_signed_by_confirmation_key).toBe(false); // Key mismatch detected!
    expect(result.is_credential_verified).toBe(true); // Credential itself is still valid
    expect(result.credentials).toHaveLength(1);
    expect(result.credentials[0].verified).toBe(true); // Credential verification passes
    expect(result.credentials[0].is_credential_signature_valid).toBe(true);
    expect(result.credentials[0].is_within_validity_period).toBe(true);
  });

  test("expired presentation should fail validity period check", async () => {
    // Create presentation with past expiration
    const authKeyId = holderController.authentication[0];
    const presentationSigner = await presentation.signer(holderController._privateKey);
    const presentationData = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      "type": ["VerifiablePresentation"],
      "holder": "https://holder.example",
      "verifiableCredential": [testCredential]
    };

    const pastTime = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
    const signedPresentation = await presentationSigner.sign(presentationData, {
      kid: authKeyId,
      issuanceTime: pastTime
      // Note: expiration is automatically set to 1 hour from issuance, so this will be expired
    });

    // Verify with detailed breakdown
    const result = await verifyPresentationDetailed(signedPresentation, genericResolver);

    expect(result.verified).toBe(false);
    expect(result.is_presentation_signature_valid).toBe(true);
    expect(result.is_within_validity_period).toBe(false); // Expired!
    expect(result.is_signed_by_confirmation_key).toBe(true);
    expect(result.is_credential_verified).toBe(true);
  });
});

/**
 * Enhanced presentation verifier that provides detailed breakdown of verification results
 */
async function verifyPresentationDetailed(
  presentationJWT: string,
  resolver: any
): Promise<DetailedVerificationResult> {
  const result: DetailedVerificationResult = {
    verified: false,
    is_presentation_signature_valid: false,
    is_within_validity_period: false,
    is_signed_by_confirmation_key: false,
    is_credential_verified: false,
    credentials: []
  };

  try {
    // Parse JWT
    const parts = presentationJWT.split('.');
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));

    // Check signature validity
    try {
      const presVerifier = await presentation.presentationVerifierFromResolver(resolver);
      await presVerifier.verify(presentationJWT, {
        verificationTime: new Date()
      });
      result.is_presentation_signature_valid = true;
    } catch (error) {
      // Signature verification failed
      console.error('Presentation signature verification failed:', error);
      result.is_presentation_signature_valid = false;
    }

    // Check validity period
    const now = Date.now() / 1000;
    const issuedAt = payload.iat || 0;
    const expiresAt = payload.exp || (issuedAt + 3600); // Default 1 hour
    const notBefore = payload.nbf || issuedAt;

    result.is_within_validity_period = now >= notBefore && now <= expiresAt;

    // Check confirmation key binding
    result.is_signed_by_confirmation_key = await checkConfirmationKeyBinding(
      payload,
      header.kid,
      resolver
    );

    // Verify each credential
    if (payload.verifiableCredential && Array.isArray(payload.verifiableCredential)) {
      for (const cred of payload.verifiableCredential) {
        const credResult = await verifyCredentialDetailed(cred, resolver);
        result.credentials.push(credResult);
      }
      result.is_credential_verified = result.credentials.every(c => c.verified);
    }

    // Overall verification is AND of all checks
    result.verified = result.is_presentation_signature_valid &&
                     result.is_within_validity_period &&
                     result.is_signed_by_confirmation_key &&
                     result.is_credential_verified;

  } catch (error) {
    console.error('Verification error:', error);
  }

  return result;
}

/**
 * Check if presentation is signed by the key specified in credential's cnf.kid
 */
async function checkConfirmationKeyBinding(
  presentationPayload: any,
  presentationSigningKey: string,
  resolver: any
): Promise<boolean> {
  try {
    if (!presentationPayload.verifiableCredential || !Array.isArray(presentationPayload.verifiableCredential)) {
      return true; // No credentials to check
    }

    for (const cred of presentationPayload.verifiableCredential) {
      if (typeof cred === 'string' && cred.startsWith('data:application/vc+jwt,')) {
        // Parse embedded credential JWT
        const credJWT = cred.substring('data:application/vc+jwt,'.length);
        const credParts = credJWT.split('.');
        const credPayload = JSON.parse(atob(credParts[1]));

        // Check if credential has holder binding
        if (credPayload.cnf && credPayload.cnf.kid) {
          // Compare credential's intended holder with presentation's signing key
          if (credPayload.cnf.kid !== presentationSigningKey) {
            return false; // Key mismatch - stolen credential detected
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Confirmation key binding check failed:', error);
    return false;
  }
}

/**
 * Verify individual credential with detailed breakdown
 */
async function verifyCredentialDetailed(
  credentialData: any,
  resolver: any
): Promise<CredentialVerificationResult> {
  const result: CredentialVerificationResult = {
    verified: false,
    is_credential_signature_valid: false,
    is_within_validity_period: false
  };

  try {
    if (typeof credentialData === 'string' && credentialData.startsWith('data:application/vc+jwt,')) {
      const credJWT = credentialData.substring('data:application/vc+jwt,'.length);
      const parts = credJWT.split('.');
      const payload = JSON.parse(atob(parts[1]));

      // Check signature validity
      try {
        const credVerifier = await credential.credentialVerifierFromResolver(resolver);
        await credVerifier.verify(credJWT, new Date());
        result.is_credential_signature_valid = true;
      } catch (error) {
        result.is_credential_signature_valid = false;
      }

      // Check validity period
      const now = Date.now() / 1000;
      const issuedAt = payload.iat || 0;
      const expiresAt = payload.exp || (issuedAt + 365 * 24 * 3600); // Default 1 year
      const notBefore = payload.nbf || issuedAt;

      result.is_within_validity_period = now >= notBefore && now <= expiresAt;

      // Overall credential verification
      result.verified = result.is_credential_signature_valid && result.is_within_validity_period;
    }
  } catch (error) {
    console.error('Credential verification error:', error);
  }

  return result;
}