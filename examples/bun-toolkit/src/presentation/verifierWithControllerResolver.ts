import * as credential from "../credential";
import type { VerifiablePresentation } from "./presentation";
import { base64url } from "../encoding";
import { createJsonWebSignatureFromEnvelopedVerifiableCredential } from "../credential/credential";
import type { EnvelopedVerifiableCredential, VerifiableCredential } from "../credential/credential";

export interface ControllerResolver {
  resolve: (id: string) => Promise<{
    assertion: {
      resolve: (id: string) => Promise<credential.CredentialVerifier>;
    };
    authentication: {
      resolve: (id: string) => Promise<{
        verify: (jws: string) => Promise<VerifiablePresentation>;
      }>;
    };
  }>;
}

export interface VerificationOptions {
  expectedNonce?: string;
  expectedAudience?: string | string[];
}

export interface PresentationVerifierWithControllerResolver {
  verify: (jws: string, options?: VerificationOptions) => Promise<VerifiablePresentation>;
}

export const verifierWithControllerResolver = async (controllerResolver: ControllerResolver) => {
  return {
    verify: async (jws: string, options?: VerificationOptions) => {
      // Parse JWS to get initial information
      const parts = jws.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWS format');
      }

      const [protectedHeader, payload, signature] = parts;

      if (!protectedHeader || !payload || !signature) {
        throw new Error('Invalid JWS format: missing parts');
      }

      // Decode header to get the kid
      const headerBytes = base64url.decode(protectedHeader);
      const header = JSON.parse(new TextDecoder().decode(headerBytes));

      // Decode payload to get holder information
      const payloadBytes = base64url.decode(payload);
      const presentation = JSON.parse(new TextDecoder().decode(payloadBytes)) as VerifiablePresentation;

      // Get the holder ID from the presentation
      if (!presentation.holder) {
        throw new Error('Presentation must have a holder');
      }

      const holderId = presentation.holder;

      // Resolve the holder's controller document
      const holderController = await controllerResolver.resolve(holderId);

      // Get the authentication key resolver for the holder
      const authenticationKeyResolver = await holderController.authentication;

      // Resolve the presentation verifier using the kid
      // The resolver handles both full verification method IDs and raw kids
      const presentationVerifier = await authenticationKeyResolver.resolve(header.kid);

      // Verify the presentation signature
      const verifiedPresentation = await presentationVerifier.verify(jws);

      // Extract the full JWT payload to check time claims, nonce and audience
      const jwtPayload = JSON.parse(new TextDecoder().decode(payloadBytes)) as any;

      // Validate time-based JWT claims
      const nowInSeconds = Math.floor(Date.now() / 1000);

      // Check exp (expiration) claim
      if (jwtPayload.exp !== undefined) {
        if (typeof jwtPayload.exp !== 'number') {
          throw new Error('Invalid exp claim: must be a number');
        }
        if (nowInSeconds > jwtPayload.exp) {
          const expDate = new Date(jwtPayload.exp * 1000);
          throw new Error(`Presentation has expired. Expired at: ${expDate.toISOString()}`);
        }
      }

      // Check iat (issued at) claim
      if (jwtPayload.iat !== undefined) {
        if (typeof jwtPayload.iat !== 'number') {
          throw new Error('Invalid iat claim: must be a number');
        }
        if (jwtPayload.iat > nowInSeconds + 60) { // Allow 60 seconds clock skew
          throw new Error('Invalid iat claim: presentation issued in the future');
        }
      }

      // Validate nonce if expected
      if (options?.expectedNonce) {
        if (!jwtPayload.nonce) {
          throw new Error('Nonce is required but not present in presentation');
        }
        if (jwtPayload.nonce !== options.expectedNonce) {
          throw new Error(`Nonce mismatch: expected ${options.expectedNonce} but got ${jwtPayload.nonce}`);
        }
      }

      // Validate audience if expected
      if (options?.expectedAudience) {
        if (!jwtPayload.aud) {
          throw new Error('Audience is required but not present in presentation');
        }

        // Normalize both to arrays for comparison
        const presentationAud = Array.isArray(jwtPayload.aud) ? jwtPayload.aud : [jwtPayload.aud];
        const expectedAud = Array.isArray(options.expectedAudience) ? options.expectedAudience : [options.expectedAudience];

        // Check if at least one expected audience matches
        const hasMatchingAudience = expectedAud.some(expected =>
          presentationAud.includes(expected)
        );

        if (!hasMatchingAudience) {
          throw new Error(`Audience mismatch: expected one of [${expectedAud.join(', ')}] but got [${presentationAud.join(', ')}]`);
        }
      }

      // Now verify each credential in the presentation
      if (verifiedPresentation.verifiableCredential && verifiedPresentation.verifiableCredential.length > 0) {
        for (const envelopedCred of verifiedPresentation.verifiableCredential) {
          // Extract JWS from enveloped credential
          const credJws = createJsonWebSignatureFromEnvelopedVerifiableCredential(envelopedCred as EnvelopedVerifiableCredential);

          // Parse credential to get issuer
          const credParts = credJws.split('.');
          if (credParts.length !== 3) {
            throw new Error('Invalid credential JWS format');
          }

          // Decode credential payload to get issuer
          const credPayloadBytes = base64url.decode(credParts[1]);
          const credPayload = JSON.parse(new TextDecoder().decode(credPayloadBytes)) as VerifiableCredential;

          // Get the issuer from the credential
          const issuerId = credPayload.issuer;

          // Resolve the issuer's controller document
          const issuerController = await controllerResolver.resolve(issuerId);

          // Get the assertion key resolver for the issuer
          const assertionKeyResolver = await issuerController.assertion;

          // Parse credential header to get the kid used to sign
          const credHeaderBytes = base64url.decode(credParts[0]);
          const credHeader = JSON.parse(new TextDecoder().decode(credHeaderBytes));

          // Resolve the credential verifier using the kid
          // The resolver handles both full verification method IDs and raw kids
          const credentialVerifier = await assertionKeyResolver.resolve(credHeader.kid);

          // Verify the credential
          const verifiedCredential = await credentialVerifier.verify(credJws);

          // Check if credential has cnf claim (MUST be top-level)
          if (verifiedCredential.cnf?.kid) {
            // The presentation MUST be signed with the key specified in cnf.kid
            const cnfKid = verifiedCredential.cnf.kid;

            // Extract just the kid part if cnfKid is a full verification method ID
            let cnfKeyId = cnfKid;
            if (cnfKid.includes('#')) {
              cnfKeyId = cnfKid.split('#')[1];
            }

            // The presentation's signing key must match the cnf.kid
            if (header.kid !== cnfKeyId) {
              throw new Error(`Presentation key mismatch: credential requires key ${cnfKeyId} but presentation was signed with ${header.kid}`);
            }
          }
        }
      }

      return verifiedPresentation;
    }
  };
};