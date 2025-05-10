import React from 'react';

const ResolveTab = ({ configItems, scopeTypes, showToast, resolveState, setResolveState }) => {
  // Using parent component's state for persistence between tab switches
  
  // Get the scope types excluding 'default' since it's not applicable as a property
  const propertyTypes = scopeTypes.filter(type => type.name !== 'default');
  
  const handlePropertyChange = (scopeType, value) => {
    setResolveState(prev => ({
      ...prev,
      propertyValues: {
        ...prev.propertyValues,
        [scopeType]: value
      }
    }));
  };
  
  const handleReset = () => {
    if (confirm('Are you sure you want to reset all configuration values and results?')) {
      setResolveState({
        configItemKey: '',
        propertyValues: {},
        result: null
      });
      showToast('Configuration reset successfully', 'info');
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!resolveState.configItemKey) {
      showToast('Please select a configuration item', 'warning');
      return;
    }
    
    // Filter out empty property values
    const propertiesObj = {};
    Object.entries(resolveState.propertyValues).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        propertiesObj[key] = value;
      }
    });
    
    if (Object.keys(propertiesObj).length === 0) {
      showToast('Please fill in at least one property field', 'warning');
      return;
    }
    
    // Resolve config value
    fetch('/api/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config_item_key: resolveState.configItemKey,
        properties: propertiesObj
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
      setResolveState(prev => ({
        ...prev,
        result: data.value
      }));
    })
    .catch(error => {
      showToast(error.message, 'danger');
      setResolveState(prev => ({
        ...prev,
        result: null
      }));
    });
  };
  
  return (
    <div className="tab-pane fade show active" role="tabpanel">
      <div className="row mt-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-check2-circle me-2"></i>
                Resolve Configuration Value
              </h5>
              <button 
                type="button" 
                className="btn btn-sm btn-outline-danger"
                onClick={handleReset}
              >
                <i className="bi bi-trash me-1"></i>
                Reset
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="resolveConfigItemKey" className="form-label">Configuration Item</label>
                  <select 
                    className="form-select" 
                    id="resolveConfigItemKey" 
                    value={resolveState.configItemKey}
                    onChange={(e) => setResolveState(prev => ({...prev, configItemKey: e.target.value}))}
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
                  <label className="form-label">Object Properties</label>
                  <div className="card mb-3">
                    <div className="card-body bg-light">
                      <p className="small text-muted mb-2">Fill in the values for the properties you want to include in the resolution. Leave blank to exclude.</p>
                      {propertyTypes.map(type => (
                        <div className="mb-3" key={type.name}>
                          <label className="form-label">{type.name}</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={`Enter ${type.name} value...`}
                            value={resolveState.propertyValues[type.name] || ''}
                            onChange={(e) => handlePropertyChange(type.name, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-search me-1"></i>
                  Resolve
                </button>
              </form>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          {resolveState.result !== null && (
            <div className="card">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">
                  <i className="bi bi-check2-circle me-2"></i>
                  Resolution Result
                </h5>
              </div>
              <div className="card-body">
                <h4 className="text-center">Resolved Value:</h4>
                <div className="alert alert-success text-center">
                  <span className="fs-4">{resolveState.result}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className={`card ${resolveState.result !== null ? 'mt-3' : ''}`}>
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Configuration Resolution Help
              </h5>
            </div>
            <div className="card-body">
              <p>
                The system resolves configuration values based on the scope hierarchy, 
                from most local to most global:
              </p>
              <ol>
                <li><strong>Account</strong></li>
                <li><strong>Model</strong></li>
                <li><strong>Model Family</strong></li>
                <li><strong>Model Provider</strong></li>
                <li><strong>Default</strong></li>
              </ol>
              <p>
                Add properties to describe your object, and the system will find the most 
                appropriate configuration value based on these properties.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResolveTab;