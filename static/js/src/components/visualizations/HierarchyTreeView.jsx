import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const HierarchyTreeView = ({ configItemKey }) => {
  const svgRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (configItemKey) {
      fetchData();
    }
  }, [configItemKey]);

  useEffect(() => {
    if (data && svgRef.current) {
      renderVisualization();
    }
  }, [data, svgRef.current]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/visualization/hierarchy?config_item_key=${encodeURIComponent(configItemKey)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch hierarchy data');
      }
      const responseData = await response.json();
      console.log("Hierarchy tree data:", responseData);
      
      // Transform data for D3 tree visualization
      const transformedData = transformDataForTree(responseData);
      setData(transformedData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching hierarchy data:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Transform the API data into a hierarchical structure for D3 tree
  const transformDataForTree = (apiData) => {
    // Create a root node
    const root = {
      name: apiData.config_item.key,
      description: apiData.config_item.description,
      children: []
    };

    // Sort scope types from global to local
    const scopeTypes = [...apiData.scope_types].sort((a, b) => b.priority - a.priority);

    // For each scope type, create a child node
    scopeTypes.forEach(scopeType => {
      const scopeNode = {
        name: scopeType.name,
        priority: scopeType.priority,
        children: []
      };

      // For each value in the scope type, create a leaf node
      scopeType.values.forEach(value => {
        scopeNode.children.push({
          name: value.scope_value || 'global',
          value: value.value
        });
      });

      root.children.push(scopeNode);
    });

    return root;
  };

  const renderVisualization = () => {
    if (!svgRef.current || !data) return;

    // Clear existing content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Setup dimensions
    const width = svgRef.current.clientWidth || 800;
    const height = 500;
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create the tree layout
    const treeLayout = d3.tree()
      .size([innerHeight, innerWidth]);

    // Create the container
    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Convert data to D3 hierarchy
    const root = d3.hierarchy(data);
    
    // Compute the tree layout
    const treeData = treeLayout(root);

    // Add links between nodes
    g.selectAll(".link")
      .data(treeData.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x))
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5);

    // Add nodes
    const node = g.selectAll(".node")
      .data(treeData.descendants())
      .enter().append("g")
      .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
      .attr("transform", d => `translate(${d.y},${d.x})`);

    // Add node circles with color based on depth
    node.append("circle")
      .attr("r", d => {
        // Root node is larger
        if (d.depth === 0) return 10;
        // Value nodes are medium
        if (!d.children) return 6;
        // Scope type nodes are in between
        return 8;
      })
      .attr("fill", d => {
        // Root node is blue
        if (d.depth === 0) return "#4285F4";
        // Value nodes are colored by priority (red for local, yellow for global)
        if (!d.children && d.parent) {
          const intensity = d.parent.data.priority ? 1 - ((d.parent.data.priority - 10) / 40) : 0.5;
          return d3.interpolateYlOrRd(intensity);
        }
        // Scope type nodes are grey
        return "#999";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // Add node labels
    node.append("text")
      .attr("dy", d => d.depth === 0 ? "2em" : (d.children ? "-1.5em" : "0.31em"))
      .attr("x", d => d.children ? 0 : 10)
      .attr("text-anchor", d => d.children ? "middle" : "start")
      .style("fill", "white")
      .text(d => {
        if (d.depth === 0) {
          return d.data.name;
        }
        if (d.children) {
          return d.data.name;
        }
        return `${d.data.name}: ${d.data.value}`;
      });

    // Add description text for the root node
    if (treeData.descendants().length > 0) {
      const rootNode = treeData.descendants()[0];
      node.filter(d => d.depth === 0)
        .append("text")
        .attr("dy", "3.5em")
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .style("font-size", "10px")
        .text(d => d.data.description);
    }

    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-size", "16px")
      .text(`Hierarchy Tree for "${data.name}"`);
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

  if (!data) {
    return (
      <div className="text-center">No data available</div>
    );
  }

  return (
    <div className="hierarchy-tree-container" style={{ width: "100%", height: "100%" }}>
      <h6 className="text-center mb-3">
        <span className="badge bg-secondary">
          Hierarchy: {configItemKey}
        </span>
      </h6>
      <svg 
        ref={svgRef} 
        style={{ 
          width: "100%", 
          height: "500px", 
          display: "block", 
          margin: "0 auto",
          overflow: "visible"
        }}
      ></svg>
    </div>
  );
};

export default HierarchyTreeView;