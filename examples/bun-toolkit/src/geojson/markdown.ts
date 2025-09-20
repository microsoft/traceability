/**
 * GeoJSON to Markdown Export Utilities
 *
 * Generates GitHub-flavored markdown with expandable sections
 * for GeoJSON content preview and analysis.
 */

import type { GeoJSONAnalysis } from './detector';


/**
 * Converts GeoJSON to expandable markdown section
 */
export function geoJSONToMarkdown(
  geoJSON: any,
  analysis: GeoJSONAnalysis
): string {

  const lines: string[] = [];
  const emoji = getGeoJSONEmoji(analysis.type, analysis.geometryTypes);

  // Main expandable section
  lines.push('<details>');
  lines.push(`<summary>${emoji} ${analysis.description}</summary>`);
  lines.push('');

  lines.push('');
  lines.push('```geojson');
  lines.push(JSON.stringify(geoJSON, null, 2));
  lines.push('```');
  lines.push('');

  lines.push('</details>');

  return lines.join('\n');
}

/**
 * Determines appropriate emoji for GeoJSON type
 */
function getGeoJSONEmoji(type: string, geometryTypes?: string[]): string {
  if (geometryTypes) {
    if (geometryTypes.includes('LineString')) return '🗺️'; // Routes/paths
    if (geometryTypes.includes('Polygon')) return '🏢'; // Areas/regions
    if (geometryTypes.includes('Point')) return '📍'; // Locations
  }

  switch (type) {
    case 'FeatureCollection': return '🌍';
    case 'Feature': return '📍';
    case 'Point': return '📍';
    case 'LineString': return '🛣️';
    case 'Polygon': return '🏢';
    case 'MultiPoint': return '📍';
    case 'MultiLineString': return '🗺️';
    case 'MultiPolygon': return '🏢';
    default: return '🗺️';
  }
}
