import React, { useState, useEffect } from 'react';
import { CascadeView } from './';

const VisualizationsTab = () => {
  const [configItems, setConfigItems] = useState([]);
  const [selectedConfigItem, setSelectedConfigItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConfigItems();
  }, []);

  const fetchConfigItems = async () => {
    try {
      const response = await fetch('/api/config-items');
      if (!response.ok) {
        throw new Error('Failed to fetch config items');
      }
      const data = await response.json();
      console.log('Fetched config items:', data);
      setConfigItems(data);
      if (data.length > 0) {
        setSelectedConfigItem(data[0].key);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching config items:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading configuration data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4" role="alert">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="row mt-4">
      <div className="col-12">
        <div className="card">
          <div className="card-header bg-primary text-white">
            <h3 className="mb-0">
              <i className="bi bi-graph-up me-2"></i>
              Configuration Visualization
            </h3>
          </div>
          <div className="card-body">
            <p className="lead">
              This visualization shows how configuration values cascade through the scope hierarchy,
              from global defaults to specific local overrides.
            </p>
            
            <div className="form-group mb-4">
              <label htmlFor="configItemSelect" className="form-label">Select Configuration Item</label>
              <select 
                id="configItemSelect" 
                className="form-select" 
                value={selectedConfigItem}
                onChange={(e) => setSelectedConfigItem(e.target.value)}
              >
                {configItems.map(item => (
                  <option key={item.key} value={item.key}>
                    {item.key} - {item.description}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="card mb-4">
              <div className="card-header bg-info">
                <h5 className="mb-0">Configuration Cascade View</h5>
              </div>
              <div className="card-body">
                {selectedConfigItem && (
                  <CascadeView configItemKey={selectedConfigItem} />
                )}
                <p className="text-muted mt-3">
                  This visualization shows how configuration values cascade from global (top) to local (bottom) scopes.
                  Values for more local scopes override those from more global scopes during resolution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizationsTab;