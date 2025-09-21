## Controllers

| Name | Controller ID | Authentication Key | Fraudulent |
|------|---------------|-------------------|------------|
| Anonymous Distributor | https://anonymous-distributor.example/entity/vi-stt-001 | -XwVdLYzYfug9elJRgcSlQjawMW1RMEqfB4gG7hEL9A |  |
| Camarón Corriente S.A. | https://camaron-corriente.example/entity/ve-pbc-001 | RREK8ExRqquJQlLTuH2oLgHIu5N5_8EGw4zPDt0ZRa0 |  |
| Cargo Line Ltd | https://cargo-line.example/entity/pr-sju-001 | Is1nmYZZvkaJfQY-rwDp43RW9TbglgOBdkY44P_ialI |  |
| Chompchomp Ltd | https://chompchomp.example/entity/bvi-001 | wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE |  |
| Honest Importer Ltd | https://honest-importer.example/entity/us-mia-001 | Q8rnIRwrk-G_2vie7dP8AlbXiTGGKExx7Y1QnIj4C-E |  |
| Legit Shrimp Ltd | https://legit-shrimp.example/entity/tt-pos-001 | F4FzDU1QWvUzDpWAuwlpvO-A4TuixJ-92PXLUwwqKPo |  |
| Shady Carrier Ltd | https://shady-carrier.example/entity/aw-oru-001 | RZp0CzLsm1iBdc6RyR6ryCFb3sNiOIdzzSf92n7fBJg | ⚠️ Synthetic Identity Fraud |
| Shady Distributor Ltd | https://shady-distributor.example/entity/bvi-002 | ID_fcFqPhzrsWKEbcTrx2pLqyORpk38YL2R8hAsc5R8 | ⚠️ Synthetic Identity Fraud |

## Credentials

| File Name | Issuer ID | Holder Key | Schema     | Fraudulent |
|-----------|-----------|------------|-------------|------------|
| chompchomp-purchase-order.json | https://chompchomp.example/entity/bvi-001 | ID_fcFqPhzrsWKEbcTrx2pLqyORpk38YL2R8hAsc5R8 | PurchaseOrderCredential |  |
| camaron-corriente-invoice.json | https://camaron-corriente.example/entity/ve-pbc-001 | wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE | CommercialInvoiceCredential |  |
| camaron-corriente-origin.json | https://legit-shrimp.example/entity/tt-pos-001 | wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE | CertificateOfOriginCredential |  |
| cargo-line-secondary-lading.json | https://shady-carrier.example/entity/aw-oru-001 | -XwVdLYzYfug9elJRgcSlQjawMW1RMEqfB4gG7hEL9A | BillOfLadingCredential | ⚠️ Counterfeiting and Alteration |
| anonymous-distributor-purchase-order.json | https://chompchomp.example/entity/bvi-001 | RREK8ExRqquJQlLTuH2oLgHIu5N5_8EGw4zPDt0ZRa0 | PurchaseOrderCredential |  |
| legit-shrimp-honest-importer-origin.json | https://legit-shrimp.example/entity/tt-pos-001 | Q8rnIRwrk-G_2vie7dP8AlbXiTGGKExx7Y1QnIj4C-E | CertificateOfOriginCredential | ⚠️ Document Compromise |
| shady-carrier-lading.json | https://shady-carrier.example/entity/aw-oru-001 | wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE | BillOfLadingCredential | ⚠️ Counterfeiting and Alteration |
| shady-distributor-fraudulent-origin.json | https://legit-shrimp.example/entity/tt-pos-001 | ID_fcFqPhzrsWKEbcTrx2pLqyORpk38YL2R8hAsc5R8 | CertificateOfOriginCredential | ⚠️ Counterfeiting and Alteration |
| shady-distributor-invoice.json | https://camaron-corriente.example/entity/ve-pbc-001 | -XwVdLYzYfug9elJRgcSlQjawMW1RMEqfB4gG7hEL9A | CommercialInvoiceCredential |  |
| test-purchase-order.json | https://chompchomp.example/entity/bvi-001 | nx62J6beWO6mIavpWWEQc_gGoIi8zfAECZ8p-zHxEvI | PurchaseOrderCredential |  |
| simple-test.json | https://chompchomp.example/entity/bvi-001 | nx62J6beWO6mIavpWWEQc_gGoIi8zfAECZ8p-zHxEvI | PurchaseOrderCredential |  |

## Presentations

| Holder | Verifier (Controller ID) |
|--------|-------------------------|
| https://shady-distributor.example/entity/bvi-002 | https://anonymous-distributor.example/entity/vi-stt-001 |
| https://chompchomp.example/entity/bvi-001 | https://camaron-corriente.example/entity/ve-pbc-001 |
| https://chompchomp.example/entity/bvi-001 | https://camaron-corriente.example/entity/ve-pbc-001 |
| https://anonymous-distributor.example/entity/vi-stt-001 | https://cargo-line.example/entity/pr-sju-001 |
| https://camaron-corriente.example/entity/ve-pbc-001 | https://chompchomp.example/entity/bvi-001 |
| https://shady-distributor.example/entity/bvi-002 | https://legit-shrimp.example/entity/tt-pos-001 |
| https://shady-distributor.example/entity/bvi-002 | https://legit-shrimp.example/entity/tt-pos-001 |
| https://honest-importer.example/entity/us-mia-001 | https://legit-shrimp.example/entity/tt-pos-001 |
| https://chompchomp.example/entity/bvi-001 | https://shady-carrier.example/entity/aw-oru-001 |
| https://shady-distributor.example/entity/bvi-002 | https://legit-shrimp.example/entity/tt-pos-001 |
| https://anonymous-distributor.example/entity/vi-stt-001 | https://shady-distributor.example/entity/bvi-002 |
