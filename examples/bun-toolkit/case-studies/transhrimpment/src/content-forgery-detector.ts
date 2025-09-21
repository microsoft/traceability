interface CredentialContent {
  credentialId: string;
  issuerClaim: string;        // Who the credential claims to be from
  actualSigner: string;       // Who actually signed it (from JWT header)
  holderBinding: string;      // cnf.kid - who should present it
  businessContent: string;    // Hash of business-relevant fields
  geoContent: string;         // Hash of geographic data
  timestamp: number;          // When issued
}

interface ContentSimilarity {
  credential1: string;
  credential2: string;
  businessContentMatch: boolean;
  geoContentMatch: boolean;
  identityMismatch: boolean;
  suspicionLevel: number;
}

export class ContentBasedForgeryDetector {
  private extractBusinessContent(credentialPayload: any): string {
    // Extract unique identifiers and specific details that shouldn't be duplicated across different entities
    const businessFields: any = {};

    // Navigate the credential structure
    const credSubject = credentialPayload.credentialSubject;
    if (!credSubject) return "";

    // If it's a FeatureCollection, look at the features
    if (credSubject.type === "FeatureCollection" && credSubject.features) {
      credSubject.features.forEach((feature: any, index: number) => {
        if (feature.properties) {
          const props = feature.properties;

          // Extract unique identifiers that should not be shared
          if (props.orderNumber) businessFields[`orderNumber_${index}`] = props.orderNumber;
          if (props.invoiceNumber) businessFields[`invoiceNumber_${index}`] = props.invoiceNumber;
          if (props.certificateNumber) businessFields[`certificateNumber_${index}`] = props.certificateNumber;
          if (props.containerNumber) businessFields[`containerNumber_${index}`] = props.containerNumber;
          if (props.vesselName) businessFields[`vesselName_${index}`] = props.vesselName;
          if (props.ladingNumber) businessFields[`ladingNumber_${index}`] = props.ladingNumber;

          // Extract specific transaction details (amounts, dates, unique descriptions)
          if (props.totalAmount) businessFields[`totalAmount_${index}`] = props.totalAmount;
          if (props.items && Array.isArray(props.items)) {
            businessFields[`items_${index}`] = JSON.stringify(props.items);
          }
          if (props.deliveryDate) businessFields[`deliveryDate_${index}`] = props.deliveryDate;
          if (props.issueDate) businessFields[`issueDate_${index}`] = props.issueDate;

          // Detailed product specifications that might be copied
          if (props.productSpecification) businessFields[`productSpec_${index}`] = props.productSpecification;
          if (props.temperature && props.storageConditions) {
            businessFields[`storage_${index}`] = `${props.temperature}-${props.storageConditions}`;
          }
        }
      });
    }

    // Direct credential subject fields
    if (credSubject.id && credSubject.id.includes("specific")) {
      businessFields.credentialId = credSubject.id;
    }

    // Only hash if we have meaningful content
    const filteredFields = Object.fromEntries(
      Object.entries(businessFields).filter(([_, value]) => value != null && value !== "")
    );

    return Object.keys(filteredFields).length > 0 ? this.hashObject(filteredFields) : "";
  }

  private extractGeoContent(credentialPayload: any): string {
    // Extract geographic features for comparison
    const geoFeatures = credentialPayload.credentialSubject?.features || [];
    const geoContent = geoFeatures.map((feature: any) => ({
      type: feature.geometry?.type,
      coordinates: feature.geometry?.coordinates,
      properties: Object.fromEntries(
        Object.entries(feature.properties || {})
          .filter(([key, _]) => !key.includes('id') && !key.includes('key') && !key.includes('name'))
      )
    }));

    return this.hashObject(geoContent);
  }

  private hashObject(obj: any): string {
    // Create a deterministic hash by sorting keys
    return btoa(JSON.stringify(obj, Object.keys(obj).sort()));
  }

