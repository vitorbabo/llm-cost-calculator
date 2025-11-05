/**
 * LLM Cost Calculator - Main Application
 * Orchestrates UI, calculations, and data management
 */

const App = {
  models: [],
  comparisons: [],
  currentTimeframe: 'hour',

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
      this.setupProviderAccordions();
      this.updateRequestsLabels(); // Set initial labels based on default timeframe
      this.setupEventListeners();

      // Initialize with default comparison
      this.addComparison('OpenAI', 'GPT-4o');

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
   * Setup provider accordions dynamically
   */
  setupProviderAccordions() {
    const providers = this.getProviders();
    const container = document.getElementById('providers-container');
    container.innerHTML = '';

    Object.keys(providers).sort().forEach((providerName, index) => {
      const isFirst = index === 0;
      const accordionHtml = this.createProviderAccordion(providerName, providers[providerName], isFirst);
      container.insertAdjacentHTML('beforeend', accordionHtml);
    });

    // Setup accordion change listeners
    document.querySelectorAll('.provider-accordion').forEach(details => {
      details.addEventListener('toggle', (e) => {
        if (details.open) {
          this.updateComparisonFromUI(details.dataset.provider);
        }
      });
    });
  },

  /**
   * Create HTML for a provider accordion
   */
  createProviderAccordion(provider, models, isOpen = false) {
    const defaultModel = models[0];
    const id = `provider-${provider.toLowerCase().replace(/\s+/g, '-')}`;

    return `
      <details class="provider-accordion flex flex-col rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-4 group"
               ${isOpen ? 'open' : ''}
               data-provider="${provider}"
               id="${id}">
        <summary class="flex cursor-pointer items-center justify-between py-4">
          <div class="flex items-center gap-3">
            <input type="checkbox"
                   class="provider-enable w-4 h-4 text-primary bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark rounded focus:ring-primary"
                   ${isOpen ? 'checked' : ''}
                   data-provider="${provider}"
                   onclick="event.stopPropagation()">
            <p class="text-base font-medium">${provider}</p>
          </div>
          <span class="material-symbols-outlined transition-transform duration-200 group-open:rotate-180">expand_more</span>
        </summary>
        <div class="border-t border-border-light dark:border-border-dark -mx-4">
          <div class="p-4 flex flex-col gap-6">
            <!-- Model Selection -->
            <label class="flex flex-col gap-2">
              <p class="text-sm font-medium">Model</p>
              <select class="model-select form-select w-full rounded-lg border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark focus:ring-primary focus:border-primary"
                      data-provider="${provider}">
                ${models.map(m => `<option value="${m.model}">${m.model}</option>`).join('')}
              </select>
            </label>

            <!-- Input Unit Selection -->
            <label class="flex flex-col gap-2">
              <p class="text-sm font-medium">Input Unit</p>
              <select class="input-unit-select form-select w-full rounded-lg border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark"
                      data-provider="${provider}">
                <option value="tokens">Tokens</option>
                <option value="chars">Characters</option>
                <option value="words">Words</option>
              </select>
            </label>

            <!-- Input Tokens/Chars/Words -->
            <div class="@container">
              <div class="relative flex w-full flex-col items-start justify-between gap-3">
                <div class="flex w-full items-center justify-between">
                  <p class="text-sm font-medium">Input <span class="input-unit-label">Tokens</span></p>
                  <input class="input-value form-input w-24 rounded-md text-sm p-1 text-right bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark"
                         type="number"
                         value="4096"
                         min="0"
                         data-provider="${provider}"/>
                </div>
                <div class="flex h-4 w-full items-center gap-4">
                  <input class="input-slider w-full h-1.5 bg-border-light dark:bg-border-dark rounded-full appearance-none cursor-pointer accent-primary"
                         max="${defaultModel.context_window}"
                         min="0"
                         type="range"
                         value="4096"
                         data-provider="${provider}"/>
                </div>
              </div>
            </div>

            <!-- Output Unit Selection -->
            <label class="flex flex-col gap-2">
              <p class="text-sm font-medium">Output Unit</p>
              <select class="output-unit-select form-select w-full rounded-lg border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark"
                      data-provider="${provider}">
                <option value="tokens">Tokens</option>
                <option value="chars">Characters</option>
                <option value="words">Words</option>
              </select>
            </label>

            <!-- Output Tokens/Chars/Words -->
            <div class="@container">
              <div class="relative flex w-full flex-col items-start justify-between gap-3">
                <div class="flex w-full items-center justify-between">
                  <p class="text-sm font-medium">Output <span class="output-unit-label">Tokens</span></p>
                  <input class="output-value form-input w-24 rounded-md text-sm p-1 text-right bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark"
                         type="number"
                         value="1024"
                         min="0"
                         data-provider="${provider}"/>
                </div>
                <div class="flex h-4 w-full items-center gap-4">
                  <input class="output-slider w-full h-1.5 bg-border-light dark:bg-border-dark rounded-full appearance-none cursor-pointer accent-primary"
                         max="${Math.min(defaultModel.context_window / 2, 16384)}"
                         min="0"
                         type="range"
                         value="1024"
                         data-provider="${provider}"/>
                </div>
              </div>
            </div>

            <!-- Requests per Minute -->
            <label class="flex flex-col gap-2">
              <p class="text-sm font-medium requests-label">Requests per Minute</p>
              <input class="rpm-input form-input w-full rounded-lg border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark focus:ring-primary focus:border-primary"
                     type="number"
                     value="60"
                     min="1"
                     data-provider="${provider}"/>
            </label>

            <!-- Quota Status -->
            <div class="quota-status hidden p-3 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark">
              <p class="text-xs font-medium mb-2">Quota Usage</p>
              <div class="space-y-2 text-xs"></div>
            </div>
          </div>
        </div>
      </details>
    `;
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Calculate button
    document.getElementById('calculate-btn')?.addEventListener('click', () => {
      this.calculate();
    });

    // Reset button
    document.getElementById('reset-btn')?.addEventListener('click', () => {
      this.reset();
    });

    // Timeframe selector
    document.getElementById('timeframe-select')?.addEventListener('change', (e) => {
      this.currentTimeframe = e.target.value;
      this.updateRequestsLabels();
      this.calculate();
    });

    // Provider enable checkboxes
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('provider-enable')) {
        const provider = e.target.dataset.provider;
        const details = document.getElementById(`provider-${provider.toLowerCase().replace(/\s+/g, '-')}`);

        if (e.target.checked) {
          details.setAttribute('open', '');
          this.updateComparisonFromUI(provider);
        } else {
          this.removeComparison(provider);
        }
        this.calculate();
      }
    });

    // Model selection changes
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('model-select')) {
        this.updateComparisonFromUI(e.target.dataset.provider);
        this.calculate();
      }
    });

    // Input/Output value changes
    document.addEventListener('input', (e) => {
      if (e.target.classList.contains('input-value') || e.target.classList.contains('input-slider')) {
        const provider = e.target.dataset.provider;
        const details = document.getElementById(`provider-${provider.toLowerCase().replace(/\s+/g, '-')}`);
        const value = parseInt(e.target.value) || 0;

        // Sync slider and input
        details.querySelector('.input-value').value = value;
        details.querySelector('.input-slider').value = value;

        this.updateComparisonFromUI(provider);
        this.calculate();
      }

      if (e.target.classList.contains('output-value') || e.target.classList.contains('output-slider')) {
        const provider = e.target.dataset.provider;
        const details = document.getElementById(`provider-${provider.toLowerCase().replace(/\s+/g, '-')}`);
        const value = parseInt(e.target.value) || 0;

        // Sync slider and input
        details.querySelector('.output-value').value = value;
        details.querySelector('.output-slider').value = value;

        this.updateComparisonFromUI(provider);
        this.calculate();
      }

      if (e.target.classList.contains('rpm-input')) {
        this.updateComparisonFromUI(e.target.dataset.provider);
        this.calculate();
      }
    });

    // Unit selection changes
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('input-unit-select')) {
        const provider = e.target.dataset.provider;
        const details = document.getElementById(`provider-${provider.toLowerCase().replace(/\s+/g, '-')}`);
        const unit = e.target.value;
        const label = details.querySelector('.input-unit-label');

        label.textContent = unit.charAt(0).toUpperCase() + unit.slice(1);
        this.updateComparisonFromUI(provider);
        this.calculate();
      }

      if (e.target.classList.contains('output-unit-select')) {
        const provider = e.target.dataset.provider;
        const details = document.getElementById(`provider-${provider.toLowerCase().replace(/\s+/g, '-')}`);
        const unit = e.target.value;
        const label = details.querySelector('.output-unit-label');

        label.textContent = unit.charAt(0).toUpperCase() + unit.slice(1);
        this.updateComparisonFromUI(provider);
        this.calculate();
      }
    });

    // Advanced settings toggle
    document.getElementById('advanced-toggle')?.addEventListener('click', () => {
      const panel = document.getElementById('advanced-panel');
      panel.classList.toggle('hidden');
    });
  },

  /**
   * Update requests field labels based on timeframe
   */
  updateRequestsLabels() {
    const labels = document.querySelectorAll('.requests-label');
    let labelText = 'Requests per Minute';

    switch (this.currentTimeframe) {
      case 'minute':
        labelText = 'Requests per Minute';
        break;
      case 'hour':
        labelText = 'Requests per Hour';
        break;
      case 'day':
        labelText = 'Requests per Day';
        break;
      case 'month':
        labelText = 'Requests per Month';
        break;
      case 'total':
        labelText = 'Total Requests';
        break;
    }

    labels.forEach(label => {
      label.textContent = labelText;
    });
  },

  /**
   * Add a comparison
   */
  addComparison(provider, modelName = null) {
    const providerModels = this.models.filter(m => m.provider === provider);
    const model = modelName
      ? providerModels.find(m => m.model === modelName)
      : providerModels[0];

    if (!model) return;

    // Remove existing comparison for this provider
    this.comparisons = this.comparisons.filter(c => c.model.provider !== provider);

    // Add new comparison
    this.comparisons.push({
      model,
      inputTokens: 4096,
      outputTokens: 1024,
      requestsPerMinute: 60,
      timeframe: this.currentTimeframe,
      enabled: true
    });
  },

  /**
   * Remove a comparison
   */
  removeComparison(provider) {
    this.comparisons = this.comparisons.filter(c => c.model.provider !== provider);
  },

  /**
   * Update comparison from UI values
   */
  updateComparisonFromUI(provider) {
    const details = document.getElementById(`provider-${provider.toLowerCase().replace(/\s+/g, '-')}`);
    if (!details) return;

    const modelSelect = details.querySelector('.model-select');
    const inputValue = parseInt(details.querySelector('.input-value').value) || 0;
    const outputValue = parseInt(details.querySelector('.output-value').value) || 0;
    const rpmInput = parseInt(details.querySelector('.rpm-input').value) || 1;
    const inputUnit = details.querySelector('.input-unit-select').value;
    const outputUnit = details.querySelector('.output-unit-select').value;

    const model = this.models.find(m =>
      m.provider === provider && m.model === modelSelect.value
    );

    if (!model) return;

    // Convert to tokens
    const inputTokens = Utils.toTokens(inputValue, inputUnit);
    const outputTokens = Utils.toTokens(outputValue, outputUnit);

    // Update or add comparison
    const existingIndex = this.comparisons.findIndex(c => c.model.provider === provider);

    const comparison = {
      model,
      inputTokens,
      outputTokens,
      requestsPerMinute: rpmInput,
      timeframe: this.currentTimeframe,
      enabled: details.querySelector('.provider-enable').checked
    };

    if (existingIndex >= 0) {
      this.comparisons[existingIndex] = comparison;
    } else {
      this.comparisons.push(comparison);
    }

    // Update quota status
    this.updateQuotaStatus(provider, model, inputTokens, outputTokens, rpmInput);
  },

  /**
   * Update quota status display
   */
  updateQuotaStatus(provider, model, inputTokens, outputTokens, rpm) {
    const details = document.getElementById(`provider-${provider.toLowerCase().replace(/\s+/g, '-')}`);
    const quotaDiv = details.querySelector('.quota-status');
    const quotaContent = quotaDiv.querySelector('.space-y-2');

    const validation = Calculator.validateQuotas(model, inputTokens, outputTokens, rpm);

    if (validation.warnings.length === 0) {
      quotaDiv.classList.add('hidden');
      return;
    }

    quotaDiv.classList.remove('hidden');
    quotaContent.innerHTML = validation.warnings.map(warning => {
      const color = warning.severity === 'error' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400';
      return `
        <div class="${color}">
          <div class="flex items-center gap-2 mb-1">
            <span class="material-symbols-outlined text-sm">${warning.severity === 'error' ? 'error' : 'warning'}</span>
            <span class="font-medium">${warning.type.toUpperCase()}</span>
          </div>
          <p>${warning.message}</p>
          <div class="mt-1 bg-background-light dark:bg-background-dark rounded-full h-1.5">
            <div class="h-1.5 rounded-full ${warning.severity === 'error' ? 'bg-red-600' : 'bg-yellow-600'}"
                 style="width: ${Math.min(warning.percentage, 100)}%"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Calculate and display results
   */
  calculate() {
    if (this.comparisons.length === 0) {
      this.showError('No models selected for comparison');
      return;
    }

    // Filter enabled comparisons
    const enabledComparisons = this.comparisons.filter(c => c.enabled);

    if (enabledComparisons.length === 0) {
      this.clearResults();
      return;
    }

    // Calculate comparisons
    const results = Calculator.compareModels(enabledComparisons);

    // Update UI
    this.updateSummaryCards(results);
    this.updateChart(results);
    this.updateTable(results);
  },

  /**
   * Update summary cards
   */
  updateSummaryCards(results) {
    const enabledResults = results.filter(r => r.enabled);
    if (enabledResults.length === 0) return;

    // Find the cheapest option
    const cheapest = enabledResults[0];

    const totalCostEl = document.getElementById('total-cost');
    const inputPriceEl = document.getElementById('input-price');
    const outputPriceEl = document.getElementById('output-price');
    const timeframeLabelEls = document.querySelectorAll('.timeframe-label');

    if (totalCostEl) {
      totalCostEl.textContent = Utils.formatCurrency(cheapest.totalCost.totalCost);
    }

    if (inputPriceEl) {
      inputPriceEl.textContent = Utils.formatCurrency(cheapest.model.input_price_per_1m);
    }

    if (outputPriceEl) {
      outputPriceEl.textContent = Utils.formatCurrency(cheapest.model.output_price_per_1m);
    }

    timeframeLabelEls.forEach(el => {
      if (cheapest.totalCost.period === 'total') {
        el.textContent = '(total)';
      } else {
        el.textContent = `/ ${cheapest.totalCost.period}`;
      }
    });
  },

  /**
   * Update comparison chart
   */
  updateChart(results) {
    const chartContainer = document.getElementById('chart-bars');
    if (!chartContainer) return;

    const enabledResults = results.filter(r => r.enabled);
    if (enabledResults.length === 0) {
      chartContainer.innerHTML = '<p class="text-text-light/60 dark:text-text-dark/60 text-sm">No data to display</p>';
      return;
    }

    const maxCost = Math.max(...enabledResults.map(r => r.totalCost.totalCost));

    chartContainer.innerHTML = enabledResults.map(result => {
      const heightPercent = maxCost > 0 ? (result.totalCost.totalCost / maxCost * 100) : 0;
      const isFirst = result === enabledResults[0];

      return `
        <div class="flex flex-col items-center gap-2 flex-1 h-full justify-end">
          <div class="w-full ${isFirst ? 'bg-primary' : 'bg-primary/30'} rounded-t-md transition-all duration-300"
               style="height: ${heightPercent}%"
               title="${result.model.model}: ${Utils.formatCurrency(result.totalCost.totalCost)}">
          </div>
          <p class="text-xs text-text-light/70 dark:text-text-dark/70 text-center">${result.model.model}</p>
          <p class="text-xs font-medium">${Utils.formatCurrency(result.totalCost.totalCost)}</p>
        </div>
      `;
    }).join('');
  },

  /**
   * Update comparison table
   */
  updateTable(results) {
    const tbody = document.getElementById('comparison-table-body');
    if (!tbody) return;

    tbody.innerHTML = results.map((result, index) => {
      const isEnabled = result.enabled;
      const opacity = isEnabled ? '' : 'text-text-light/50 dark:text-text-dark/50';
      const hasErrors = result.validation.warnings.some(w => w.severity === 'error');

      return `
        <tr class="border-b border-border-light dark:border-border-dark">
          <th class="px-6 py-4 font-medium whitespace-nowrap ${opacity}" scope="row">
            ${result.model.model}
            ${hasErrors ? '<span class="material-symbols-outlined text-red-600 text-sm ml-1" title="Quota exceeded">error</span>' : ''}
          </th>
          <td class="px-6 py-4 ${opacity}">${result.model.provider}</td>
          <td class="px-6 py-4 ${opacity}">${Utils.formatNumber(result.model.context_window)}</td>
          <td class="px-6 py-4 ${opacity}">
            ${Utils.formatCurrency(result.model.input_price_per_1m)} / ${Utils.formatCurrency(result.model.output_price_per_1m)}
          </td>
          <td class="px-6 py-4 ${opacity}">
            ${Utils.formatNumber(result.totalCost.totalInputTokens)} / ${Utils.formatNumber(result.totalCost.totalOutputTokens)}
          </td>
          <td class="px-6 py-4 text-right font-medium ${opacity}">
            ${isEnabled ? Utils.formatCurrency(result.totalCost.totalCost) : '-'}
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Clear results
   */
  clearResults() {
    const totalCostEl = document.getElementById('total-cost');
    const chartContainer = document.getElementById('chart-bars');
    const tbody = document.getElementById('comparison-table-body');

    if (totalCostEl) totalCostEl.textContent = '$0.00';
    if (chartContainer) chartContainer.innerHTML = '<p class="text-text-light/60 dark:text-text-dark/60 text-sm">No data to display</p>';
    if (tbody) tbody.innerHTML = '';
  },

  /**
   * Reset all inputs
   */
  reset() {
    this.comparisons = [];

    // Uncheck all provider checkboxes
    document.querySelectorAll('.provider-enable').forEach(cb => {
      cb.checked = false;
    });

    // Close all accordions
    document.querySelectorAll('.provider-accordion').forEach(details => {
      details.removeAttribute('open');
    });

    this.clearResults();

    // Reinitialize with first provider
    const firstProvider = Object.keys(this.getProviders())[0];
    if (firstProvider) {
      const details = document.getElementById(`provider-${firstProvider.toLowerCase().replace(/\s+/g, '-')}`);
      const checkbox = details.querySelector('.provider-enable');
      checkbox.checked = true;
      details.setAttribute('open', '');
      this.addComparison(firstProvider);
      this.calculate();
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
