# PDF PII Redaction Tool

A Python-based tool that automatically detects and redacts Personally Identifiable Information (PII) from PDF documents using Azure OpenAI's language models.

## 🎯 Purpose

This tool helps organizations and individuals protect sensitive information by:
- Automatically detecting PII in PDF documents (names, dates, addresses, phone numbers)
- Creating redacted versions of PDFs with PII information blacked out
- Generating metadata about detected PII for audit purposes
- Supporting both single file and batch processing of multiple PDFs

## ✨ Features

- **AI-Powered Detection**: Uses Azure OpenAI to intelligently identify PII
- **Multiple PII Types**: Detects names, dates, addresses, and phone numbers
- **Confidence Scoring**: Provides confidence levels for each detected PII item
- **Metadata Generation**: Creates JSON files with detection results for audit trails
- **Batch Processing**: Process entire directories of PDF files at once
- **Secure Authentication**: Uses Azure DefaultAzureCredential for secure API access

## 🔧 Prerequisites

- Python 3.7 or higher
- Azure OpenAI service account and deployment
- Azure CLI installed and authenticated (or other Azure credential method)

## 📦 Installation

1. Clone or download this repository

2. Create and activate a virtual environment (recommended):
   ```bash
   # Create a virtual environment
   python -m venv redaction-env
   
   # Activate it (Windows)
   redaction-env\Scripts\activate
   
   # Activate it (macOS/Linux)
   source redaction-env/bin/activate
   ```
   
   Then install required dependencies:
   ```bash
   pip install azure-openai azure-identity python-dotenv PyPDF2 PyMuPDF
   ```

3. Create a `.env` file in the project root with your Azure OpenAI credentials:
   ```env
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_DEPLOYMENT=your-deployment-name
   ```

4. Ensure you're authenticated with Azure (one of the following):
   - Run `az login` if you have Azure CLI installed
   - Use managed identity if running on Azure
   - Set up other Azure credential methods as needed

## 🚀 Usage

### Jupyter Notebook (Recommended)

Open `main.ipynb` in Jupyter Lab or VS Code and run the cells step by step. This provides an interactive experience with detailed explanations for each step.

## 📁 Output Files

For each processed PDF, the tool generates:

1. **Redacted PDF**: Original PDF with PII information blacked out
2. **Metadata JSON**: Contains details about detected PII items:
   ```json
   [
     {
       "text": "John Doe",
       "category": "name",
       "confidence": 0.95
     },
     {
       "text": "555-123-4567",
       "category": "phone number",
       "confidence": 0.98
     }
   ]
   ```

## 🔒 Security & Privacy

- **No Data Storage**: Text is processed in real-time and not stored by the service
- **Secure Authentication**: Uses Azure AD tokens, no hardcoded API keys
- **Local Processing**: PDF manipulation happens locally on your machine
- **Audit Trail**: Metadata files provide transparency about what was detected

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AZURE_OPENAI_ENDPOINT` | Your Azure OpenAI service endpoint | Yes |
| `AZURE_OPENAI_DEPLOYMENT` | The deployment name for your model | Yes |

### Supported PII Types

Currently detects:
- Names (personal names)
- Dates (birth dates, etc.)
- Addresses (street addresses)
- Phone numbers

## 🛠️ How It Works

1. **Text Extraction**: Uses PyPDF2 to extract text from PDF pages
2. **PII Detection**: Sends text to Azure OpenAI with specialized prompts
3. **Response Processing**: Parses JSON response containing PII locations and types
4. **PDF Redaction**: Uses PyMuPDF (fitz) to locate and redact text in the original PDF
5. **Output Generation**: Saves redacted PDF and metadata JSON files

## 📋 Dependencies

- `azure-openai`: Azure OpenAI Python SDK
- `azure-identity`: Azure authentication library
- `python-dotenv`: Environment variable management
- `PyPDF2`: PDF text extraction
- `PyMuPDF` (fitz): PDF manipulation and redaction

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure you're logged into Azure CLI: `az login`
   - Verify your Azure OpenAI resource permissions

2. **No Text Extracted**
   - Some PDFs may be image-based or encrypted
   - Try using OCR preprocessing for scanned documents

3. **API Rate Limits**
   - The tool processes one document at a time to respect rate limits
   - Large documents may take several minutes to process

### Error Messages

- `No text extracted from [file]`: PDF may be empty, image-based, or corrupted
- `Azure OpenAI PII extraction error`: Check your API credentials and deployment settings
- `Failed to process [file]`: Individual file processing error (batch mode continues with other files)

## 📄 License

This project is provided as-is for educational and organizational use. Please ensure compliance with your organization's data handling policies and applicable privacy regulations.

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Additional PII types (SSNs, credit cards, etc.)
- OCR support for image-based PDFs
- GUI interface
- Additional output formats
- Enhanced confidence scoring

## ⚠️ Disclaimer

This tool is designed to assist with PII redaction but should not be considered 100% accurate. Always review the output and metadata files to ensure all sensitive information has been properly identified and redacted. The accuracy depends on the underlying AI model's capabilities and the complexity of the document content.