import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const HeatmapView = () => {
  const svgRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  useEffect(() => {
    if (data) {
      renderHeatmap();
    }
  }, [data]);

  const fetchHeatmapData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/visualization/heatmap');
      if (!response.ok) {
        throw new Error('Failed to fetch heatmap data');
      }
      const data = await response.json();
      setData(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const renderHeatmap = () => {
    if (!svgRef.current || !data) return;

    // Clear the SVG
    d3.select(svgRef.current).selectAll("*").remove();

    // Process the data for visualization
    // We'll create a flattened array of cells for the heatmap
    const cells = [];
    
    data.config_items.forEach((config_item, rowIndex) => {
      data.scope_types.forEach((scope_type) => {
        // Get values for this scope type
        const scopeValues = data.scope_values[scope_type] || [];
        if (scopeValues.length === 0) {
          // Add a single cell for a scope type with no specific values (like 'default')
          const value = config_item.values[scope_type] && config_item.values[scope_type]['global'];
          cells.push({
            config_item: config_item.key,
            config_item_index: rowIndex,
            scope_type: scope_type,
            scope_value: 'global',
            scope_value_index: 0,
            value: value !== undefined ? value : null
          });
        } else {
          // Add cells for each scope value
          scopeValues.forEach((scope_value, colIndex) => {
            const value = config_item.values[scope_type] && config_item.values[scope_type][scope_value];
            cells.push({
              config_item: config_item.key,
              config_item_index: rowIndex,
              scope_type: scope_type,
              scope_value: scope_value,
              scope_value_index: colIndex,
              value: value !== undefined ? value : null
            });
          });
        }
      });
    });

    // Set up dimensions
    const margin = { top: 50, right: 50, bottom: 100, left: 150 };
    const width = Math.max(600, 150 + cells.length * 30); // Ensure minimum width
    const height = 600;
    const cellSize = 30;

    // Create the SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create a scale for colors
    // We need to determine min and max values for color scaling
    const values = cells.map(d => d.value).filter(d => d !== null);
    const min = d3.min(values);
    const max = d3.max(values);
    
    // Create color scale based on value type
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([min, max]);

    // Group by config item and scope type
    const groups = d3.group(cells, d => d.config_item, d => d.scope_type);

    // Create x and y scales
    const configItems = data.config_items.map(d => d.key);
    const scopeTypes = data.scope_types;

    const y = d3.scaleBand()
      .domain(configItems)
      .range([0, configItems.length * cellSize])
      .padding(0.1);

    // Define the base positions for each scope type
    let xStart = 0;
    const scopeTypePositions = {};
    
    scopeTypes.forEach(scopeType => {
      const values = data.scope_values[scopeType] || ['global'];
      scopeTypePositions[scopeType] = {
        start: xStart,
        end: xStart + values.length * cellSize
      };
      xStart += values.length * cellSize + 20; // Add gap between scope types
    });

    // Add cells to the heatmap
    svg.selectAll(".heatmap-cell")
      .data(cells)
      .enter()
      .append("rect")
      .attr("class", "heatmap-cell")
      .attr("x", d => {
        const typePosition = scopeTypePositions[d.scope_type].start;
        const scopeValues = data.scope_values[d.scope_type] || ['global'];
        const scopeValueIndex = scopeValues.indexOf(d.scope_value);
        return typePosition + (scopeValueIndex >= 0 ? scopeValueIndex : 0) * cellSize;
      })
      .attr("y", d => y(d.config_item))
      .attr("width", cellSize)
      .attr("height", y.bandwidth())
      .attr("fill", d => d.value !== null ? colorScale(d.value) : "#ccc")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .append("title")
      .text(d => `${d.config_item} (${d.scope_type}/${d.scope_value}): ${d.value !== null ? d.value : 'No value'}`);

    // Add y axis for config items
    svg.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "white");

    // Add labels for scope types
    Object.entries(scopeTypePositions).forEach(([scopeType, position]) => {
      const midpoint = position.start + (position.end - position.start) / 2;
      
      svg.append("text")
        .attr("x", midpoint)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "white")
        .style("font-weight", "bold")
        .text(scopeType);
      
      // Add labels for scope values
      const scopeValues = data.scope_values[scopeType] || ['global'];
      scopeValues.forEach((value, i) => {
        svg.append("text")
          .attr("x", position.start + i * cellSize + cellSize / 2)
          .attr("y", -5)
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", "white")
          .text(value);
      });
    });

    // Add a color legend
    const legendWidth = 200;
    const legendHeight = 20;
    
    const legendX = d3.scaleLinear()
      .domain([min, max])
      .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendX)
      .ticks(5)
      .tickFormat(d3.format(max > 1000 ? ",.0f" : ".2f"));
    
    const legendGroup = svg.append("g")
      .attr("transform", `translate(0, ${configItems.length * cellSize + 40})`);
    
    const defs = svg.append("defs");
    
    const linearGradient = defs.append("linearGradient")
      .attr("id", "heatmap-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");
    
    linearGradient.selectAll("stop")
      .data(d3.range(0, 1.01, 0.1))
      .enter()
      .append("stop")
      .attr("offset", d => d * 100 + "%")
      .attr("stop-color", d => colorScale(min + d * (max - min)));
    
    legendGroup.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#heatmap-gradient)");
    
    legendGroup.append("g")
      .call(legendAxis)
      .selectAll("text")
      .style("fill", "white");
    
    legendGroup.append("text")
      .attr("x", legendWidth / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .text("Value Range");
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
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
    <div className="heatmap-container">
      <div className="card">
        <div className="card-header bg-warning text-dark">
          <h5 className="mb-0">Configuration Value Heatmap</h5>
        </div>
        <div className="card-body">
          <div className="svg-container" style={{ overflow: 'auto' }}>
            <svg ref={svgRef} style={{ minWidth: '100%' }}></svg>
          </div>
          <div className="mt-3">
            <p className="text-muted">
              This heatmap visualizes all configuration values across different config items and scopes.
              Darker colors represent higher values. Empty cells indicate no configuration value is set.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapView;