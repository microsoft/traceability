[Controlled Identifiers are a W3C Technical Recommendation](https://www.w3.org/TR/cid-1.0/), that provides a data model for discovering cryptographic keys for an entity, and relationships between identifiers for that entity.

[GLUE](https://datatracker.ietf.org/doc/draft-ietf-spice-glue-id/) is an internet draft being developed by the SPICE Working group at IETF.

Together these specifications enable verifiable supply chain graphs that are essential for managing tax and subsidy information related to ESG (Environmental, Social, and Governance) issues such as climate concerns. By providing cryptographically verifiable assertions about supply chain participants and their environmental practices, organizations can:

- **Claim tax incentives** for sustainable practices with verifiable proof
- **Qualify for climate subsidies** by demonstrating authentic supply chain sustainability
- **Comply with carbon reporting requirements** through auditable supply chain data
- **Manage ESG risk** by verifying supplier environmental credentials
- **Enable carbon credit trading** with verified emission reduction claims

Here is an example CID, relating a company owned website to legal entity identifiers:

```json
{
  "@context": ["https://www.w3.org/ns/cid/v1"],
  "id": "https://controller.example/101",
  "alsoKnownAs": [
    "urn:ietf:spice:glue:gln:123",
    "urn:ietf:spice:glue:lei:456",
    "urn:ietf:spice:glue:pen:789"
  ],
  "verificationMethod": [
    {
      "id": "https://controller.example/101#NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs",
      "type": "JsonWebKey",
      "controller": "https://controller.example/101",
      "publicKeyJwk": {
        "kid": "NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs",
        "kty": "EC",
        "crv": "P-384",
        "alg": "ES384",
        "x": "1F14JSzKbwxO-Heqew5HzEt-0NZXAjCu8w-RiuV8_9tMiXrSZdjsWqi4y86OFb5d",
        "y": "dnd8yoq-NOJcBuEYgdVVMmSxonXg-DU90d7C4uPWb_Lkd4WIQQEH0DyeC2KUDMIU"
      }
    }
  ],
  "assertionMethod": [
    "https://controller.example/101#NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs"
  ]
}
```

With the above controller document, the entity with identifier `https://controller.example/101` can be identified by the following identifiers:

- `urn:ietf:spice:glue:gln:123`
- `urn:ietf:spice:glue:lei:456`
- `urn:ietf:spice:glue:pen:789`

And supply chain assertions made by this entity can be verified by the following verification method:

- `https://controller.example/101#NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs`

This verifiable identity system is particularly valuable for ESG and climate-related tax and subsidy management because it enables organizations to:

- **Submit authenticated carbon footprint data** for tax credit applications and climate subsidy programs
- **Provide verifiable sustainability claims** that can be audited by tax authorities and subsidy administrators
- **Demonstrate supply chain transparency** required for ESG compliance and regulatory reporting
- **Support carbon credit trading** with cryptographically verified emission reduction claims
- **Enable automated tax/subsidy processing** through machine-readable, verifiable environmental data

Adding new keys and aliases over time allows for modeling the natural lifecycle of supply chain organizations, while enabling keys to be used for a limited time and limited purpose, such as specific ESG reporting periods or climate-related tax/subsidy applications.