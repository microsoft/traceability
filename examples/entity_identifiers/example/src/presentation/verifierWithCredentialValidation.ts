import * as key from "../key";
import * as credential from "../credential";
import type { VerifiablePresentation } from "./presentation";
import type { PublicKey } from "../types";
import { base64url } from "../encoding";
import { createJsonWebSignatureFromEnvelopedVerifiableCredential } from "../credential/credential";
import type { EnvelopedVerifiableCredential, VerifiableCredential } from "../credential/credential";

export interface ControllerResolver {
  resolve: (id: string) => Promise<{
    assertion: {
      resolve: (id: string) => Promise<credential.CredentialVerifier>;
    };
    authentication: {
      resolve: (id: string) => Promise<any>;
    };
  }>;
}

export interface PresentationVerifierWithCredentialValidation {
  verify: (jws: string, controllerResolver?: ControllerResolver) => Promise<VerifiablePresentation>;
}

export const verifierWithCredentialValidation = async (publicKey: PublicKey) => {
  const verifier = await key.verifier(publicKey);
  return {
    verify: async (jws: string, controllerResolver?: ControllerResolver) => {
      // Parse JWS: header.payload.signature
      const parts = jws.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWS format');
      }

      const [protectedHeader, payload, signature] = parts;

      if (!protectedHeader || !payload || !signature) {
        throw new Error('Invalid JWS format: missing parts');
      }

      // Decode and parse header
      const headerBytes = base64url.decode(protectedHeader);
      const header = JSON.parse(new TextDecoder().decode(headerBytes));

      // Verify the algorithm matches the public key
      if (header.alg !== publicKey.alg) {
        throw new Error(`Algorithm mismatch: expected ${publicKey.alg}, got ${header.alg}`);
      }

      // Verify the key ID matches
      if (header.kid !== publicKey.kid) {
        throw new Error(`Key ID mismatch: expected ${publicKey.kid}, got ${header.kid}`);
      }

      // Prepare data for verification
      const toBeVerified = protectedHeader + "." + payload;
      const signatureBytes = base64url.decode(signature);

      // Verify the signature
      const isValid = await verifier.verify(
        new TextEncoder().encode(toBeVerified),
        signatureBytes
      );

      if (!isValid) {
        throw new Error('Invalid signature');
      }

      // Decode the presentation
      const payloadBytes = base64url.decode(payload);
      const presentation = JSON.parse(new TextDecoder().decode(payloadBytes)) as VerifiablePresentation;

      // If controllerResolver is provided, verify each credential and check cnf claims
      if (controllerResolver && presentation.verifiableCredential && presentation.verifiableCredential.length > 0) {
        for (const envelopedCred of presentation.verifiableCredential) {
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

          // The credential header has the kid, but we need to find the full verification method ID
          // Try to resolve using the issuer ID + fragment (common pattern)
          let credentialVerifier;
          try {
            // Try with full verification method ID (issuer + # + kid)
            const verificationMethodId = `${issuerId}#${credHeader.kid}`;
            credentialVerifier = await assertionKeyResolver.resolve(verificationMethodId);
          } catch (e) {
            // If that fails, try with just the kid
            try {
              credentialVerifier = await assertionKeyResolver.resolve(credHeader.kid);
            } catch (e2) {
              throw new Error(`Cannot find assertion key for credential signed with kid: ${credHeader.kid}`);
            }
          }

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

            // The presentation's signing key (publicKey.kid) must match the cnf.kid
            if (publicKey.kid !== cnfKeyId) {
              throw new Error(`Presentation key mismatch: credential requires key ${cnfKeyId} but presentation was signed with ${publicKey.kid}`);
            }
          }
        }
      }

      return presentation;
    }
  };
};