  detectContentBasedForgery(credentials: Map<string, any> | Record<string, any>): ContentSimilarity[] {
    const credentialContents: CredentialContent[] = [];
    const similarities: ContentSimilarity[] = [];

    // Step 1: Extract content from all credentials
    const credentialEntries = credentials instanceof Map ?
      Array.from(credentials.entries()) :
      Object.entries(credentials);

    credentialEntries.forEach(([credKey, credential]) => {
      try {
        const jwtToken = credential.id.substring("data:application/vc+jwt,".length);
        const [headerB64, payloadB64] = jwtToken.split('.');

        const header = JSON.parse(atob(headerB64));
        const payload = JSON.parse(atob(payloadB64));

        credentialContents.push({
          credentialId: credKey,
          issuerClaim: payload.issuer || payload.iss,
          actualSigner: header.kid,
          holderBinding: payload.cnf?.kid || "",
          businessContent: this.extractBusinessContent(payload),
          geoContent: this.extractGeoContent(payload),
          timestamp: payload.iat || 0
        });
      } catch (error) {
        console.warn(`Failed to extract content from ${credKey}:`, error);
      }
    });

    // Step 2: Compare all credential pairs for suspicious similarities
    for (let i = 0; i < credentialContents.length; i++) {
      for (let j = i + 1; j < credentialContents.length; j++) {
        const cred1 = credentialContents[i];
        const cred2 = credentialContents[j];

        const similarity = this.compareCredentials(cred1, cred2);
        if (similarity.suspicionLevel > 0) {
          similarities.push(similarity);
        }
      }
    }

    return similarities;
  }

  private compareCredentials(cred1: CredentialContent, cred2: CredentialContent): ContentSimilarity {
    const businessMatch = cred1.businessContent === cred2.businessContent &&
                         cred1.businessContent !== "" && cred1.businessContent.length > 10;
    const geoMatch = cred1.geoContent === cred2.geoContent &&
                    cred1.geoContent !== "" && cred1.geoContent.length > 10;

    // Check for identity mismatches that matter
    const differentIssuers = cred1.issuerClaim !== cred2.issuerClaim;
    const differentSigners = cred1.actualSigner !== cred2.actualSigner;
    const differentHolders = cred1.holderBinding !== cred2.holderBinding;

    const identityMismatch = differentIssuers || differentSigners || differentHolders;

    let suspicionLevel = 0;

    // Calculate time difference for temporal analysis
    const timeDiff = Math.abs(cred1.timestamp - cred2.timestamp);

    // Only flag as suspicious if there are meaningful business content matches AND identity issues
    if (businessMatch && identityMismatch) {
      // Very high suspicion: Same unique business identifiers but different entities claiming them
      suspicionLevel += 85;

      // Extra suspicion if the timing is very close (same day reuse of identifiers)
      if (timeDiff < 3600) { // Within 1 hour
        suspicionLevel += 10;
      }
    }

    // Moderate suspicion: Same geographic patterns but different identities (could be route copying)
    if (geoMatch && identityMismatch && !businessMatch) {
      suspicionLevel += 40;
    }

    // Maximum suspicion: Both business and geographic content copied
    if (businessMatch && geoMatch && identityMismatch) {
      suspicionLevel = 95;
    }

    // Temporal proximity within fraud timeline increases suspicion
    if (timeDiff < 86400 * 7 && suspicionLevel > 0) { // Within 1 week
      suspicionLevel += 5;
    }

    return {
      credential1: cred1.credentialId,
      credential2: cred2.credentialId,
      businessContentMatch: businessMatch,
      geoContentMatch: geoMatch,
      identityMismatch: identityMismatch,
      suspicionLevel
    };
  }

  // Helper method to get fraud type from content analysis
  getFraudTypeFromSimilarity(similarity: ContentSimilarity): string {
    if (similarity.suspicionLevel > 90) {
      return "⚠️ Counterfeiting and Alteration";
    } else if (similarity.businessContentMatch && similarity.identityMismatch) {
      return "⚠️ Synthetic Identity Fraud";
    } else if (similarity.geoContentMatch && similarity.identityMismatch) {
      return "⚠️ Counterfeiting and Alteration";
    } else if (similarity.suspicionLevel > 70) {
      return "⚠️ Counterfeiting and Alteration";
    }
    return null;
  }
}

// Export types for use in tests
export type { CredentialContent, ContentSimilarity };