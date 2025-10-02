import type { VerifiableCredential } from "../credential/credential";
import type { GenericResolver } from "../resolver/genericResolver";

/**
 * Validates JWT time-based claims (exp, iat) against a verification time
 * @param jwtPayload - The JWT payload to validate
 * @param verificationTime - The time to validate against
 * @throws Error if time claims are invalid
 */
export const validateJWTTimeClaims = (jwtPayload: any, verificationTime: Date): void => {
  const now = verificationTime;
  const nowInSeconds = Math.floor(now.getTime() / 1000);

  // Check exp (expiration) claim
  if (jwtPayload.exp !== undefined) {
    if (typeof jwtPayload.exp !== 'number') {
      throw new Error('Invalid exp claim: must be a number');
    }
    if (nowInSeconds > jwtPayload.exp) {
      const expDate = new Date(jwtPayload.exp * 1000);
      throw new Error(`JWT has expired. Expired at: ${expDate.toISOString()}`);
    }
  }

  // Check iat (issued at) claim
  if (jwtPayload.iat !== undefined) {
    if (typeof jwtPayload.iat !== 'number') {
      throw new Error('Invalid iat claim: must be a number');
    }
    if (jwtPayload.iat > nowInSeconds + 60) { // Allow 60 seconds clock skew
      throw new Error('Invalid iat claim: JWT issued in the future');
    }
  }
};

/**
 * Validates credential schemas against a verifiable credential
 * @param verifiedCredential - The credential to validate
 * @param resolver - The resolver to use for schema resolution
 * @throws Error if schema validation fails
 */
export const validateCredentialSchemas = async (
  verifiedCredential: VerifiableCredential,
  resolver: GenericResolver
): Promise<void> => {
  if (!verifiedCredential.credentialSchema) return;

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
        console.warn(`Could not validate credential against schema ${schema.id}: ${error}`);
      }
    }
  }
};

/**
 * Validates nonce and audience claims in JWT payload
 * @param jwtPayload - The JWT payload to validate
 * @param options - Validation options containing expected nonce and audience
 * @throws Error if nonce or audience validation fails
 */
export const validateNonceAndAudience = (jwtPayload: any, options: { expectedNonce?: string; expectedAudience?: string | string[] }): void => {
  // Validate nonce if expected
  if (options.expectedNonce) {
    if (!jwtPayload.nonce) {
      throw new Error('Nonce is required but not present in JWT');
    }
    if (jwtPayload.nonce !== options.expectedNonce) {
      throw new Error(`Nonce mismatch: expected ${options.expectedNonce} but got ${jwtPayload.nonce}`);
    }
  }

  // Validate audience if expected
  if (options.expectedAudience) {
    if (!jwtPayload.aud) {
      throw new Error('Audience is required but not present in JWT');
    }

    // Normalize both to arrays for comparison
    const jwtAud = Array.isArray(jwtPayload.aud) ? jwtPayload.aud : [jwtPayload.aud];
    const expectedAud = Array.isArray(options.expectedAudience) ? options.expectedAudience : [options.expectedAudience];

    // Check if at least one expected audience matches
    const hasMatchingAudience = expectedAud.some(expected =>
      jwtAud.includes(expected)
    );

    if (!hasMatchingAudience) {
      throw new Error(`Audience mismatch: expected one of [${expectedAud.join(', ')}] but got [${jwtAud.join(', ')}]`);
    }
  }
};
