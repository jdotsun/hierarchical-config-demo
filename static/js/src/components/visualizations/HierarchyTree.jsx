import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const HierarchyTree = () => {
  const svgRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHierarchyData();
  }, []);

  useEffect(() => {
    if (data) {
      renderTree();
    }
  }, [data]);

  const fetchHierarchyData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/visualization/hierarchy');
      if (!response.ok) {
        throw new Error('Failed to fetch hierarchy data');
      }
      const data = await response.json();
      setData(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const renderTree = () => {
    if (!svgRef.current || !data) return;

    const width = 1000;
    const height = 800;
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };

    // Clear the SVG
    d3.select(svgRef.current).selectAll("*").remove();

    // Create the root hierarchy
    const root = d3.hierarchy(data);
    
    // Position the nodes
    const treeLayout = d3.tree()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    
    treeLayout(root);

    // Create the SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add links
    svg.selectAll(".link")
      .data(root.links())
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
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", d => `node ${d.children ? "node--internal" : "node--leaf"}`)
      .attr("transform", d => `translate(${d.y},${d.x})`);

    // Add circles to nodes
    node.append("circle")
      .attr("r", 6)
      .attr("fill", d => getNodeColor(d))
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5);

    // Add labels to nodes
    node.append("text")
      .attr("dy", ".31em")
      .attr("x", d => d.children ? -8 : 8)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .text(d => getNodeLabel(d))
      .style("font-size", "12px")
      .style("fill", "white");

    // Add value labels for leaf nodes
    node.filter(d => !d.children)
      .append("text")
      .attr("dy", "1.31em")
      .attr("x", 8)
      .attr("text-anchor", "start")
      .text(d => getNodeValue(d))
      .style("font-size", "10px")
      .style("fill", "#aaa");
  };

  const getNodeColor = (d) => {
    const depth = d.depth;
    switch (depth) {
      case 0: return "#2c3e50"; // Root
      case 1: return "#3498db"; // Config Items
      case 2: return "#9b59b6"; // Scope Types
      case 3: return "#e74c3c"; // Values
      default: return "#95a5a6"; // Default
    }
  };

  const getNodeLabel = (d) => {
    return d.data.name;
  };

  const getNodeValue = (d) => {
    if (d.data.value !== undefined) {
      return `Value: ${d.data.value}`;
    }
    return '';
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
    <div className="hierarchy-tree-container">
      <div className="card">
        <div className="card-header bg-info text-white">
          <h5 className="mb-0">Configuration Hierarchy Tree</h5>
        </div>
        <div className="card-body">
          <div className="svg-container" style={{ overflow: 'auto' }}>
            <svg ref={svgRef} style={{ minWidth: '100%' }}></svg>
          </div>
          <div className="legend mt-3">
            <h6>Legend:</h6>
            <div className="d-flex flex-wrap">
              <div className="me-3 mb-2">
                <span className="badge bg-primary me-1" style={{ backgroundColor: "#3498db" }}>&nbsp;</span>
                Config Item
              </div>
              <div className="me-3 mb-2">
                <span className="badge bg-primary me-1" style={{ backgroundColor: "#9b59b6" }}>&nbsp;</span>
                Scope Type
              </div>
              <div className="me-3 mb-2">
                <span className="badge bg-primary me-1" style={{ backgroundColor: "#e74c3c" }}>&nbsp;</span>
                Scope Value
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HierarchyTree;