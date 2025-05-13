import React, { useState, useEffect } from 'react';
import ConfigItemsTab from './ConfigItemsTab';
import ConfigValuesTab from './ConfigValuesTab';
import ResolveTab from './ResolveTab';
import { VisualizationsTab } from './visualizations';

const App = () => {
  const [activeTab, setActiveTab] = useState('items');
  const [configItems, setConfigItems] = useState([]);
  const [configValues, setConfigValues] = useState([]);
  const [scopeTypes, setScopeTypes] = useState([]);
  
  // State for persistent resolve configuration
  const [resolveState, setResolveState] = useState({
    configItemKey: '',
    propertyValues: {},  // Changed to an object with scope type as key
    result: null
  });
  
  // Fetch initial data
  useEffect(() => {
    fetchScopeTypes();
    fetchConfigItems();
    fetchConfigValues();
  }, []);
  
  // Fetch all scope types
  const fetchScopeTypes = () => {
    fetch('/api/scope-types')
      .then(response => response.json())
      .then(data => {
        setScopeTypes(data);
      })
      .catch(error => showToast('Error fetching scope types: ' + error, 'danger'));
  };
  
  // Fetch all config items
  const fetchConfigItems = () => {
    fetch('/api/config-items')
      .then(response => response.json())
      .then(data => {
        setConfigItems(data);
      })
      .catch(error => showToast('Error fetching config items: ' + error, 'danger'));
  };
  
  // Fetch all config values
  const fetchConfigValues = () => {
    fetch('/api/config-values')
      .then(response => response.json())
      .then(data => {
        setConfigValues(data);
      })
      .catch(error => showToast('Error fetching config values: ' + error, 'danger'));
  };
  
  // Show a toast notification (we'll use bootstrap's toast)
  const showToast = (message, type = 'info') => {
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
  };
  
  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h3 className="mb-0">
                <i className="bi bi-gear-wide-connected me-2"></i>
                Configuration Management System
              </h3>
            </div>
            <div className="card-body">
              <p className="lead">
                This system allows you to manage configuration values across different scopes, 
                from most local (specific) to most global (general).
              </p>
              
              <p>
                <strong>Scope Hierarchy (most local to most global):</strong>
                <span className="badge bg-info me-1">account</span>
                <span className="badge bg-info me-1">model</span>
                <span className="badge bg-info me-1">model family</span>
                <span className="badge bg-info me-1">model provider</span>
                <span className="badge bg-info">default</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          {/* Nav tabs */}
          <ul className="nav nav-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'items' ? 'active' : ''}`} 
                onClick={() => setActiveTab('items')}
                type="button"
              >
                <i className="bi bi-list-ul me-1"></i>
                Configuration Items
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'values' ? 'active' : ''}`}
                onClick={() => setActiveTab('values')}
                type="button"
              >
                <i className="bi bi-sliders me-1"></i>
                Configuration Values
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'resolve' ? 'active' : ''}`}
                onClick={() => setActiveTab('resolve')}
                type="button"
              >
                <i className="bi bi-check2-circle me-1"></i>
                Resolve Configuration
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'visualizations' ? 'active' : ''}`}
                onClick={() => setActiveTab('visualizations')}
                type="button"
              >
                <i className="bi bi-graph-up me-1"></i>
                Visualizations
              </button>
            </li>
          </ul>
          
          {/* Tab content */}
          <div className="tab-content">
            {activeTab === 'items' && (
              <ConfigItemsTab 
                configItems={configItems} 
                fetchConfigItems={fetchConfigItems}
                fetchConfigValues={fetchConfigValues}
                showToast={showToast}
              />
            )}
            
            {activeTab === 'values' && (
              <ConfigValuesTab 
                configItems={configItems} 
                configValues={configValues}
                scopeTypes={scopeTypes}
                fetchConfigValues={fetchConfigValues}
                showToast={showToast}
              />
            )}
            
            {activeTab === 'resolve' && (
              <ResolveTab 
                configItems={configItems}
                scopeTypes={scopeTypes}
                showToast={showToast}
                resolveState={resolveState}
                setResolveState={setResolveState}
              />
            )}
            
            {activeTab === 'visualizations' && (
              <VisualizationsTab />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;