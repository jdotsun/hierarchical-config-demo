import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ScopeOverlapView = ({ configItemKey }) => {
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
      const response = await fetch(`/api/visualization/comparison?config_item_key=${encodeURIComponent(configItemKey)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch comparison data');
      }
      const responseData = await response.json();
      console.log("Scope overlap data:", responseData);
      setData(responseData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching scope overlap data:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const renderVisualization = () => {
    if (!svgRef.current || !data) return;

    // Clear existing content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Setup dimensions
    const width = svgRef.current.clientWidth || 800;
    const height = 500;
    
    // Create the container
    svg.attr("width", width)
       .attr("height", height);

    // Group for positioning the visualization
    const g = svg.append("g")
                .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Sort scope types from global to local
    const scopeTypes = data.scope_types.sort((a, b) => b.priority - a.priority);
    
    // Filter to scope types that have values
    const scopeTypesWithValues = scopeTypes.filter(st => st.values.length > 0);
    
    // If we have too few scope types, add dummy ones for visualization
    if (scopeTypesWithValues.length < 2) {
      console.log("Not enough scope types with values for overlap visualization");
      renderAlternative(svg, width, height, scopeTypesWithValues);
      return;
    }

    // We'll need to position our circles in a way that shows overlap
    // For simplicity, we'll use a predefined pattern based on the number of scope types
    const centers = calculateCircleCenters(scopeTypesWithValues.length);
    const radiusScale = d3.scaleLinear()
                         .domain([0, scopeTypesWithValues.length])
                         .range([120, 80]);
    
    // Draw circles for each scope type
    scopeTypesWithValues.forEach((scopeType, i) => {
      // Calculate radius based on number of values
      const radius = radiusScale(Math.min(scopeType.values.length, 5));
      
      // Draw the circle
      g.append("circle")
       .attr("cx", centers[i][0])
       .attr("cy", centers[i][1])
       .attr("r", radius)
       .attr("fill", d3.interpolateYlOrRd(1 - ((scopeType.priority - 10) / 40)))
       .attr("fill-opacity", 0.6)
       .attr("stroke", "white")
       .attr("stroke-width", 2);
      
      // Add the scope type label
      g.append("text")
       .attr("x", centers[i][0])
       .attr("y", centers[i][1] - 20)
       .attr("text-anchor", "middle")
       .style("fill", "white")
       .style("font-weight", "bold")
       .style("font-size", "14px")
       .text(scopeType.name);
      
      // Add value labels inside the circle
      scopeType.values.forEach((value, j) => {
        // Position labels in a circular pattern within each scope circle
        const angle = (j / scopeType.values.length) * 2 * Math.PI;
        const labelRadius = radius * 0.6; // Inside the circle
        const x = centers[i][0] + labelRadius * Math.cos(angle);
        const y = centers[i][1] + labelRadius * Math.sin(angle);
        
        g.append("text")
         .attr("x", x)
         .attr("y", y)
         .attr("text-anchor", "middle")
         .style("fill", "white")
         .style("font-size", "12px")
         .text(`${value.scope_value || 'global'}: ${value.value}`);
      });
    });

    // Add title
    svg.append("text")
       .attr("x", width / 2)
       .attr("y", 30)
       .attr("text-anchor", "middle")
       .style("fill", "white")
       .style("font-size", "16px")
       .text(`Scope Overlap for "${data.config_item.key}"`);
    
    // Add legend
    const legend = svg.append("g")
                    .attr("transform", `translate(${width - 150}, 60)`);
    
    // Legend title
    legend.append("text")
          .attr("x", 0)
          .attr("y", 0)
          .style("fill", "white")
          .style("font-weight", "bold")
          .text("Scope Priority");
    
    // Legend items
    const priorities = [10, 20, 30, 40, 50];
    priorities.forEach((priority, i) => {
      const intensity = 1 - ((priority - 10) / 40);
      
      legend.append("rect")
            .attr("x", 0)
            .attr("y", 20 + i * 25)
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", d3.interpolateYlOrRd(intensity))
            .attr("stroke", "white");
      
      legend.append("text")
            .attr("x", 30)
            .attr("y", 20 + i * 25 + 15)
            .style("fill", "white")
            .text(`Priority ${priority} (${getPriorityLabel(priority)})`);
    });
  };

  // Helper function to get a label for priority
  const getPriorityLabel = (priority) => {
    switch(priority) {
      case 10: return "Most Local";
      case 50: return "Most Global";
      default: return "Intermediate";
    }
  };

  // Calculate evenly spaced circle centers for n circles
  const calculateCircleCenters = (n) => {
    const centers = [];
    const radius = 150;  // Adjust based on your visualization size
    
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * 2 * Math.PI;
      centers.push([
        radius * Math.cos(angle) * 0.5,  // Scale to make them closer
        radius * Math.sin(angle) * 0.5
      ]);
    }
    
    return centers;
  };

  // Render an alternative visualization when there aren't enough scope types
  const renderAlternative = (svg, width, height, scopeTypesWithValues) => {
    const g = svg.append("g")
                .attr("transform", `translate(${width / 2}, ${height / 2})`);
    
    // Title for the alternative view
    svg.append("text")
       .attr("x", width / 2)
       .attr("y", 30)
       .attr("text-anchor", "middle")
       .style("fill", "white")
       .style("font-size", "16px")
       .text(`Scope Distribution for "${data.config_item.key}"`);
    
    // Create a single large circle for the config item
    g.append("circle")
     .attr("cx", 0)
     .attr("cy", 0)
     .attr("r", 150)
     .attr("fill", "#4285F4")
     .attr("fill-opacity", 0.3)
     .attr("stroke", "white")
     .attr("stroke-width", 2);
    
    // Add the config item name to the center
    g.append("text")
     .attr("x", 0)
     .attr("y", 0)
     .attr("text-anchor", "middle")
     .style("fill", "white")
     .style("font-weight", "bold")
     .style("font-size", "16px")
     .text(data.config_item.key);
    
    // Place the scope types radially around the center
    scopeTypesWithValues.forEach((scopeType, i) => {
      const angle = (i / Math.max(scopeTypesWithValues.length, 1)) * 2 * Math.PI;
      const x = 100 * Math.cos(angle);
      const y = 100 * Math.sin(angle);
      
      // Draw a smaller circle for each scope type
      g.append("circle")
       .attr("cx", x)
       .attr("cy", y)
       .attr("r", 50)
       .attr("fill", d3.interpolateYlOrRd(1 - ((scopeType.priority - 10) / 40)))
       .attr("fill-opacity", 0.7)
       .attr("stroke", "white")
       .attr("stroke-width", 1);
      
      // Add the scope type name
      g.append("text")
       .attr("x", x)
       .attr("y", y - 15)
       .attr("text-anchor", "middle")
       .style("fill", "white")
       .style("font-weight", "bold")
       .style("font-size", "14px")
       .text(scopeType.name);
      
      // Add all values for this scope type
      scopeType.values.forEach((value, j) => {
        g.append("text")
         .attr("x", x)
         .attr("y", y + 5 + j * 20)
         .attr("text-anchor", "middle")
         .style("fill", "white")
         .style("font-size", "12px")
         .text(`${value.scope_value || 'global'}: ${value.value}`);
      });
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

  if (!data) {
    return (
      <div className="text-center">No data available</div>
    );
  }

  return (
    <div className="scope-overlap-container" style={{ width: "100%", height: "100%" }}>
      <h6 className="text-center mb-3">
        <span className="badge bg-secondary">
          Scope Overlap: {configItemKey}
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

export default ScopeOverlapView;