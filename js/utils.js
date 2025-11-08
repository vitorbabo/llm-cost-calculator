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
  },

  /**
   * Download a file with specified content
   * @param {string} content - File content
   * @param {string} filename - Name of the file to download
   * @param {string} mimeType - MIME type of the file
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Generate CSV content from results data
   * @param {Array} results - Array of calculation results
   * @param {Object} config - Configuration object with input parameters
   * @returns {string} CSV content
   */
  generateCSV(results, config) {
    const enabledResults = results.filter(r => r.enabled);
    if (enabledResults.length === 0) {
      return 'No results to export';
    }

    const lines = [];

    // Add header row with all columns
    lines.push('Provider,Model,Average Input Tokens,Average Output Tokens,RPM,Calc Mode,Duration,Input Price ($/1M),Output Price ($/1M),Input Tokens,Output Tokens,Input Cost,Output Cost,Total Cost,Cost per Request,Total Requests,Context Usage %,RPM Usage %,TPM Usage %');

    // Add each model's data
    enabledResults.forEach(result => {
      const model = result.model;
      const requestCost = result.requestCost;
      const totalCost = result.totalCost;
      const validation = result.validation;

      // Calculate usage percentages
      const tokensPerRequest = (config.inputTokens || 0) + (config.outputTokens || 0);
      const contextUsage = model.context_window > 0
        ? (tokensPerRequest / model.context_window) * 100
        : 0;
      const rpmUsage = validation.limits.rpm
        ? (validation.usage.requestsPerMinute / validation.limits.rpm) * 100
        : 0;
      const tpmUsage = validation.limits.tpm
        ? (validation.usage.tokensPerMinute / validation.limits.tpm) * 100
        : 0;

      const row = [
        model.provider,
        model.model,
        config.inputTokens || 0,
        config.outputTokens || 0,
        config.rpm || 0,
        config.calcMode || 'duration',
        config.calcMode === 'duration' ? (config.duration || 'day') : config.totalRequests || 0,
        model.input_price_per_1m,
        model.output_price_per_1m,
        config.inputTokens || 0,
        config.outputTokens || 0,
        requestCost.inputCost.toFixed(6),
        requestCost.outputCost.toFixed(6),
        totalCost.totalCost.toFixed(6),
        requestCost.totalCost.toFixed(6),
        totalCost.totalRequests,
        contextUsage.toFixed(2),
        rpmUsage.toFixed(2),
        tpmUsage.toFixed(2)
      ];

      // Escape commas in fields by wrapping in quotes
      const escapedRow = row.map(field => {
        const fieldStr = String(field);
        return fieldStr.includes(',') ? `"${fieldStr}"` : fieldStr;
      });

      lines.push(escapedRow.join(','));
    });

    return lines.join('\n');
  },

  /**
   * Export results to CSV file
   * @param {Array} results - Array of calculation results
   * @param {Object} config - Configuration object with input parameters
   */
  exportToCSV(results, config) {
    const csvContent = this.generateCSV(results, config);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `llm-cost-calculator-${timestamp}.csv`;
    this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  },

  /**
   * Export results to PDF file
   * @param {Array} results - Array of calculation results
   * @param {Object} config - Configuration object with input parameters
   */
  exportToPDF(results, config) {
    const enabledResults = results.filter(r => r.enabled);
    if (enabledResults.length === 0) {
      alert('No results to export');
      return;
    }

    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
      alert('PDF library not loaded. Please refresh the page and try again.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - (2 * margin);

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('LLM Cost Calculator - Results', margin, yPos);
    yPos += 10;

    // Generated date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
    yPos += 15;

    // Configuration section
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Configuration', margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const configLines = [
      `Average Input Tokens: ${this.formatNumber(config.inputTokens || 0)}`,
      `Average Output Tokens: ${this.formatNumber(config.outputTokens || 0)}`,
      `Requests Per Minute: ${config.rpm || 0}`,
      `Calculation Mode: ${config.calcMode || 'duration'}`,
    ];

    if (config.calcMode === 'duration') {
      configLines.push(`Duration: ${config.duration || 'day'}`);
    } else {
      configLines.push(`Total Requests: ${this.formatNumber(config.totalRequests || 0)}`);
    }

    configLines.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 5;

    // Summary section
    const cheapest = enabledResults[0];
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const costPer1k = (cheapest.totalCost.totalCost / cheapest.totalCost.totalRequests) * 1000;
    const summaryLines = [
      `Estimated Cost: ${this.formatCurrency(cheapest.totalCost.totalCost)}`,
      `Cost per 1K Requests: ${this.formatCurrency(costPer1k)}`,
      `Total Requests: ${this.formatNumber(cheapest.totalCost.totalRequests)}`
    ];

    summaryLines.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 10;

    // Model Details Section
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Model Details', margin, yPos);
    yPos += 10;

    enabledResults.forEach((result, index) => {
      // Check if we need a new page
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      const model = result.model;
      const requestCost = result.requestCost;
      const totalCost = result.totalCost;
      const validation = result.validation;

      // Calculate usage percentages
      const tokensPerRequest = (config.inputTokens || 0) + (config.outputTokens || 0);
      const contextUsage = model.context_window > 0
        ? (tokensPerRequest / model.context_window) * 100
        : 0;
      const rpmUsage = validation.limits.rpm
        ? (validation.usage.requestsPerMinute / validation.limits.rpm) * 100
        : 0;
      const tpmUsage = validation.limits.tpm
        ? (validation.usage.tokensPerMinute / validation.limits.tpm) * 100
        : 0;

      // Model name header
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`${index + 1}. ${model.provider} - ${model.model}`, margin, yPos);
      yPos += 6;

      // Pricing info
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`Input Price: $${model.input_price_per_1m}/1M tokens`, margin + 5, yPos);
      yPos += 4;
      doc.text(`Output Price: $${model.output_price_per_1m}/1M tokens`, margin + 5, yPos);
      yPos += 6;

      // Cost Details
      doc.setFont(undefined, 'bold');
      doc.text('Cost Details:', margin + 5, yPos);
      yPos += 4;
      doc.setFont(undefined, 'normal');
      doc.text(`Input Cost: ${this.formatCurrency(requestCost.inputCost)} per request`, margin + 10, yPos);
      yPos += 4;
      doc.text(`Output Cost: ${this.formatCurrency(requestCost.outputCost)} per request`, margin + 10, yPos);
      yPos += 4;
      doc.text(`Total Cost per Request: ${this.formatCurrency(requestCost.totalCost)}`, margin + 10, yPos);
      yPos += 4;
      doc.setFont(undefined, 'bold');
      doc.text(`Total Cost: ${this.formatCurrency(totalCost.totalCost)}`, margin + 10, yPos);
      yPos += 6;

      // Quota Usage
      doc.setFont(undefined, 'bold');
      doc.text('Quota Usage:', margin + 5, yPos);
      yPos += 4;
      doc.setFont(undefined, 'normal');

      const contextColor = contextUsage > 100 ? [239, 68, 68] : contextUsage > 80 ? [245, 158, 11] : [16, 185, 129];
      const rpmColor = rpmUsage > 100 ? [239, 68, 68] : rpmUsage > 80 ? [245, 158, 11] : [16, 185, 129];
      const tpmColor = tpmUsage > 100 ? [239, 68, 68] : tpmUsage > 80 ? [245, 158, 11] : [16, 185, 129];

      doc.setTextColor(...contextColor);
      doc.text(`Context Window Usage: ${contextUsage.toFixed(2)}%`, margin + 10, yPos);
      yPos += 4;

      if (validation.limits.rpm) {
        doc.setTextColor(...rpmColor);
        doc.text(`RPM Usage: ${rpmUsage.toFixed(2)}%`, margin + 10, yPos);
        yPos += 4;
      }

      if (validation.limits.tpm) {
        doc.setTextColor(...tpmColor);
        doc.text(`TPM Usage: ${tpmUsage.toFixed(2)}%`, margin + 10, yPos);
        yPos += 4;
      }

      // Reset text color
      doc.setTextColor(0, 0, 0);
      yPos += 4;

      // Draw separator line
      if (index < enabledResults.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
      }
    });

    // Save the PDF
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `llm-cost-calculator-${timestamp}.pdf`;
    doc.save(filename);
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
