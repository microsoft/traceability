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
  credentials: CredentialVerificationResult[];
  problems: Problem[];
  verified_header?: any; // JWT header when verification succeeds
  verified_payload?: any; // JWT payload when verification succeeds
}

export interface Problem {
  type: string;
  title: string;
  detail: string;
}

export interface CredentialVerificationResult {
  verified: boolean; // Logical AND of credential security checks
  problems: Problem[];
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
      problems: []
    };

    let is_credential_signature_valid = false;
    let is_within_validity_period = false;
    let is_iss_prefix_of_kid = false;

    // Extract JWS from enveloped credential
    const credJws = createJsonWebSignatureFromEnvelopedVerifiableCredential(envelopedCred as EnvelopedVerifiableCredential);

    if (!credJws) {
      credResult.problems.push({
        type: "is_credential_signature_valid",
        title: "Malformed credential",
        detail: "Unable to extract JWT from enveloped credential. The credential may be corrupted or improperly formatted."
      });
      results.push(credResult);
      continue;
    }

    // Parse credential to get issuer
    let credParsed;
    try {
      credParsed = jws.parseJWS(credJws);
    } catch (error) {
      credResult.problems.push({
        type: "is_credential_signature_valid",
        title: "Invalid credential JWT format",
        detail: "The credential JWT is malformed and cannot be parsed. This indicates data corruption or tampering."
      });
      results.push(credResult);
      continue;
    }
    const credHeader = credParsed.header;
    const credPayload = credParsed.payload as VerifiableCredential;

    const assertionKeyId = credHeader.kid;

    // Security check: is_iss_prefix_of_kid - ensure issuer is prefix of kid
    is_iss_prefix_of_kid = assertionKeyId.startsWith(credPayload.issuer);
    if (!is_iss_prefix_of_kid) {
      credResult.problems.push({
        type: "is_iss_prefix_of_kid",
        title: "Issuer identity mismatch",
        detail: "The credential's issuer identifier must be a prefix of the signing key identifier. This prevents attackers from impersonating other issuers by using keys they don't control."
      });
    }

    // Extract controller ID from the assertion method ID
    const issuerControllerId = extractControllerIdFromVerificationMethod(assertionKeyId);

    // Resolve the issuer's controller document
    const issuer = await resolver.resolveController(issuerControllerId);

    // Resolve the credential verifier using the kid
    const credentialVerifier = await issuer.assertion.resolve(assertionKeyId);

    // Check signature validity
    try {
      await credentialVerifier.verify(credJws, options.verificationTime);
      is_credential_signature_valid = true;
    } catch (error) {
      // Only catch verification failures, re-throw system errors
      if (error.message?.includes('signature') || error.message?.includes('expired') || error.message?.includes('Invalid') || error.message?.includes('not yet valid')) {
        is_credential_signature_valid = false;

        // Determine if this is a time-related error or signature error
        if (error.message?.includes('expired') || error.message?.includes('not yet valid')) {
          is_within_validity_period = false;
          credResult.problems.push({
            type: "is_within_validity_period",
            title: "Credential expired or not yet valid",
            detail: "The credential is being used outside its validity period. Expired credentials may indicate stale or compromised data, while future-dated credentials may indicate time manipulation attacks."
          });
        } else {
          credResult.problems.push({
            type: "is_credential_signature_valid",
            title: "Invalid credential signature",
            detail: "The cryptographic signature on this credential is invalid. This indicates the credential may have been tampered with, forged, or signed with the wrong key."
          });
        }
      } else {
        throw error; // Re-throw unexpected system errors
      }
    }

    // Check validity period using existing validation utilities
    try {
      validateJWTTimeClaims(credPayload, options.verificationTime);
      is_within_validity_period = true;
    } catch (error) {
      if (error.message?.includes('expired') || error.message?.includes('not yet valid')) {
        is_within_validity_period = false;
        credResult.problems.push({
          type: "is_within_validity_period",
          title: "Credential expired or not yet valid",
          detail: "The credential is being used outside its validity period. Expired credentials may indicate stale or compromised data, while future-dated credentials may indicate time manipulation attacks."
        });
      } else {
        throw error; // Re-throw unexpected errors
      }
    }

    // Overall credential verification - AND of all checks
    credResult.verified = is_credential_signature_valid &&
                         is_within_validity_period &&
                         is_iss_prefix_of_kid;

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
        credentials: [],
        problems: []
      };

      let is_presentation_signature_valid = false;
      let is_within_validity_period = false;
      let is_signed_by_confirmation_key = false;
      let is_credential_verified = false;

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
        is_presentation_signature_valid = true;
      } catch (error) {
        // Only catch verification failures, re-throw system errors
        if (error.message?.includes('signature') || error.message?.includes('expired') || error.message?.includes('Invalid')) {
          is_presentation_signature_valid = false;
          result.problems.push({
            type: "is_presentation_signature_valid",
            title: "Invalid presentation signature",
            detail: "The cryptographic signature on this presentation is invalid. This means the presentation was not signed by the claimed holder or has been tampered with."
          });
        } else {
          throw error; // Re-throw unexpected system errors
        }
      }

      // Check time validity
      try {
        validateJWTTimeClaims(payload, options.verificationTime);
        is_within_validity_period = true;
      } catch (error) {
        // Only catch time validation failures
        if (error.message?.includes('expired') || error.message?.includes('not yet valid')) {
          is_within_validity_period = false;
          result.problems.push({
            type: "is_within_validity_period",
            title: "Presentation expired or not yet valid",
            detail: "The presentation is being used outside its validity period. This may indicate an attempted replay attack or time manipulation attack."
          });
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
      is_credential_verified = credentialResults.every(c => c.verified);
      if (!is_credential_verified) {
        result.problems.push({
          type: "is_credential_verified",
          title: "One or more credentials failed verification",
          detail: "At least one credential in this presentation has verification problems. Check individual credential verification results for specific issues."
        });
      }

      // Check confirmation key binding
      is_signed_by_confirmation_key = await checkConfirmationKeyBinding(payload, authenticationKeyId);
      if (!is_signed_by_confirmation_key) {
        result.problems.push({
          type: "is_signed_by_confirmation_key",
          title: "Stolen credential detected",
          detail: "The presentation is signed by a different key than the one the credentials were issued to. This indicates the credentials may have been stolen and are being presented by an unauthorized party."
        });
      }

      // Overall verification is AND of all checks
      result.verified = is_presentation_signature_valid &&
                       is_within_validity_period &&
                       is_signed_by_confirmation_key &&
                       is_credential_verified;

      // Add verified header and payload if verification succeeds
      if (result.verified) {
        result.verified_header = header;
        result.verified_payload = payload;
      }

      return result;
    }
  };
};