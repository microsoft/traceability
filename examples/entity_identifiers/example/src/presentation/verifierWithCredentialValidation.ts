import * as key from "../key";
import * as credential from "../credential";
import type { VerifiablePresentation } from "./presentation";
import type { PublicKey } from "../types";
import { base64url } from "../encoding";
import { createJsonWebSignatureFromEnvelopedVerifiableCredential } from "../credential/credential";
import type { EnvelopedVerifiableCredential } from "../credential/credential";

export interface PresentationVerifierWithCredentialValidation {
  verify: (jws: string, credentialVerifiers?: Map<string, credential.CredentialVerifier>) => Promise<VerifiablePresentation>;
}

export const verifierWithCredentialValidation = async (publicKey: PublicKey) => {
  const verifier = await key.verifier(publicKey);
  return {
    verify: async (jws: string, credentialVerifiers?: Map<string, credential.CredentialVerifier>) => {
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

      // If credentialVerifiers are provided, verify each credential and check cnf claims
      if (credentialVerifiers && presentation.verifiableCredential && presentation.verifiableCredential.length > 0) {
        for (const envelopedCred of presentation.verifiableCredential) {
          // Extract JWS from enveloped credential
          const credJws = createJsonWebSignatureFromEnvelopedVerifiableCredential(envelopedCred as EnvelopedVerifiableCredential);

          // Parse credential header to get issuer key ID
          const credParts = credJws.split('.');
          if (credParts.length !== 3) {
            throw new Error('Invalid credential JWS format');
          }

          const credHeaderBytes = base64url.decode(credParts[0]);
          const credHeader = JSON.parse(new TextDecoder().decode(credHeaderBytes));

          // Find the appropriate verifier for this credential
          const credentialVerifier = credentialVerifiers.get(credHeader.kid);
          if (!credentialVerifier) {
            throw new Error(`No verifier found for credential with kid: ${credHeader.kid}`);
          }

          // Verify the credential
          const verifiedCredential = await credentialVerifier.verify(credJws);

          // Check if credential has cnf claim (MUST be top-level)
          if (verifiedCredential.cnf?.kid) {
            // The presentation MUST be signed with the key specified in cnf.kid
            const cnfKid = verifiedCredential.cnf.kid;

            // The presentation's signing key (publicKey.kid) must match the cnf.kid
            if (publicKey.kid !== cnfKid) {
              throw new Error(`Presentation key mismatch: credential requires key ${cnfKid} but presentation was signed with ${publicKey.kid}`);
            }
          }
        }
      }

      return presentation;
    }
  };
};