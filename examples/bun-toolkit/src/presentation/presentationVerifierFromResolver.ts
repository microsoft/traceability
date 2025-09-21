import type { VerifiablePresentation } from "./presentation";
import type { EnvelopedVerifiableCredential, VerifiableCredential } from "../credential/credential";
import type { GenericResolver } from "../resolver/genericResolver";
import * as jws from "../encoding/jws";
import { createJsonWebSignatureFromEnvelopedVerifiableCredential } from "../credential/credential";
import { defaultGenericResolver } from "../resolver/genericResolver";
import { validateJWTTimeClaims, validateNonceAndAudience, validateCredentialSchemas } from "../verification/utils";

export interface VerificationOptions {
  expectedNonce?: string;
  expectedAudience?: string | string[];
  validateCredentialSchemas?: boolean;
  verificationTime: Date;
}

export interface PresentationVerifierFromResolver {
  verify: (jws: string, options: VerificationOptions) => Promise<VerifiablePresentation>;
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
): Promise<void> => {
  if (!verifiedPresentation.verifiableCredential || verifiedPresentation.verifiableCredential.length === 0) {
    return;
  }

  for (const envelopedCred of verifiedPresentation.verifiableCredential) {
    // Extract JWS from enveloped credential
    const credJws = createJsonWebSignatureFromEnvelopedVerifiableCredential(envelopedCred as EnvelopedVerifiableCredential);
    
    if (!credJws) {
      throw new Error('Failed to extract JWS from enveloped credential');
    }

    // Parse credential to get issuer
    const credParsed = jws.parseJWS(credJws);
    const credHeader = credParsed.header;
    const credPayload = credParsed.payload as VerifiableCredential;

    const  assertionKeyId = credHeader.kid;

    // Resolve the issuer's controller document
    const issuer = await resolver.resolveController(assertionKeyId);

    if (!assertionKeyId.startsWith(credPayload.issuer)) {
      throw new Error(`Credential issuer ${credPayload.issuer} does not match assertion key ${assertionKeyId}`);
    }

    // Resolve the credential verifier using the kid
    const credentialVerifier = await issuer.assertion.resolve(assertionKeyId);

    // Verify the credential at the same time we're verifying the presentation
    const verifiedCredential = await credentialVerifier.verify(credJws, options.verificationTime);

    // Check if credential has cnf claim (MUST be top-level)
    if (verifiedCredential.cnf?.kid) {
      // The presentation MUST be signed with the key specified in cnf.kid
      const cnfKid = verifiedCredential.cnf.kid;

      // The presentation's signing key must match the cnf.kid
      if (authenticationKeyId !== cnfKid) {
        throw new Error(`Presentation key mismatch: credential requires key ${cnfKid} but presentation was signed with ${authenticationKeyId}`);
      }
    }

    // If validateCredentialSchemas option is true, validate credential against its schemas
    if (options.validateCredentialSchemas) {
      await validateCredentialSchemas(verifiedCredential, resolver);
    }
  }
};

export const presentationVerifierFromResolver = async (
  resolver: GenericResolver = defaultGenericResolver
) => {
  return {
    verify: async (jws: string, options: VerificationOptions) => {
      const { header, payload } = parseJWS(jws);
      const authenticationKeyId = header.kid;

      // Get the holder ID from the presentation header kid
      if (!authenticationKeyId) {
        throw new Error('Presentation header must have a kid');
      }

      

      // Resolve the holder's controller document
      const holder = await resolver.resolveController(authenticationKeyId);

      // Resolve the presentation verifier using the kid
      const presentationVerifier = await holder.authentication.resolve(authenticationKeyId);

      // Verify the presentation signature
      const verifiedPresentation = await presentationVerifier.verify(jws, options.verificationTime);

      // Validate time-based JWT claims
      validateJWTTimeClaims(payload, options.verificationTime);

      // Validate nonce and audience
      validateNonceAndAudience(payload, options);

      // Now verify each credential in the presentation
      await verifyPresentedCredentials(verifiedPresentation, authenticationKeyId, resolver, options);

      return verifiedPresentation;
    }
  };
};