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
- **Visual Cost Breakdown**: Bar charts and detailed tables for comparison
- **Unit Conversions**: Automatic conversion between tokens, characters, and words

### Supported Models (examples)

#### OpenAI
- GPT-4o, GPT-4o-mini
- GPT-4-Turbo, GPT-4

#### AWS
- Claude 3.5 Sonnet
- Claude 3 Opus, Sonnet, Haiku

## Installation

### Quick Start (Local)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/llm-cost-calculator.git
cd llm-cost-calculator
```

2. Open `index.html` in your browser:
```bash
# Using Python's built-in server
python3 -m http.server 8000

# Or using Node.js http-server
npx http-server

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

1. Enable multiple providers by checking their boxes
2. Configure each provider's settings independently
3. Click Calculate to see side-by-side comparison
4. The cheapest option is highlighted in the chart

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

The calculator automatically validates your configuration against provider limits:
- ⚠️ **Warning** (Yellow): Usage is 80-100% of limit
- ❌ **Error** (Red): Usage exceeds limit

## File Structure

```
llm-cost-calculator/
├── index.html              # Main HTML interface
├── data/
│   └── models.csv          # Model pricing database
├── js/
│   ├── app.js             # Main application logic
│   ├── calculator.js      # Cost calculation engine
│   └── utils.js           # Utility functions
└── README.md              # This file
```

## Data Structure (models.csv)

The CSV file contains model specifications:

```csv
provider,model,context_window,input_price_per_1m,output_price_per_1m,tpm_limit,rpm_limit
OpenAI,GPT-4o,128000,5.00,15.00,800000,10000
```

### Adding New Models

To add a new model, simply add a row to `data/models.csv`:

1. `provider`: Provider name (e.g., "OpenAI")
2. `model`: Model name (e.g., "GPT-4o")
3. `context_window`: Maximum tokens (input + output)
4. `input_price_per_1m`: Cost per 1 million input tokens (USD)
5. `output_price_per_1m`: Cost per 1 million output tokens (USD)
6. `tpm_limit`: Tokens per minute limit (optional)
7. `rpm_limit`: Requests per minute limit (optional)

## Token Conversion Ratios

The calculator uses these approximations:
- **1 token** ≈ 4 characters
- **1 word** ≈ 1.3 tokens
- **1 word** ≈ 6 characters (including spaces)

These are estimates and may vary by tokenizer. For precise calculations, use token units.

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

Requires a modern browser with ES6+ support.

## Technologies Used

- **HTML5/CSS3**: Structure and styling
- **Vanilla JavaScript**: No framework dependencies
- **Tailwind CSS**: Utility-first CSS framework (via CDN)
- **Google Fonts**: Inter typeface
- **Material Symbols**: Icon library

## Features Roadmap

### Planned Features
- [ ] Export results to CSV/PDF
- [ ] Save/load configurations
- [ ] Custom model pricing
- [ ] Batch estimation
- [ ] API cost tracking integration
- [ ] Historical price trends
- [ ] Cost optimization suggestions

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
- OpenAI: https://openai.com/pricing
- Anthropic: https://www.anthropic.com/pricing
- Google: https://cloud.google.com/vertex-ai/pricing
- Other providers: Check respective websites

## Acknowledgments

- Design inspired by modern web application patterns
- Pricing data compiled from official provider documentation
- Built with a focus on usability and accuracy

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for similar problems
- Provide detailed information about your environment and the problem

---

**Made with ❤️ for the AI/ML community**
