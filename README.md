# LLM Cost Calculator

A comprehensive web-based calculator for estimating and comparing costs across different Large Language Model (LLM) providers and models.

![LLM Cost Calculator](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

### Core Functionality
- **Multi-Provider Support**: Compare costs across OpenAI, Anthropic, Google, Cohere, Meta, and Mistral models
- **Flexible Input Units**: Calculate using tokens, characters, or words
- **Time-Based Projections**: Simulate costs per minute, hour, day, or month
- **Real-Time Comparison**: Side-by-side cost analysis with visual charts
- **Interactive UI**: Responsive design with dark mode support

### Advanced Features
- **Quota Validation**: Automatic checking of TPM (Tokens Per Minute) and RPM (Requests Per Minute) limits
- **Context Window Validation**: Ensures input/output doesn't exceed model limits
- **Dynamic Model Loading**: Easy to update pricing via CSV file
- **Custom Models**: Add your own models with custom pricing
- **Visual Cost Breakdown**: Bar charts and detailed tables for comparison
- **Unit Conversions**: Automatic conversion between tokens, characters, and words
- **Export Capabilities**: Export results to CSV or PDF format
- **Calculation Modes**: Calculate by duration (hour/day/month) or total requests


## Installation

### Quick Start (Local)

1. Clone the repository:
```bash
git clone https://github.com/vitorbabo/llm-cost-calculator.git
cd llm-cost-calculator
```

2. (Optional) Copy the example config:
```bash
cp config.example.json config.json
# Edit config.json to customize branding and settings
```

3. Start a local server:
```bash
# Using npm scripts
npm start

# Or using Python directly
python3 -m http.server 8000

# Or using Node.js http-server
npx http-server -p 8000

# Then open http://localhost:8000 in your browser
```

### No Installation Required
The calculator works entirely in the browser with no build step or dependencies. Just open `index.html` in any modern web browser.

## Usage

### Basic Usage

1. **Select a Provider**: Click on a provider accordion (e.g., OpenAI, Anthropic) and check the box to enable it
2. **Choose a Model**: Select from the dropdown menu
3. **Set Input/Output**:
   - Choose your preferred unit (tokens/chars/words)
   - Set input and output amounts using sliders or text input
4. **Configure Requests**: Set requests per minute
5. **Select Timeframe**: Choose to calculate per minute, hour, day, or month
6. **Click Calculate**: View results in the summary cards, chart, and detailed table

### Comparing Multiple Models

1. Select multiple models from the model selector
2. All models use the same shared usage parameters for fair comparison
3. View side-by-side comparison in charts and tables
4. The cheapest option is highlighted in the results

### Adding Custom Models

1. Click the **"+ Custom Model"** button in the Model Selection panel
2. Fill in the model details:
   - Provider and model name
   - Input/output pricing per 1M tokens
   - Context window size
   - Optional: TPM and RPM limits
3. Click **"Save Model"** to add it to your selection
4. Custom models are saved in your browser's local storage

### Understanding Results

- **Summary Cards**: Show the cheapest option and pricing details
- **Bar Chart**: Visual comparison of total costs
- **Detailed Table**: Comprehensive breakdown including:
  - Model name and provider
  - Context window size
  - Input/output pricing per 1M tokens
  - Total tokens used
  - Final cost calculation

### Quota Warnings

The calculator automatically validates your configuration against provider limits.


## File Structure

```
llm-cost-calculator/
├── index.html              # Main HTML interface
├── data/
│   └── models.csv          # Model pricing database
├── css/
│   └── styles.css          # Custom styles and theme
├── js/
│   ├── app.js             # Main application logic
│   ├── calculator.js      # Cost calculation engine
│   └── utils.js           # Utility functions
├── config.json             # Application configuration (optional, see config.example.json)
├── config.example.json     # Configuration template
├── package.json            # NPM package configuration
├── LICENSE                 # MIT License
├── CONTRIBUTING.md         # Contribution guidelines
├── CHANGELOG.md            # Version history and changes
└── README.md              # This file
```

## Data Structure (models.csv)

The CSV file contains model specifications:

```csv
provider,model,context_window,input_price_per_1m,output_price_per_1m,tpm_limit,rpm_limit,region,pricing_type,ptu_price_monthly
OpenAI,GPT-5,400000,1.25,10.00,3000000,300,Global,PAYG,
```

### Adding New Models

To add a new model, simply add a row to `data/models.csv`:

1. `provider`: Provider name (e.g., "OpenAI")
2. `model`: Model name (e.g., "GPT-5")
3. `context_window`: Maximum tokens (input + output)
4. `input_price_per_1m`: Cost per 1 million input tokens (USD)
5. `output_price_per_1m`: Cost per 1 million output tokens (USD)
6. `tpm_limit`: Tokens per minute limit (optional)
7. `rpm_limit`: Requests per minute limit (optional)
8. `region`: Geographic region (e.g., "Global", "US-East")
9. `pricing_type`: Pricing model (e.g., "PAYG" for pay-as-you-go)
10. `ptu_price_monthly`: Monthly price for PTU (Provisioned Throughput Units) if applicable

## Token Conversion Ratios

The calculator uses these approximations:
- **1 token** ≈ 4 characters
- **1 word** ≈ 1.3 tokens
- **1 word** ≈ 6 characters (including spaces)

These are estimates and may vary by tokenizer. For precise calculations, use token units.

## Customization

The calculator supports customization through an optional `config.json` file in the root directory.

### Quick Start

1. Copy `config.example.json` to `config.json`
2. Edit the settings to match your needs
3. Reload the application

### Configuration Options

The `config.json` file supports the following structure:

```json
{
  "branding": {
    "title": "LLM Cost Calculator",
    "logo": {
      "enabled": true,
      "url": "path/to/logo.png",
      "alt": "Company Logo"
    }
  },
  "apiKeyButton": {
    "enabled": true,
    "text": "Get API Key",
    "url": "https://platform.openai.com/api-keys",
    "providers": {
      "OpenAI": "https://platform.openai.com/api-keys",
      "Anthropic": "https://console.anthropic.com/settings/keys"
    }
  }
}
```

**Configuration Fields:**

- `branding.title`: Custom title for the application
- `branding.logo.enabled`: Show/hide custom logo
- `branding.logo.url`: Path or URL to your logo image
- `branding.logo.alt`: Alt text for the logo
- `apiKeyButton.enabled`: Show/hide the API key button
- `apiKeyButton.text`: Button text
- `apiKeyButton.url`: Default URL for getting API keys
- `apiKeyButton.providers`: Provider-specific API key URLs (optional)

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Updating Pricing Data

To update model pricing:
1. Edit `data/models.csv`
2. Update the relevant prices
3. Submit a PR with documentation of pricing source

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

Pricing information is approximate and may not reflect current provider pricing. Always verify costs with the official provider documentation before making business decisions.

Pricing sources:
- OpenAI: https://openai.com/api/pricing/
- Anthropic: https://claude.com/pricing#api

---

**Made with ❤️ for the AI/ML community**
