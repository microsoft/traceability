/**
 * GeoJSON to Markdown Export Utilities
 *
 * Generates GitHub-flavored markdown with expandable sections
 * for GeoJSON content preview and analysis.
 */

import { GeoJSONAnalysis, formatCoordinates } from './detector';

export interface GeoJSONMarkdownOptions {
  title?: string;
  showAnalysis?: boolean;
  showCoordinates?: boolean;
  showProperties?: boolean;
  maxPropertiesDisplay?: number;
}

/**
 * Converts GeoJSON to expandable markdown section
 */
export function geoJSONToMarkdown(
  geoJSON: any,
  analysis: GeoJSONAnalysis,
  options: GeoJSONMarkdownOptions = {}
): string {
  const {
    title = "Geographic Data",
    showAnalysis = true,
    showCoordinates = true,
    showProperties = true,
    maxPropertiesDisplay = 5
  } = options;

  const lines: string[] = [];
  const emoji = getGeoJSONEmoji(analysis.type, analysis.geometryTypes);

  // Main expandable section
  lines.push('<details>');
  lines.push(`<summary>${emoji} ${title} - ${analysis.description}</summary>`);
  lines.push('');

  // Analysis section
  if (showAnalysis) {
    lines.push('### 📊 Geographic Analysis');
    lines.push('');
    lines.push(`- **Type**: ${analysis.type}`);

    if (analysis.featureCount) {
      lines.push(`- **Features**: ${analysis.featureCount}`);
    }

    if (analysis.geometryTypes && analysis.geometryTypes.length > 0) {
      lines.push(`- **Geometry Types**: ${analysis.geometryTypes.join(', ')}`);
    }

    if (analysis.boundingBox) {
      const [minLon, minLat, maxLon, maxLat] = analysis.boundingBox;
      lines.push(`- **Bounding Box**: ${formatCoordinates([minLon, minLat])} to ${formatCoordinates([maxLon, maxLat])}`);
    }

    lines.push('');
  }

  // Properties section
  if (showProperties && analysis.properties && analysis.properties.length > 0) {
    lines.push('### 🏷️ Feature Properties');
    lines.push('');

    analysis.properties.slice(0, maxPropertiesDisplay).forEach((props, index) => {
      lines.push(`**Feature ${index + 1}:**`);

      // Show important properties first
      const importantKeys = ['name', 'type', 'description', 'quantity', 'carrier', 'shipper', 'consignee'];
      const otherKeys = Object.keys(props).filter(key => !importantKeys.includes(key));

      [...importantKeys.filter(key => props[key]), ...otherKeys].forEach(key => {
        const value = props[key];
        if (typeof value === 'object' && value !== null) {
          if (value.name || value.id) {
            lines.push(`  - **${key}**: ${value.name || value.id}`);
          } else {
            lines.push(`  - **${key}**: ${JSON.stringify(value)}`);
          }
        } else {
          lines.push(`  - **${key}**: ${value}`);
        }
      });

      lines.push('');
    });

    if (analysis.properties.length > maxPropertiesDisplay) {
      lines.push(`*... and ${analysis.properties.length - maxPropertiesDisplay} more features*`);
      lines.push('');
    }
  }

  // Coordinates section (for simple geometries)
  if (showCoordinates && shouldShowCoordinates(analysis)) {
    lines.push('### 📍 Coordinates');
    lines.push('');

    const coords = extractMainCoordinates(geoJSON);
    if (coords.length > 0) {
      if (coords.length <= 10) {
        coords.forEach((coord, index) => {
          lines.push(`${index + 1}. ${formatCoordinates(coord)}`);
        });
      } else {
        // Show first few and last few for long coordinate lists
        coords.slice(0, 5).forEach((coord, index) => {
          lines.push(`${index + 1}. ${formatCoordinates(coord)}`);
        });
        lines.push(`... (${coords.length - 10} coordinates omitted)`);
        coords.slice(-5).forEach((coord, index) => {
          lines.push(`${coords.length - 5 + index + 1}. ${formatCoordinates(coord)}`);
        });
      }
      lines.push('');
    }
  }

  // Raw GeoJSON section (always included for debugging)
  lines.push('### 📄 Raw GeoJSON');
  lines.push('');
  lines.push('```geojson');
  lines.push(JSON.stringify(geoJSON, null, 2));
  lines.push('```');
  lines.push('');

  // Supply chain context if detected
  if (analysis.properties && analysis.properties.length > 0) {
    const supplyChainInfo = extractSupplyChainInfo(analysis.properties);
    if (supplyChainInfo.length > 0) {
      lines.push('### 🚛 Supply Chain Context');
      lines.push('');
      supplyChainInfo.forEach(info => lines.push(`- ${info}`));
      lines.push('');
    }
  }

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

/**
 * Determines if coordinates should be shown
 */
function shouldShowCoordinates(analysis: GeoJSONAnalysis): boolean {
  // Show coordinates for simple geometries, not for complex collections
  if (analysis.type === 'FeatureCollection' && (analysis.featureCount || 0) > 3) {
    return false;
  }

  return analysis.geometryTypes?.includes('Point') ||
         analysis.geometryTypes?.includes('LineString') ||
         false;
}

/**
 * Extracts main coordinates from GeoJSON for display
 */
function extractMainCoordinates(geoJSON: any): number[][] {
  const coords: number[][] = [];

  switch (geoJSON.type) {
    case 'FeatureCollection':
      // Extract from first few features only
      geoJSON.features.slice(0, 3).forEach((feature: any) => {
        if (feature.geometry) {
          coords.push(...extractMainCoordinates(feature.geometry));
        }
      });
      break;

    case 'Feature':
      if (geoJSON.geometry) {
        coords.push(...extractMainCoordinates(geoJSON.geometry));
      }
      break;

    case 'Point':
      coords.push(geoJSON.coordinates);
      break;

    case 'LineString':
      coords.push(...geoJSON.coordinates);
      break;

    case 'Polygon':
      // Just the outer ring
      coords.push(...geoJSON.coordinates[0]);
      break;

    case 'MultiPoint':
      coords.push(...geoJSON.coordinates);
      break;

    case 'MultiLineString':
      // Just the first LineString
      if (geoJSON.coordinates.length > 0) {
        coords.push(...geoJSON.coordinates[0]);
      }
      break;
  }

  return coords;
}

/**
 * Extracts supply chain specific information from properties
 */
function extractSupplyChainInfo(properties: Record<string, any>[]): string[] {
  const info: string[] = [];

  properties.forEach((props, index) => {
    const featureNum = properties.length > 1 ? ` (Feature ${index + 1})` : '';

    if (props.shipper) {
      info.push(`**Shipper${featureNum}**: ${props.shipper.name || props.shipper.id || JSON.stringify(props.shipper)}`);
    }

    if (props.carrier) {
      info.push(`**Carrier${featureNum}**: ${props.carrier.name || props.carrier.id || JSON.stringify(props.carrier)}`);
    }

    if (props.consignee) {
      info.push(`**Consignee${featureNum}**: ${props.consignee.name || props.consignee.id || JSON.stringify(props.consignee)}`);
    }

    if (props.buyer) {
      info.push(`**Buyer${featureNum}**: ${props.buyer.name || props.buyer.id || JSON.stringify(props.buyer)}`);
    }

    if (props.seller) {
      info.push(`**Seller${featureNum}**: ${props.seller.name || props.seller.id || JSON.stringify(props.seller)}`);
    }

    if (props.quantity) {
      info.push(`**Quantity${featureNum}**: ${props.quantity}`);
    }

    if (props.vesselName) {
      info.push(`**Vessel${featureNum}**: ${props.vesselName}`);
    }

    if (props.deliveryDate) {
      info.push(`**Delivery Date${featureNum}**: ${props.deliveryDate}`);
    }
  });

  return info;
}

/**
 * Creates a simple map preview URL for coordinates (using OpenStreetMap)
 */
export function generateMapPreviewURL(analysis: GeoJSONAnalysis): string | null {
  if (!analysis.boundingBox) return null;

  const [minLon, minLat, maxLon, maxLat] = analysis.boundingBox;
  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;

  // Calculate appropriate zoom level based on bounding box size
  const lonDiff = Math.abs(maxLon - minLon);
  const latDiff = Math.abs(maxLat - minLat);
  const maxDiff = Math.max(lonDiff, latDiff);

  let zoom = 10;
  if (maxDiff > 10) zoom = 3;
  else if (maxDiff > 5) zoom = 5;
  else if (maxDiff > 1) zoom = 8;
  else if (maxDiff > 0.1) zoom = 12;
  else zoom = 15;

  return `https://www.openstreetmap.org/#map=${zoom}/${centerLat.toFixed(4)}/${centerLon.toFixed(4)}`;
}