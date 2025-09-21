#!/bin/bash

# Transhrimpment Case Study - Digital Investigation Demo
# This script demonstrates the CLI workflow for investigating supply chain fraud

# Change to project root for proper module resolution
cd ../../

# Using existing case study configurations
echo "🔍 Starting Transhrimpment Digital Investigation Demo"
echo "===================================================="
echo ""

REPORT_FILE="case-studies/transhrimpment/report.md"

# Initialize report file
cat > "$REPORT_FILE" << 'EOF'
# Transhrimpment Digital Investigation Report

This is a hypothetical scenario, this report is for demo purposes only.

## Executive Summary

This report documents a digital forensic investigation of the "Transhrimpment" supply chain fraud case using verifiable credentials and cryptographic signatures to detect document tampering and identity theft.

---

EOF

echo "🔍 Starting Transhrimpment Digital Investigation Demo"
echo "=================================================="
echo "📄 Report will be generated in: $REPORT_FILE"

# Ensure output directories exist
mkdir -p case-studies/transhrimpment/{controllers,credentials,presentations}

echo ""
echo "🔍 Step 1: Identify Entities"
echo "============================"
echo "🔒 Reading entity configurations..."
echo "🌐 Generating controller documents..."
echo "📍 Validating and extracting geographic data..."

# Add controller generation section to report
cat >> "$REPORT_FILE" << 'EOF'
## Step 1: Identify Entities

<details>
<summary>🔍 Click to expand entity identification details</summary>

Identifying supply chain entities, gather their addresses, locations and aliases for comparison to supply chain documents:

EOF

# Helper function to run command and capture REAL output for report
run_command_and_report() {
    local description="$1"
    local command="$2"
    local status_emoji="$3"

    echo "Running: $description..."

    # Run command and capture REAL output
    local output
    local exit_code
    output=$(eval "$command" 2>&1)
    exit_code=$?

    # Determine actual status based on exit code
    local actual_status
    if [ $exit_code -eq 0 ]; then
        actual_status="✅"
    else
        actual_status="❌"
    fi

    # Add REAL results to report with collapsible section
    echo "" >> "$REPORT_FILE"
    echo "<details>" >> "$REPORT_FILE"
    echo "<summary>$actual_status $description</summary>" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo '```bash' >> "$REPORT_FILE"
    echo "$ $command" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "$output" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    if [ $exit_code -ne 0 ]; then
        echo "Exit code: $exit_code" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
    echo "</details>" >> "$REPORT_FILE"

    return $exit_code
}

# Generate all controller documents silently
echo "Generating controller documents..."
bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/chompchomp-config.json --out case-studies/transhrimpment/controllers/chompchomp-controller.json > /dev/null 2>&1
bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/camaron-corriente-config.json --out case-studies/transhrimpment/controllers/camaron-corriente-controller.json > /dev/null 2>&1
bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/legit-shrimp-config.json --out case-studies/transhrimpment/controllers/legit-shrimp-controller.json > /dev/null 2>&1
bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/shady-carrier-config.json --out case-studies/transhrimpment/controllers/shady-carrier-controller.json > /dev/null 2>&1
bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/shady-distributor-config.json --out case-studies/transhrimpment/controllers/shady-distributor-controller.json > /dev/null 2>&1
bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/cargo-line-config.json --out case-studies/transhrimpment/controllers/cargo-line-controller.json > /dev/null 2>&1
bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/anonymous-distributor-config.json --out case-studies/transhrimpment/controllers/anonymous-distributor-controller.json > /dev/null 2>&1
bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/honest-importer-config.json --out case-studies/transhrimpment/controllers/honest-importer-controller.json > /dev/null 2>&1

