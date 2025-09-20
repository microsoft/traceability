/**
 * GeoJSON Detection and Analysis Utilities
 *
 * Provides functionality to detect, validate, and analyze GeoJSON content
 * within verifiable credentials for supply chain geographic data.
 */

export interface GeoJSONAnalysis {
  isValid: boolean;
  type: string;
  featureCount?: number;
  geometryTypes?: string[];
  boundingBox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  properties?: Record<string, any>[];
  description?: string;
}

/**
 * Detects if an object is valid GeoJSON
 */
export function isValidGeoJSON(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;

  // Check for required GeoJSON properties
  if (!obj.type || typeof obj.type !== 'string') return false;

  const validTypes = [
    'Point', 'MultiPoint', 'LineString', 'MultiLineString',
    'Polygon', 'MultiPolygon', 'GeometryCollection',
    'Feature', 'FeatureCollection'
  ];

  if (!validTypes.includes(obj.type)) return false;

  // Additional validation based on type
  switch (obj.type) {
    case 'FeatureCollection':
      return Array.isArray(obj.features) && obj.features.every((f: any) => isValidGeoJSON(f));

    case 'Feature':
      return obj.geometry && isValidGeoJSON(obj.geometry);

    case 'Point':
      return Array.isArray(obj.coordinates) && obj.coordinates.length >= 2 &&
             obj.coordinates.every((coord: any) => typeof coord === 'number');

    case 'LineString':
      return Array.isArray(obj.coordinates) && obj.coordinates.length >= 2 &&
             obj.coordinates.every((coord: any) =>
               Array.isArray(coord) && coord.length >= 2 &&
               coord.every((c: any) => typeof c === 'number')
             );

    case 'Polygon':
      return Array.isArray(obj.coordinates) && obj.coordinates.length >= 1 &&
             obj.coordinates.every((ring: any) =>
               Array.isArray(ring) && ring.length >= 4 &&
               ring.every((coord: any) =>
                 Array.isArray(coord) && coord.length >= 2 &&
                 coord.every((c: any) => typeof c === 'number')
               )
             );

    default:
      return true; // Basic validation passed for other types
  }
}

/**
 * Extracts coordinates from any GeoJSON geometry
 */
function extractCoordinates(geometry: any): number[][] {
  const coords: number[][] = [];

  switch (geometry.type) {
    case 'Point':
      coords.push(geometry.coordinates);
      break;

    case 'LineString':
      coords.push(...geometry.coordinates);
      break;

    case 'Polygon':
      // Extract coordinates from all rings
      geometry.coordinates.forEach((ring: number[][]) => {
        coords.push(...ring);
      });
      break;

    case 'MultiPoint':
      coords.push(...geometry.coordinates);
      break;

    case 'MultiLineString':
      geometry.coordinates.forEach((line: number[][]) => {
        coords.push(...line);
      });
      break;

    case 'MultiPolygon':
      geometry.coordinates.forEach((polygon: number[][][]) => {
        polygon.forEach((ring: number[][]) => {
          coords.push(...ring);
        });
      });
      break;
  }

  return coords;
}

/**
 * Calculates bounding box from coordinates
 */
function calculateBoundingBox(coordinates: number[][]): [number, number, number, number] {
  if (coordinates.length === 0) return [0, 0, 0, 0];

  let minLon = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLon = coordinates[0][0];
  let maxLat = coordinates[0][1];

  coordinates.forEach(([lon, lat]) => {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  });

  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Analyzes GeoJSON structure and content
 */
export function analyzeGeoJSON(obj: any): GeoJSONAnalysis {
  if (!isValidGeoJSON(obj)) {
    return { isValid: false, type: 'invalid' };
  }

  const analysis: GeoJSONAnalysis = {
    isValid: true,
    type: obj.type
  };

  let allCoordinates: number[][] = [];
  const geometryTypes: Set<string> = new Set();
  const properties: Record<string, any>[] = [];

  switch (obj.type) {
    case 'FeatureCollection':
      analysis.featureCount = obj.features.length;

      obj.features.forEach((feature: any) => {
        if (feature.geometry) {
          geometryTypes.add(feature.geometry.type);
          allCoordinates.push(...extractCoordinates(feature.geometry));
        }
        if (feature.properties) {
          properties.push(feature.properties);
        }
      });
      break;

    case 'Feature':
      analysis.featureCount = 1;
      if (obj.geometry) {
        geometryTypes.add(obj.geometry.type);
        allCoordinates.push(...extractCoordinates(obj.geometry));
      }
      if (obj.properties) {
        properties.push(obj.properties);
      }
      break;

    default:
      // Direct geometry object
      geometryTypes.add(obj.type);
      allCoordinates.push(...extractCoordinates(obj));
      break;
  }

  analysis.geometryTypes = Array.from(geometryTypes);
  analysis.properties = properties;

  if (allCoordinates.length > 0) {
    analysis.boundingBox = calculateBoundingBox(allCoordinates);
  }

  // Generate human-readable description
  analysis.description = generateDescription(analysis);

  return analysis;
}

/**
 * Generates human-readable description of GeoJSON content
 */
function generateDescription(analysis: GeoJSONAnalysis): string {
  const { type, featureCount, geometryTypes } = analysis;

  if (type === 'FeatureCollection') {
    const geomDesc = geometryTypes!.length === 1
      ? geometryTypes![0]
      : `${geometryTypes!.length} geometry types`;
    return `Feature collection with ${featureCount} features containing ${geomDesc}`;
  }

  if (type === 'Feature') {
    return `Single feature with ${geometryTypes![0]} geometry`;
  }

  return `${type} geometry`;
}

/**
 * Detects GeoJSON in credential subjects
 */
export function detectCredentialGeoJSON(credential: any): GeoJSONAnalysis | null {
  if (!credential?.credentialSubject) return null;

  const subject = credential.credentialSubject;

  // Check if the credential subject itself is GeoJSON
  if (isValidGeoJSON(subject)) {
    return analyzeGeoJSON(subject);
  }

  // Check if any property of the credential subject is GeoJSON
  for (const [key, value] of Object.entries(subject)) {
    if (isValidGeoJSON(value)) {
      const analysis = analyzeGeoJSON(value);
      analysis.description = `${key}: ${analysis.description}`;
      return analysis;
    }
  }

  return null;
}

/**
 * Formats coordinates for display
 */
export function formatCoordinates(coordinates: number[]): string {
  if (coordinates.length >= 2) {
    const [lon, lat] = coordinates;
    const latStr = lat >= 0 ? `${lat.toFixed(4)}°N` : `${Math.abs(lat).toFixed(4)}°S`;
    const lonStr = lon >= 0 ? `${lon.toFixed(4)}°E` : `${Math.abs(lon).toFixed(4)}°W`;
    return `${latStr}, ${lonStr}`;
  }
  return coordinates.join(', ');
}