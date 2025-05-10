import React, { useState, useEffect } from 'react';

const ConfigValuesTab = ({ configItems, configValues, scopeTypes, fetchConfigValues, showToast }) => {
  const [formData, setFormData] = useState({
    config_item_key: '',
    scope_type: '',
    scope_value: '',
    value: ''
  });
  
  const [showScopeValue, setShowScopeValue] = useState(true);
  
  // Effect to update scope value visibility and requirement based on scope type
  useEffect(() => {
    if (formData.scope_type === 'default') {
      setShowScopeValue(false);
    } else {
      setShowScopeValue(true);
    }
  }, [formData.scope_type]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Special handling for scope_type change
    if (name === 'scope_type' && value === 'default') {
      setFormData(prev => ({
        ...prev,
        scope_value: ''
      }));
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('Submitting config value:', formData);
    
    // Validate form
    if (!formData.config_item_key || !formData.scope_type || !formData.value) {
      console.log('Missing required fields');
      showToast('Please fill out all required fields', 'warning');
      return;
    }
    
    // For default scope type, scope value should be null
    let scope_value = formData.scope_value;
    if (formData.scope_type === 'default') {
      scope_value = null;
    } else if (!scope_value) {
      console.log('Missing scope value for non-default scope type');
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
        config_item_key: formData.config_item_key,
        scope_type: formData.scope_type,
        scope_value: scope_value,
        value: formData.value
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
      setFormData({
        config_item_key: '',
        scope_type: '',
        scope_value: '',
        value: ''
      });
      
      // Refresh data
      fetchConfigValues();
      
      showToast('Configuration value set successfully', 'success');
    })
    .catch(error => {
      showToast(error.message, 'danger');
    });
  };
  
  const handleDelete = (configItemKey, scopeType, scopeValue) => {
    if (confirm('Are you sure you want to delete this configuration value?')) {
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
  };
  
  return (
    <div className="tab-pane fade show active" role="tabpanel">
      <div className="row mt-4">
        <div className="col-md-5">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-sliders me-2"></i>
                Set Configuration Value
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="valueConfigItemKey" className="form-label">Configuration Item</label>
                  <select 
                    className="form-select" 
                    id="valueConfigItemKey" 
                    name="config_item_key"
                    value={formData.config_item_key}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>-- Select a configuration item --</option>
                    {configItems.map(item => (
                      <option key={item.key} value={item.key}>
                        {item.key}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="valueScopeType" className="form-label">Scope Type</label>
                  <select 
                    className="form-select" 
                    id="valueScopeType" 
                    name="scope_type"
                    value={formData.scope_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>-- Select a scope type --</option>
                    {scopeTypes.map(type => (
                      <option key={type.name} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                {showScopeValue && (
                  <div className="mb-3">
                    <label htmlFor="valueScopeValue" className="form-label">Scope Value</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="valueScopeValue" 
                      name="scope_value"
                      value={formData.scope_value}
                      onChange={handleChange}
                      required={formData.scope_type !== 'default'}
                    />
                    <div className="form-text">Value to match against the object's property</div>
                  </div>
                )}
                <div className="mb-3">
                  <label htmlFor="configValueValue" className="form-label">Configuration Value</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="configValueValue" 
                    name="value"
                    value={formData.value}
                    onChange={handleChange}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-save me-1"></i>
                  Set Value
                </button>
              </form>
            </div>
          </div>
        </div>
        
        <div className="col-md-7">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-sliders me-2"></i>
                Configuration Values
              </h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Config Item</th>
                      <th>Scope Type</th>
                      <th>Scope Value</th>
                      <th>Value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configValues.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center">No configuration values defined</td>
                      </tr>
                    ) : (
                      configValues.map((value, index) => (
                        <tr key={index}>
                          <td>{value.config_item_key}</td>
                          <td>{value.scope_type}</td>
                          <td>{value.scope_value || <i>global</i>}</td>
                          <td>{value.value}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(value.config_item_key, value.scope_type, value.scope_value)}
                            >
                              <i className="bi bi-trash"></i> Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigValuesTab;