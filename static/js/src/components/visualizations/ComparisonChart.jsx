import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const ComparisonChart = ({ configItemKey }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (configItemKey) {
      fetchComparisonData();
    }
  }, [configItemKey]);

  useEffect(() => {
    if (data && chartRef.current) {
      renderChart();
    }

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/visualization/comparison?config_item_key=${encodeURIComponent(configItemKey)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch comparison data');
      }
      const data = await response.json();
      setData(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (!chartRef.current || !data) return;

    // Clean up existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Prepare the data
    const scopeTypes = data.scope_types.sort((a, b) => a.priority - b.priority);
    const datasets = [];
    const colors = [
      'rgba(52, 152, 219, 0.7)',  // Blue
      'rgba(155, 89, 182, 0.7)',  // Purple
      'rgba(231, 76, 60, 0.7)',   // Red
      'rgba(241, 196, 15, 0.7)',  // Yellow
      'rgba(46, 204, 113, 0.7)'   // Green
    ];

    // Collect all unique scope values across all scope types
    const allScopeValues = new Set();
    
    scopeTypes.forEach(scopeType => {
      scopeType.values.forEach(value => {
        allScopeValues.add(value.scope_value);
      });
    });
    
    // Convert to array and sort
    const labels = Array.from(allScopeValues).sort();

    // Create datasets for each scope type
    scopeTypes.forEach((scopeType, index) => {
      // Create a map of scope_value -> value for this scope type
      const valueMap = {};
      scopeType.values.forEach(v => {
        valueMap[v.scope_value] = v.value;
      });

      // Create the dataset
      const dataset = {
        label: scopeType.name,
        data: labels.map(scopeValue => valueMap[scopeValue] || null),
        backgroundColor: colors[index % colors.length],
        borderColor: colors[index % colors.length].replace('0.7', '1'),
        borderWidth: 1
      };

      datasets.push(dataset);
    });

    // Create the chart
    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: `Values for ${data.config_item.key} across different scopes`,
            color: 'white'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y;
                }
                return label;
              }
            }
          }
        },
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
        }
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

  if (!data) {
    return (
      <div className="alert alert-info" role="alert">
        No data available for this configuration item.
      </div>
    );
  }

  return (
    <div className="comparison-chart-container">
      <div className="card">
        <div className="card-header bg-success text-white">
          <h5 className="mb-0">Configuration Value Comparison</h5>
        </div>
        <div className="card-body">
          <div className="chart-container" style={{ position: 'relative', height: '400px' }}>
            <canvas ref={chartRef}></canvas>
          </div>
          <div className="mt-3">
            <h6>Description: {data.config_item.description}</h6>
            <p>Value Type: {data.config_item.value_type}</p>
            <p className="text-muted">
              This chart compares the values of <strong>{data.config_item.key}</strong> across different scope types and scope values.
              Lower priority scope types (more local) will override higher priority ones during resolution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonChart;