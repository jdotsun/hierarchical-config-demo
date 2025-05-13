import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const ImpactAnalysis = ({ configItemKey }) => {
  const svgRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (configItemKey) {
      fetchImpactData();
    }
  }, [configItemKey]);

  useEffect(() => {
    if (data) {
      renderImpactAnalysis();
    }
  }, [data]);

  const fetchImpactData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/visualization/impact?config_item_key=${encodeURIComponent(configItemKey)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch impact data');
      }
      const data = await response.json();
      setData(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const renderImpactAnalysis = () => {
    if (!svgRef.current || !data) return;

    // Clear the SVG
    d3.select(svgRef.current).selectAll("*").remove();

    // Set up dimensions
    const margin = { top: 20, right: 120, bottom: 50, left: 120 };
    const width = 800;
    const height = 500;

    // Create the SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create a hierarchical structure for the impact data
    const root = {
      name: data.config_item.key,
      description: data.config_item.description,
      value_type: data.config_item.value_type,
      children: []
    };

    // Group by scope type
    const scopeTypeGroups = d3.group(data.impact, d => d.scope_type);
    
    // Add scope type nodes
    for (const [scopeType, values] of scopeTypeGroups) {
      const scopeNode = {
        name: scopeType,
        children: []
      };
      
      // Add scope value nodes
      for (const value of values) {
        const scopeValueNode = {
          name: value.scope_value || "global",
          value: value.value,
          affected_objects: value.affected_objects || []
        };
        
        scopeNode.children.push(scopeValueNode);
      }
      
      root.children.push(scopeNode);
    }

    // Create the hierarchy
    const hierarchy = d3.hierarchy(root);
    
    // Create the tree layout
    const treeLayout = d3.tree()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    
    treeLayout(hierarchy);

    // Add links
    svg.selectAll(".link")
      .data(hierarchy.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x))
      .attr("fill", "none")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1.5);

    // Add nodes
    const node = svg.selectAll(".node")
      .data(hierarchy.descendants())
      .enter()
      .append("g")
      .attr("class", d => `node ${d.children ? "node--internal" : "node--leaf"}`)
      .attr("transform", d => `translate(${d.y},${d.x})`);

    // Add circles to nodes
    node.append("circle")
      .attr("r", d => d.depth === 2 ? 8 : 6)  // Make leaf nodes slightly larger
      .attr("fill", d => {
        if (d.depth === 0) return "#2c3e50";  // Root (config item)
        if (d.depth === 1) return "#3498db";  // Scope type
        return "#e74c3c";                     // Scope value
      })
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5);

    // Add labels to nodes
    node.append("text")
      .attr("dy", ".31em")
      .attr("x", d => d.children ? -8 : 8)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .text(d => {
        if (d.depth === 0) return d.data.name;
        if (d.depth === 1) return d.data.name;
        return `${d.data.name} (${d.data.value})`;
      })
      .style("font-size", "12px")
      .style("fill", "white");

    // Add title text for more info on hover
    node.append("title")
      .text(d => {
        if (d.depth === 0) {
          return `Config Item: ${d.data.name}\nDescription: ${d.data.description}\nType: ${d.data.value_type}`;
        } else if (d.depth === 1) {
          return `Scope Type: ${d.data.name}\nValues: ${d.children.length}`;
        } else {
          return `Scope Value: ${d.data.name}\nValue: ${d.data.value}`;
        }
      });
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

  if (!data || !data.impact || data.impact.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        No impact data available for this configuration item.
      </div>
    );
  }

  return (
    <div className="impact-analysis-container">
      <div className="card">
        <div className="card-header bg-danger text-white">
          <h5 className="mb-0">Configuration Impact Analysis</h5>
        </div>
        <div className="card-body">
          <div className="svg-container" style={{ overflow: 'auto' }}>
            <svg ref={svgRef} style={{ minWidth: '100%' }}></svg>
          </div>
          <div className="mt-3">
            <h6>Configuration Item: {data.config_item.key}</h6>
            <p>Description: {data.config_item.description}</p>
            <p>Value Type: {data.config_item.value_type}</p>
            <p className="text-muted">
              This visualization shows the impact of configuration values across different scopes.
              The configuration resolution follows a hierarchy from more specific (local) scopes to less specific (global) scopes.
            </p>
          </div>
          <div className="table-responsive mt-4">
            <h6>Value Details</h6>
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th>Scope Type</th>
                  <th>Scope Value</th>
                  <th>Value</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {data.impact.map((item, index) => (
                  <tr key={index}>
                    <td>{item.scope_type}</td>
                    <td>{item.scope_value || 'global'}</td>
                    <td>{item.value}</td>
                    <td>{item.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpactAnalysis;