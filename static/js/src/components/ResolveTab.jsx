import React, { useState } from 'react';

const ResolveTab = ({ configItems, scopeTypes, showToast }) => {
  const [configItemKey, setConfigItemKey] = useState('');
  const [properties, setProperties] = useState([]);
  const [result, setResult] = useState(null);
  
  const handleAddProperty = () => {
    // Filter out 'default' scope type since it's not applicable for properties
    const filteredScopeTypes = scopeTypes.filter(type => type.name !== 'default');
    
    if (filteredScopeTypes.length > 0) {
      setProperties([...properties, {
        key: filteredScopeTypes[0].name,
        value: ''
      }]);
    }
  };
  
  const handlePropertyChange = (index, field, value) => {
    const updatedProperties = [...properties];
    updatedProperties[index][field] = value;
    setProperties(updatedProperties);
  };
  
  const handleRemoveProperty = (index) => {
    const updatedProperties = [...properties];
    updatedProperties.splice(index, 1);
    setProperties(updatedProperties);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!configItemKey) {
      showToast('Please select a configuration item', 'warning');
      return;
    }
    
    if (properties.length === 0) {
      showToast('Please add at least one property', 'warning');
      return;
    }
    
    // Convert properties array to object for API
    const propertiesObj = {};
    properties.forEach(prop => {
      if (prop.key && prop.value) {
        propertiesObj[prop.key] = prop.value;
      }
    });
    
    if (Object.keys(propertiesObj).length === 0) {
      showToast('Please fill in all property fields', 'warning');
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
      setResult(data.value);
    })
    .catch(error => {
      showToast(error.message, 'danger');
      setResult(null);
    });
  };
  
  return (
    <div className="tab-pane fade show active" role="tabpanel">
      <div className="row mt-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-check2-circle me-2"></i>
                Resolve Configuration Value
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="resolveConfigItemKey" className="form-label">Configuration Item</label>
                  <select 
                    className="form-select" 
                    id="resolveConfigItemKey" 
                    value={configItemKey}
                    onChange={(e) => setConfigItemKey(e.target.value)}
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
                  <div id="propertiesContainer">
                    {properties.map((prop, index) => (
                      <div className="row property-row mb-2" key={index}>
                        <div className="col-5">
                          <select
                            className="form-select"
                            value={prop.key}
                            onChange={(e) => handlePropertyChange(index, 'key', e.target.value)}
                          >
                            {scopeTypes.filter(type => type.name !== 'default').map(type => (
                              <option key={type.name} value={type.name}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-5">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Value"
                            value={prop.value}
                            onChange={(e) => handlePropertyChange(index, 'value', e.target.value)}
                          />
                        </div>
                        <div className="col-2">
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => handleRemoveProperty(index)}
                          >
                            <i className="bi bi-dash-circle"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary mt-2"
                    onClick={handleAddProperty}
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    Add Property
                  </button>
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
          {result !== null && (
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
                  <span className="fs-4">{result}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className={`card ${result !== null ? 'mt-3' : ''}`}>
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