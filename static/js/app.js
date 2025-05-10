// Configuration Management System Frontend JS

// Global variables
let configItems = [];
let configValues = [];
let scopeTypes = [];

// DOM ready event
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips and popovers
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Fetch initial data
    fetchScopeTypes();
    fetchConfigItems();
    fetchConfigValues();
    
    // Set up event listeners
    setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
    // Config Item Form
    document.getElementById('configItemForm').addEventListener('submit', handleConfigItemSubmit);
    
    // Config Value Form
    document.getElementById('configValueForm').addEventListener('submit', handleConfigValueSubmit);
    
    // Resolution Form
    document.getElementById('resolutionForm').addEventListener('submit', handleResolutionSubmit);
    
    // Delete buttons will be set up when data is loaded
    
    // Tab switching
    const tabEls = document.querySelectorAll('a[data-bs-toggle="tab"]');
    tabEls.forEach(tabEl => {
        tabEl.addEventListener('shown.bs.tab', event => {
            if (event.target.getAttribute('href') === '#itemsTab') {
                fetchConfigItems();
            } else if (event.target.getAttribute('href') === '#valuesTab') {
                fetchConfigValues();
            }
        });
    });
    
    // Add property button for resolution form
    document.getElementById('addPropertyBtn').addEventListener('click', addPropertyField);
}

// Fetch all scope types
function fetchScopeTypes() {
    fetch('/api/scope-types')
        .then(response => response.json())
        .then(data => {
            scopeTypes = data;
            updateScopeTypeSelects();
        })
        .catch(error => showToast('Error fetching scope types: ' + error, 'danger'));
}

// Fetch all config items
function fetchConfigItems() {
    fetch('/api/config-items')
        .then(response => response.json())
        .then(data => {
            configItems = data;
            updateConfigItemsTable();
            updateConfigItemSelects();
        })
        .catch(error => showToast('Error fetching config items: ' + error, 'danger'));
}

// Fetch all config values
function fetchConfigValues() {
    fetch('/api/config-values')
        .then(response => response.json())
        .then(data => {
            configValues = data;
            updateConfigValuesTable();
        })
        .catch(error => showToast('Error fetching config values: ' + error, 'danger'));
}

// Update the config items table
function updateConfigItemsTable() {
    const tbody = document.getElementById('configItemsTableBody');
    tbody.innerHTML = '';
    
    if (configItems.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" class="text-center">No configuration items defined</td>`;
        tbody.appendChild(tr);
        return;
    }
    
    configItems.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.key}</td>
            <td>${item.description}</td>
            <td>${item.value_type}</td>
            <td>
                <button class="btn btn-sm btn-danger delete-item-btn" data-key="${item.key}">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.currentTarget.getAttribute('data-key');
            if (confirm(`Are you sure you want to delete the configuration item "${key}"?`)) {
                deleteConfigItem(key);
            }
        });
    });
}

// Update the config values table
function updateConfigValuesTable() {
    const tbody = document.getElementById('configValuesTableBody');
    tbody.innerHTML = '';
    
    if (configValues.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" class="text-center">No configuration values defined</td>`;
        tbody.appendChild(tr);
        return;
    }
    
    configValues.forEach(value => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${value.config_item_key}</td>
            <td>${value.scope_type}</td>
            <td>${value.scope_value || '<i>global</i>'}</td>
            <td>${value.value}</td>
            <td>
                <button class="btn btn-sm btn-danger delete-value-btn" 
                    data-item-key="${value.config_item_key}" 
                    data-scope-type="${value.scope_type}" 
                    data-scope-value="${value.scope_value || ''}">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-value-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemKey = e.currentTarget.getAttribute('data-item-key');
            const scopeType = e.currentTarget.getAttribute('data-scope-type');
            const scopeValue = e.currentTarget.getAttribute('data-scope-value') || null;
            
            if (confirm(`Are you sure you want to delete this configuration value?`)) {
                deleteConfigValue(itemKey, scopeType, scopeValue);
            }
        });
    });
}

// Update all scope type selects
function updateScopeTypeSelects() {
    const scopeTypeSelect = document.getElementById('scopeType');
    scopeTypeSelect.innerHTML = '';
    
    scopeTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.name;
        option.textContent = type.name;
        scopeTypeSelect.appendChild(option);
    });
    
    // Update scope value field visibility based on selected scope type
    updateScopeValueFieldVisibility();
    
    // Add change event listener to scope type select
    scopeTypeSelect.addEventListener('change', updateScopeValueFieldVisibility);
}

// Update visibility of scope value field based on selected scope type
function updateScopeValueFieldVisibility() {
    const scopeTypeSelect = document.getElementById('scopeType');
    const scopeValueGroup = document.getElementById('scopeValueGroup');
    
    if (scopeTypeSelect.value === 'default') {
        scopeValueGroup.style.display = 'none';
    } else {
        scopeValueGroup.style.display = 'block';
    }
}

// Update all config item selects
function updateConfigItemSelects() {
    const configItemSelects = document.querySelectorAll('.config-item-select');
    
    configItemSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '';
        
        configItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.key;
            option.textContent = item.key;
            select.appendChild(option);
        });
        
        // Restore previous selection if possible
        if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
            select.value = currentValue;
        }
    });
}

