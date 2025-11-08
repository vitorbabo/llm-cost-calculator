/**
 * LLM Cost Calculator - Main Application
 * Orchestrates UI, calculations, and data management
 */

const App = {
  models: [],
  selectedModels: [], // Array of selected model objects
  sharedConfig: {
    inputTokens: 5000,
    outputTokens: 1500,
    rpm: 20, // Requests per minute
    calcMode: 'duration', // 'duration' or 'total'
    duration: 'day', // 'hour', 'day', or 'month'
    totalRequests: 100 // For 'total' mode
  },
  globalInputUnit: 'tokens',
  globalOutputUnit: 'tokens',

  /**
   * Initialize the application
   */
  async init() {
    console.log('Initializing LLM Cost Calculator...');

    try {
      // Load models from CSV
      await this.loadModels();

      // Setup UI components
      this.setupDarkMode();
      this.renderModelSelector();
      this.setupEventListeners();
      this.updateDynamicLimits(); // Set initial dynamic limits

      // Initialize with default model selection
      const gpt4o = this.models.find(m => m.model === 'GPT-5');
      if (gpt4o) {
        this.addModelToSelection(gpt4o);
      }

      console.log('App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to load models data');
    }
  },

  /**
   * Load models from CSV file
   */
  async loadModels() {
    try {
      const response = await fetch('data/models.csv');
      const csv = await response.text();
      this.models = Utils.parseCSV(csv);
      console.log(`Loaded ${this.models.length} models`);
    } catch (error) {
      console.error('Error loading models:', error);
      throw error;
    }
  },

  /**
   * Get models grouped by provider
   */
  getProviders() {
    const providers = {};

    this.models.forEach(model => {
      if (!providers[model.provider]) {
        providers[model.provider] = [];
      }
      providers[model.provider].push(model);
    });

    return providers;
  },

  /**
   * Render the model selector with grouped models by provider
   */
  renderModelSelector() {
    const selector = document.getElementById('model-selector');
    if (!selector) return;

    const providers = this.getProviders();

    selector.innerHTML = Object.keys(providers).sort().map(providerName => {
      const models = providers[providerName];
      return `
        <div class="provider-group border-b border-border-light dark:border-border-dark last:border-b-0">
          <div class="p-2 bg-background-light/50 dark:bg-background-dark/50 text-xs font-medium text-text-light/70 dark:text-text-dark/70">
            ${providerName}
          </div>
          ${models.map(model => {
            const modelId = `${model.provider}-${model.model}`.replace(/[^a-zA-Z0-9-]/g, '-');
            return `
              <label class="model-option flex items-center gap-3 p-3 hover:bg-background-light dark:hover:bg-background-dark cursor-pointer transition-colors"
                     data-model-id="${modelId}">
                <input type="checkbox"
                       class="model-checkbox w-4 h-4 text-primary bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark rounded focus:ring-primary"
                       data-provider="${model.provider}"
                       data-model="${model.model}">
                <div class="flex-1">
                  <p class="text-sm font-medium">${model.model}</p>
                  <p class="text-xs text-text-light/60 dark:text-text-dark/60">
                    ${Utils.formatCurrency(model.input_price_per_1m)} / ${Utils.formatCurrency(model.output_price_per_1m)} per 1M tokens
                  </p>
                </div>
              </label>
            `;
          }).join('')}
        </div>
      `;
    }).join('');
  },

  /**
   * Add a model to the selection
   */
  addModelToSelection(model) {
    // Check if model is already selected
    const exists = this.selectedModels.find(m =>
      m.provider === model.provider && m.model === model.model
    );

    if (exists) return;

    this.selectedModels.push(model);
    this.updateSelectedModelsDisplay();
    this.updateModelSelectorCheckboxes();
    this.updateDynamicLimits(); // Update limits based on new selection
    this.calculate();
  },

  /**
   * Remove a model from the selection
   */
  removeModelFromSelection(provider, modelName) {
    this.selectedModels = this.selectedModels.filter(m =>
      !(m.provider === provider && m.model === modelName)
    );
    this.updateSelectedModelsDisplay();
    this.updateModelSelectorCheckboxes();
    this.updateDynamicLimits(); // Update limits based on new selection
    this.calculate();
  },

  /**
   * Update the selected models display area
   */
  updateSelectedModelsDisplay() {
    const container = document.getElementById('selected-models');
    if (!container) return;

    if (this.selectedModels.length === 0) {
      container.innerHTML = '<p class="text-xs text-text-light/60 dark:text-text-dark/60 m-auto">No models selected</p>';
      return;
    }

    container.innerHTML = this.selectedModels.map(model => `
      <div class="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg">
        <span class="text-sm font-medium">${model.model}</span>
        <button class="remove-model-btn hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                data-provider="${model.provider}"
                data-model="${model.model}">
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    `).join('');
  },

  /**
   * Update checkboxes in model selector based on selected models
   */
  updateModelSelectorCheckboxes() {
    document.querySelectorAll('.model-checkbox').forEach(checkbox => {
      const provider = checkbox.dataset.provider;
      const modelName = checkbox.dataset.model;

      const isSelected = this.selectedModels.some(m =>
        m.provider === provider && m.model === modelName
      );

      checkbox.checked = isSelected;
    });
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Reset button
    document.getElementById('reset-btn')?.addEventListener('click', () => {
      this.reset();
    });

    // Shared input tokens
    const sharedInputTokens = document.getElementById('shared-input-tokens');
    const sharedInputSlider = document.getElementById('shared-input-slider');

    sharedInputTokens?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 1;
      if (sharedInputSlider) {
        sharedInputSlider.value = value;
      }
      this.sharedConfig.inputTokens = value;
      this.calculate();
    });

    sharedInputSlider?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 1;
      if (sharedInputTokens) {
        sharedInputTokens.value = value;
      }
      this.sharedConfig.inputTokens = value;
      this.calculate();
    });

    // Shared output tokens
    const sharedOutputTokens = document.getElementById('shared-output-tokens');
    const sharedOutputSlider = document.getElementById('shared-output-slider');

    sharedOutputTokens?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 1;
      if (sharedOutputSlider) {
        sharedOutputSlider.value = value;
      }
      this.sharedConfig.outputTokens = value;
      this.calculate();
    });

    sharedOutputSlider?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 1;
      if (sharedOutputTokens) {
        sharedOutputTokens.value = value;
      }
      this.sharedConfig.outputTokens = value;
      this.calculate();
    });

    // RPM (Requests Per Minute)
    const sharedRpm = document.getElementById('shared-rpm');
    const sharedRpmSlider = document.getElementById('shared-rpm-slider');

    sharedRpm?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 1;
      if (sharedRpmSlider) {
        sharedRpmSlider.value = value;
      }
      this.sharedConfig.rpm = value;
      this.updateRuntimeEstimate();
      this.calculate();
    });

    sharedRpmSlider?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 1;
      if (sharedRpm) {
        sharedRpm.value = value;
      }
      this.sharedConfig.rpm = value;
      this.updateRuntimeEstimate();
      this.calculate();
    });

    // Calculation mode radio buttons
    document.querySelectorAll('input[name="calc-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.sharedConfig.calcMode = e.target.value;

        // Enable/disable total requests input based on mode
        const totalRequestsInput = document.getElementById('total-requests-input');
        const durationSelect = document.getElementById('duration-select');

        if (e.target.value === 'total') {
          totalRequestsInput?.removeAttribute('disabled');
          durationSelect?.setAttribute('disabled', 'disabled');
        } else {
          totalRequestsInput?.setAttribute('disabled', 'disabled');
          durationSelect?.removeAttribute('disabled');
        }

        this.updateRuntimeEstimate();
        this.calculate();
      });
    });

    // Duration selector
    document.getElementById('duration-select')?.addEventListener('change', (e) => {
      this.sharedConfig.duration = e.target.value;
      this.calculate();
    });

    // Total requests input
    document.getElementById('total-requests-input')?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 1;
      this.sharedConfig.totalRequests = value;
      this.updateRuntimeEstimate();
      this.calculate();
    });

    // Preset buttons (if any exist)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('preset-btn') || e.target.closest('.preset-btn')) {
        const btn = e.target.classList.contains('preset-btn') ? e.target : e.target.closest('.preset-btn');
        const inputTokens = parseInt(btn.dataset.input);
        const outputTokens = parseInt(btn.dataset.output);

        this.sharedConfig.inputTokens = inputTokens;
        this.sharedConfig.outputTokens = outputTokens;

        // Update UI
        document.getElementById('shared-input-tokens').value = inputTokens;
        document.getElementById('shared-input-slider').value = inputTokens;
        document.getElementById('shared-output-tokens').value = outputTokens;
        document.getElementById('shared-output-slider').value = outputTokens;

        this.calculate();
      }
    });

    // Model checkboxes
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('model-checkbox')) {
        const provider = e.target.dataset.provider;
        const modelName = e.target.dataset.model;
        const model = this.models.find(m => m.provider === provider && m.model === modelName);

        if (e.target.checked) {
          this.addModelToSelection(model);
        } else {
          this.removeModelFromSelection(provider, modelName);
        }
      }
    });

    // Remove model buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-model-btn') || e.target.closest('.remove-model-btn')) {
        const btn = e.target.classList.contains('remove-model-btn') ? e.target : e.target.closest('.remove-model-btn');
        const provider = btn.dataset.provider;
        const modelName = btn.dataset.model;
        this.removeModelFromSelection(provider, modelName);
      }
    });

    // Model search
    document.getElementById('model-search')?.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      document.querySelectorAll('.model-option').forEach(option => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(searchTerm) ? '' : 'none';
      });

      // Hide provider groups if all models are hidden
      document.querySelectorAll('.provider-group').forEach(group => {
        const visibleModels = Array.from(group.querySelectorAll('.model-option'))
          .filter(opt => opt.style.display !== 'none');
        group.style.display = visibleModels.length > 0 ? '' : 'none';
      });
    });

    // Global unit selection changes
    document.getElementById('global-input-unit')?.addEventListener('change', (e) => {
      this.globalInputUnit = e.target.value;
      this.calculate();
    });

    document.getElementById('global-output-unit')?.addEventListener('change', (e) => {
      this.globalOutputUnit = e.target.value;
      this.calculate();
    });

    // Advanced settings toggle
    document.getElementById('advanced-toggle')?.addEventListener('click', () => {
      const panel = document.getElementById('advanced-panel');
      panel.classList.toggle('hidden');
    });
  },


  /**
   * Update runtime estimate for total requests mode
   */
  updateRuntimeEstimate() {
    const estimateEl = document.getElementById('runtime-estimate');
    if (!estimateEl) return;

    if (this.sharedConfig.calcMode === 'total') {
      const runtime = this.sharedConfig.totalRequests / this.sharedConfig.rpm;
      const hours = Math.floor(runtime / 60);
      const minutes = Math.floor(runtime % 60);

      let runtimeText = '';
      if (hours > 0) {
        runtimeText = `Runtime: ~${hours}h ${minutes}m at ${this.sharedConfig.rpm} RPM`;
      } else {
        runtimeText = `Runtime: ~${minutes} minutes at ${this.sharedConfig.rpm} RPM`;
      }

      estimateEl.textContent = runtimeText;
    }
  },

  /**
   * Update dynamic limits based on selected models
   */
  updateDynamicLimits() {
    if (this.selectedModels.length === 0) {
      // Default limits when no models selected
      this.updateTokenLimit(10000);
      this.updateRpmLimit(250);
      return;
    }

    // Find minimum context window (for token limit)
    const minContextWindow = Math.min(...this.selectedModels.map(m => m.context_window));
    this.updateTokenLimit(minContextWindow);

    // Find minimum RPM limit
    const minRpm = Math.min(...this.selectedModels.map(m => m.rpm_limit || 250));
    this.updateRpmLimit(minRpm);
  },

  /**
   * Update token input max values
   */
  updateTokenLimit(maxTokens) {
    const inputSlider = document.getElementById('shared-input-slider');
    const outputSlider = document.getElementById('shared-output-slider');

    if (inputSlider) {
      inputSlider.max = maxTokens;
      // Adjust current value if exceeds new max
      if (this.sharedConfig.inputTokens > maxTokens) {
        this.sharedConfig.inputTokens = Math.floor(maxTokens * 0.8);
        inputSlider.value = this.sharedConfig.inputTokens;
        document.getElementById('shared-input-tokens').value = this.sharedConfig.inputTokens;
      }
    }

    if (outputSlider) {
      outputSlider.max = maxTokens;
      // Adjust current value if exceeds new max
      if (this.sharedConfig.outputTokens > maxTokens) {
        this.sharedConfig.outputTokens = Math.floor(maxTokens * 0.2);
        outputSlider.value = this.sharedConfig.outputTokens;
        document.getElementById('shared-output-tokens').value = this.sharedConfig.outputTokens;
      }
    }
  },

  /**
   * Update RPM limit display and max value
   */
  updateRpmLimit(maxRpm) {
    const rpmSlider = document.getElementById('shared-rpm-slider');
    const rpmInput = document.getElementById('shared-rpm');
    const rpmLimitDisplay = document.getElementById('rpm-limit-display');

    if (rpmSlider) {
      rpmSlider.max = maxRpm;
      // Adjust current value if exceeds new max
      if (this.sharedConfig.rpm > maxRpm) {
        this.sharedConfig.rpm = maxRpm;
        rpmSlider.value = maxRpm;
        if (rpmInput) rpmInput.value = maxRpm;
      }
    }

    if (rpmLimitDisplay) {
      rpmLimitDisplay.textContent = maxRpm;
    }
  },

  /**
   * Calculate and display results
   */
  calculate() {
    if (this.selectedModels.length === 0) {
      this.clearResults();
      return;
    }

    // Convert to tokens using global units
    const inputTokens = Utils.toTokens(this.sharedConfig.inputTokens, this.globalInputUnit);
    const outputTokens = Utils.toTokens(this.sharedConfig.outputTokens, this.globalOutputUnit);

    // Create comparisons for each selected model with the shared config
    const comparisons = this.selectedModels.map(model => ({
      model,
      inputTokens,
      outputTokens,
      rpm: this.sharedConfig.rpm,
      calcMode: this.sharedConfig.calcMode,
      duration: this.sharedConfig.duration,
      totalRequests: this.sharedConfig.totalRequests,
      enabled: true
    }));

    // Calculate comparisons
    const results = Calculator.compareModels(comparisons);

    // Update unified view
    this.updateCostView(results);
  },

  /**
   * Update cost view with all cost-related information
   */
  updateCostView(results) {
    const enabledResults = results.filter(r => r.enabled);
    if (enabledResults.length === 0) return;

    // Find the cheapest option
    const cheapest = enabledResults[0];

    // Update summary cards
    this.updateCostSummaryCards(cheapest);
    this.updateMaxThroughputCard(results);
    this.updateAvgUtilizationCard(results);

    // Update chart (bar for multiple, pie for single)
    if (enabledResults.length === 1) {
      this.showSingleModelChart(cheapest);
    } else {
      this.showMultiModelChart(enabledResults);
    }

    // Update cost comparison table
    this.updateCostTable(results);
  },

  /**
   * Update cost summary cards
   */
  updateCostSummaryCards(cheapest) {
    const totalCostEl = document.getElementById('total-cost');
    const costPer1kEl = document.getElementById('cost-per-1k');
    const timeframeLabelEls = document.querySelectorAll('.timeframe-label');

    if (totalCostEl) {
      totalCostEl.textContent = Utils.formatCurrency(cheapest.totalCost.totalCost);
    }

    // Calculate cost per 1K requests
    if (costPer1kEl) {
      const costPer1k = (cheapest.totalCost.totalCost / cheapest.totalCost.totalRequests) * 1000;
      costPer1kEl.textContent = Utils.formatCurrency(costPer1k);
    }

    timeframeLabelEls.forEach(el => {
      if (cheapest.totalCost.mode === 'total') {
        el.textContent = '(total)';
      } else {
        el.textContent = `/ ${cheapest.totalCost.duration}`;
      }
    });
  },

  /**
   * Update max throughput card
   */
  updateMaxThroughputCard(results) {
    const maxThroughputEl = document.getElementById('max-throughput');
    const maxThroughputDetailEl = document.getElementById('max-throughput-detail');

    if (!maxThroughputEl || !maxThroughputDetailEl) return;

    const enabledResults = results.filter(r => r.enabled);
    if (enabledResults.length === 0) {
      maxThroughputEl.textContent = '-';
      maxThroughputDetailEl.textContent = 'No models selected';
      return;
    }

    // Find model with highest throughput (prioritize TPM over RPM)
    let maxThroughputModel = null;
    let maxTpm = 0;
    let maxRpm = 0;

    enabledResults.forEach(result => {
      const model = result.model;
      if (model.tpm_limit && model.tpm_limit > maxTpm) {
        maxTpm = model.tpm_limit;
        maxThroughputModel = model;
      } else if (!model.tpm_limit && model.rpm_limit && model.rpm_limit > maxRpm) {
        maxRpm = model.rpm_limit;
        if (!maxThroughputModel || !maxThroughputModel.tpm_limit) {
          maxThroughputModel = model;
        }
      }
    });

    if (maxThroughputModel) {
      if (maxTpm > 0) {
        maxThroughputEl.textContent = Utils.formatCompactNumber(maxTpm) + ' TPM';
        maxThroughputDetailEl.textContent = maxThroughputModel.model;
      } else if (maxRpm > 0) {
        maxThroughputEl.textContent = Utils.formatCompactNumber(maxRpm) + ' RPM';
        maxThroughputDetailEl.textContent = maxThroughputModel.model;
      } else {
        maxThroughputEl.textContent = 'N/A';
        maxThroughputDetailEl.textContent = 'No limits available';
      }
    } else {
      maxThroughputEl.textContent = 'N/A';
      maxThroughputDetailEl.textContent = 'No limits available';
    }
  },

  /**
   * Update average utilization card
   */
  updateAvgUtilizationCard(results) {
    const avgUtilizationEl = document.getElementById('avg-utilization');
    const avgUtilizationDetailEl = document.getElementById('avg-utilization-detail');

    if (!avgUtilizationEl || !avgUtilizationDetailEl) return;

    const enabledResults = results.filter(r => r.enabled);
    if (enabledResults.length === 0) {
      avgUtilizationEl.textContent = '-';
      avgUtilizationDetailEl.textContent = 'No models selected';
      return;
    }

    // RPM is now directly available in config
    const requestsPerMinute = this.sharedConfig.rpm;

    // Calculate average utilization across all models
    let totalUtilization = 0;
    let modelsWithLimits = 0;
    let okCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    enabledResults.forEach(result => {
      const totalTokens = result.requestCost.inputTokens + result.requestCost.outputTokens;
      const tokensPerMinute = totalTokens * requestsPerMinute;

      const contextUsage = result.model.context_window ? (totalTokens / result.model.context_window * 100) : 0;
      const rpmUsage = result.model.rpm_limit ? (requestsPerMinute / result.model.rpm_limit * 100) : 0;
      const tpmUsage = result.model.tpm_limit ? (tokensPerMinute / result.model.tpm_limit * 100) : 0;

      const maxUsage = Math.max(contextUsage, rpmUsage, tpmUsage);

      if (maxUsage > 0) {
        totalUtilization += maxUsage;
        modelsWithLimits++;

        if (maxUsage > 100) {
          errorCount++;
        } else if (maxUsage > 80) {
          warningCount++;
        } else {
          okCount++;
        }
      }
    });

    const avgUtilization = modelsWithLimits > 0 ? totalUtilization / modelsWithLimits : 0;

    // Determine color based on average utilization
    let utilizationColor = '';
    if (avgUtilization > 100) {
      utilizationColor = 'text-red-600 dark:text-red-400';
    } else if (avgUtilization > 80) {
      utilizationColor = 'text-yellow-600 dark:text-yellow-400';
    } else {
      utilizationColor = 'text-green-600 dark:text-green-400';
    }

    avgUtilizationEl.textContent = avgUtilization > 0 ? `${avgUtilization.toFixed(1)}%` : 'N/A';
    avgUtilizationEl.className = `text-2xl font-bold ${utilizationColor}`;

    // Create detail text
    let detailText = '';
    if (errorCount > 0) {
      detailText = `${errorCount} model${errorCount > 1 ? 's' : ''} over limit`;
    } else if (warningCount > 0) {
      detailText = `${warningCount} model${warningCount > 1 ? 's' : ''} near limit`;
    } else if (okCount > 0) {
      detailText = `${okCount} model${okCount > 1 ? 's' : ''} within limits`;
    } else {
      detailText = 'No quota data available';
    }

    avgUtilizationDetailEl.textContent = detailText;
  },

  /**
   * Show multi-model bar chart
   */
  showMultiModelChart(enabledResults) {
    document.getElementById('multi-model-chart')?.classList.remove('hidden');
    document.getElementById('single-model-chart')?.classList.add('hidden');

    const chartContainer = document.getElementById('chart-bars');
    if (!chartContainer) return;

    if (enabledResults.length === 0) {
      chartContainer.innerHTML = '<p class="text-text-light/60 dark:text-text-dark/60 text-sm">No data to display</p>';
      return;
    }

    const maxCost = Math.max(...enabledResults.map(r => r.totalCost.totalCost));

    chartContainer.innerHTML = enabledResults.map(result => {
      const heightPercent = maxCost > 0 ? (result.totalCost.totalCost / maxCost * 100) : 0;
      const isFirst = result === enabledResults[0];

      // Determine quota status
      const hasErrors = result.validation.warnings.some(w => w.severity === 'error');
      const hasWarnings = result.validation.warnings.some(w => w.severity === 'warning');

      let quotaIcon = '';
      let quotaColor = '';

      if (hasErrors) {
        quotaIcon = 'error';
        quotaColor = 'text-red-600 dark:text-red-400';
      } else if (hasWarnings) {
        quotaIcon = 'warning';
        quotaColor = 'text-yellow-600 dark:text-yellow-400';
      } else {
        quotaIcon = 'check_circle';
        quotaColor = 'text-green-600 dark:text-green-400';
      }

      // Calculate overall quota usage for badge
      const totalTokens = result.requestCost.inputTokens + result.requestCost.outputTokens;
      const requestsPerMinute = this.sharedConfig.rpm;
      const tokensPerMinute = totalTokens * requestsPerMinute;

      const contextUsage = result.model.context_window ? (totalTokens / result.model.context_window * 100) : 0;
      const rpmUsage = result.model.rpm_limit ? (requestsPerMinute / result.model.rpm_limit * 100) : 0;
      const tpmUsage = result.model.tpm_limit ? (tokensPerMinute / result.model.tpm_limit * 100) : 0;
      const maxUsage = Math.max(contextUsage, rpmUsage, tpmUsage);

      return `
        <div class="flex flex-col items-center flex-1 h-full" style="min-width: 60px;">
          <div class="flex flex-col items-center gap-1 mb-2">
            <span class="material-symbols-outlined text-base ${quotaColor}" title="Quota status">${quotaIcon}</span>
            <p class="text-xs ${quotaColor} h-4">${maxUsage > 0 ? `${maxUsage.toFixed(0)}%` : ''}</p>
          </div>
          <div class="flex-1 w-full flex flex-col justify-end">
            <div class="w-full ${isFirst ? 'bg-primary' : 'bg-primary/30'} rounded-t-md transition-all duration-300 relative"
                 style="height: ${heightPercent}%"
                 title="${result.model.model}: ${Utils.formatCurrency(result.totalCost.totalCost)} | Quota: ${maxUsage.toFixed(0)}%">
              ${maxUsage > 0 ? `
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-${hasErrors ? 'red' : hasWarnings ? 'yellow' : 'green'}-500/50 to-transparent"></div>
              ` : ''}
            </div>
          </div>
          <div class="flex flex-col items-center gap-0.5 mt-2">
            <p class="text-xs text-text-light/70 dark:text-text-dark/70 text-center truncate w-full px-1">${result.model.model}</p>
            <p class="text-xs font-medium">${Utils.formatCurrency(result.totalCost.totalCost)}</p>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Show single-model pie chart
   */
  showSingleModelChart(result) {
    document.getElementById('multi-model-chart')?.classList.add('hidden');
    document.getElementById('single-model-chart')?.classList.remove('hidden');

    const pieContainer = document.getElementById('chart-pie');
    const gaugesContainer = document.getElementById('quota-gauges');

    // Render cost pie chart
    if (pieContainer) {
      const inputCost = result.totalCost.totalInputCost;
      const outputCost = result.totalCost.totalOutputCost;
      const total = inputCost + outputCost;

      if (total === 0) {
        pieContainer.innerHTML = '<p class="text-text-light/60 dark:text-text-dark/60 text-sm">No cost data</p>';
      } else {
        const inputPercent = (inputCost / total * 100).toFixed(1);
        const outputPercent = (outputCost / total * 100).toFixed(1);

        // Simple CSS-based pie chart using conic gradient
        pieContainer.innerHTML = `
          <div class="flex items-center justify-center gap-4">
            <div class="relative w-24 h-24 flex-shrink-0">
              <div class="w-full h-full rounded-full" style="background: conic-gradient(
                #ffa500 0% ${inputPercent}%,
                #ffa50050 ${inputPercent}% 100%
              )"></div>
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-16 h-16 rounded-full bg-surface-light dark:bg-surface-dark"></div>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-sm bg-primary flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium">Input</p>
                  <p class="text-xs text-text-light/60 dark:text-text-dark/60">${Utils.formatCurrency(inputCost)} (${inputPercent}%)</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-sm bg-primary/30 flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium">Output</p>
                  <p class="text-xs text-text-light/60 dark:text-text-dark/60">${Utils.formatCurrency(outputCost)} (${outputPercent}%)</p>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    }

    // Render quota gauges
    if (gaugesContainer) {
      this.renderQuotaGauges(gaugesContainer, result);
    }
  },

  /**
   * Render radial gauge charts for quota usage
   */
  renderQuotaGauges(container, result) {
    const model = result.model;
    const totalTokens = result.requestCost.inputTokens + result.requestCost.outputTokens;

    // RPM is now directly available in config
    const requestsPerMinute = this.sharedConfig.rpm;
    const tokensPerMinute = totalTokens * requestsPerMinute;

    // Calculate usage percentages
    const contextUsage = model.context_window ? Math.min((totalTokens / model.context_window * 100), 150) : 0;
    const rpmUsage = model.rpm_limit ? Math.min((requestsPerMinute / model.rpm_limit * 100), 150) : null;
    const tpmUsage = model.tpm_limit ? Math.min((tokensPerMinute / model.tpm_limit * 100), 150) : null;

    const gauges = [
      { label: 'Context', value: contextUsage, max: model.context_window, current: totalTokens },
      { label: 'RPM', value: rpmUsage, max: model.rpm_limit, current: Math.round(requestsPerMinute) },
      { label: 'TPM', value: tpmUsage, max: model.tpm_limit, current: Math.round(tokensPerMinute) }
    ];

    container.innerHTML = gauges.map(gauge => {
      if (gauge.value === null) {
        return `
          <div class="flex flex-col items-center justify-start gap-1.5" style="width: 80px;">
            <div class="radial-gauge opacity-30">
              ${this.createRadialGaugeSVG(0, '#9ca3af')}
            </div>
            <p class="text-xs font-medium text-text-light/70 dark:text-text-dark/70 text-center">${gauge.label}</p>
            <p class="text-xs text-text-light/60 dark:text-text-dark/60 text-center">N/A</p>
          </div>
        `;
      }

      const percentage = gauge.value;
      let color = '#10b981'; // green
      if (percentage > 100) color = '#ef4444'; // red
      else if (percentage > 80) color = '#f59e0b'; // yellow

      return `
        <div class="flex flex-col items-center justify-start gap-1.5" style="width: 80px;">
          <div class="radial-gauge">
            ${this.createRadialGaugeSVG(percentage, color)}
            <div class="radial-gauge-text">
              <p class="text-sm font-bold" style="color: ${color}">${percentage.toFixed(0)}%</p>
            </div>
          </div>
          <p class="text-xs font-medium text-text-light/70 dark:text-text-dark/70 text-center">${gauge.label}</p>
          <p class="text-xs text-text-light/60 dark:text-text-dark/60 text-center break-words">${Utils.formatNumber(gauge.current)} / ${Utils.formatNumber(gauge.max)}</p>
        </div>
      `;
    }).join('');
  },

  /**
   * Create SVG for radial gauge
   */
  createRadialGaugeSVG(percentage, color) {
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

    return `
      <svg width="80" height="80" class="radial-gauge-circle">
        <circle cx="40" cy="40" r="${radius}" stroke-width="6" class="radial-gauge-bg"></circle>
        <circle cx="40" cy="40" r="${radius}" stroke-width="6"
                class="radial-gauge-progress"
                stroke="${color}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"></circle>
      </svg>
    `;
  },

  /**
   * Update cost comparison table
   */
  updateCostTable(results) {
    const tbody = document.getElementById('comparison-table-body');
    if (!tbody) return;

    tbody.innerHTML = results.map((result, index) => {
      const isEnabled = result.enabled;
      const opacity = isEnabled ? '' : 'text-text-light/50 dark:text-text-dark/50';
      const hasErrors = result.validation.warnings.some(w => w.severity === 'error');
      const hasWarnings = result.validation.warnings.some(w => w.severity === 'warning');

      let statusIcon = '';
      let statusColor = '';
      let warningText = '';

      if (hasErrors) {
        statusIcon = 'error';
        statusColor = 'text-red-600 dark:text-red-400';
        const errorMessages = result.validation.warnings
          .filter(w => w.severity === 'error')
          .map(w => w.message)
          .join('\n');
        warningText = errorMessages;
      } else if (hasWarnings) {
        statusIcon = 'warning';
        statusColor = 'text-yellow-600 dark:text-yellow-400';
        const warningMessages = result.validation.warnings
          .filter(w => w.severity === 'warning')
          .map(w => w.message)
          .join('\n');
        warningText = warningMessages;
      }

      const statusIconHtml = (hasErrors || hasWarnings) ?
        `<span class="material-symbols-outlined text-base ${statusColor} warning-tooltip" data-warning="${warningText}">${statusIcon}</span>` : '';

      // Calculate quota usage
      const totalTokens = result.requestCost.inputTokens + result.requestCost.outputTokens;
      const requestsPerMinute = this.sharedConfig.rpm;
      const tokensPerMinute = totalTokens * requestsPerMinute;

      const contextUsage = result.model.context_window ? (totalTokens / result.model.context_window * 100) : 0;
      const rpmUsage = result.model.rpm_limit ? (requestsPerMinute / result.model.rpm_limit * 100) : 0;
      const tpmUsage = result.model.tpm_limit ? (tokensPerMinute / result.model.tpm_limit * 100) : 0;

      // Create expanded content
      const expandedContent = this.createExpandedRowContent(result, {
        contextUsage,
        rpmUsage,
        tpmUsage,
        requestsPerMinute,
        tokensPerMinute,
        totalTokens
      });

      const rowId = `row-${index}`;

      return `
        <tr class="border-b border-border-light dark:border-border-dark expandable-row" data-row-id="${rowId}">
          <th class="px-6 py-4 font-medium whitespace-nowrap ${opacity}" scope="row">
            <div class="model-name-wrapper">
              <span class="material-symbols-outlined text-base expand-icon cursor-pointer" data-row-id="${rowId}">expand_more</span>
              ${statusIconHtml}
              <span class="model-tooltip" data-provider="${result.model.provider}">${result.model.model}</span>
            </div>
          </th>
          <td class="px-6 py-4 text-right ${opacity}">
            ${Utils.formatCurrency(result.model.input_price_per_1m)}
          </td>
          <td class="px-6 py-4 text-right ${opacity}">
            ${Utils.formatCurrency(result.model.output_price_per_1m)}
          </td>
          <td class="px-6 py-4 text-right ${opacity}">
            ${Utils.formatCompactNumber(result.totalCost.totalInputTokens)}
          </td>
          <td class="px-6 py-4 text-right ${opacity}">
            ${Utils.formatCompactNumber(result.totalCost.totalOutputTokens)}
          </td>
          <td class="px-6 py-4 text-right font-medium ${opacity}">
            ${isEnabled ? Utils.formatCurrency(result.totalCost.totalCost) : '-'}
          </td>
        </tr>
        <tr id="${rowId}-expanded" class="border-b border-border-light dark:border-border-dark">
          <td colspan="6" class="p-0">
            <div class="expanded-content" id="${rowId}-content">
              ${expandedContent}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Add click event listeners for expandable rows
    this.setupExpandableRows();
  },

  /**
   * Create expanded row content with detailed quota breakdown
   */
  createExpandedRowContent(result, usage) {
    const { contextUsage, rpmUsage, tpmUsage, requestsPerMinute, tokensPerMinute, totalTokens } = usage;

    const getUsageColor = (percentage) => {
      if (percentage > 100) return 'text-red-600 dark:text-red-400';
      if (percentage > 80) return 'text-yellow-600 dark:text-yellow-400';
      return 'text-green-600 dark:text-green-400';
    };

    const getProgressBarColor = (percentage) => {
      if (percentage > 100) return 'bg-red-500';
      if (percentage > 80) return 'bg-yellow-500';
      return 'bg-green-500';
    };

    // Calculate cost per 1K requests for this model
    const costPer1k = (result.totalCost.totalCost / result.totalCost.totalRequests) * 1000;

    // Calculate monthly projection
    let monthlyCost = 0;
    if (result.totalCost.mode === 'total') {
      // For total mode, show the total cost
      monthlyCost = result.totalCost.totalCost;
    } else {
      // Project to monthly based on duration
      switch (result.totalCost.duration) {
        case 'hour': monthlyCost = result.totalCost.totalCost * 24 * 30; break;
        case 'day': monthlyCost = result.totalCost.totalCost * 30; break;
        case 'month': monthlyCost = result.totalCost.totalCost; break;
      }
    }

    // Build calculation basis text
    let calculationBasis = '';
    if (result.totalCost.mode === 'total') {
      calculationBasis = `${Utils.formatNumber(result.totalCost.totalRequests)} total requests`;
      if (result.totalCost.runtimeMinutes) {
        const hours = Math.floor(result.totalCost.runtimeMinutes / 60);
        const minutes = Math.floor(result.totalCost.runtimeMinutes % 60);
        if (hours > 0) {
          calculationBasis += ` (~${hours}h ${minutes}m at ${result.totalCost.rpm} RPM)`;
        } else {
          calculationBasis += ` (~${minutes} minutes at ${result.totalCost.rpm} RPM)`;
        }
      }
    } else {
      calculationBasis = `${result.totalCost.rpm} RPM × ${result.totalCost.duration} = ${Utils.formatNumber(result.totalCost.totalRequests)} requests`;
    }

    return `
      <div class="p-6 bg-background-light/50 dark:bg-background-dark/50">
        <!-- Calculation Basis Banner -->
        <div class="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-sm">calculate</span>
            <span class="text-xs font-medium text-text-light/80 dark:text-text-dark/80">Calculation Basis:</span>
            <span class="text-xs font-semibold text-primary">${calculationBasis}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Cost Details -->
          <div class="md:col-span-2">
            <h4 class="font-semibold text-sm mb-3 text-primary">Cost Details</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-text-light/70 dark:text-text-dark/70">Input Cost:</span>
                <span class="font-medium">${result.totalCost.totalInputTokens.toLocaleString()} tokens × ${Utils.formatCurrency(result.model.input_price_per_1m)}/1M = ${Utils.formatCurrency(result.totalCost.totalInputCost)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-light/70 dark:text-text-dark/70">Output Cost:</span>
                <span class="font-medium">${result.totalCost.totalOutputTokens.toLocaleString()} tokens × ${Utils.formatCurrency(result.model.output_price_per_1m)}/1M = ${Utils.formatCurrency(result.totalCost.totalOutputCost)}</span>
              </div>
              <div class="flex justify-between pt-2 border-t border-border-light dark:border-border-dark">
                <span class="text-text-light/70 dark:text-text-dark/70">Price per Call:</span>
                <span class="font-medium">${Utils.formatCurrency(result.totalCost.costPerRequest)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-light/70 dark:text-text-dark/70">Cost per 1K Requests:</span>
                <span class="font-medium">${Utils.formatCurrency(costPer1k)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-light/70 dark:text-text-dark/70">${result.totalCost.mode === 'total' ? 'Total Cost:' : 'Monthly Projection:'}</span>
                <span class="font-medium">${Utils.formatCurrency(monthlyCost)}</span>
              </div>
            </div>
          </div>

          <!-- Quota Usage -->
          <div>
            <h4 class="font-semibold text-sm mb-3 text-primary">Quota Usage</h4>
            <div class="space-y-3">
              <!-- Context Usage -->
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-text-light/70 dark:text-text-dark/70">Context Window</span>
                  <span class="${getUsageColor(contextUsage)} font-medium">${contextUsage.toFixed(1)}%</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-2 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
                    <div class="${getProgressBarColor(contextUsage)} h-full transition-all duration-300" style="width: ${Math.min(contextUsage, 100)}%"></div>
                  </div>
                </div>
                <p class="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">${Utils.formatNumber(totalTokens)} / ${Utils.formatNumber(result.model.context_window)}</p>
              </div>

              <!-- RPM Usage -->
              ${result.model.rpm_limit ? `
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span class="text-text-light/70 dark:text-text-dark/70">Requests Per Minute</span>
                    <span class="${getUsageColor(rpmUsage)} font-medium">${rpmUsage.toFixed(1)}%</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
                      <div class="${getProgressBarColor(rpmUsage)} h-full transition-all duration-300" style="width: ${Math.min(rpmUsage, 100)}%"></div>
                    </div>
                  </div>
                  <p class="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">${Utils.formatNumber(requestsPerMinute)} / ${Utils.formatNumber(result.model.rpm_limit)}</p>
                </div>
              ` : ''}

              <!-- TPM Usage -->
              ${result.model.tpm_limit ? `
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span class="text-text-light/70 dark:text-text-dark/70">Tokens Per Minute</span>
                    <span class="${getUsageColor(tpmUsage)} font-medium">${tpmUsage.toFixed(1)}%</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
                      <div class="${getProgressBarColor(tpmUsage)} h-full transition-all duration-300" style="width: ${Math.min(tpmUsage, 100)}%"></div>
                    </div>
                  </div>
                  <p class="text-xs text-text-light/60 dark:text-text-dark/60 mt-1">${Utils.formatNumber(tokensPerMinute)} / ${Utils.formatNumber(result.model.tpm_limit)}</p>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Setup event listeners for expandable table rows
   */
  setupExpandableRows() {
    document.querySelectorAll('.expandable-row, .expand-icon').forEach(element => {
      element.addEventListener('click', (e) => {
        const rowId = element.dataset.rowId || e.target.dataset.rowId;
        if (!rowId) return;

        const content = document.getElementById(`${rowId}-content`);
        const icon = document.querySelector(`.expand-icon[data-row-id="${rowId}"]`);

        if (content && icon) {
          const isOpen = content.classList.contains('open');

          if (isOpen) {
            content.classList.remove('open');
            icon.classList.remove('rotated');
            icon.textContent = 'expand_more';
          } else {
            content.classList.add('open');
            icon.classList.add('rotated');
            icon.textContent = 'expand_less';
          }
        }
      });
    });
  },

  /**
   * Clear results
   */
  clearResults() {
    // Clear cost view
    const totalCostEl = document.getElementById('total-cost');
    const costPer1kEl = document.getElementById('cost-per-1k');
    const maxThroughputEl = document.getElementById('max-throughput');
    const maxThroughputDetailEl = document.getElementById('max-throughput-detail');
    const avgUtilizationEl = document.getElementById('avg-utilization');
    const avgUtilizationDetailEl = document.getElementById('avg-utilization-detail');
    const chartContainer = document.getElementById('chart-bars');
    const tbody = document.getElementById('comparison-table-body');

    if (totalCostEl) totalCostEl.textContent = '$0.00';
    if (costPer1kEl) costPer1kEl.textContent = '$0.00';
    if (maxThroughputEl) maxThroughputEl.textContent = '-';
    if (maxThroughputDetailEl) maxThroughputDetailEl.textContent = 'No models selected';
    if (avgUtilizationEl) {
      avgUtilizationEl.textContent = '-';
      avgUtilizationEl.className = 'text-2xl font-bold';
    }
    if (avgUtilizationDetailEl) avgUtilizationDetailEl.textContent = 'No models selected';
    if (chartContainer) chartContainer.innerHTML = '<p class="text-text-light/60 dark:text-text-dark/60 text-sm">Select models to compare</p>';
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-8 text-center text-text-light/60 dark:text-text-dark/60">
            Select models to see results
          </td>
        </tr>
      `;
    }

    // Show multi-model chart container by default
    document.getElementById('multi-model-chart')?.classList.remove('hidden');
    document.getElementById('single-model-chart')?.classList.add('hidden');
  },

  /**
   * Reset all inputs
   */
  reset() {
    // Clear selected models
    this.selectedModels = [];

    // Reset shared config to defaults
    this.sharedConfig = {
      inputTokens: 5000,
      outputTokens: 1500,
      requests: 100
    };

    // Reset UI inputs
    document.getElementById('shared-input-tokens').value = 5000;
    document.getElementById('shared-input-slider').value = 5000;
    document.getElementById('shared-output-tokens').value = 1500;
    document.getElementById('shared-output-slider').value = 1500;
    document.getElementById('shared-requests').value = 100;
    document.getElementById('shared-requests-slider').value = 100;

    // Clear model search
    const searchInput = document.getElementById('model-search');
    if (searchInput) {
      searchInput.value = '';
      // Show all model options
      document.querySelectorAll('.model-option').forEach(opt => opt.style.display = '');
      document.querySelectorAll('.provider-group').forEach(group => group.style.display = '');
    }

    // Update displays
    this.updateSelectedModelsDisplay();
    this.updateModelSelectorCheckboxes();
    this.clearResults();

    // Reinitialize with default model
    const gpt4o = this.models.find(m => m.provider === 'OpenAI' && m.model === 'GPT-4o');
    if (gpt4o) {
      this.addModelToSelection(gpt4o);
    }
  },

  /**
   * Setup dark mode toggle
   */
  setupDarkMode() {
    const toggle = document.getElementById('dark-mode-toggle');
    const html = document.documentElement;

    // Check for saved preference or default to light mode
    const currentMode = localStorage.getItem('theme') || 'light';
    html.classList.toggle('dark', currentMode === 'dark');

    toggle?.addEventListener('click', () => {
      const isDark = html.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  },

  /**
   * Show error message
   */
  showError(message) {
    console.error(message);
    // Could add a toast notification here
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
