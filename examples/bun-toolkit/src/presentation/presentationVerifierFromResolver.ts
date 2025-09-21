import type { VerifiablePresentation } from "./presentation";
import type { EnvelopedVerifiableCredential, VerifiableCredential } from "../credential/credential";
import type { GenericResolver } from "../resolver/genericResolver";
import * as jws from "../encoding/jws";
import { createJsonWebSignatureFromEnvelopedVerifiableCredential } from "../credential/credential";
import { defaultGenericResolver } from "../resolver/genericResolver";
import { extractControllerIdFromVerificationMethod } from "../resolver/utils";
import { validateJWTTimeClaims, validateNonceAndAudience, validateCredentialSchemas } from "../verification/utils";

export interface VerificationOptions {
  expectedNonce?: string;
  expectedAudience?: string | string[];
  validateCredentialSchemas?: boolean;
  verificationTime: Date;
}

export interface DetailedVerificationResult {
  verified: boolean; // Logical AND of all security checks
  is_presentation_signature_valid: boolean;
  is_within_validity_period: boolean;
  is_signed_by_confirmation_key: boolean;
  is_credential_verified: boolean;
  credentials: CredentialVerificationResult[];
}

export interface CredentialVerificationResult {
  verified: boolean; // Logical AND of credential security checks
  is_credential_signature_valid: boolean;
  is_within_validity_period: boolean;
  is_iss_prefix_of_kid: boolean;
}

export interface PresentationVerifierFromResolver {
  verify: (jws: string, options: VerificationOptions) => Promise<DetailedVerificationResult>;
}

interface ParsedJWS {
  header: any;
  payload: any;
  presentation: VerifiablePresentation;
  signature: string;
}

const parseJWS = (jwsString: string): ParsedJWS => {
  const parsed = jws.parseJWS(jwsString);
  return {
    header: parsed.header,
    payload: parsed.payload,
    presentation: parsed.payload as VerifiablePresentation,
    signature: parsed.signature
  };
};

const verifyPresentedCredentials = async (
  verifiedPresentation: VerifiablePresentation,
  authenticationKeyId: string,
  resolver: GenericResolver,
  options: VerificationOptions
): Promise<CredentialVerificationResult[]> => {
  const results: CredentialVerificationResult[] = [];

  if (!verifiedPresentation.verifiableCredential || verifiedPresentation.verifiableCredential.length === 0) {
    return results;
  }

  for (const envelopedCred of verifiedPresentation.verifiableCredential) {
    const credResult: CredentialVerificationResult = {
      verified: false,
      is_credential_signature_valid: false,
      is_within_validity_period: false,
      is_iss_prefix_of_kid: false
    };

    // Extract JWS from enveloped credential
    const credJws = createJsonWebSignatureFromEnvelopedVerifiableCredential(envelopedCred as EnvelopedVerifiableCredential);

    if (!credJws) {
      results.push(credResult);
      continue;
    }

    // Parse credential to get issuer
    const credParsed = jws.parseJWS(credJws);
    const credHeader = credParsed.header;
    const credPayload = credParsed.payload as VerifiableCredential;

    const assertionKeyId = credHeader.kid;

    // Security check: is_iss_prefix_of_kid - ensure issuer is prefix of kid
    credResult.is_iss_prefix_of_kid = assertionKeyId.startsWith(credPayload.issuer);

    // Extract controller ID from the assertion method ID
    const issuerControllerId = extractControllerIdFromVerificationMethod(assertionKeyId);

    // Resolve the issuer's controller document
    const issuer = await resolver.resolveController(issuerControllerId);

    // Resolve the credential verifier using the kid
    const credentialVerifier = await issuer.assertion.resolve(assertionKeyId);

    // Check signature validity
    try {
      await credentialVerifier.verify(credJws, options.verificationTime);
      credResult.is_credential_signature_valid = true;
    } catch (error) {
      // Only catch verification failures, re-throw system errors
      if (error.message?.includes('signature') || error.message?.includes('expired') || error.message?.includes('Invalid')) {
        credResult.is_credential_signature_valid = false;
      } else {
        throw error; // Re-throw unexpected system errors
      }
    }

    // Check validity period using existing validation utilities
    try {
      validateJWTTimeClaims(credPayload, options.verificationTime);
      credResult.is_within_validity_period = true;
    } catch (error) {
      if (error.message?.includes('expired') || error.message?.includes('not yet valid')) {
        credResult.is_within_validity_period = false;
      } else {
        throw error; // Re-throw unexpected errors
      }
    }

    // Overall credential verification - AND of all checks
    credResult.verified = credResult.is_credential_signature_valid &&
                         credResult.is_within_validity_period &&
                         credResult.is_iss_prefix_of_kid;

    // If validateCredentialSchemas option is true, validate credential against its schemas
    if (options.validateCredentialSchemas && credResult.verified) {
      try {
        await validateCredentialSchemas(credPayload, resolver);
      } catch (error) {
        // Schema validation failure - credential is not verified
        credResult.verified = false;
      }
    }

    results.push(credResult);
  }

  return results;
};