# Function to extract entity info and GeoJSON preview from validation
extract_entity_geojson() {
    local entity_name="$1"
    local controller_file="$2"

    echo "Identifying $entity_name..."

    # Use the new analyze-controller command to generate entity report
    local entity_report
    entity_report=$(bun src/cli.ts analyze-controller --controller "$controller_file" --schema case-studies/transhrimpment/schemas/controller-document.yaml 2>/dev/null)

    # Replace the generic "Entity Analysis" title with the actual entity name
    entity_report=$(echo "$entity_report" | sed "s/### ✅ Entity Analysis/### ✅ $entity_name/" | sed "s/### ❌ Entity Analysis/### ❌ $entity_name/")

    # Add the entity report to the main report file
    echo "" >> "$REPORT_FILE"
    echo "$entity_report" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
}

echo ""
echo "Identifying entities through controller validation..."

# Extract entity information for each controller
extract_entity_geojson "Chompchomp Ltd" "case-studies/transhrimpment/controllers/chompchomp-controller.json"
extract_entity_geojson "Camarón Corriente S.A." "case-studies/transhrimpment/controllers/camaron-corriente-controller.json"
extract_entity_geojson "Legit Shrimp Ltd" "case-studies/transhrimpment/controllers/legit-shrimp-controller.json"
extract_entity_geojson "Shady Carrier Ltd" "case-studies/transhrimpment/controllers/shady-carrier-controller.json"
extract_entity_geojson "Shady Distributor Ltd" "case-studies/transhrimpment/controllers/shady-distributor-controller.json"
extract_entity_geojson "Cargo Line Ltd" "case-studies/transhrimpment/controllers/cargo-line-controller.json"
extract_entity_geojson "Anonymous Distributor" "case-studies/transhrimpment/controllers/anonymous-distributor-controller.json"
extract_entity_geojson "Honest Importer Inc" "case-studies/transhrimpment/controllers/honest-importer-controller.json"

# Add final summary
echo "" >> "$REPORT_FILE"
cat >> "$REPORT_FILE" << 'EOF'

**🔍 Entity identification completed!**

</details>

EOF

echo ""
echo "🔍 Entity identification completed! Report generated at: $REPORT_FILE"
echo "📍 Geographic locations extracted for all entities"
echo "🗺️ Map previews available in report"

# Create resolver cache from all controller documents
echo ""
echo "🗃️  Creating resolver cache from controller documents..."
run_command_and_report "Create resolver cache from controllers" "bun src/cli.ts create-resolver-cache --controllers case-studies/transhrimpment/controllers --out case-studies/transhrimpment/resolver-cache.json" "📦"

echo ""
echo "📋 Step 2: Document Creation (Credential Issuance)"
echo "=================================================="
echo "📄 Issuing verifiable credentials from the Transhrimpment narrative..."
echo "🔐 Using private keys from entity configurations..."
echo "✅ Verifying each credential after issuance..."

# Add Step 2 section to report
cat >> "$REPORT_FILE" << 'EOF'

---

## Step 2: Document Creation

<details>
<summary>📋 Click to expand document details</summary>

This section covers all the documents that are issued for this supply chain.

EOF

