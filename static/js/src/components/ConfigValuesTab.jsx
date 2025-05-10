import React, { useState, useEffect } from 'react';

const ConfigValuesTab = ({ configItems, configValues, scopeTypes, fetchConfigValues, showToast }) => {
  // State for editable grid
  const [gridData, setGridData] = useState([]);
  const [editRow, setEditRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [newRow, setNewRow] = useState({
    config_item_key: '',
    scope_type: '',
    scope_value: '',
    value: '',
    isNew: true
  });
  
  // Update grid data when config values change
  useEffect(() => {
    setGridData(configValues);
  }, [configValues]);
  
  // When edit scope type changes to default, clear scope value
  useEffect(() => {
    if (editData.scope_type === 'default') {
      setEditData(prev => ({
        ...prev,
        scope_value: ''
      }));
    }
  }, [editData.scope_type]);
  
  // Start editing a row
  const handleEdit = (index) => {
    setEditRow(index);
    setEditData({ ...gridData[index] });
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditRow(null);
    setEditData({});
  };
  
  // Handle input change for editing
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle input change for new row
  const handleNewRowChange = (e) => {
    const { name, value } = e.target;
    setNewRow(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Special handling for scope_type change to default
    if (name === 'scope_type' && value === 'default') {
      setNewRow(prev => ({
        ...prev,
        scope_value: ''
      }));
    }
  };
  
  // Save edited row
  const handleSaveEdit = () => {
    // Validate form
    if (!editData.config_item_key || !editData.scope_type || !editData.value) {
      showToast('Please fill out all required fields', 'warning');
      return;
    }
    
    // For default scope type, scope value should be null
    let scope_value = editData.scope_value;
    if (editData.scope_type === 'default') {
      scope_value = null;
    } else if (!scope_value) {
      showToast('Scope value is required for non-default scope types', 'warning');
      return;
    }
    
    // Update the config value via API
    fetch('/api/config-values', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config_item_key: editData.config_item_key,
        scope_type: editData.scope_type,
        scope_value: scope_value,
        value: editData.value
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.error || 'Failed to save configuration value');
        });
      }
      return response.json();
    })
    .then(() => {
      // Reset edit state
      setEditRow(null);
      setEditData({});
      
      // Refresh data
      fetchConfigValues();
      
      showToast('Configuration value saved successfully', 'success');
    })
    .catch(error => {
      showToast(error.message, 'danger');
    });
  };
  
  // Save new row
  const handleSaveNewRow = () => {
    // Validate form
    if (!newRow.config_item_key || !newRow.scope_type || !newRow.value) {
      showToast('Please fill out all required fields', 'warning');
      return;
    }
    
    // For default scope type, scope value should be null
    let scope_value = newRow.scope_value;
    if (newRow.scope_type === 'default') {
      scope_value = null;
    } else if (!scope_value) {
      showToast('Scope value is required for non-default scope types', 'warning');
      return;
    }
    
    // Add the config value via API
    fetch('/api/config-values', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config_item_key: newRow.config_item_key,
        scope_type: newRow.scope_type,
        scope_value: scope_value,
        value: newRow.value
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.error || 'Failed to add configuration value');
        });
      }
      return response.json();
    })
    .then(() => {
      // Reset new row form
      setNewRow({
        config_item_key: '',
        scope_type: '',
        scope_value: '',
        value: '',
        isNew: true
      });
      
      // Refresh data
      fetchConfigValues();
      
      showToast('Configuration value added successfully', 'success');
    })
    .catch(error => {
      showToast(error.message, 'danger');
    });
  };
  
  // Delete a config value
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
  
  // Check if scope value field should be shown based on scope type
  const shouldShowScopeValue = (scopeType) => {
    return scopeType !== 'default';
  };
  
  return (
    <div className="tab-pane fade show active" role="tabpanel">
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
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
                    {/* New row form */}
                    <tr className="table-info">
                      <td>
                        <select 
                          className="form-select form-select-sm" 
                          name="config_item_key"
                          value={newRow.config_item_key}
                          onChange={handleNewRowChange}
                        >
                          <option value="" disabled>-- Select --</option>
                          {configItems.map(item => (
                            <option key={item.key} value={item.key}>
                              {item.key}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select 
                          className="form-select form-select-sm" 
                          name="scope_type"
                          value={newRow.scope_type}
                          onChange={handleNewRowChange}
                        >
                          <option value="" disabled>-- Select --</option>
                          {scopeTypes.map(type => (
                            <option key={type.name} value={type.name}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {shouldShowScopeValue(newRow.scope_type) ? (
                          <input 
                            type="text" 
                            className="form-control form-control-sm" 
                            name="scope_value"
                            value={newRow.scope_value}
                            onChange={handleNewRowChange}
                            placeholder="Scope value"
                          />
                        ) : (
                          <i>global</i>
                        )}
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="form-control form-control-sm" 
                          name="value"
                          value={newRow.value}
                          onChange={handleNewRowChange}
                          placeholder="Value"
                        />
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={handleSaveNewRow}
                        >
                          <i className="bi bi-plus-circle"></i> Add
                        </button>
                      </td>
                    </tr>
                    
                    {/* Existing rows */}
                    {gridData.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center">No configuration values defined</td>
                      </tr>
                    ) : (
                      gridData.map((row, index) => (
                        <tr key={index}>
                          {editRow === index ? (
                            <>
                              <td>
                                <select 
                                  className="form-select form-select-sm" 
                                  name="config_item_key"
                                  value={editData.config_item_key}
                                  onChange={handleEditChange}
                                >
                                  {configItems.map(item => (
                                    <option key={item.key} value={item.key}>
                                      {item.key}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <select 
                                  className="form-select form-select-sm" 
                                  name="scope_type"
                                  value={editData.scope_type}
                                  onChange={handleEditChange}
                                >
                                  {scopeTypes.map(type => (
                                    <option key={type.name} value={type.name}>
                                      {type.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                {shouldShowScopeValue(editData.scope_type) ? (
                                  <input 
                                    type="text" 
                                    className="form-control form-control-sm" 
                                    name="scope_value"
                                    value={editData.scope_value || ''}
                                    onChange={handleEditChange}
                                  />
                                ) : (
                                  <i>global</i>
                                )}
                              </td>
                              <td>
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm" 
                                  name="value"
                                  value={editData.value}
                                  onChange={handleEditChange}
                                />
                              </td>
                              <td>
                                <div className="btn-group">
                                  <button 
                                    className="btn btn-sm btn-success"
                                    onClick={handleSaveEdit}
                                  >
                                    <i className="bi bi-save"></i>
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-secondary"
                                    onClick={handleCancelEdit}
                                  >
                                    <i className="bi bi-x-circle"></i>
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>{row.config_item_key}</td>
                              <td>{row.scope_type}</td>
                              <td>{row.scope_value || <i>global</i>}</td>
                              <td>{row.value}</td>
                              <td>
                                <div className="btn-group">
                                  <button 
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleEdit(index)}
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleDelete(row.config_item_key, row.scope_type, row.scope_value)}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
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