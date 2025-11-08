/**
 * LLM Cost Calculator - Main Application
 * Orchestrates UI, calculations, and data management
 */

const App = {
  models: [],
  customModels: [], // Array of user-created custom models
  selectedModels: [], // Array of selected model objects
  config: null, // Application configuration from config.json
  selectedProvider: 'all', // Track selected provider filter
  sharedConfig: {
    inputTokens: 5000,
    outputTokens: 1500,
    requestsPerDay: 100, // Requests per day (user-facing)
    rpm: 0.0694, // Calculated from requestsPerDay (100/1440)
    calcMode: 'duration', // 'duration' or 'total'
    duration: 'day', // 'hour', 'day', or 'month'
    totalRequests: 100, // For 'total' mode
    daysPerMonth: 30, // Number of active days per month
    selectedPreset: 'custom', // Track which preset is selected
    presetsCollapsed: true // Track if presets are collapsed
  },
  globalInputUnit: 'tokens',
  globalOutputUnit: 'tokens',

  /**
   * Initialize the application
   */
  async init() {
    console.log('Initializing LLM Cost Calculator...');

    try {
      // Load configuration
      await this.loadConfig();

      // Apply configuration to UI
      this.applyConfig();

      // Load models from CSV
      await this.loadModels();

      // Setup UI components
      this.setupDarkMode();
      this.renderModelSelector();
      this.setupEventListeners();
      this.updateDynamicLimits(); // Set initial dynamic limits
      this.toggleDaysPerMonthField(); // Initialize days per month field visibility
      this.selectPreset('custom'); // Mark custom as initially selected
      this.updateRPMDisplay(); // Initialize RPM display
      this.togglePresetsCollapsed(); // Initialize collapsed state

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
   * Load configuration from config.json
   */
  async loadConfig() {
    try {
      const response = await fetch('config.json');
      if (response.ok) {
        this.config = await response.json();
        console.log('Configuration loaded:', this.config);
      } else {
        console.log('No config.json found, using defaults');
        this.config = this.getDefaultConfig();
      }
    } catch (error) {
      console.log('Error loading config.json, using defaults:', error);
      this.config = this.getDefaultConfig();
    }
  },

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      branding: {
        title: 'LLM Cost Calculator',
        logo: {
          enabled: false,
          url: '',
          alt: 'Logo'
        }
      },
      apiKeyButton: {
        enabled: false,
        text: 'Get API Key',
        url: 'https://platform.openai.com/api-keys',
        providers: {}
      },
      theme: {
        primaryColor: '#ffa500'
      }
    };
  },

  /**
   * Apply configuration to UI
   */
  applyConfig() {
    if (!this.config) return;

    // Apply branding
    if (this.config.branding) {
      // Set title
      if (this.config.branding.title) {
        const titleElement = document.getElementById('app-title');
        if (titleElement) {
          titleElement.textContent = this.config.branding.title;
        }
        document.title = this.config.branding.title;
      }

      // Set logo
      if (this.config.branding.logo && this.config.branding.logo.enabled) {
        const logoElement = document.getElementById('custom-logo');
        const defaultIcon = document.getElementById('default-icon');

        if (logoElement && this.config.branding.logo.url) {
          logoElement.src = this.config.branding.logo.url;
          logoElement.alt = this.config.branding.logo.alt || 'Logo';
          logoElement.classList.remove('hidden');
          if (defaultIcon) {
            defaultIcon.classList.add('hidden');
          }
        }
      }
    }

    // Apply API key button configuration
    if (this.config.apiKeyButton && this.config.apiKeyButton.enabled) {
      const apiKeyButton = document.getElementById('api-key-button');
      const apiKeyButtonText = document.getElementById('api-key-button-text');

      if (apiKeyButton) {
        apiKeyButton.href = this.config.apiKeyButton.url || '#';
        apiKeyButton.classList.remove('hidden');
        apiKeyButton.classList.add('flex');

        if (apiKeyButtonText && this.config.apiKeyButton.text) {
          apiKeyButtonText.textContent = this.config.apiKeyButton.text;
        }
      }
    }

    console.log('Configuration applied to UI');
  },

  /**
   * Load models from CSV file
   */
  async loadModels() {
    try {
      const response = await fetch('data/models.csv');
      const csv = await response.text();
      const csvModels = Utils.parseCSV(csv);

      // Load custom models from localStorage
      this.loadCustomModels();

      // Merge custom models with CSV models
      this.models = [...csvModels, ...this.customModels];

      // Calculate and assign tiers to all models
      this.calculateModelTiers();

      console.log(`Loaded ${csvModels.length} CSV models and ${this.customModels.length} custom models`);
    } catch (error) {
      console.error('Error loading models:', error);
      throw error;
    }
  },

  /**
   * Calculate and assign tier badges to models based on pricing
   */
  calculateModelTiers() {
    // Calculate average price for each model (average of input and output price)
    const modelsWithPrices = this.models
      .filter(m => m.pricing_type === 'PAYG') // Only tier PAYG models
      .map(model => ({
        model,
        avgPrice: (parseFloat(model.input_price_per_1m) + parseFloat(model.output_price_per_1m)) / 2
      }))
      .sort((a, b) => b.avgPrice - a.avgPrice); // Sort descending

    if (modelsWithPrices.length === 0) return;

    // Calculate percentiles
    const count = modelsWithPrices.length;
    const p25Index = Math.floor(count * 0.25);
    const p75Index = Math.floor(count * 0.75);

    // Assign tiers
    modelsWithPrices.forEach((item, index) => {
      let tier, tierIcon, tierColor;

      if (index < p25Index) {
        // Top 25% - High-End
        tier = 'High-End';
        tierIcon = 'star';
        tierColor = 'text-yellow-600 dark:text-yellow-400';
      } else if (index >= p75Index) {
        // Bottom 25% - Budget
        tier = 'Budget';
        tierIcon = 'savings';
        tierColor = 'text-green-600 dark:text-green-400';
      } else {
        // Middle 50% - Mid-Range
        tier = 'Mid-Range';
        tierIcon = 'bolt';
        tierColor = 'text-blue-600 dark:text-blue-400';
      }

      item.model.tier = tier;
      item.model.tierIcon = tierIcon;
      item.model.tierColor = tierColor;
    });

    // PTU models get special tier
    this.models.filter(m => m.pricing_type === 'PTU').forEach(model => {
      model.tier = 'Specialized';
      model.tierIcon = 'verified';
      model.tierColor = 'text-purple-600 dark:text-purple-400';
    });

    // Custom models without tiers
    this.models.filter(m => m.isCustom && !m.tier).forEach(model => {
      model.tier = 'Custom';
      model.tierIcon = 'build';
      model.tierColor = 'text-gray-600 dark:text-gray-400';
    });
  },

  /**
   * Load custom models from localStorage
   */
  loadCustomModels() {
    try {
      const stored = localStorage.getItem('customModels');
      if (stored) {
        this.customModels = JSON.parse(stored);
        // Mark them as custom for UI purposes
        this.customModels.forEach(model => {
          model.isCustom = true;
        });
      } else {
        this.customModels = [];
      }
    } catch (error) {
      console.error('Error loading custom models:', error);
      this.customModels = [];
    }
  },

  /**
   * Save custom models to localStorage
   */
  saveCustomModelsToStorage() {
    try {
      localStorage.setItem('customModels', JSON.stringify(this.customModels));
    } catch (error) {
      console.error('Error saving custom models:', error);
      alert('Failed to save custom model. Storage may be full.');
    }
  },

  /**
   * Add a new custom model
   */
  addCustomModel(modelData) {
    // Validate required fields
    if (!modelData.provider || !modelData.model ||
        modelData.input_price_per_1m === undefined ||
        modelData.output_price_per_1m === undefined) {
      throw new Error('Missing required fields');
    }

    // Mark as custom
    modelData.isCustom = true;

    // Add to custom models array
    this.customModels.push(modelData);

    // Save to localStorage
    this.saveCustomModelsToStorage();

    // Add to combined models array
    this.models.push(modelData);

    // Re-render model selector
    this.renderModelSelector();

    console.log('Added custom model:', modelData.model);
  },

  /**
   * Update an existing custom model
   */
  updateCustomModel(originalModel, updatedData) {
    // Find the model in customModels array
    const index = this.customModels.findIndex(m =>
      m.provider === originalModel.provider && m.model === originalModel.model
    );

    if (index === -1) {
      throw new Error('Custom model not found');
    }

    // Update the model
    updatedData.isCustom = true;
    this.customModels[index] = updatedData;

    // Save to localStorage
    this.saveCustomModelsToStorage();

    // Reload all models
    this.reloadModels();

    console.log('Updated custom model:', updatedData.model);
  },

  /**
   * Delete a custom model
   */
  deleteCustomModel(model) {
    // Remove from customModels array
    this.customModels = this.customModels.filter(m =>
      !(m.provider === model.provider && m.model === model.model)
    );

    // Save to localStorage
    this.saveCustomModelsToStorage();

    // Remove from selected models if it's selected
    this.removeModelFromSelection(model.provider, model.model);

    // Reload all models
    this.reloadModels();

    console.log('Deleted custom model:', model.model);
  },

  /**
   * Reload models (merge CSV and custom models)
   */
  reloadModels() {
    // Remove custom models from the models array
    this.models = this.models.filter(m => !m.isCustom);

    // Add custom models back
    this.models = [...this.models, ...this.customModels];

    // Re-render model selector (which will show pills with correct selection state)
    this.renderModelSelector();
  },

  /**
   * Open custom model modal for adding a new model
   */
  openCustomModelModal(editModel = null) {
    const modal = document.getElementById('custom-model-modal');
    const form = document.getElementById('custom-model-form');
    const title = document.getElementById('custom-model-modal-title');

    if (!modal || !form) return;

    // Reset form
    form.reset();

    if (editModel) {
      // Edit mode
      title.textContent = 'Edit Custom Model';
      document.getElementById('cm-provider').value = editModel.provider || '';
      document.getElementById('cm-model').value = editModel.model || '';
      document.getElementById('cm-context-window').value = editModel.context_window || 128000;
      document.getElementById('cm-input-price').value = editModel.input_price_per_1m || 0;
      document.getElementById('cm-output-price').value = editModel.output_price_per_1m || 0;
      document.getElementById('cm-tpm-limit').value = editModel.tpm_limit || '';
      document.getElementById('cm-rpm-limit').value = editModel.rpm_limit || '';
      document.getElementById('cm-region').value = editModel.region || 'Global';

      // Store original model for update
      form.dataset.editProvider = editModel.provider;
      form.dataset.editModel = editModel.model;
    } else {
      // Add mode
      title.textContent = 'Add Custom Model';
      delete form.dataset.editProvider;
      delete form.dataset.editModel;
    }

    // Show modal
    modal.classList.remove('hidden');
  },

  /**
   * Close custom model modal
   */
  closeCustomModelModal() {
    const modal = document.getElementById('custom-model-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  },

  /**
   * Handle custom model form submission
   */
  handleCustomModelSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const isEdit = form.dataset.editProvider && form.dataset.editModel;

    // Gather form data
    const modelData = {
      provider: document.getElementById('cm-provider').value.trim(),
      model: document.getElementById('cm-model').value.trim(),
      context_window: parseInt(document.getElementById('cm-context-window').value) || 128000,
      input_price_per_1m: parseFloat(document.getElementById('cm-input-price').value) || 0,
      output_price_per_1m: parseFloat(document.getElementById('cm-output-price').value) || 0,
      tpm_limit: parseInt(document.getElementById('cm-tpm-limit').value) || null,
      rpm_limit: parseInt(document.getElementById('cm-rpm-limit').value) || null,
      region: document.getElementById('cm-region').value.trim() || 'Global',
      pricing_type: 'PAYG',
      ptu_price_monthly: null
    };

    try {
      if (isEdit) {
        // Update existing model
        const originalModel = {
          provider: form.dataset.editProvider,
          model: form.dataset.editModel
        };
        this.updateCustomModel(originalModel, modelData);
        alert('Custom model updated successfully!');
      } else {
        // Add new model
        this.addCustomModel(modelData);
        alert('Custom model added successfully!');
      }

      // Close modal
      this.closeCustomModelModal();
    } catch (error) {
      alert('Error saving custom model: ' + error.message);
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

    // Render provider tabs
    this.renderProviderTabs();

    const providers = this.getProviders();

    // Filter providers based on selection
    const filteredProviders = this.selectedProvider === 'all'
      ? providers
      : { [this.selectedProvider]: providers[this.selectedProvider] || [] };

    // Render models as clickable pills grouped by provider
    selector.innerHTML = Object.keys(filteredProviders).sort().map(providerName => {
      const models = filteredProviders[providerName];
      return `
        <div class="provider-group mb-4">
          <div class="mb-2 text-xs font-semibold text-text-light/70 dark:text-text-dark/70 uppercase tracking-wide">
            ${providerName}
          </div>
          <div class="flex flex-wrap gap-2">
            ${models.map(model => {
              const isSelected = this.selectedModels.some(m =>
                m.provider === model.provider && m.model === model.model
              );
              const isCustom = model.isCustom === true;
              const hasTier = model.tier && !isCustom;

              // Base classes for pill
              const baseClasses = 'model-pill flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-xs border';
              const selectedClasses = isSelected
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark hover:border-primary/50 hover:bg-primary/5';

              return `
                <div class="model-option ${baseClasses} ${selectedClasses}"
                     data-provider="${model.provider}"
                     data-model="${model.model}">
                  <div class="flex items-center gap-2 flex-1">
                    <span class="font-medium whitespace-nowrap">${model.model}</span>
                    ${hasTier ? `<span class="material-symbols-outlined text-xs ${isSelected ? 'text-white' : model.tierColor}" title="${model.tier}">${model.tierIcon}</span>` : ''}
                    ${isCustom ? `<span class="material-symbols-outlined text-xs ${isSelected ? 'text-white' : 'text-primary'}" title="Custom Model">build</span>` : ''}
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs opacity-80 whitespace-nowrap">${Utils.formatCurrency(model.input_price_per_1m)}/${Utils.formatCurrency(model.output_price_per_1m)}</span>
                    ${isCustom ? `
                      <button class="edit-custom-model-btn p-0.5 rounded hover:bg-white/20 transition-colors"
                              data-provider="${model.provider}"
                              data-model="${model.model}"
                              title="Edit custom model"
                              onclick="event.stopPropagation()">
                        <span class="material-symbols-outlined text-sm ${isSelected ? 'text-white' : 'text-text-light/70 dark:text-text-dark/70'}">edit</span>
                      </button>
                      <button class="delete-custom-model-btn p-0.5 rounded hover:bg-white/20 transition-colors"
                              data-provider="${model.provider}"
                              data-model="${model.model}"
                              title="Delete custom model"
                              onclick="event.stopPropagation()">
                        <span class="material-symbols-outlined text-sm ${isSelected ? 'text-white' : 'text-red-600 dark:text-red-400'}">delete</span>
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Add click event listeners to pills
    this.setupModelPillListeners();
  },

  /**
   * Setup event listeners for model pills
   */
  setupModelPillListeners() {
    document.querySelectorAll('.model-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        // Don't toggle if clicking on edit/delete buttons
        if (e.target.closest('.edit-custom-model-btn') || e.target.closest('.delete-custom-model-btn')) {
          return;
        }

        const provider = pill.dataset.provider;
        const modelName = pill.dataset.model;
        const model = this.models.find(m => m.provider === provider && m.model === modelName);

        if (!model) return;

        const isSelected = this.selectedModels.some(m =>
          m.provider === provider && m.model === modelName
        );

        if (isSelected) {
          this.removeModelFromSelection(provider, modelName);
        } else {
          this.addModelToSelection(model);
        }
      });
    });
  },

  /**
   * Render provider filter tabs
   */
  renderProviderTabs() {
    const tabsContainer = document.getElementById('provider-tabs');
    if (!tabsContainer) return;

    const providers = this.getProviders();
    const providerNames = Object.keys(providers).sort();

    // Calculate model counts per provider
    const providerCounts = {};
    providerNames.forEach(name => {
      providerCounts[name] = providers[name].length;
    });

    const totalCount = this.models.length;

    tabsContainer.innerHTML = `
      <button class="provider-tab px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${this.selectedProvider === 'all' ? 'bg-primary text-white' : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-primary/10'}"
              data-provider="all">
        All (${totalCount})
      </button>
      ${providerNames.map(name => `
        <button class="provider-tab px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${this.selectedProvider === name ? 'bg-primary text-white' : 'bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark hover:bg-primary/10'}"
                data-provider="${name}">
          ${name} (${providerCounts[name]})
        </button>
      `).join('')}
    `;

    // Add event listeners to provider tabs
    tabsContainer.querySelectorAll('.provider-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const provider = e.currentTarget.dataset.provider;
        this.selectedProvider = provider;
        this.renderModelSelector();
      });
    });
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
    this.renderModelSelector(); // Re-render pills with updated selection
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
    this.renderModelSelector(); // Re-render pills with updated selection
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
    // Custom model modal
    document.getElementById('add-custom-model-btn')?.addEventListener('click', () => {
      this.openCustomModelModal();
    });

    document.getElementById('custom-model-form')?.addEventListener('submit', (e) => {
      this.handleCustomModelSubmit(e);
    });

    document.getElementById('close-custom-modal-btn')?.addEventListener('click', () => {
      this.closeCustomModelModal();
    });

    document.getElementById('cancel-custom-modal-btn')?.addEventListener('click', () => {
      this.closeCustomModelModal();
    });

    // Close modal on background click
    document.getElementById('custom-model-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'custom-model-modal') {
        this.closeCustomModelModal();
      }
    });

    // Edit custom model buttons (delegated)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-custom-model-btn') || e.target.closest('.edit-custom-model-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const btn = e.target.classList.contains('edit-custom-model-btn') ? e.target : e.target.closest('.edit-custom-model-btn');
        const provider = btn.dataset.provider;
        const modelName = btn.dataset.model;
        console.log('Edit button clicked:', provider, modelName);
        const model = this.models.find(m => m.provider === provider && m.model === modelName);
        if (model) {
          this.openCustomModelModal(model);
        }
      }
    });

    // Delete custom model buttons (delegated)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-custom-model-btn') || e.target.closest('.delete-custom-model-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const btn = e.target.classList.contains('delete-custom-model-btn') ? e.target : e.target.closest('.delete-custom-model-btn');
        const provider = btn.dataset.provider;
        const modelName = btn.dataset.model;
        console.log('Delete button clicked:', provider, modelName);
        const model = this.models.find(m => m.provider === provider && m.model === modelName);
        if (model && confirm(`Are you sure you want to delete the custom model "${model.model}"?`)) {
          this.deleteCustomModel(model);
        }
      }
    });

    // Reset button
    document.getElementById('reset-btn')?.addEventListener('click', () => {
      this.reset();
    });

    // Export buttons
    document.getElementById('export-csv-btn')?.addEventListener('click', () => {
      this.exportToCSV();
    });

    document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
      this.exportToPDF();
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
      this.selectPreset('custom'); // Switch to custom when user manually changes
      this.calculate();
    });

    sharedInputSlider?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 1;
      if (sharedInputTokens) {
        sharedInputTokens.value = value;
      }
      this.sharedConfig.inputTokens = value;
      this.selectPreset('custom'); // Switch to custom when user manually changes
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
      this.selectPreset('custom'); // Switch to custom when user manually changes
      this.calculate();
    });

    sharedOutputSlider?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 1;
      if (sharedOutputTokens) {
        sharedOutputTokens.value = value;
      }
      this.sharedConfig.outputTokens = value;
      this.selectPreset('custom'); // Switch to custom when user manually changes
      this.calculate();
    });

    // Requests Per Day
    const sharedRequestsPerDay = document.getElementById('shared-requests-per-day');
    const sharedRequestsPerDaySlider = document.getElementById('shared-requests-per-day-slider');

    sharedRequestsPerDay?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 1;
      if (sharedRequestsPerDaySlider) {
        sharedRequestsPerDaySlider.value = value;
      }
      this.sharedConfig.requestsPerDay = value;
      this.sharedConfig.rpm = value / 1440; // Convert to RPM (1440 minutes per day)
      this.updateRPMDisplay();
      this.selectPreset('custom'); // Switch to custom when user manually changes
      this.updateRuntimeEstimate();
      this.calculate();
    });

    sharedRequestsPerDaySlider?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 1;
      if (sharedRequestsPerDay) {
        sharedRequestsPerDay.value = value;
      }
      this.sharedConfig.requestsPerDay = value;
      this.sharedConfig.rpm = value / 1440; // Convert to RPM (1440 minutes per day)
      this.updateRPMDisplay();
      this.selectPreset('custom'); // Switch to custom when user manually changes
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
      this.toggleDaysPerMonthField();
      this.calculate();
    });

    // Days per month input
    document.getElementById('days-per-month')?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 1;
      this.sharedConfig.daysPerMonth = Math.max(1, Math.min(31, value));
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

    // Model pills are handled by setupModelPillListeners() called from renderModelSelector()

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

    // Preset toggle button
    document.getElementById('preset-toggle')?.addEventListener('click', () => {
      this.sharedConfig.presetsCollapsed = !this.sharedConfig.presetsCollapsed;
      this.togglePresetsCollapsed();
    });

    // Usage preset buttons
    document.querySelectorAll('.usage-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.currentTarget;
        const preset = button.dataset.preset;

        // Handle custom preset (just marks it as selected)
        if (preset === 'custom') {
          this.selectPreset('custom');
          return;
        }

        // Apply preset values
        const inputTokens = parseInt(button.dataset.input);
        const outputTokens = parseInt(button.dataset.output);
        const requestsPerDay = parseInt(button.dataset.requestsPerDay);
        const duration = button.dataset.duration;

        this.applyPreset(preset, inputTokens, outputTokens, requestsPerDay, duration);
      });
    });
  },

  /**
   * Apply a usage preset
   */
  applyPreset(presetName, inputTokens, outputTokens, requestsPerDay, duration) {
    // Update config
    this.sharedConfig.inputTokens = inputTokens;
    this.sharedConfig.outputTokens = outputTokens;
    this.sharedConfig.requestsPerDay = requestsPerDay;
    this.sharedConfig.rpm = requestsPerDay / 1440; // Convert to RPM
    this.sharedConfig.duration = duration;
    this.sharedConfig.calcMode = 'duration';
    this.sharedConfig.selectedPreset = presetName;

    // Update UI inputs
    document.getElementById('shared-input-tokens').value = inputTokens;
    document.getElementById('shared-input-slider').value = inputTokens;
    document.getElementById('shared-output-tokens').value = outputTokens;
    document.getElementById('shared-output-slider').value = outputTokens;
    document.getElementById('shared-requests-per-day').value = requestsPerDay;
    document.getElementById('shared-requests-per-day-slider').value = requestsPerDay;
    document.getElementById('duration-select').value = duration;
    document.getElementById('calc-mode-duration').checked = true;

    // Enable/disable appropriate inputs
    document.getElementById('total-requests-input')?.setAttribute('disabled', 'disabled');
    document.getElementById('duration-select')?.removeAttribute('disabled');

    // Toggle days per month field visibility
    this.toggleDaysPerMonthField();

    // Update RPM display
    this.updateRPMDisplay();

    // Update preset selection visual state
    this.selectPreset(presetName);

    // Recalculate
    this.calculate();
  },

  /**
   * Mark a preset as selected
   */
  selectPreset(presetName) {
    this.sharedConfig.selectedPreset = presetName;

    // Update visual state of preset buttons
    document.querySelectorAll('.usage-preset-btn').forEach(btn => {
      const btnPreset = btn.dataset.preset;
      const isSelected = btnPreset === presetName;

      if (isSelected) {
        btn.classList.add('border-primary/50', 'bg-primary/5', 'dark:bg-primary/10', 'preset-selected');
        btn.classList.remove('border-border-light', 'dark:border-border-dark');

        // Add checkmark if not already there
        if (!btn.querySelector('.material-symbols-outlined:last-child')) {
          const checkmark = document.createElement('span');
          checkmark.className = 'material-symbols-outlined text-primary text-sm';
          checkmark.textContent = 'check_circle';
          btn.querySelector('.flex').appendChild(checkmark);
        }
      } else {
        btn.classList.remove('border-primary/50', 'bg-primary/5', 'dark:bg-primary/10', 'preset-selected');
        btn.classList.add('border-border-light', 'dark:border-border-dark');

        // Remove checkmark
        const checkmark = btn.querySelector('.material-symbols-outlined:last-child');
        if (checkmark && checkmark.textContent === 'check_circle') {
          checkmark.remove();
        }
      }
    });
  },

  /**
   * Toggle visibility of days per month field based on duration selection
   */
  toggleDaysPerMonthField() {
    const daysPerMonthContainer = document.getElementById('days-per-month-container');
    const duration = this.sharedConfig.duration;

    if (daysPerMonthContainer) {
      if (duration === 'month') {
        daysPerMonthContainer.classList.remove('hidden');
      } else {
        daysPerMonthContainer.classList.add('hidden');
      }
    }
  },

  /**
   * Update RPM display based on requests per day
   */
  updateRPMDisplay() {
    const rpmDisplay = document.getElementById('rpm-display');
    if (!rpmDisplay) return;

    const rpm = this.sharedConfig.rpm;
    rpmDisplay.textContent = `~${rpm.toFixed(2)} RPM`;
  },

  /**
   * Toggle collapsed state of usage presets section
   */
  togglePresetsCollapsed() {
    const presetList = document.getElementById('preset-list');
    const presetDescription = document.getElementById('preset-description');
    const toggleIcon = document.querySelector('#preset-toggle .material-symbols-outlined:last-child');

    if (!presetList || !toggleIcon) return;

    if (this.sharedConfig.presetsCollapsed) {
      // Collapsed state - show only selected preset
      const selectedPreset = this.sharedConfig.selectedPreset;
      document.querySelectorAll('.usage-preset-btn').forEach(btn => {
        const btnPreset = btn.dataset.preset;
        if (btnPreset === selectedPreset) {
          btn.style.display = '';
        } else {
          btn.style.display = 'none';
        }
      });
      if (presetDescription) presetDescription.classList.add('hidden');
      toggleIcon.textContent = 'expand_more';
    } else {
      // Expanded state - show all presets
      document.querySelectorAll('.usage-preset-btn').forEach(btn => {
        btn.style.display = '';
      });
      if (presetDescription) presetDescription.classList.remove('hidden');
      toggleIcon.textContent = 'expand_less';
    }
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
      daysPerMonth: this.sharedConfig.daysPerMonth,
      enabled: true
    }));

    // Calculate comparisons
    const results = Calculator.compareModels(comparisons);

    // Store results for export
    this.currentResults = results;

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
   * DEPRECATED: Chart functionality removed to simplify UI
   */
  showMultiModelChart(enabledResults) {
    // Chart rendering removed - all information available in table
    return;
  },

  /**
   * Show single-model pie chart
   * DEPRECATED: Chart functionality removed to simplify UI
   */
  showSingleModelChart(result) {
    // Chart rendering removed - all information available in table
    return;
  },

  /**
   * Render radial gauge charts for quota usage
   * DEPRECATED: Chart functionality removed to simplify UI
   */
  renderQuotaGauges(container, result) {
    // Chart rendering removed - all information available in table
    return;
  },

  /**
   * Create SVG for radial gauge
   * DEPRECATED: Chart functionality removed to simplify UI
   */
  createRadialGaugeSVG(percentage, color) {
    // Chart rendering removed - all information available in table
    return '';
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

      if (hasErrors) {
        statusIcon = 'error';
        statusColor = 'text-red-600 dark:text-red-400';
      } else if (hasWarnings) {
        statusIcon = 'warning';
        statusColor = 'text-yellow-600 dark:text-yellow-400';
      }

      const statusIconHtml = (hasErrors || hasWarnings) ?
        `<span class="material-symbols-outlined text-base ${statusColor}">${statusIcon}</span>` : '';

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
      // For duration mode, show days if it's a month calculation
      const durationDisplay = result.totalCost.duration === 'month'
        ? `${result.totalCost.duration} (${this.sharedConfig.daysPerMonth} days)`
        : result.totalCost.duration;
      calculationBasis = `${result.totalCost.rpm} RPM × ${durationDisplay} = ${Utils.formatNumber(result.totalCost.totalRequests)} requests`;
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
                <span class="text-text-light/70 dark:text-text-dark/70">Cost per Request:</span>
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
    const expandableRows = document.querySelectorAll('.expandable-row');

    // Auto-expand first row if only one model selected, or if it's the default GPT-5 model
    if (expandableRows.length === 1) {
      // Only one model - auto-expand it
      const rowId = expandableRows[0].dataset.rowId;
      const content = document.getElementById(`${rowId}-content`);
      const icon = document.querySelector(`.expand-icon[data-row-id="${rowId}"]`);

      if (content && icon) {
        content.classList.add('open');
        icon.classList.add('rotated');
        icon.textContent = 'expand_less';
      }
    } else if (expandableRows.length > 1 && this.currentResults) {
      // Multiple models - check if GPT-5 is among them and auto-expand it
      const gpt5Result = this.currentResults.find(r => r.model.model === 'GPT-5');
      if (gpt5Result) {
        const gpt5Index = this.currentResults.indexOf(gpt5Result);
        const rowId = `row-${gpt5Index}`;
        const content = document.getElementById(`${rowId}-content`);
        const icon = document.querySelector(`.expand-icon[data-row-id="${rowId}"]`);

        if (content && icon) {
          content.classList.add('open');
          icon.classList.add('rotated');
          icon.textContent = 'expand_less';
        }
      }
    }

    // Add click event listeners for toggling
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
    // Clear stored results
    this.currentResults = null;

    // Clear cost view
    const totalCostEl = document.getElementById('total-cost');
    const costPer1kEl = document.getElementById('cost-per-1k');
    const maxThroughputEl = document.getElementById('max-throughput');
    const maxThroughputDetailEl = document.getElementById('max-throughput-detail');
    const avgUtilizationEl = document.getElementById('avg-utilization');
    const avgUtilizationDetailEl = document.getElementById('avg-utilization-detail');
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
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-8 text-center text-text-light/60 dark:text-text-dark/60">
            Select models to see results
          </td>
        </tr>
      `;
    }
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
      requestsPerDay: 100,
      rpm: 100 / 1440, // Calculated from requestsPerDay
      calcMode: 'duration',
      duration: 'day',
      totalRequests: 100,
      daysPerMonth: 30,
      selectedPreset: 'custom',
      presetsCollapsed: true
    };

    // Reset provider filter
    this.selectedProvider = 'all';

    // Reset UI inputs
    const sharedInputTokens = document.getElementById('shared-input-tokens');
    const sharedInputSlider = document.getElementById('shared-input-slider');
    const sharedOutputTokens = document.getElementById('shared-output-tokens');
    const sharedOutputSlider = document.getElementById('shared-output-slider');
    const sharedRequestsPerDay = document.getElementById('shared-requests-per-day');
    const sharedRequestsPerDaySlider = document.getElementById('shared-requests-per-day-slider');
    const calcModeDuration = document.getElementById('calc-mode-duration');
    const durationSelect = document.getElementById('duration-select');
    const totalRequestsInput = document.getElementById('total-requests-input');

    if (sharedInputTokens) sharedInputTokens.value = 5000;
    if (sharedInputSlider) sharedInputSlider.value = 5000;
    if (sharedOutputTokens) sharedOutputTokens.value = 1500;
    if (sharedOutputSlider) sharedOutputSlider.value = 1500;
    if (sharedRequestsPerDay) sharedRequestsPerDay.value = 100;
    if (sharedRequestsPerDaySlider) sharedRequestsPerDaySlider.value = 100;
    if (calcModeDuration) calcModeDuration.checked = true;
    if (durationSelect) durationSelect.value = 'day';
    if (totalRequestsInput) {
      totalRequestsInput.value = 100;
      totalRequestsInput.disabled = true;
    }

    // Reset days per month
    const daysPerMonth = document.getElementById('days-per-month');
    if (daysPerMonth) daysPerMonth.value = 30;

    // Reset unit selectors
    const globalInputUnit = document.getElementById('global-input-unit');
    const globalOutputUnit = document.getElementById('global-output-unit');
    if (globalInputUnit) {
      globalInputUnit.value = 'tokens';
      this.globalInputUnit = 'tokens';
    }
    if (globalOutputUnit) {
      globalOutputUnit.value = 'tokens';
      this.globalOutputUnit = 'tokens';
    }

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
    this.clearResults();
    this.updateRPMDisplay();
    this.renderModelSelector(); // Re-render pills to reset provider filter and selection

    // Reset preset selection and days per month visibility
    this.selectPreset('custom');
    this.toggleDaysPerMonthField();
    this.togglePresetsCollapsed();

    // Reinitialize with default model
    const gpt5 = this.models.find(m => m.model === 'GPT-5');
    if (gpt5) {
      this.addModelToSelection(gpt5);
    }

    console.log('Reset completed');
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
   * Export results to CSV
   */
  exportToCSV() {
    if (!this.currentResults || this.currentResults.length === 0) {
      alert('No results to export. Please select at least one model and run calculations.');
      return;
    }

    // Convert to tokens for export
    const inputTokens = Utils.toTokens(this.sharedConfig.inputTokens, this.globalInputUnit);
    const outputTokens = Utils.toTokens(this.sharedConfig.outputTokens, this.globalOutputUnit);

    const config = {
      inputTokens,
      outputTokens,
      rpm: this.sharedConfig.rpm,
      calcMode: this.sharedConfig.calcMode,
      duration: this.sharedConfig.duration,
      totalRequests: this.sharedConfig.totalRequests
    };

    Utils.exportToCSV(this.currentResults, config);
  },

  /**
   * Export results to PDF
   */
  exportToPDF() {
    if (!this.currentResults || this.currentResults.length === 0) {
      alert('No results to export. Please select at least one model and run calculations.');
      return;
    }

    // Convert to tokens for export
    const inputTokens = Utils.toTokens(this.sharedConfig.inputTokens, this.globalInputUnit);
    const outputTokens = Utils.toTokens(this.sharedConfig.outputTokens, this.globalOutputUnit);

    const config = {
      inputTokens,
      outputTokens,
      rpm: this.sharedConfig.rpm,
      calcMode: this.sharedConfig.calcMode,
      duration: this.sharedConfig.duration,
      totalRequests: this.sharedConfig.totalRequests
    };

    Utils.exportToPDF(this.currentResults, config);
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
