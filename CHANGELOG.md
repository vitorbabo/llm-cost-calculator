# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-08

### Added
- Initial release of LLM Cost Calculator
- Multi-provider support (OpenAI, Anthropic, Google, Cohere, Meta, Mistral)
- Flexible input units (tokens, characters, words)
- Time-based projections (per minute, hour, day, month)
- Total requests calculation mode
- Real-time cost comparison with visual charts
- Interactive UI with dark mode support
- Quota validation (TPM and RPM limits)
- Context window validation
- Custom models feature
- Export capabilities (CSV and PDF)
- Configuration system via `config.json`
  - Customizable branding and logo
  - Customizable API key button
  - Theme customization
- MIT License
- Comprehensive README with usage instructions
- Contributing guidelines (CONTRIBUTING.md)
- Example configuration template (config.example.json)
- Package.json with helpful scripts

### Features
- **Core Functionality**
  - Calculate costs across multiple LLM providers
  - Compare models side-by-side
  - Automatic unit conversions
  - Visual cost breakdown with charts

- **Advanced Features**
  - Custom model creation
  - Local storage persistence for custom models
  - Provider-specific quota limits
  - Responsive design for all devices
  - Dark mode with smooth transitions

- **Customization**
  - Optional configuration file support
  - Custom branding and logos
  - Configurable API key buttons
  - Theme color customization

### Documentation
- Complete README with examples
- Contribution guidelines
- Configuration documentation
- CSV data structure documentation
- Token conversion ratios explained

---

For more details about each release, visit [GitHub Releases](https://github.com/vitorbabo/llm-cost-calculator/releases).