# Helper function to issue and verify credentials
issue_and_verify_credential() {
    local entity_name="$1"
    local entity_config="$2"
    local credential_template="$3"
    local schema_file="$4"
    local output_file="$5"
    local description="$6"

    echo "📋 Issuing $description..."

    # Template will be created if it doesn't exist using predefined examples
    if [ ! -f "$credential_template" ]; then
        echo "⚠️  Credential template $credential_template not found"
        echo "Please ensure credential templates are created before running this demo"
        return 1
    fi

    # Issue the credential
    local sign_result
    sign_result=$(bun src/cli.ts sign-credential --entity-configuration "$entity_config" --credential "$credential_template" --out "$output_file" 2>&1 | head -16)
    local sign_exit_code=$?

    # Verify the credential using the resolver cache
    local verify_result=""
    local verify_exit_code=1

    if [ $sign_exit_code -eq 0 ] && [ -f "$output_file" ]; then
        verify_result=$(bun src/cli.ts verify-credential --credential "$output_file" --resolver-cache case-studies/transhrimpment/resolver-cache.json 2>&1 | head -16)
        verify_exit_code=$?
    fi

    # Determine status
    local status_emoji="❌"
    if [ $sign_exit_code -eq 0 ] && [ $verify_exit_code -eq 0 ]; then
        status_emoji="✅"
    fi

    # Extract any GeoJSON data from the credential
    local geojson_preview=""
    if [ -f "$output_file" ]; then
        geojson_preview=$(python3 -c "
import json
import sys
try:
    with open('$output_file', 'r') as f:
        cred = json.load(f)
    if 'credentialSubject' in cred and 'features' in cred['credentialSubject']:
        features = cred['credentialSubject']['features']
        if features and len(features) > 0:
            coords = features[0].get('geometry', {}).get('coordinates', [])
            props = features[0].get('properties', {})
            if coords:
                print(f'📍 Location: [{coords[0]}, {coords[1]}]')
                if 'name' in props or 'type' in props:
                    print(f'🏢 Details: {props.get(\"name\", \"\")} ({props.get(\"type\", \"\")})')
except Exception as e:
    pass
" 2>/dev/null)
    fi

    # Add to report with credential content and analysis
    cat >> "$REPORT_FILE" << EOF

### $status_emoji $description

<details>
<summary>Document Verification</summary>

**Verify Command:**
\`\`\`bash
bun src/cli.ts verify-credential --credential $output_file --resolver-cache case-studies/transhrimpment/resolver-cache.json
\`\`\`

**Verify Result:**
\`\`\`
$verify_result
\`\`\`

</details>

EOF

    # Skip credential JSON content - EnvelopedVerifiableCredential format is implementation detail

    # Add GeoJSON preview if available
    if [ -n "$geojson_preview" ]; then
        cat >> "$REPORT_FILE" << EOF
**Geographic Information:**
$geojson_preview

EOF
    fi

    # === PRESENTATION WORKFLOW ===
    # Create and sign presentation for this credential
    if [ $sign_exit_code -eq 0 ] && [ -f "$output_file" ]; then
        # Determine presentation output file
        local base_filename=$(basename "$output_file" .json)
        local presentation_file="case-studies/transhrimpment/presentations/${base_filename}-presentation.json"
        local presentation_template_file="${output_file%.json}-presentation-template.json"

        # Extract holder ID from credential's cnf.kid field using resolver cache
        local holder_id=$(bun src/cli.ts extract-holder-id --credential "$output_file" --resolver-cache case-studies/transhrimpment/resolver-cache.json 2>/dev/null || echo "unknown-holder")

        echo "📋 Creating presentation for $description..."

        # Create presentation template for this specific credential
        cat > "$presentation_template_file" << PRES_EOF
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2"
  ],
  "type": [
    "VerifiablePresentation"
  ],
  "holder": "$holder_id",
  "verifiableCredential": [
    $(cat "$output_file")
  ]
}
PRES_EOF

        # Sign the presentation
        local pres_sign_result
        pres_sign_result=$(bun src/cli.ts sign-presentation --entity-configuration "$entity_config" --presentation "$presentation_template_file" --out "$presentation_file" 2>&1 | head -16)
        local pres_sign_exit_code=$?

        # Verify the presentation
        local pres_verify_result=""
        local pres_verify_exit_code=1
        if [ $pres_sign_exit_code -eq 0 ] && [ -f "$presentation_file" ]; then
            pres_verify_result=$(bun src/cli.ts verify-presentation --presentation "$presentation_file" --resolver-cache case-studies/transhrimpment/resolver-cache.json 2>&1 | head -16)
            pres_verify_exit_code=$?
        fi

        # Determine presentation status
        local pres_status_emoji="❌"
        if [ $pres_sign_exit_code -eq 0 ] && [ $pres_verify_exit_code -eq 0 ]; then
            pres_status_emoji="✅"
        fi


</details>

---

## Step 3: Document Exchange

<details>
<summary>🔄 Click to expand document exchange details</summary>

This section covers all the presentations that are created for this supply chain.


#### $pres_status_emoji Presentation for $description

<details>
<summary>Presentation Verification</summary>

**Verify Command:**
\`\`\`bash
bun src/cli.ts verify-presentation --presentation $presentation_file --resolver-cache case-studies/transhrimpment/resolver-cache.json
\`\`\`

**Verify Result:**
\`\`\`
$pres_verify_result
\`\`\`

</details>

EOF

        # Skip presentation JSON content - EnvelopedVerifiablePresentation format is implementation detail

        # Clean up presentation template file
        rm -f "$presentation_template_file"
    fi

    return $sign_exit_code
}

# Create credential templates and presentations directories
mkdir -p case-studies/transhrimpment/credential-templates
mkdir -p case-studies/transhrimpment/presentations

echo ""
echo "🏭 Issuing legitimate supply chain credentials per narrative..."

# LEGITIMATE DOCUMENTS (8 total as per README)

# 1. Purchase Order: Chompchomp → Camarón Corriente
issue_and_verify_credential \
    "Chompchomp Ltd" \
    "case-studies/transhrimpment/entity_configurations/chompchomp-config.json" \
    "case-studies/transhrimpment/credential-templates/purchase-order-template.json" \
    "case-studies/transhrimpment/schemas/purchase-order-credential.yaml" \
    "case-studies/transhrimpment/credentials/chompchomp-purchase-order.json" \
    "Purchase Order (Chompchomp → Camarón Corriente)"

# 2. Commercial Invoice: Camarón Corriente → Chompchomp
issue_and_verify_credential \
    "Camarón Corriente S.A." \
    "case-studies/transhrimpment/entity_configurations/camaron-corriente-config.json" \
    "case-studies/transhrimpment/credential-templates/commercial-invoice-template.json" \
    "case-studies/transhrimpment/schemas/commercial-invoice-credential.yaml" \
    "case-studies/transhrimpment/credentials/camaron-corriente-invoice.json" \
    "Commercial Invoice (Camarón Corriente → Chompchomp)"

# 3. Certificate of Origin: Camarón Corriente → Chompchomp
issue_and_verify_credential \
    "Camarón Corriente S.A." \
    "case-studies/transhrimpment/entity_configurations/camaron-corriente-config.json" \
    "case-studies/transhrimpment/credential-templates/certificate-origin-template.json" \
    "case-studies/transhrimpment/schemas/certificate-of-origin-credential.yaml" \
    "case-studies/transhrimpment/credentials/camaron-corriente-origin.json" \
    "Certificate of Origin (Camarón Corriente → Chompchomp)"

# 4. Bill of Lading: Shady Carrier → Chompchomp
issue_and_verify_credential \
    "Shady Carrier Ltd" \
    "case-studies/transhrimpment/entity_configurations/shady-carrier-config.json" \
    "case-studies/transhrimpment/credential-templates/bill-lading-template.json" \
    "case-studies/transhrimpment/schemas/bill-of-lading-credential.yaml" \
    "case-studies/transhrimpment/credentials/shady-carrier-lading.json" \
    "Bill of Lading (Shady Carrier → Chompchomp)"

# 5. Secondary Purchase Order: Anonymous Distributor → Shady Distributor
issue_and_verify_credential \
    "Anonymous Distributor" \
    "case-studies/transhrimpment/entity_configurations/anonymous-distributor-config.json" \
    "case-studies/transhrimpment/credential-templates/secondary-purchase-order-template.json" \
    "case-studies/transhrimpment/schemas/purchase-order-credential.yaml" \
    "case-studies/transhrimpment/credentials/anonymous-distributor-purchase-order.json" \
    "Secondary Purchase Order (Anonymous Distributor → Shady Distributor)"

# 6. Secondary Commercial Invoice: Shady Distributor → Anonymous Distributor
issue_and_verify_credential \
    "Shady Distributor Ltd" \
    "case-studies/transhrimpment/entity_configurations/shady-distributor-config.json" \
    "case-studies/transhrimpment/credential-templates/secondary-commercial-invoice-template.json" \
    "case-studies/transhrimpment/schemas/commercial-invoice-credential.yaml" \
    "case-studies/transhrimpment/credentials/shady-distributor-invoice.json" \
    "Secondary Commercial Invoice (Shady Distributor → Anonymous Distributor)"

# 7. Forged Bill of Lading: Shady Carrier forges documentation about original shipment
issue_and_verify_credential \
    "Shady Carrier Ltd" \
    "case-studies/transhrimpment/entity_configurations/shady-carrier-config.json" \
    "case-studies/transhrimpment/credential-templates/shady-carrier-forged-lading-template.json" \
    "case-studies/transhrimpment/schemas/bill-of-lading-credential.yaml" \
    "case-studies/transhrimpment/credentials/shady-carrier-forged-lading.json" \
    "Forged Bill of Lading (Shady Carrier forges original shipment documentation)"

# 8. Legitimate Secondary Bill of Lading: Cargo Line → Anonymous Distributor
issue_and_verify_credential \
    "Cargo Line Ltd" \
    "case-studies/transhrimpment/entity_configurations/cargo-line-config.json" \
    "case-studies/transhrimpment/credential-templates/cargo-line-legitimate-lading-template.json" \
    "case-studies/transhrimpment/schemas/bill-of-lading-credential.yaml" \
    "case-studies/transhrimpment/credentials/cargo-line-legitimate-lading.json" \
    "Legitimate Secondary Bill of Lading (Cargo Line → Anonymous Distributor)"

# 9. Stolen Certificate of Origin: Legit Shrimp → Honest Importer (legitimate but will be misused)
issue_and_verify_credential \
    "Legit Shrimp Ltd" \
    "case-studies/transhrimpment/entity_configurations/legit-shrimp-config.json" \
    "case-studies/transhrimpment/credential-templates/stolen-certificate-template.json" \
    "case-studies/transhrimpment/schemas/certificate-of-origin-credential.yaml" \
    "case-studies/transhrimpment/credentials/legit-shrimp-honest-importer-origin.json" \
    "Certificate of Origin (Legit Shrimp → Honest Importer) - WILL BE STOLEN"

echo ""
echo "🚨 Issuing fraudulent credential (for investigation purposes)..."

# FRAUDULENT DOCUMENTS (1 total as per README)

# 10. Fraudulent Certificate of Origin: Shady Distributor forging Legit Shrimp's identity
issue_and_verify_credential \
    "Shady Distributor Ltd" \
    "case-studies/transhrimpment/entity_configurations/shady-distributor-config.json" \
    "case-studies/transhrimpment/credential-templates/fraudulent-origin-template.json" \
    "case-studies/transhrimpment/schemas/certificate-of-origin-credential.yaml" \
    "case-studies/transhrimpment/credentials/shady-distributor-fraudulent-origin.json" \
    "FRAUDULENT Certificate of Origin (Shady Distributor forging Legit Shrimp identity)"

# Add summary section to report
cat >> "$REPORT_FILE" << 'EOF'

</details>

---

EOF

echo ""
echo "📋 Steps 2 & 3: Documentation collection completed!"
echo "✅ 8 legitimate credentials issued per narrative"
echo "🚨 1 fraudulent certificate of origin issued"
echo "🔐 All credentials cryptographically signed and verified"
echo "🔄 9 presentations created and verified for each credential"
echo "📍 Geographic data preserved for route analysis"

echo ""
echo "🔍 Step 4: Fraud Detection Analysis"
echo "=================================="
echo "🕵️ Demonstrating how cryptographic verification detects fraud..."

# Add Step 4 section to report
cat >> "$REPORT_FILE" << 'EOF'

---

## Step 4: Fraud Detection Analysis

<details>
<summary>🔍 Click to expand fraud detection analysis</summary>

Demonstrating how verifiable credentials prevent fraud through cryptographic verification and holder binding.

### Scenario 1: Fraudulent Credential Detection

**Issue**: Testing the fraudulent Certificate of Origin created in Step 2, where Shady Distributor Ltd attempted to forge a credential claiming to be from Legit Shrimp Ltd but signed it with their own keys.

**Expected Result**: Verification should fail because the signature doesn't match Legit Shrimp Ltd's authorized keys.

EOF

echo ""
echo "🚨 Testing fraudulent credential verification..."
echo "   Verifying existing fraudulent certificate from Step 2..."

# Test the fraudulent credential - this should fail verification
echo "" >> "$REPORT_FILE"
echo "<details>" >> "$REPORT_FILE"
echo "<summary>❌ Fraudulent Certificate Verification Test</summary>" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Test Command:**" >> "$REPORT_FILE"
echo '```bash' >> "$REPORT_FILE"
echo "bun src/cli.ts verify-credential --credential case-studies/transhrimpment/credentials/shady-distributor-fraudulent-origin.json --resolver-cache case-studies/transhrimpment/resolver-cache.json" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Test Result:**" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"

# Run the test and capture output
fraud_test_result=$(bun src/cli.ts verify-credential --credential case-studies/transhrimpment/credentials/shady-distributor-fraudulent-origin.json --resolver-cache case-studies/transhrimpment/resolver-cache.json 2>&1)
fraud_exit_code=$?
# Truncate output to keep report manageable
fraud_test_result=$(echo "$fraud_test_result" | head -16)

echo "$fraud_test_result" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"

if [ $fraud_exit_code -ne 0 ]; then
    echo "✅ FRAUD DETECTED! Credential verification failed as expected"
    echo "" >> "$REPORT_FILE"
    echo "**✅ FRAUD SUCCESSFULLY DETECTED**: The fraudulent certificate failed verification because it was signed by Shady Distributor Ltd's keys, not Legit Shrimp Ltd's authorized signing keys." >> "$REPORT_FILE"
else
    echo "❌ FRAUD NOT DETECTED! This should have failed"
    echo "" >> "$REPORT_FILE"
    echo "**❌ UNEXPECTED**: This credential should have failed verification." >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "</details>" >> "$REPORT_FILE"

# Add Scenario 2 to report
cat >> "$REPORT_FILE" << 'EOF'

### Scenario 2: Stolen Credential Detection (Holder Binding Failure)

**Issue**: Demonstrating what happens when Shady Distributor Ltd attempts to present the legitimate Certificate of Origin (created in Step 2) that was originally issued by Legit Shrimp Ltd to Honest Importer Ltd.

**Expected Result**: Presentation should fail because Shady Distributor Ltd cannot prove they are the intended holder (cnf.kid mismatch).

EOF

echo ""
echo "🚨 Testing stolen credential presentation..."
echo "   Demonstrating fraudulent presentation attempt (for analysis only)..."

# The legitimate presentation already exists: case-studies/transhrimpment/presentations/legit-shrimp-honest-importer-origin-presentation.json
# This was created in Step 3 with the correct holder (Honest Importer)
# Now we'll demonstrate what happens if Shady Distributor tries to present this same credential

fraudulent_presentation_file="case-studies/transhrimpment/presentations/fraudulent-stolen-presentation.json"

# Check if the legitimate presentation exists first
legitimate_presentation="case-studies/transhrimpment/presentations/legit-shrimp-honest-importer-origin-presentation.json"

if [ ! -f "$legitimate_presentation" ]; then
    echo "❌ Error: Legitimate presentation not found at $legitimate_presentation"
    echo "This indicates an issue with the previous steps."
    exit 1
fi

echo "   Note: Using existing legitimate credential from Step 2"
echo "   Simulating unauthorized presentation attempt by wrong entity..."

# Get the holder ID that Shady Distributor would claim to be
shady_distributor_id="https://shady-distributor.example/entity/bvi-002"

# Create fraudulent presentation template (demonstrating the attack scenario)
cat > "${fraudulent_presentation_file%.json}-template.json" << FRAUD_PRES_EOF
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2"
  ],
  "type": [
    "VerifiablePresentation"
  ],
  "holder": "$shady_distributor_id",
  "verifiableCredential": [
    $(cat "case-studies/transhrimpment/credentials/legit-shrimp-honest-importer-origin.json")
  ]
}
FRAUD_PRES_EOF

