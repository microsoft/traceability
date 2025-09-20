
export type ES256 = 'ES256';
export type ES384 = 'ES384';

export interface PublicKeyJwk {
  kid: string;
  kty: "EC";
  x: string;
  y: string;
  key_ops: ["verify"];
}

export interface PrivateKeyJwk extends Omit<PublicKeyJwk, 'key_ops'> {
  d: string;  
  key_ops: ['sign'];
}

export type ES256PrivateKeyJwk = PrivateKeyJwk & {  
  alg: ES256;
  crv: "P-256";
}


export type ES256PublicKeyJwk = PublicKeyJwk & {
  alg: ES256;
  crv: "P-256";
}

export type ES384PrivateKeyJwk = PrivateKeyJwk & {
  alg: ES384;
  crv: "P-384";
}

export type ES384PublicKeyJwk = PublicKeyJwk & {
  alg: ES384;
  crv: "P-384";
}

export type PublicKey = ES256PublicKeyJwk | ES384PublicKeyJwk;
export type PrivateKey = ES256PrivateKeyJwk | ES384PrivateKeyJwk;