// Handle config item form submission
function handleConfigItemSubmit(e) {
    e.preventDefault();
    
    const key = document.getElementById('configItemKey').value;
    const description = document.getElementById('configItemDescription').value;
    const valueType = document.getElementById('configItemValueType').value;
    
    // Validate form
    if (!key || !description || !valueType) {
        showToast('Please fill out all fields', 'warning');
        return;
    }
    
    // Check for duplicate key
    if (configItems.some(item => item.key === key)) {
        showToast('Configuration item with this key already exists', 'warning');
        return;
    }
    
    // Create config item
    fetch('/api/config-items', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            key: key,
            description: description,
            value_type: valueType
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to create configuration item');
            });
        }
        return response.json();
    })
    .then(data => {
        // Reset form
        document.getElementById('configItemForm').reset();
        
        // Refresh data
        fetchConfigItems();
        
        showToast('Configuration item created successfully', 'success');
    })
    .catch(error => {
        showToast(error.message, 'danger');
    });
}

// Handle config value form submission
function handleConfigValueSubmit(e) {
    e.preventDefault();
    
    const configItemKey = document.getElementById('configItemKey').value;
    const scopeType = document.getElementById('scopeType').value;
    let scopeValue = document.getElementById('scopeValue').value;
    const value = document.getElementById('configValue').value;
    
    // Validate form
    if (!configItemKey || !scopeType || !value) {
        showToast('Please fill out all required fields', 'warning');
        return;
    }
    
    // For default scope type, scope value should be null
    if (scopeType === 'default') {
        scopeValue = null;
    } else if (!scopeValue) {
        showToast('Scope value is required for non-default scope types', 'warning');
        return;
    }
    
    // Create config value
    fetch('/api/config-values', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            config_item_key: configItemKey,
            scope_type: scopeType,
            scope_value: scopeValue,
            value: value
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to set configuration value');
            });
        }
        return response.json();
    })
    .then(data => {
        // Reset form
        document.getElementById('configValueForm').reset();
        
        // Refresh data
        fetchConfigValues();
        
        showToast('Configuration value set successfully', 'success');
    })
    .catch(error => {
        showToast(error.message, 'danger');
    });
}

// Delete a config item
function deleteConfigItem(key) {
    fetch(`/api/config-items/${key}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Configuration item not found');
            }
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to delete configuration item');
            });
        }
        
        // Refresh data
        fetchConfigItems();
        fetchConfigValues();
        
        showToast('Configuration item deleted successfully', 'success');
    })
    .catch(error => {
        showToast(error.message, 'danger');
    });
}

// Delete a config value
function deleteConfigValue(configItemKey, scopeType, scopeValue) {
    fetch('/api/config-values', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            config_item_key: configItemKey,
            scope_type: scopeType,
            scope_value: scopeValue === '' ? null : scopeValue
        })
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Configuration value not found');
            }
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to delete configuration value');
            });
        }
        
        // Refresh data
        fetchConfigValues();
        
        showToast('Configuration value deleted successfully', 'success');
    })
    .catch(error => {
        showToast(error.message, 'danger');
    });
}

// Handle resolution form submission
function handleResolutionSubmit(e) {
    e.preventDefault();
    
    const configItemKey = document.getElementById('resolveConfigItemKey').value;
    const propertiesContainer = document.getElementById('propertiesContainer');
    const propertyRows = propertiesContainer.querySelectorAll('.property-row');
    
    // Build properties object
    const properties = {};
    propertyRows.forEach(row => {
        const keyInput = row.querySelector('.property-key');
        const valueInput = row.querySelector('.property-value');
        
        if (keyInput.value && valueInput.value) {
            properties[keyInput.value] = valueInput.value;
        }
    });
    
    // Validate form
    if (!configItemKey) {
        showToast('Please select a configuration item', 'warning');
        return;
    }
    
    if (Object.keys(properties).length === 0) {
        showToast('Please add at least one property', 'warning');
        return;
    }
    
    // Resolve config value
    fetch('/api/resolve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            config_item_key: configItemKey,
            properties: properties
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to resolve configuration value');
            });
        }
        return response.json();
    })
    .then(data => {
        // Display result
        document.getElementById('resolutionResult').textContent = data.value;
        document.getElementById('resolutionResultContainer').style.display = 'block';
    })
    .catch(error => {
        showToast(error.message, 'danger');
        document.getElementById('resolutionResultContainer').style.display = 'none';
    });
}

// Add a new property field to the resolution form
function addPropertyField() {
    const propertiesContainer = document.getElementById('propertiesContainer');
    const rowIndex = propertiesContainer.querySelectorAll('.property-row').length;
    
    const propertyRow = document.createElement('div');
    propertyRow.className = 'row property-row mb-2';
    propertyRow.innerHTML = `
        <div class="col-5">
            <select class="form-select property-key">
                ${scopeTypes.map(type => `
                    <option value="${type.name}" ${type.name === 'default' ? 'disabled' : ''}>
                        ${type.name}
                    </option>
                `).join('')}
            </select>
        </div>
        <div class="col-5">
            <input type="text" class="form-control property-value" placeholder="Value">
        </div>
        <div class="col-2">
            <button type="button" class="btn btn-danger remove-property-btn">
                <i class="bi bi-dash-circle"></i>
            </button>
        </div>
    `;
    
    propertiesContainer.appendChild(propertyRow);
    
    // Add event listener to remove button
    propertyRow.querySelector('.remove-property-btn').addEventListener('click', function() {
        propertyRow.remove();
    });
}

// Show a toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });
    
    bsToast.show();
    
    // Remove the toast from the DOM after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}
