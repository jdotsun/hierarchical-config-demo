import React, { useState, useEffect } from 'react';
import { CascadeView } from './';

// Configuration profile types for comparison
const PROFILE_TYPES = {
  COMPLEX: 'complex',
  SIMPLE: 'simple',
  ALL_DEFAULT: 'all_default'
};

// Helper function to get profile description
const getProfileDescription = (profileType) => {
  switch (profileType) {
    case PROFILE_TYPES.COMPLEX:
      return "Complex - Many overrides at different scope levels";
    case PROFILE_TYPES.SIMPLE:
      return "Simple - Few overrides, mostly defaults";
    case PROFILE_TYPES.ALL_DEFAULT:
      return "Defaults Only - Only global default values";
    default:
      return "";
  }
};

const VisualizationsTab = () => {
  const [configItems, setConfigItems] = useState([]);
  const [selectedConfigItem1, setSelectedConfigItem1] = useState('');
  const [selectedConfigItem2, setSelectedConfigItem2] = useState('');
  const [sideComparisonEnabled, setSideComparisonEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Define profile selections
  const [leftProfile, setLeftProfile] = useState(PROFILE_TYPES.COMPLEX);
  const [rightProfile, setRightProfile] = useState(PROFILE_TYPES.SIMPLE);

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
        // Set initial selections to different items if possible
        setSelectedConfigItem1(data[0].key);
        setSelectedConfigItem2(data.length > 1 ? data[1].key : data[0].key);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching config items:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  // Helper to get the most complex config item
  const getMostComplexItem = () => {
    // For now, we'll use a heuristic - if we have 'risk_tolerance', use that as it typically has many values
    const riskItem = configItems.find(item => item.key === 'risk_tolerance');
    return riskItem ? riskItem.key : (configItems.length > 0 ? configItems[0].key : '');
  };

  // Helper to get a simple config item
  const getSimpleItem = () => {
    // For now, we'll use 'market_hours_only' as it typically has fewer values
    const simpleItem = configItems.find(item => item.key === 'market_hours_only');
    return simpleItem ? simpleItem.key : (configItems.length > 0 ? configItems[0].key : '');
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
              from global defaults to specific local overrides. You can compare different configuration items side by side.
            </p>
            
            <div className="form-check form-switch mb-3">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="flexSwitchCheckDefault" 
                checked={sideComparisonEnabled}
                onChange={() => setSideComparisonEnabled(!sideComparisonEnabled)}
              />
              <label className="form-check-label" htmlFor="flexSwitchCheckDefault">
                Enable side-by-side comparison
              </label>
            </div>
            
            <div className="row mb-4">
              <div className={sideComparisonEnabled ? "col-md-6" : "col-md-12"}>
                <div className="card h-100">
                  <div className="card-header bg-info text-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Configuration View {sideComparisonEnabled ? "1" : ""}</h5>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="form-group mb-3">
                      <label htmlFor="configItemSelect1" className="form-label">Select Configuration Item</label>
                      <select 
                        id="configItemSelect1" 
                        className="form-select" 
                        value={selectedConfigItem1}
                        onChange={(e) => setSelectedConfigItem1(e.target.value)}
                      >
                        {configItems.map(item => (
                          <option key={item.key} value={item.key}>
                            {item.key} - {item.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {selectedConfigItem1 && (
                      <div className="cascade-container" style={{ minHeight: "400px" }}>
                        <CascadeView configItemKey={selectedConfigItem1} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {sideComparisonEnabled && (
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-header bg-info text-white">
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Configuration View 2</h5>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="form-group mb-3">
                        <label htmlFor="configItemSelect2" className="form-label">Select Configuration Item</label>
                        <select 
                          id="configItemSelect2" 
                          className="form-select" 
                          value={selectedConfigItem2}
                          onChange={(e) => setSelectedConfigItem2(e.target.value)}
                        >
                          {configItems.map(item => (
                            <option key={item.key} value={item.key}>
                              {item.key} - {item.description}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {selectedConfigItem2 && (
                        <div className="cascade-container" style={{ minHeight: "400px" }}>
                          <CascadeView configItemKey={selectedConfigItem2} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="alert alert-info">
              <h5>Understanding the Visualization</h5>
              <p>This visualization shows how configuration values cascade from global (top) to local (bottom) scopes.</p>
              <ul>
                <li>Each row represents a scope type (account, model, model family, etc.)</li>
                <li>Colors indicate scope priority: red = more local (higher priority), yellow = more global (lower priority)</li>
                <li>During resolution, values from more local scopes (top) override values from more global scopes (bottom)</li>
              </ul>
              <p>By comparing different configuration items side by side, you can see patterns in how configurations cascade differently based on their complexity and structure.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizationsTab;