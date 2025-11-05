/**
 * Cost Calculator Engine
 * Handles all cost calculations and quota validations
 */

const Calculator = {
  /**
   * Calculate cost for a single request
   * @param {Object} model - Model data from CSV
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @returns {Object} Cost breakdown
   */
  calculateRequestCost(model, inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000000) * model.input_price_per_1m;
    const outputCost = (outputTokens / 1000000) * model.output_price_per_1m;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
      inputTokens,
      outputTokens
    };
  },

  /**
   * Calculate total cost based on request frequency
   * @param {Object} requestCost - Single request cost
   * @param {number} requestsPerMinute - Number of requests per minute
   * @param {string} timeframe - 'minute', 'hour', or 'day'
   * @returns {Object} Cost breakdown with totals
   */
  calculateTotalCost(requestCost, requestsPerMinute, timeframe = 'minute') {
    let multiplier = 1;
    let period = 'minute';

    switch (timeframe) {
      case 'hour':
        multiplier = 60;
        period = 'hour';
        break;
      case 'day':
        multiplier = 60 * 24;
        period = 'day';
        break;
      case 'month':
        multiplier = 60 * 24 * 30;
        period = 'month';
        break;
      default:
        multiplier = 1;
        period = 'minute';
    }

    const totalRequests = requestsPerMinute * multiplier;
    const totalInputTokens = requestCost.inputTokens * totalRequests;
    const totalOutputTokens = requestCost.outputTokens * totalRequests;
    const totalInputCost = requestCost.inputCost * totalRequests;
    const totalOutputCost = requestCost.outputCost * totalRequests;
    const totalCost = requestCost.totalCost * totalRequests;

    return {
      period,
      totalRequests,
      totalInputTokens,
      totalOutputTokens,
      totalInputCost,
      totalOutputCost,
      totalCost,
      costPerRequest: requestCost.totalCost
    };
  },

  /**
   * Validate against quota limits
   * @param {Object} model - Model data with limits
   * @param {number} inputTokens - Input tokens per request
   * @param {number} outputTokens - Output tokens per request
   * @param {number} requestsPerMinute - Requests per minute
   * @returns {Object} Validation result with warnings
   */
  validateQuotas(model, inputTokens, outputTokens, requestsPerMinute) {
    const tokensPerRequest = inputTokens + outputTokens;
    const tokensPerMinute = tokensPerRequest * requestsPerMinute;

    const warnings = [];
    const limits = {
      tpm: model.tpm_limit || null,
      rpm: model.rpm_limit || null
    };

    // Check RPM limit
    if (limits.rpm && requestsPerMinute > limits.rpm) {
      warnings.push({
        type: 'rpm',
        message: `Requests per minute (${requestsPerMinute}) exceeds limit (${limits.rpm})`,
        severity: 'error',
        limit: limits.rpm,
        current: requestsPerMinute,
        percentage: (requestsPerMinute / limits.rpm) * 100
      });
    }

    // Check TPM limit
    if (limits.tpm && tokensPerMinute > limits.tpm) {
      warnings.push({
        type: 'tpm',
        message: `Tokens per minute (${tokensPerMinute}) exceeds limit (${limits.tpm})`,
        severity: 'error',
        limit: limits.tpm,
        current: tokensPerMinute,
        percentage: (tokensPerMinute / limits.tpm) * 100
      });
    }

    // Check context window
    if (tokensPerRequest > model.context_window) {
      warnings.push({
        type: 'context',
        message: `Total tokens (${tokensPerRequest}) exceeds context window (${model.context_window})`,
        severity: 'error',
        limit: model.context_window,
        current: tokensPerRequest,
        percentage: (tokensPerRequest / model.context_window) * 100
      });
    }

    // Add warnings for high usage (>80%)
    if (limits.rpm && requestsPerMinute > limits.rpm * 0.8 && requestsPerMinute <= limits.rpm) {
      warnings.push({
        type: 'rpm',
        message: `Requests per minute is at ${((requestsPerMinute / limits.rpm) * 100).toFixed(1)}% of limit`,
        severity: 'warning',
        limit: limits.rpm,
        current: requestsPerMinute,
        percentage: (requestsPerMinute / limits.rpm) * 100
      });
    }

    if (limits.tpm && tokensPerMinute > limits.tpm * 0.8 && tokensPerMinute <= limits.tpm) {
      warnings.push({
        type: 'tpm',
        message: `Tokens per minute is at ${((tokensPerMinute / limits.tpm) * 100).toFixed(1)}% of limit`,
        severity: 'warning',
        limit: limits.tpm,
        current: tokensPerMinute,
        percentage: (tokensPerMinute / limits.tpm) * 100
      });
    }

    return {
      valid: warnings.filter(w => w.severity === 'error').length === 0,
      warnings,
      limits,
      usage: {
        tokensPerMinute,
        requestsPerMinute,
        tokensPerRequest
      }
    };
  },

  /**
   * Calculate maximum possible requests within limits
   * @param {Object} model - Model data with limits
   * @param {number} inputTokens - Input tokens per request
   * @param {number} outputTokens - Output tokens per request
   * @returns {Object} Maximum capacity
   */
  calculateMaxCapacity(model, inputTokens, outputTokens) {
    const tokensPerRequest = inputTokens + outputTokens;

    const maxByRPM = model.rpm_limit || Infinity;
    const maxByTPM = model.tpm_limit ? Math.floor(model.tpm_limit / tokensPerRequest) : Infinity;
    const maxByContext = tokensPerRequest <= model.context_window ? Infinity : 0;

    const maxRequestsPerMinute = Math.min(maxByRPM, maxByTPM, maxByContext);

    return {
      maxRequestsPerMinute,
      limitedBy: maxRequestsPerMinute === maxByRPM ? 'rpm' :
                 maxRequestsPerMinute === maxByTPM ? 'tpm' :
                 maxRequestsPerMinute === 0 ? 'context' : 'none',
      maxByRPM,
      maxByTPM,
      tokensPerRequest
    };
  },

  /**
   * Compare multiple models
   * @param {Array} comparisons - Array of {model, inputTokens, outputTokens, requestsPerMinute, timeframe}
   * @returns {Array} Sorted comparison results
   */
  compareModels(comparisons) {
    const results = comparisons.map(comp => {
      const requestCost = this.calculateRequestCost(
        comp.model,
        comp.inputTokens,
        comp.outputTokens
      );

      const totalCost = this.calculateTotalCost(
        requestCost,
        comp.requestsPerMinute,
        comp.timeframe
      );

      const validation = this.validateQuotas(
        comp.model,
        comp.inputTokens,
        comp.outputTokens,
        comp.requestsPerMinute
      );

      const maxCapacity = this.calculateMaxCapacity(
        comp.model,
        comp.inputTokens,
        comp.outputTokens
      );

      return {
        model: comp.model,
        requestCost,
        totalCost,
        validation,
        maxCapacity,
        enabled: comp.enabled !== false
      };
    });

    // Sort by total cost (ascending)
    return results.sort((a, b) => a.totalCost.totalCost - b.totalCost.totalCost);
  },

  /**
   * Generate cost projection for different timeframes
   * @param {Object} requestCost - Single request cost
   * @param {number} requestsPerMinute - Requests per minute
   * @returns {Object} Projections for different timeframes
   */
  generateProjections(requestCost, requestsPerMinute) {
    return {
      minute: this.calculateTotalCost(requestCost, requestsPerMinute, 'minute'),
      hour: this.calculateTotalCost(requestCost, requestsPerMinute, 'hour'),
      day: this.calculateTotalCost(requestCost, requestsPerMinute, 'day'),
      month: this.calculateTotalCost(requestCost, requestsPerMinute, 'month')
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Calculator;
}
