# Contributing to LLM Cost Calculator

Thank you for your interest in contributing to the LLM Cost Calculator! This document provides guidelines and instructions for contributing.

## Ways to Contribute

### 1. Updating Pricing Data

Pricing changes frequently. To update model pricing:

1. Edit `data/models.csv` with the new pricing information
2. Include a link to the official pricing source in your pull request
3. Update the pricing sources section in `README.md` if adding a new provider

### 2. Adding New Models

To add a new LLM model:

1. Add a row to `data/models.csv` with all required fields
2. Test that the model appears and calculates correctly
3. Include documentation of the pricing source

### 3. Reporting Bugs

When reporting bugs, please include:

- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Console errors (F12 Developer Tools)

### 4. Suggesting Features

Feature requests are welcome! Please:

- Check existing issues first
- Describe the use case
- Explain how it would benefit users
- Consider creating a mockup or example

### 5. Code Contributions

#### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/llm-cost-calculator.git`
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. Make your changes
5. Test thoroughly in multiple browsers
6. Commit with clear messages: `git commit -m 'Add amazing feature'`
7. Push to your fork: `git push origin feature/amazing-feature`
8. Open a Pull Request

#### Code Style

- Use consistent indentation (2 spaces)
- Write clear, descriptive variable and function names
- Add comments for complex logic
- Keep functions focused and modular
- Test in both light and dark mode

#### File Structure

```
llm-cost-calculator/
├── index.html          # Main HTML - keep clean and semantic
├── data/
│   └── models.csv      # Model data - alphabetize by provider
├── css/
│   └── styles.css      # Custom styles - organize by component
├── js/
│   ├── app.js          # Main app logic
│   ├── calculator.js   # Calculation engine
│   └── utils.js        # Utility functions
└── config.json         # Configuration (not in git)
```

#### Testing Checklist

Before submitting a PR, verify:

- [ ] Works in Chrome, Firefox, and Safari
- [ ] Works in both light and dark mode
- [ ] Responsive on mobile, tablet, and desktop
- [ ] No console errors
- [ ] Custom models feature still works
- [ ] Export functions work correctly
- [ ] All calculations are accurate
- [ ] Code is well-commented

### 6. Documentation

Improvements to documentation are always appreciated:

- Fix typos or unclear explanations
- Add examples or screenshots
- Improve setup instructions
- Translate documentation (if multilingual support is added)

## Pull Request Process

1. **Update Documentation**: If you've changed functionality, update the README
2. **Keep PRs Focused**: One feature/fix per PR
3. **Write Clear Descriptions**: Explain what and why, not just how
4. **Link Issues**: Reference any related issues
5. **Be Patient**: Maintainers will review as soon as possible
6. **Be Responsive**: Address review feedback promptly

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or inflammatory comments
- Personal or political attacks
- Publishing others' private information
- Unprofessional conduct

## Questions?

Feel free to:

- Open an issue for discussion
- Check existing issues and PRs
- Review closed PRs to see what's already been considered

## License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.

---

**Thank you for contributing to making LLM cost calculations more accessible!**
