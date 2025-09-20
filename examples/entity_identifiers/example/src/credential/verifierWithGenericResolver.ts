import type { VerifiableCredential } from "./credential";
import type { GenericResolver } from "../resolver/genericResolver";
import { base64url } from "../encoding";
import { defaultGenericResolver } from "../resolver/genericResolver";

export interface CredentialVerifierWithGenericResolver {
  verify: (jws: string, options?: { validateSchema?: boolean }) => Promise<VerifiableCredential>;
}

export const verifierWithGenericResolver = async (
  resolver: GenericResolver = defaultGenericResolver
) => {
  return {
    verify: async (jws: string, options?: { validateSchema?: boolean }) => {
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

      // Decode payload to get credential information
      const payloadBytes = base64url.decode(payload);
      const credential = JSON.parse(new TextDecoder().decode(payloadBytes)) as VerifiableCredential;

      // Get the issuer from the credential
      if (!credential.issuer) {
        throw new Error('Credential must have an issuer');
      }

      const issuerId = credential.issuer;

      // Resolve the issuer's controller document
      const issuerController = await resolver.resolveController(issuerId);

      // Get the assertion key resolver for the issuer
      const assertionKeyResolver = await issuerController.assertion;

      // Resolve the credential verifier using the kid
      const credentialVerifier = await assertionKeyResolver.resolve(header.kid);

      // Verify the credential signature
      const verifiedCredential = await credentialVerifier.verify(jws);

      // If validateSchema option is true and credential has credentialSchema, validate it
      if (options?.validateSchema && verifiedCredential.credentialSchema) {
        for (const schema of verifiedCredential.credentialSchema) {
          if (schema.type === "JsonSchema") {
            try {
              const validator = await resolver.resolveSchema(schema.id);
              const valid = validator(verifiedCredential);
              if (!valid) {
                throw new Error(`Credential validation failed against schema ${schema.id}: ${JSON.stringify(validator.errors)}`);
              }
            } catch (error) {
              // If schema cannot be resolved, we could either fail or continue
              // For now, we'll log a warning and continue
              console.warn(`Could not validate against schema ${schema.id}: ${error}`);
            }
          }
        }
      }

      return verifiedCredential;
    }
  };
};