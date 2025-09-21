# Gaps and Misalignments Between README and Report JSON

## Missing Fraud Type Detection

**Report JSON Issue**: Several features that should be flagged as fraudulent according to the README timeline have `fraud_type: null` instead of appropriate fraud classifications:

- **Line 501**: Presentation for stolen legitimate certificate (Feb 8) should be `"⚠️ Document Compromise"` but is `null`
- **Line 521**: Credential for stolen legitimate certificate should be `"⚠️ Document Compromise"` but is `null`

## README Timeline vs Report Discrepancies

**Presentation Description Mismatch**:
- **Line 500**: Report shows presentation holder as "honest-importer" but description says "inappropriately presented by Shady Distributor Ltd"
- This creates confusion about who actually presented the stolen credential

## Missing Document Compromise Detection

**Technical Gap**: The report JSON lacks proper fraud type classification for the key document compromise scenario described in README:
- **February 8, 2024** event: "STOLEN legitimate certificate credentials inappropriately presented by Shady Distributor Ltd"
- This should trigger `"⚠️ Document Compromise"` fraud type based on cnf.kid mismatch detection methodology described in README's Investigation Methodology section

## Synthetic Identity Fraud Classification Gap

**Missing Classification**: No features in the report JSON are classified as `"⚠️ Synthetic Identity Fraud"` despite README identifying Shady Distributor Ltd as a synthetic identity entity established specifically to fence stolen goods

## Verification Logic Inconsistency

**Lines 492-501**: The stolen credential presentation shows:
- `presentation_verified: true`
- `presentation_contains_fraudulent_credential: true`
- But `fraud_type: null`

This contradicts the README's Investigation Methodology which states that document compromise should be detectable through verification key analysis when cnf.kid mismatches occur.