/**
 * Check if presentation is signed by the key specified in credential's cnf.kid
 */
const checkConfirmationKeyBinding = async (
  presentationPayload: any,
  presentationSigningKey: string
): Promise<boolean> => {
  try {
    if (!presentationPayload.verifiableCredential || !Array.isArray(presentationPayload.verifiableCredential)) {
      return true; // No credentials to check
    }

    for (const cred of presentationPayload.verifiableCredential) {
      const credJWT = createJsonWebSignatureFromEnvelopedVerifiableCredential(cred as EnvelopedVerifiableCredential);

      if (credJWT) {
        const credParsed = jws.parseJWS(credJWT);
        const credPayload = credParsed.payload;

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
    return false;
  }
};

export const presentationVerifierFromResolver = async (
  resolver: GenericResolver = defaultGenericResolver
) => {
  return {
    verify: async (jws: string, options: VerificationOptions) => {
      const result: DetailedVerificationResult = {
        verified: false,
        is_presentation_signature_valid: false,
        is_within_validity_period: false,
        is_signed_by_confirmation_key: false,
        is_credential_verified: false,
        credentials: []
      };

      const { header, payload } = parseJWS(jws);
      const authenticationKeyId = header.kid;

      if (!authenticationKeyId) {
        throw new Error('Presentation header must have a kid');
      }

      // Check presentation signature validity
      try {
        const controllerId = extractControllerIdFromVerificationMethod(authenticationKeyId);
        const holder = await resolver.resolveController(controllerId);
        const presentationVerifier = await holder.authentication.resolve(authenticationKeyId);

        await presentationVerifier.verify(jws, options.verificationTime);
        result.is_presentation_signature_valid = true;
      } catch (error) {
        // Only catch verification failures, re-throw system errors
        if (error.message?.includes('signature') || error.message?.includes('expired') || error.message?.includes('Invalid')) {
          result.is_presentation_signature_valid = false;
        } else {
          throw error; // Re-throw unexpected system errors
        }
      }

      // Check time validity
      try {
        validateJWTTimeClaims(payload, options.verificationTime);
        result.is_within_validity_period = true;
      } catch (error) {
        // Only catch time validation failures
        if (error.message?.includes('expired') || error.message?.includes('not yet valid')) {
          result.is_within_validity_period = false;
        } else {
          throw error; // Re-throw unexpected errors
        }
      }

      // Validate nonce and audience - let these throw if they fail
      validateNonceAndAudience(payload, options);

      // Parse verified presentation for credential verification
      const verifiedPresentation = payload as VerifiablePresentation;

      // Verify each credential in the presentation (includes is_iss_prefix_of_kid check)
      const credentialResults = await verifyPresentedCredentials(verifiedPresentation, authenticationKeyId, resolver, options);
      result.credentials = credentialResults;
      result.is_credential_verified = credentialResults.every(c => c.verified);

      // Check confirmation key binding
      result.is_signed_by_confirmation_key = await checkConfirmationKeyBinding(payload, authenticationKeyId);

      // Overall verification is AND of all checks
      result.verified = result.is_presentation_signature_valid &&
                       result.is_within_validity_period &&
                       result.is_signed_by_confirmation_key &&
                       result.is_credential_verified;

      return result;
    }
  };
};