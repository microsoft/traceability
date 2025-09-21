## Controllers

| Name | Controller ID | Authentication Key | Fraudulent |
|------|---------------|-------------------|------------|
| Anonymous Distributor | https://anonymous-distributor.example | -XwVdLYzYfug9elJRgcSlQjawMW1RMEqfB4gG7hEL9A |  |
| Camarón Corriente S.A. | https://camaron-corriente.example | RREK8ExRqquJQlLTuH2oLgHIu5N5_8EGw4zPDt0ZRa0 |  |
| Cargo Line Ltd | https://cargo-line.example | Is1nmYZZvkaJfQY-rwDp43RW9TbglgOBdkY44P_ialI |  |
| Chompchomp Ltd | https://chompchomp.example | wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE |  |
| Honest Importer Ltd | https://honest-importer.example | Q8rnIRwrk-G_2vie7dP8AlbXiTGGKExx7Y1QnIj4C-E |  |
| Legit Shrimp Ltd | https://legit-shrimp.example | F4FzDU1QWvUzDpWAuwlpvO-A4TuixJ-92PXLUwwqKPo |  |
| Shady Carrier Ltd | https://shady-carrier.example | RZp0CzLsm1iBdc6RyR6ryCFb3sNiOIdzzSf92n7fBJg | ⚠️ Synthetic Identity Fraud |
| Shady Distributor Ltd | https://shady-distributor.example | ID_fcFqPhzrsWKEbcTrx2pLqyORpk38YL2R8hAsc5R8 | ⚠️ Synthetic Identity Fraud |

## Credentials

| File Name | Issuer ID | Holder Key | Schema     | Fraudulent |
|-----------|-----------|------------|-------------|------------|
| chompchomp-purchase-order.json | https://chompchomp.example | ID_fcFqPhzrsWKEbcTrx2pLqyORpk38YL2R8hAsc5R8 | PurchaseOrderCredential |  |
| camaron-corriente-invoice.json | https://camaron-corriente.example | wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE | CommercialInvoiceCredential |  |
| camaron-corriente-origin.json | https://legit-shrimp.example | wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE | CertificateOfOriginCredential |  |
| shady-carrier-forged-lading.json | https://shady-carrier.example | -XwVdLYzYfug9elJRgcSlQjawMW1RMEqfB4gG7hEL9A | BillOfLadingCredential | ⚠️ Counterfeiting and Alteration |
| anonymous-distributor-purchase-order.json | https://chompchomp.example | RREK8ExRqquJQlLTuH2oLgHIu5N5_8EGw4zPDt0ZRa0 | PurchaseOrderCredential |  |
| legit-shrimp-honest-importer-origin.json | https://legit-shrimp.example | Q8rnIRwrk-G_2vie7dP8AlbXiTGGKExx7Y1QnIj4C-E | CertificateOfOriginCredential | ⚠️ Document Compromise |
| shady-carrier-lading.json | https://shady-carrier.example | wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE | BillOfLadingCredential | ⚠️ Counterfeiting and Alteration |
| shady-distributor-fraudulent-origin.json | https://legit-shrimp.example | ID_fcFqPhzrsWKEbcTrx2pLqyORpk38YL2R8hAsc5R8 | CertificateOfOriginCredential | ⚠️ Counterfeiting and Alteration |
| shady-distributor-invoice.json | https://camaron-corriente.example | -XwVdLYzYfug9elJRgcSlQjawMW1RMEqfB4gG7hEL9A | CommercialInvoiceCredential |  |
| test-purchase-order.json | https://chompchomp.example | nx62J6beWO6mIavpWWEQc_gGoIi8zfAECZ8p-zHxEvI | PurchaseOrderCredential |  |
| simple-test.json | https://chompchomp.example | nx62J6beWO6mIavpWWEQc_gGoIi8zfAECZ8p-zHxEvI | PurchaseOrderCredential |  |

## Presentations

| Holder | Verifier (Controller ID) |
|--------|-------------------------|
| https://shady-distributor.example | https://anonymous-distributor.example |
| https://chompchomp.example | https://camaron-corriente.example |
| https://chompchomp.example | https://camaron-corriente.example |
| https://anonymous-distributor.example | https://cargo-line.example |
| https://camaron-corriente.example | https://chompchomp.example |
| https://shady-distributor.example | https://legit-shrimp.example |
| https://shady-distributor.example | https://legit-shrimp.example |
| https://honest-importer.example | https://legit-shrimp.example |
| https://chompchomp.example | https://shady-carrier.example |
| https://shady-distributor.example | https://legit-shrimp.example |
| https://anonymous-distributor.example | https://shady-distributor.example |
