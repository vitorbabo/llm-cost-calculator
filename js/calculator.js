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
    // For PTU pricing, cost per request is not applicable
    // PTU is a fixed monthly cost regardless of usage
    if (model.pricing_type === 'PTU') {
      return {
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        inputTokens,
        outputTokens,
        isPTU: true
      };
    }

    const inputCost = (inputTokens / 1000000) * model.input_price_per_1m;
    const outputCost = (outputTokens / 1000000) * model.output_price_per_1m;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
      inputTokens,
      outputTokens,
      isPTU: false
    };
  },

  /**
   * Calculate total cost based on request frequency
   * @param {Object} requestCost - Single request cost
   * @param {number} rpm - Requests per minute (for quota validation)
   * @param {Object} options - Calculation options
   * @param {string} options.mode - 'duration' or 'total'
   * @param {string} options.duration - 'hour', 'day', or 'month' (if mode is 'duration')
   * @param {number} options.totalRequests - Total number of requests (if mode is 'total')
   * @param {number} options.daysPerMonth - Number of active days per month (default: 30)
   * @param {Object} model - Model data (needed for PTU pricing)
   * @returns {Object} Cost breakdown with totals
   */
  calculateTotalCost(requestCost, rpm, options = {}, model = null) {
    // Support legacy call signature for backwards compatibility
    if (typeof options === 'string') {
      const timeframe = options;
      options = { mode: timeframe === 'total' ? 'total' : 'duration', duration: timeframe };
      if (timeframe === 'total') {
        options.totalRequests = rpm; // Legacy: rpm param was total requests
        rpm = 100; // Use a default RPM for legacy calls
      }
    }

    const { mode = 'duration', duration = 'day', totalRequests = 10000, daysPerMonth = 30 } = options;

    let multiplier = 1;
    let period = duration;
    let calculatedTotalRequests = 0;
    let runtimeMinutes = 0;

    // Calculate total requests based on mode
    if (mode === 'total') {
      // Total requests mode: use provided total
      calculatedTotalRequests = totalRequests;
      runtimeMinutes = rpm > 0 ? totalRequests / rpm : 0;
      period = 'total';
    } else {
      // Duration mode: calculate from RPM × time
      switch (duration) {
        case 'hour':
          multiplier = 60;
          break;
        case 'day':
          multiplier = 60 * 24; // 1,440 minutes
          break;
        case 'month':
          multiplier = 60 * 24 * daysPerMonth; // Use configured days per month
          break;
        default:
          multiplier = 60 * 24; // Default to day
      }
      calculatedTotalRequests = rpm * multiplier;
      runtimeMinutes = multiplier;
    }

    const totalInputTokens = requestCost.inputTokens * calculatedTotalRequests;
    const totalOutputTokens = requestCost.outputTokens * calculatedTotalRequests;

    // Handle PTU pricing
    if (requestCost.isPTU && model && model.ptu_price_monthly) {
      const ptuMonthlyPrice = parseFloat(model.ptu_price_monthly) || 0;
      let totalCost = ptuMonthlyPrice;

      // Prorate PTU cost based on mode and duration
      if (mode === 'total') {
        // For total requests, prorate based on runtime
        const monthsRuntime = runtimeMinutes / (daysPerMonth * 24 * 60);
        totalCost = ptuMonthlyPrice * monthsRuntime;
      } else {
        // Prorate based on duration
        switch (duration) {
          case 'hour':
            totalCost = ptuMonthlyPrice / (daysPerMonth * 24);
            break;
          case 'day':
            totalCost = ptuMonthlyPrice / daysPerMonth;
            break;
          case 'month':
            totalCost = ptuMonthlyPrice;
            break;
        }
      }

      return {
        mode,
        period,
        duration: mode === 'duration' ? duration : null,
        rpm,
        totalRequests: calculatedTotalRequests,
        runtimeMinutes: mode === 'total' ? runtimeMinutes : null,
        totalInputTokens,
        totalOutputTokens,
        totalInputCost: 0,
        totalOutputCost: 0,
        totalCost,
        costPerRequest: calculatedTotalRequests > 0 ? totalCost / calculatedTotalRequests : 0,
        isPTU: true,
        ptuMonthlyPrice
      };
    }

    // Handle PAYG pricing
    const totalInputCost = requestCost.inputCost * calculatedTotalRequests;
    const totalOutputCost = requestCost.outputCost * calculatedTotalRequests;
    const totalCost = requestCost.totalCost * calculatedTotalRequests;

    return {
      mode,
      period,
      duration: mode === 'duration' ? duration : null,
      rpm,
      totalRequests: calculatedTotalRequests,
      runtimeMinutes: mode === 'total' ? runtimeMinutes : null,
      totalInputTokens,
      totalOutputTokens,
      totalInputCost,
      totalOutputCost,
      totalCost,
      costPerRequest: requestCost.totalCost,
      isPTU: false
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
        message: `Requests per minute (${Utils.formatNumber(requestsPerMinute)}) exceeds limit (${Utils.formatNumber(limits.rpm)})`,
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
        message: `Tokens per minute (${Utils.formatNumber(tokensPerMinute)}) exceeds limit (${Utils.formatNumber(limits.tpm)})`,
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
        message: `Total tokens (${Utils.formatNumber(tokensPerRequest)}) exceeds context window (${Utils.formatNumber(model.context_window)})`,
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
   * @param {Array} comparisons - Array of {model, inputTokens, outputTokens, rpm, calcMode, duration, totalRequests}
   * @returns {Array} Sorted comparison results
   */
  compareModels(comparisons) {
    const results = comparisons.map(comp => {
      const requestCost = this.calculateRequestCost(
        comp.model,
        comp.inputTokens,
        comp.outputTokens
      );

      // Build options object for new API
      const calcOptions = {
        mode: comp.calcMode || 'duration',
        duration: comp.duration || 'day',
        totalRequests: comp.totalRequests || 10000,
        daysPerMonth: comp.daysPerMonth || 30
      };

      const totalCost = this.calculateTotalCost(
        requestCost,
        comp.rpm || comp.requestsPerMinute || 100, // Support both old and new naming
        calcOptions,
        comp.model  // Pass model for PTU pricing
      );

      const validation = this.validateQuotas(
        comp.model,
        comp.inputTokens,
        comp.outputTokens,
        comp.rpm || comp.requestsPerMinute || 100 // Validate based on actual RPM
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
