import React, { useState } from 'react';

const ConfigItemsTab = ({ configItems, fetchConfigItems, fetchConfigValues, showToast }) => {
  const [formData, setFormData] = useState({
    key: '',
    description: '',
    value_type: 'string'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.key || !formData.description || !formData.value_type) {
      showToast('Please fill out all fields', 'warning');
      return;
    }
    
    // Check for duplicate key
    if (configItems.some(item => item.key === formData.key)) {
      showToast('Configuration item with this key already exists', 'warning');
      return;
    }
    
    // Create config item
    fetch('/api/config-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
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
      setFormData({
        key: '',
        description: '',
        value_type: 'string'
      });
      
      // Refresh data
      fetchConfigItems();
      
      showToast('Configuration item created successfully', 'success');
    })
    .catch(error => {
      showToast(error.message, 'danger');
    });
  };

  const handleDelete = (key) => {
    if (confirm(`Are you sure you want to delete the configuration item "${key}"?`)) {
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
  };

  return (
    <div className="tab-pane fade show active" role="tabpanel">
      <div className="row mt-4">
        <div className="col-md-5">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                Create Configuration Item
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="createItemKey" className="form-label">Key</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="createItemKey" 
                    name="key"
                    value={formData.key}
                    onChange={handleChange}
                    required
                  />
                  <div className="form-text">Unique identifier for the configuration item</div>
                </div>
                <div className="mb-3">
                  <label htmlFor="createItemDescription" className="form-label">Description</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="createItemDescription" 
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="createItemValueType" className="form-label">Value Type</label>
                  <select 
                    className="form-select" 
                    id="createItemValueType" 
                    name="value_type"
                    value={formData.value_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="blob">Blob</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-plus-circle me-1"></i>
                  Create Item
                </button>
              </form>
            </div>
          </div>
        </div>
        
        <div className="col-md-7">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-list-ul me-2"></i>
                Configuration Items
              </h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Description</th>
                      <th>Value Type</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configItems.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center">No configuration items defined</td>
                      </tr>
                    ) : (
                      configItems.map(item => (
                        <tr key={item.key}>
                          <td>{item.key}</td>
                          <td>{item.description}</td>
                          <td>{item.value_type}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(item.key)}
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

export default ConfigItemsTab;