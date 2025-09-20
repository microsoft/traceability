/**
 * Base64url encoding and decoding utilities for Uint8Array
 */

/**
 * Encodes a Uint8Array to base64url string
 * @param data - The Uint8Array to encode
 * @returns The base64url encoded string
 */
export function encode(data: Uint8Array): string {
  // Convert Uint8Array to base64
  const base64 = btoa(String.fromCharCode(...data));
  
  // Convert to base64url by replacing characters and removing padding
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decodes a base64url string to Uint8Array
 * @param encoded - The base64url encoded string
 * @returns The decoded Uint8Array
 */
export function decode(encoded: string): Uint8Array {
  // Add padding back if needed
  const padded = encoded + '='.repeat((4 - encoded.length % 4) % 4);
  
  // Convert from base64url to base64
  const base64 = padded
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Decode base64 to string
  const binaryString = atob(base64);
  
  // Convert string to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}
