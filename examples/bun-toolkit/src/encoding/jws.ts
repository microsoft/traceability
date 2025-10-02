import * as base64url from "./base64url";

export interface ParsedJWS {
  header: any;
  payload: any;
  signature: string;
  protectedHeader: string;
  payloadString: string;
}

/**
 * Generic JWS decoder that parses a JWS string into its components
 * @param jws - The JWS string to parse
 * @returns Parsed JWS components
 * @throws Error if the JWS format is invalid
 */
export const parseJWS = (jws: string): ParsedJWS => {
  // Parse JWS to get initial information
  const parts = jws.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWS format');
  }

  const [protectedHeader, payload, signature] = parts;

  if (!protectedHeader || !payload || !signature) {
    throw new Error('Invalid JWS format: missing parts');
  }

  // Decode header
  const headerBytes = base64url.decode(protectedHeader);
  const header = JSON.parse(new TextDecoder().decode(headerBytes));

  // Decode payload
  const payloadBytes = base64url.decode(payload);
  const payloadObj = JSON.parse(new TextDecoder().decode(payloadBytes));

  return {
    header,
    payload: payloadObj,
    signature,
    protectedHeader,
    payloadString: payload
  };
};

/**
 * Decode only the header of a JWS without parsing the payload
 * @param jws - The JWS string to parse
 * @returns The decoded header
 * @throws Error if the JWS format is invalid
 */
export const parseJWSHeader = (jws: string): any => {
  const parts = jws.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWS format');
  }

  const [protectedHeader] = parts;
  if (!protectedHeader) {
    throw new Error('Invalid JWS format: missing header');
  }

  const headerBytes = base64url.decode(protectedHeader);
  return JSON.parse(new TextDecoder().decode(headerBytes));
};

/**
 * Decode only the payload of a JWS without parsing the header
 * @param jws - The JWS string to parse
 * @returns The decoded payload
 * @throws Error if the JWS format is invalid
 */
export const parseJWSPayload = (jws: string): any => {
  const parts = jws.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWS format');
  }

  const [, payload] = parts;
  if (!payload) {
    throw new Error('Invalid JWS format: missing payload');
  }

  const payloadBytes = base64url.decode(payload);
  return JSON.parse(new TextDecoder().decode(payloadBytes));
};
