import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ResolutionAnimationView = ({ configItemKey }) => {
  const svgRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animationRunning, setAnimationRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [resolvedValue, setResolvedValue] = useState(null);
  const [objectProperties, setObjectProperties] = useState({
    account: 'retail',
    model: 'growth',
    'model family': 'active',
    'model provider': 'provider_a'
  });

  useEffect(() => {
    if (configItemKey) {
      fetchData();
    }
  }, [configItemKey]);

  useEffect(() => {
    if (data && svgRef.current) {
      renderVisualization();
    }
  }, [data, currentStep, resolvedValue, svgRef.current]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/visualization/comparison?config_item_key=${encodeURIComponent(configItemKey)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch comparison data');
      }
      const responseData = await response.json();
      console.log("Resolution animation data:", responseData);
      setData(responseData);
      setLoading(false);
      // Reset animation state
      setCurrentStep(0);
      setResolvedValue(null);
      setAnimationRunning(false);
    } catch (err) {
      console.error("Error fetching resolution data:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const startAnimation = () => {
    if (animationRunning) return;
    
    setAnimationRunning(true);
    setCurrentStep(0);
    setResolvedValue(null);
    
    // Auto-advance through the animation steps
    const timer = setInterval(() => {
      setCurrentStep(prevStep => {
        // If we've gone through all scope types, stop the animation
        if (prevStep >= data.scope_types.length) {
          clearInterval(timer);
          setAnimationRunning(false);
          return prevStep;
        }
        return prevStep + 1;
      });
    }, 1500); // Change step every 1.5 seconds
    
    return () => clearInterval(timer);
  };

  const restartAnimation = () => {
    setCurrentStep(0);
    setResolvedValue(null);
    setAnimationRunning(false);
  };

  const updateObjectProperty = (scopeType, value) => {
    setObjectProperties(prev => ({
      ...prev,
      [scopeType]: value
    }));
    
    // Reset animation when properties change
    restartAnimation();
  };

  const renderVisualization = () => {
    if (!svgRef.current || !data) return;

    // Clear existing content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Setup dimensions
    const width = svgRef.current.clientWidth || 800;
    const height = 500;
    const margin = { top: 60, right: 100, bottom: 40, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create the container
    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Sort scope types from local to global (most specific to least specific)
    const scopeTypes = data.scope_types.sort((a, b) => a.priority - b.priority);

    // Configure a vertical scale for the scope types
    const yScale = d3.scaleBand()
      .domain(scopeTypes.map(st => st.name))
      .range([0, innerHeight])
      .padding(0.2);

    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-size", "20px")
      .text(`Configuration Resolution for "${data.config_item.key}"`);

    // Add subtitle with properties
    const propertiesText = Object.entries(objectProperties)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-size", "14px")
      .text(`Object Properties: ${propertiesText}`);

    // Draw the background boxes for each scope level
    scopeTypes.forEach((scopeType, i) => {
      // Create background for the row
      g.append("rect")
        .attr("x", 0)
        .attr("y", yScale(scopeType.name))
        .attr("width", innerWidth)
        .attr("height", yScale.bandwidth())
        .attr("fill", i < currentStep ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)")
        .attr("stroke", i === currentStep - 1 ? "#4CAF50" : "rgba(255, 255, 255, 0.2)")
        .attr("stroke-width", i === currentStep - 1 ? 3 : 1);

      // Add scope type label to the left
      g.append("text")
        .attr("x", -10)
        .attr("y", yScale(scopeType.name) + yScale.bandwidth() / 2)
        .attr("text-anchor", "end")
        .attr("alignment-baseline", "middle")
        .style("fill", "white")
        .style("font-weight", i < currentStep ? "bold" : "normal")
        .text(scopeType.name);

      // Get the scope values for this type
      const scopeValues = scopeType.values || [];
      
      // Draw values for this scope type
      scopeValues.forEach((value, j) => {
        // Determine if this value matches the object properties
        const isMatch = scopeType.name === 'default' || 
                       (objectProperties[scopeType.name] === value.scope_value);
        
        // Calculate position
        const xPos = innerWidth * 0.3 + (j * 120);
        const yPos = yScale(scopeType.name) + yScale.bandwidth() / 2;
        
        // Create circle for each value
        g.append("circle")
          .attr("cx", xPos)
          .attr("cy", yPos)
          .attr("r", 25)
          .attr("fill", isMatch ? "#4CAF50" : "#607D8B")
          .attr("opacity", i < currentStep ? 0.8 : 0.4)
          .attr("stroke", isMatch ? "white" : "none")
          .attr("stroke-width", 2);

        // Add scope value text
        g.append("text")
          .attr("x", xPos)
          .attr("y", yPos - 8)
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "middle")
          .style("fill", "white")
          .style("font-size", "12px")
          .style("font-weight", isMatch ? "bold" : "normal")
          .text(value.scope_value || "global");
        
        // Add config value text
        g.append("text")
          .attr("x", xPos)
          .attr("y", yPos + 10)
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "middle")
          .style("fill", "white")
          .style("font-size", "12px")
          .style("font-weight", isMatch ? "bold" : "normal")
          .text(value.value);
        
        // If this value matches and this scope is being checked, highlight it as the resolved value
        if (isMatch && i === currentStep - 1) {
          setResolvedValue(value.value);
          
          // Create a highlight around the matched value
          g.append("circle")
            .attr("cx", xPos)
            .attr("cy", yPos)
            .attr("r", 30)
            .attr("fill", "none")
            .attr("stroke", "#4CAF50")
            .attr("stroke-width", 3)
            .attr("stroke-dasharray", "5,5")
            .attr("opacity", 0.8);
          
          g.append("text")
            .attr("x", xPos + 50)
            .attr("y", yPos)
            .attr("text-anchor", "start")
            .attr("alignment-baseline", "middle")
            .style("fill", "#4CAF50")
            .style("font-weight", "bold")
            .text("✓ Match found!");
        }
      });
    });

    // Show the final resolved value if we've completed all steps
    if (currentStep > 0 && resolvedValue !== null) {
      // Add a box at the bottom showing the resolved value
      const resultBox = g.append("g")
        .attr("transform", `translate(${innerWidth / 2}, ${innerHeight + 20})`)
        .attr("opacity", currentStep >= scopeTypes.length ? 1 : 0.5);
      
      resultBox.append("rect")
        .attr("x", -100)
        .attr("y", 0)
        .attr("width", 200)
        .attr("height", 50)
        .attr("rx", 10)
        .attr("fill", "#4CAF50")
        .attr("opacity", 0.8);
      
      resultBox.append("text")
        .attr("x", 0)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .style("font-weight", "bold")
        .text("Resolved Value:");
      
      resultBox.append("text")
        .attr("x", 0)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(resolvedValue);
    }

    // Add animation controls
    const controls = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height - 10})`)
      .attr("class", "controls");
    
    // Start/Restart button
    const buttonWidth = 120;
    const buttonHeight = 30;
    
    controls.append("rect")
      .attr("x", -buttonWidth / 2)
      .attr("y", -buttonHeight)
      .attr("width", buttonWidth)
      .attr("height", buttonHeight)
      .attr("rx", 5)
      .attr("fill", "#1976D2")
      .attr("opacity", animationRunning ? 0.5 : 1)
      .style("cursor", "pointer")
      .on("click", !animationRunning ? startAnimation : null);
    
    controls.append("text")
      .attr("x", 0)
      .attr("y", -buttonHeight / 2 + 5)
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("pointer-events", "none")
      .text(currentStep === 0 ? "Start Animation" : "Restart Animation");
  };

  // Generate options for object property dropdowns
  const generateScopeValueOptions = (scopeType) => {
    if (!data) return [];
    
    // Find the scope type in the data
    const scopeTypeData = data.scope_types.find(st => st.name === scopeType);
    if (!scopeTypeData || !scopeTypeData.values) return [];
    
    // Extract unique scope values
    const scopeValues = scopeTypeData.values.map(v => v.scope_value).filter(Boolean);
    return scopeValues;
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
    <div className="resolution-animation-container">
      <h6 className="text-center mb-3">
        <span className="badge bg-secondary">
          Configuration Resolution: {configItemKey}
        </span>
      </h6>
      
      {/* Object properties configuration */}
      <div className="object-properties-panel mb-4 p-3 bg-dark rounded">
        <h6 className="text-white">Configure Object Properties</h6>
        <div className="row g-2">
          {Object.keys(objectProperties).map(scopeType => (
            <div className="col-md-3" key={scopeType}>
              <div className="form-group">
                <label className="text-white small">{scopeType}</label>
                <select 
                  className="form-select form-select-sm"
                  value={objectProperties[scopeType]}
                  onChange={(e) => updateObjectProperty(scopeType, e.target.value)}
                >
                  {generateScopeValueOptions(scopeType).map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
        <div className="text-white small mt-2">
          <p className="mb-0">These properties represent the attributes of the object for which we're resolving the configuration.</p>
        </div>
      </div>
      
      {/* The SVG visualization */}
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
      
      {/* Animation description */}
      <div className="animation-description mt-4">
        <div className="alert alert-info">
          <h5>Understanding the Resolution Process</h5>
          <p>
            This animation shows how a configuration value is resolved based on the object's properties.
            The system checks each scope level in order from most specific (account) to most general (default),
            looking for the first match.
          </p>
          <ol>
            <li>First, check if the account has a matching configuration</li>
            <li>Next, check if the model has a matching configuration</li>
            <li>Then, check if the model family has a matching configuration</li>
            <li>Then, check if the model provider has a matching configuration</li>
            <li>Finally, fall back to the default configuration if no matches are found</li>
          </ol>
          <p>The first matching value found is used as the resolved configuration value.</p>
        </div>
      </div>
    </div>
  );
};

export default ResolutionAnimationView;