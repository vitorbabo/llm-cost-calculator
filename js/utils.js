/**
 * Utility functions for LLM Cost Calculator
 * Handles conversions between tokens, characters, and words
 */

const Utils = {
  // Conversion ratios (approximations based on common tokenizers)
  CHARS_PER_TOKEN: 4,
  TOKENS_PER_WORD: 1.3,

  /**
   * Convert characters to tokens
   * @param {number} chars - Number of characters
   * @returns {number} Estimated number of tokens
   */
  charsToTokens(chars) {
    return Math.ceil(chars / this.CHARS_PER_TOKEN);
  },

  /**
   * Convert tokens to characters
   * @param {number} tokens - Number of tokens
   * @returns {number} Estimated number of characters
   */
  tokensToChars(tokens) {
    return Math.round(tokens * this.CHARS_PER_TOKEN);
  },

  /**
   * Convert words to tokens
   * @param {number} words - Number of words
   * @returns {number} Estimated number of tokens
   */
  wordsToTokens(words) {
    return Math.ceil(words * this.TOKENS_PER_WORD);
  },

  /**
   * Convert tokens to words
   * @param {number} tokens - Number of tokens
   * @returns {number} Estimated number of words
   */
  tokensToWords(tokens) {
    return Math.round(tokens / this.TOKENS_PER_WORD);
  },

  /**
   * Convert words to characters (avg 5 chars per word + space)
   * @param {number} words - Number of words
   * @returns {number} Estimated number of characters
   */
  wordsToChars(words) {
    return Math.round(words * 6);
  },

  /**
   * Convert characters to words
   * @param {number} chars - Number of characters
   * @returns {number} Estimated number of words
   */
  charsToWords(chars) {
    return Math.round(chars / 6);
  },

  /**
   * Convert any unit to tokens
   * @param {number} value - Input value
   * @param {string} unit - 'tokens', 'chars', or 'words'
   * @returns {number} Value in tokens
   */
  toTokens(value, unit) {
    switch (unit) {
      case 'tokens':
        return value;
      case 'chars':
        return this.charsToTokens(value);
      case 'words':
        return this.wordsToTokens(value);
      default:
        return value;
    }
  },

  /**
   * Convert tokens to any unit
   * @param {number} tokens - Number of tokens
   * @param {string} unit - 'tokens', 'chars', or 'words'
   * @returns {number} Value in specified unit
   */
  fromTokens(tokens, unit) {
    switch (unit) {
      case 'tokens':
        return tokens;
      case 'chars':
        return this.tokensToChars(tokens);
      case 'words':
        return this.tokensToWords(tokens);
      default:
        return tokens;
    }
  },

  /**
   * Format number with thousands separators
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  formatNumber(num) {
    return num.toLocaleString('en-US');
  },

  /**
   * Format large numbers with K/M suffix for thousands/millions
   * @param {number} num - Number to format
   * @returns {string} Formatted number (e.g., 1500000 -> "1.5M", 450000 -> "450K", 1500 -> "1.5K")
   */
  formatCompactNumber(num) {
    if (num >= 1000000) {
      const millions = num / 1000000;
      // Remove decimal if it's .0
      return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
    }
    if (num >= 1000) {
      const thousands = num / 1000;
      // Remove decimal if it's .0
      return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
    }
    return num.toString();
  },

  /**
   * Format currency
   * @param {number} amount - Amount to format
   * @param {number} decimals - Number of decimal places (default: 2)
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount, decimals = 2) {
    if (amount >= 1000) {
      return `$${amount.toFixed(2)}`;
    } else if (amount >= 1) {
      return `$${amount.toFixed(decimals)}`;
    } else if (amount >= 0.01) {
      return `$${amount.toFixed(4)}`;
    } else if (amount > 0) {
      return `$${amount.toFixed(6)}`;
    } else {
      return '$0.00';
    }
  },

  /**
   * Parse CSV data
   * @param {string} csv - CSV string
   * @returns {Array} Array of objects
   */
  parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};

      headers.forEach((header, index) => {
        const value = values[index];
        // Try to parse as number if possible
        obj[header] = isNaN(value) ? value : parseFloat(value);
      });

      return obj;
    });
  },

  /**
   * Calculate percentage
   * @param {number} value - Part value
   * @param {number} total - Total value
   * @returns {number} Percentage
   */
  percentage(value, total) {
    return total > 0 ? (value / total) * 100 : 0;
  },

  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Generate a unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