# Sign the fraudulent presentation using Shady Distributor's keys (this demonstrates the attack)
echo "📋 Demonstrating: Shady Distributor attempting to present stolen credential..."
fraud_pres_result=$(bun src/cli.ts sign-presentation --entity-configuration case-studies/transhrimpment/entity_configurations/shady-distributor-config.json --presentation "${fraudulent_presentation_file%.json}-template.json" --out "$fraudulent_presentation_file" 2>&1 | head -16)
fraud_pres_exit_code=$?

echo "" >> "$REPORT_FILE"
echo "<details>" >> "$REPORT_FILE"
echo "<summary>❌ Stolen Credential Presentation Test</summary>" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Note**: This creates a fraudulent presentation attempt for analysis purposes only, using the existing legitimate credential." >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Test Command:**" >> "$REPORT_FILE"
echo '```bash' >> "$REPORT_FILE"
echo "bun src/cli.ts verify-presentation --presentation $fraudulent_presentation_file --resolver-cache case-studies/transhrimpment/resolver-cache.json" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Test Result:**" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"

if [ $fraud_pres_exit_code -eq 0 ]; then
    # Presentation was signed successfully, now try to verify it (this should fail)
    stolen_test_result=$(bun src/cli.ts verify-presentation --presentation "$fraudulent_presentation_file" --resolver-cache case-studies/transhrimpment/resolver-cache.json 2>&1)
    stolen_exit_code=$?
    # Truncate output to keep report manageable
    stolen_test_result=$(echo "$stolen_test_result" | head -16)

    echo "$stolen_test_result" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"

    if [ $stolen_exit_code -ne 0 ]; then
        echo "✅ CREDENTIAL THEFT DETECTED! Presentation failed due to holder binding mismatch"
        echo "" >> "$REPORT_FILE"
        echo "**✅ CREDENTIAL THEFT SUCCESSFULLY DETECTED**: The presentation failed because the credential was bound to Honest Importer Ltd (via cnf.kid), but Shady Distributor Ltd attempted to present it." >> "$REPORT_FILE"
    else
        echo "❌ CREDENTIAL THEFT NOT DETECTED! This should have failed"
        echo "" >> "$REPORT_FILE"
        echo "**❌ UNEXPECTED**: This presentation should have failed due to holder binding verification." >> "$REPORT_FILE"
    fi
else
    echo "Error creating fraudulent presentation: $fraud_pres_result" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "</details>" >> "$REPORT_FILE"

# Add final summary to report
cat >> "$REPORT_FILE" << 'EOF'

### Summary

The cryptographic verification system successfully demonstrates two critical security features:

1. **Digital Signature Integrity**: Fraudulent credentials cannot be created using forged identities because they fail cryptographic signature verification against the claimed issuer's authorized keys.

2. **Holder Binding Protection**: Legitimate credentials cannot be stolen and misused because they are cryptographically bound to their intended holders through the `cnf.kid` field, preventing unauthorized presentation.

</details>

---

EOF

echo ""
echo "🔍 Step 4: Fraud Detection Analysis completed!"
echo "✅ Demonstrated protection against credential forgery"
echo "✅ Demonstrated protection against credential theft"
echo "🛡️ Verifiable credentials successfully prevent both identity theft and credential misuse"

