import { key } from "..";
import type { ES256, ES384, PrivateKey, PublicKey } from "../types";

export interface VerificationMethod {
  id: string;
  type: "JsonWebKey";
  controller: string;
  publicKeyJwk: PublicKey
}

export interface Point {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Address {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

export interface Controller {
  "@context": ["https://www.w3.org/ns/cid/v1", "https://geojson.org/geojson-ld/geojson-context.jsonld"];
  "id": string;
  "alsoKnownAs": string[];
  "verificationMethod": VerificationMethod[];
  "assertionMethod": string[];
  "geometry": Point;
  "address": Address;
}

export interface ControllerWithKeys {
  controller: Controller;
  privateKey: PrivateKey;
  publicKey: PublicKey;
}

export const createController = async (
  id: string, 
  alsoKnownAs: string[], 
  geometry: Point,
  address: Address,
  algorithm: ES256 | ES384 = "ES256"
): Promise<ControllerWithKeys> => {
  const privateKey = await key.generatePrivateKey(algorithm);
  const publicKey = await key.exportPublicKey(privateKey);
  const thumbprint = await key.calculateThumbprint(publicKey);
  
  const verificationMethodId = `${id}#${thumbprint}`;
  const doc = {
    "@context": ["https://www.w3.org/ns/cid/v1", "https://geojson.org/geojson-ld/geojson-context.jsonld"],
    "id": id,
    "alsoKnownAs": alsoKnownAs,
    "verificationMethod": [
      {
        "id": verificationMethodId,
        "type": "JsonWebKey",
        "controller": id,
        "publicKeyJwk": publicKey
      }
    ],
    "assertionMethod": [verificationMethodId],
    "geometry": geometry,
    "address": address
  } as Controller;  
  
  return {controller: doc, privateKey, publicKey};
}