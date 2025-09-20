
export type ES256 = 'ES256';

export interface PublicKeyJwk {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
  alg: ES256;
  key_ops: ["verify"];
}

export interface PrivateKeyJwk extends Omit<PublicKeyJwk, 'key_ops'> {
  d: string;  
  key_ops: ['sign'];
}