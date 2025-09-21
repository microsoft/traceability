/**
 * Extract controller ID from verification method ID
 * @param verificationMethodId - Full verification method ID like "https://example.com#key1" or just "https://example.com"
 * @returns Controller ID like "https://example.com"
 */
export const extractControllerIdFromVerificationMethod = (verificationMethodId: string): string => {
  if (verificationMethodId && verificationMethodId.includes('#')) {
    return verificationMethodId.split('#')[0];
  }
  return verificationMethodId;
};