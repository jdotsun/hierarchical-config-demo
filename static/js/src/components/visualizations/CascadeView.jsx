import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const CascadeView = ({ configItemKey }) => {
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
      console.log("Cascade view data:", responseData);
      setData(responseData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching cascade data:", err);
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
    const height = 400;
    const margin = { top: 40, right: 30, bottom: 40, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create the container
    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Sort scope types from global to local
    const scopeTypes = data.scope_types.sort((a, b) => b.priority - a.priority);

    // Create scales
    const yScale = d3.scaleBand()
      .domain(scopeTypes.map(st => st.name))
      .range([0, innerHeight])
      .padding(0.2);

    // Find min and max values for x scale
    let allValues = [];
    scopeTypes.forEach(st => {
      st.values.forEach(v => {
        allValues.push(+v.value);
      });
    });

    const valueExtent = d3.extent(allValues);
    const padding = (valueExtent[1] - valueExtent[0]) * 0.1;
    
    const xScale = d3.scaleLinear()
      .domain([valueExtent[0] - padding, valueExtent[1] + padding])
      .range([0, innerWidth]);

    // Add axes
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("fill", "white");

    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("fill", "white");

    // Add title
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-size", "16px")
      .text(`Configuration Cascade for "${data.config_item.key}"`);

    // Add scope type bands
    scopeTypes.forEach(scopeType => {
      // Create a group for this scope type
      const scopeGroup = g.append("g")
        .attr("class", "scope-group")
        .attr("transform", `translate(0,${yScale(scopeType.name)})`);
      
      // Add a background for the row
      scopeGroup.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", innerWidth)
        .attr("height", yScale.bandwidth())
        .attr("fill", "rgba(255, 255, 255, 0.05)");
      
      // Get values for this scope type
      const scopeValues = scopeType.values;
      
      // Draw values as circles
      scopeGroup.selectAll("circle")
        .data(scopeValues)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(+d.value))
        .attr("cy", yScale.bandwidth() / 2)
        .attr("r", 8)
        .attr("fill", d => {
          // Use a color scheme based on scope type priority
          const intensity = 1 - ((scopeType.priority - 10) / 40);
          return d3.interpolateYlOrRd(intensity);
        })
        .attr("stroke", "white")
        .attr("stroke-width", 1);
      
      // Add labels for values
      scopeGroup.selectAll(".value-label")
        .data(scopeValues)
        .enter()
        .append("text")
        .attr("class", "value-label")
        .attr("x", d => xScale(+d.value))
        .attr("y", yScale.bandwidth() / 2 - 15)
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .style("font-size", "10px")
        .text(d => d.scope_value === "global" ? "Default" : d.scope_value);
      
      // Add value text
      scopeGroup.selectAll(".value-text")
        .data(scopeValues)
        .enter()
        .append("text")
        .attr("class", "value-text")
        .attr("x", d => xScale(+d.value))
        .attr("y", yScale.bandwidth() / 2 + 4)
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .style("font-size", "10px")
        .text(d => d.value);
    });

    // Add arrows to show hierarchy
    if (scopeTypes.length > 1) {
      for (let i = 0; i < scopeTypes.length - 1; i++) {
        const y1 = yScale(scopeTypes[i].name) + yScale.bandwidth() / 2;
        const y2 = yScale(scopeTypes[i + 1].name) + yScale.bandwidth() / 2;
        
        g.append("line")
          .attr("x1", -20)
          .attr("y1", y1)
          .attr("x2", -20)
          .attr("y2", y2)
          .attr("stroke", "white")
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "3,3")
          .attr("marker-end", "url(#arrowhead)");
      }

      // Add arrowhead marker
      svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "-0 -5 10 10")
        .attr("refX", 5)
        .attr("refY", 0)
        .attr("orient", "auto")
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("xoverflow", "visible")
        .append("svg:path")
        .attr("d", "M 0,-5 L 10,0 L 0,5")
        .attr("fill", "white");
    }

    // Add a legend for the resolution order
    g.append("text")
      .attr("x", -margin.left + 10)
      .attr("y", -20)
      .style("fill", "white")
      .style("font-size", "12px")
      .text("Resolution Order →");
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
    <div className="cascade-view-container" style={{ width: "100%", height: "100%" }}>
      <h6 className="text-center mb-3">
        <span className="badge bg-secondary">
          Configuration: {configItemKey}
        </span>
      </h6>
      <svg 
        ref={svgRef} 
        style={{ 
          width: "100%", 
          height: "400px", 
          display: "block", 
          margin: "0 auto",
          overflow: "visible"
        }}
      ></svg>
    </div>
  );
};

export default CascadeView;