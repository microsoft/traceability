#!/bin/bash

# Change to project root for proper module resolution
cd ../../

echo "Simple credential issuance test"
echo "Current directory: $(pwd)"
echo ""

# Test template existence
echo "Testing template existence..."
if [ -f "case-studies/transhrimpment/credential-templates/purchase-order-template.json" ]; then
    echo "✅ Template exists"
else
    echo "❌ Template missing"
    exit 1
fi

# Simple function to issue and verify one credential
issue_credential() {
    local entity_config="$1"
    local credential_template="$2"
    local output_file="$3"

    echo "Function parameters:"
    echo "  entity_config: $entity_config"
    echo "  credential_template: $credential_template"
    echo "  output_file: $output_file"

    # Check if template exists
    if [ -f "$credential_template" ]; then
        echo "✅ Template found in function"
    else
        echo "❌ Template NOT found in function"
        return 1
    fi

    # Issue the credential
    echo "Issuing credential..."
    bun src/cli.ts sign-credential \
        --entity-configuration "$entity_config" \
        --credential "$credential_template" \
        --out "$output_file"

    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        echo "✅ Credential issued successfully"
        return 0
    else
        echo "❌ Failed to issue credential"
        return 1
    fi
}

# Test the function
echo "Testing credential issuance function..."
issue_credential \
    "case-studies/transhrimpment/entity_configurations/chompchomp-config.json" \
    "case-studies/transhrimpment/credential-templates/purchase-order-template.json" \
    "case-studies/transhrimpment/credentials/simple-test.json"

echo "Test completed"