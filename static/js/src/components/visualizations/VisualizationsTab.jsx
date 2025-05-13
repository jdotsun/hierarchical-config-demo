import React, { useState, useEffect } from 'react';
import HierarchyTree from './HierarchyTree';
import ComparisonChart from './ComparisonChart';
import HeatmapView from './HeatmapView';
import ImpactAnalysis from './ImpactAnalysis';

const VisualizationsTab = () => {
  const [configItems, setConfigItems] = useState([]);
  const [selectedConfigItem, setSelectedConfigItem] = useState('');
  const [visualizationType, setVisualizationType] = useState('hierarchy');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch all config items
    fetchConfigItems();
  }, []);

  const fetchConfigItems = async () => {
    try {
      const response = await fetch('/api/config-items');
      if (!response.ok) {
        throw new Error('Failed to fetch config items');
      }
      const data = await response.json();
      setConfigItems(data);
      if (data.length > 0) {
        setSelectedConfigItem(data[0].key);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const renderVisualization = () => {
    switch (visualizationType) {
      case 'hierarchy':
        return <HierarchyTree />;
      case 'comparison':
        return <ComparisonChart configItemKey={selectedConfigItem} />;
      case 'heatmap':
        return <HeatmapView />;
      case 'impact':
        return <ImpactAnalysis configItemKey={selectedConfigItem} />;
      default:
        return <div>Select a visualization type</div>;
    }
  };

  return (
    <div className="row mt-4">
      <div className="col-12">
        <div className="card">
          <div className="card-header bg-primary text-white">
            <h3 className="mb-0">
              <i className="bi bi-graph-up me-2"></i>
              Configuration Visualizations
            </h3>
          </div>
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="visualizationType" className="form-label">Visualization Type</label>
                  <select
                    id="visualizationType"
                    className="form-select"
                    value={visualizationType}
                    onChange={(e) => setVisualizationType(e.target.value)}
                  >
                    <option value="hierarchy">Hierarchy Tree</option>
                    <option value="comparison">Comparison Chart</option>
                    <option value="heatmap">Heatmap View</option>
                    <option value="impact">Impact Analysis</option>
                  </select>
                </div>
              </div>
              {(visualizationType === 'comparison' || visualizationType === 'impact') && (
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="configItem" className="form-label">Config Item</label>
                    <select
                      id="configItem"
                      className="form-select"
                      value={selectedConfigItem}
                      onChange={(e) => setSelectedConfigItem(e.target.value)}
                    >
                      {configItems.map(item => (
                        <option key={item.key} value={item.key}>{item.key}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <div className="visualization-container mt-4">
              {loading ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                renderVisualization()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizationsTab;