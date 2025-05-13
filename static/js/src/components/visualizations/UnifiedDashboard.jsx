import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';
import Chart from 'chart.js/auto';

const UnifiedDashboard = () => {
  const [configItems, setConfigItems] = useState([]);
  const [selectedConfigItem, setSelectedConfigItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // References for the visualization components
  const cascadeTreeRef = React.useRef(null);
  const valueDistributionRef = React.useRef(null);
  const chartInstance = React.useRef(null);

  useEffect(() => {
    fetchConfigItems();
  }, []);

  useEffect(() => {
    if (selectedConfigItem) {
      fetchCascadeData();
    }
  }, [selectedConfigItem]);

  const fetchConfigItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/config-items');
      if (!response.ok) {
        throw new Error('Failed to fetch config items');
      }
      const data = await response.json();
      setConfigItems(data);
      if (data.length > 0) {
        setSelectedConfigItem(data[0].key);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchCascadeData = async () => {
    try {
      setLoading(true);
      console.log("Fetching cascade data for config item:", selectedConfigItem);
      
      // Fetch comparison data for charts
      const comparisonResponse = await fetch(`/api/visualization/comparison?config_item_key=${encodeURIComponent(selectedConfigItem)}`);
      if (!comparisonResponse.ok) {
        throw new Error('Failed to fetch comparison data');
      }
      const comparisonData = await comparisonResponse.json();
      console.log("Received comparison data:", comparisonData);
      
      // Render visualizations
      console.log("Rendering cascade tree visualization");
      renderCascadeTree(comparisonData);
      console.log("Rendering value distribution visualization");
      renderValueDistribution(comparisonData);
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching or rendering data:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const renderCascadeTree = (data) => {
    if (!cascadeTreeRef.current || !data) return;

    // Clear the SVG
    d3.select(cascadeTreeRef.current).selectAll("*").remove();

    // Set dimensions for the visualization
    const containerWidth = cascadeTreeRef.current.parentElement.offsetWidth;
    const width = Math.min(containerWidth, 900);  // Responsive but with max width
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 30, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create the SVG
    const svg = d3.select(cascadeTreeRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepare data for the cascade visualization
    // We want to show how values cascade from global to local scopes
    const scopeTypes = data.scope_types.sort((a, b) => b.priority - a.priority); // Sort from global to local
    
    // Determine the y-scale based on scope types
    const yScale = d3.scaleBand()
      .domain(scopeTypes.map(st => st.name))
      .range([0, innerHeight])
      .padding(0.2);

    // Create a continuous x-scale for values
    // Find min and max values across all scopes for this config item
    let allValues = [];
    scopeTypes.forEach(st => {
      st.values.forEach(v => {
        allValues.push(v.value);
      });
    });
    
    const valueExtent = d3.extent(allValues);
    const padding = (valueExtent[1] - valueExtent[0]) * 0.1; // Add 10% padding
    
    const xScale = d3.scaleLinear()
      .domain([valueExtent[0] - padding, valueExtent[1] + padding])
      .range([0, innerWidth]);

    // Add axes
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .append("text")
      .attr("fill", "white")
      .attr("x", innerWidth / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .text("Value");

    svg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("fill", "white");

    // Add a title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .style("font-weight", "bold")
      .text(`Configuration Cascade: ${data.config_item.key}`);

    // Add value bars for each scope type
    scopeTypes.forEach(scopeType => {
      const scopeValues = scopeType.values;
      
      // Add value markers
      const valueGroup = svg.append("g")
        .attr("class", "value-group")
        .attr("transform", `translate(0,${yScale(scopeType.name) + yScale.bandwidth() / 2})`);
      
      // Add lines connecting values
      if (scopeValues.length > 0) {
        const lineXStart = xScale(d3.min(scopeValues, d => d.value));
        const lineXEnd = xScale(d3.max(scopeValues, d => d.value));
        
        valueGroup.append("line")
          .attr("x1", lineXStart)
          .attr("x2", lineXEnd)
          .attr("y1", 0)
          .attr("y2", 0)
          .attr("stroke", "rgba(255, 255, 255, 0.3)")
          .attr("stroke-width", 2);
      }
      
      // Add circles for each value
      valueGroup.selectAll("circle")
        .data(scopeValues)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.value))
        .attr("cy", 0)
        .attr("r", 6)
        .attr("fill", d => {
          // Calculate color based on scope priority - local scopes are more saturated
          const intensity = 1 - ((scopeType.priority - 10) / 40); // Normalize to 0-1 range
          return d3.interpolateYlOrRd(intensity);
        })
        .attr("stroke", "white")
        .attr("stroke-width", 1);
      
      // Add labels for scope values
      valueGroup.selectAll("text")
        .data(scopeValues)
        .enter()
        .append("text")
        .attr("x", d => xScale(d.value))
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "10px")
        .text(d => d.scope_value === "global" ? "Default" : d.scope_value);
    });

    // Add cascade arrows to show the resolution order
    svg.selectAll(".cascade-arrow")
      .data(d3.pairs(scopeTypes))
      .enter()
      .append("path")
      .attr("class", "cascade-arrow")
      .attr("d", d => {
        const y1 = yScale(d[0].name) + yScale.bandwidth() / 2;
        const y2 = yScale(d[1].name) + yScale.bandwidth() / 2;
        return `M ${-30} ${y1} L ${-20} ${(y1 + y2) / 2} L ${-30} ${y2}`;
      })
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 255, 0.5)")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)");
    
    // Add an arrowhead marker definition
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 5)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "rgba(255, 255, 255, 0.5)");
  };

  const renderValueDistribution = (data) => {
    if (!valueDistributionRef.current || !data) return;

    // Clean up existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Get the context
    const ctx = valueDistributionRef.current.getContext('2d');
    
    // Prepare the data for Chart.js
    const scopeTypes = data.scope_types.sort((a, b) => a.priority - b.priority); // Sort from local to global
    
    // Collect all unique scope values across all scope types
    const allScopeValues = new Set();
    scopeTypes.forEach(st => {
      st.values.forEach(v => {
        allScopeValues.add(v.scope_value);
      });
    });
    
    // Convert to array and sort
    const scopeValues = Array.from(allScopeValues).filter(Boolean).sort();
    
    // Create datasets
    const datasets = scopeTypes.map((st, index) => {
      // Create a map of scope_value -> value for this scope type
      const valueMap = {};
      st.values.forEach(v => {
        valueMap[v.scope_value] = v.value;
      });
      
      // Choose colors - use same color scheme as cascade view
      const intensity = 1 - ((st.priority - 10) / 40); // Normalize to 0-1 range
      const color = d3.interpolateYlOrRd(intensity);
      
      return {
        label: st.name,
        data: scopeValues.map(sv => valueMap[sv] || null),
        backgroundColor: color,
        borderColor: d3.rgb(color).darker(0.2).formatHex(),
        borderWidth: 1
      };
    });
    
    // Create a separate dataset for the default values (where scope_value is null)
    const defaultValues = scopeTypes.map(st => {
      const defaultValue = st.values.find(v => !v.scope_value);
      return defaultValue ? defaultValue.value : null;
    });
    
    if (defaultValues.some(v => v !== null)) {
      datasets.push({
        label: 'Default Values',
        data: Array(scopeValues.length).fill(null).concat(defaultValues.filter(v => v !== null)),
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderColor: 'rgba(255, 255, 255, 0.8)',
        borderWidth: 1,
        borderDash: [5, 5]
      });
      
      // Add a "Default" category to the labels
      scopeValues.push('Default');
    }

    // Create the chart
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: scopeValues,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Scope Values',
              color: 'white'
            },
            ticks: {
              color: 'white'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          y: {
            title: {
              display: true,
              text: `${data.config_item.key} Value`,
              color: 'white'
            },
            ticks: {
              color: 'white'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: `Value Distribution: ${data.config_item.key}`,
            color: 'white',
            font: {
              size: 16
            }
          },
          legend: {
            labels: {
              color: 'white'
            }
          },
          tooltip: {
            callbacks: {
              title: function(tooltipItems) {
                return `Scope Value: ${tooltipItems[0].label}`;
              },
              label: function(context) {
                return `${context.dataset.label}: ${context.raw}`;
              }
            }
          }
        }
      }
    });
  };

  if (loading && !selectedConfigItem) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading configuration items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="unified-dashboard mt-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">Configuration Visualization Dashboard</h4>
            </div>
            <div className="card-body">
              <p className="lead">
                This dashboard visualizes how configuration values cascade through 
                different scope levels, from global defaults to specific local overrides.
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
              
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading visualization data...</p>
                </div>
              ) : (
                <div className="row">
                  {/* Cascade Tree Visualization */}
                  <div className="col-12 mb-4">
                    <div className="card">
                      <div className="card-header bg-info">
                        <h5 className="mb-0">Configuration Cascade View</h5>
                      </div>
                      <div className="card-body">
                        <div className="visualization-container" style={{ minHeight: "400px", width: "100%" }}>
                          <svg ref={cascadeTreeRef} width="100%" height="400" style={{ display: "block", margin: "0 auto" }}></svg>
                        </div>
                        <p className="text-muted mt-2">
                          This visualization shows how configuration values cascade from global (top) to local (bottom) scopes.
                          Values for more local scopes override those from more global scopes during resolution.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Value Distribution Visualization */}
                  <div className="col-12">
                    <div className="card">
                      <div className="card-header bg-success">
                        <h5 className="mb-0">Value Distribution</h5>
                      </div>
                      <div className="card-body">
                        <div className="chart-container" style={{ height: '400px' }}>
                          <canvas ref={valueDistributionRef}></canvas>
                        </div>
                        <p className="text-muted mt-2">
                          This chart shows the distribution of configuration values across different scope values and scope types.
                          Groups of bars represent different scope values, while colors represent different scope types.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedDashboard;