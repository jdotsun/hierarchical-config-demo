from flask import request, jsonify
from models import ConfigItem, ConfigValue, ScopeType, ObjectProperties

def register_visualization_routes(app, config_manager):
    """Register routes for visualization data"""
    
    @app.route('/api/visualization/hierarchy', methods=['GET'])
    def get_hierarchy_data():
        """Get hierarchical data for tree visualization"""
        config_item_key = request.args.get('config_item_key')
        
        # Get all scope types in order of priority
        scope_types = config_manager.get_scope_types()
        
        # If a specific config item is requested, return data just for that item
        if config_item_key:
            # Get the specified config item
            config_item = config_manager.get_config_item(config_item_key)
            if not config_item:
                return jsonify({"error": f"Config item '{config_item_key}' not found"}), 404
            
            # Get values for this config item
            config_values = config_manager.get_config_values_for_item(config_item_key)
            
            # Organize data for this specific config item
            hierarchy_data = {
                "config_item": {
                    "key": config_item.key,
                    "description": config_item.description,
                    "value_type": config_item.value_type
                },
                "scope_types": []
            }
            
            # Group values by scope type
            for scope_type in scope_types:
                scope_values = [v for v in config_values if v.scope_type == scope_type.name]
                
                if scope_values:
                    scope_data = {
                        "name": scope_type.name,
                        "priority": scope_type.priority,
                        "values": []
                    }
                    
                    for value in scope_values:
                        # Convert the value to the appropriate type
                        converted_value = config_manager._convert_value(value.value, config_item.value_type)
                        
                        scope_data["values"].append({
                            "scope_value": value.scope_value if value.scope_value else "global",
                            "value": converted_value
                        })
                    
                    hierarchy_data["scope_types"].append(scope_data)
                else:
                    # Include empty scope types for completeness
                    hierarchy_data["scope_types"].append({
                        "name": scope_type.name,
                        "priority": scope_type.priority,
                        "values": []
                    })
            
            return jsonify(hierarchy_data)
        
        # If no specific config item, return the full hierarchy
        else:
            # Get all config items
            config_items = config_manager.get_config_items()
            
            # Get all config values
            config_values = config_manager.get_config_values()
            
            # Organize data in a hierarchical structure
            hierarchy_data = {
                "name": "Configuration Hierarchy",
                "children": []
            }
            
            # Group by config item
            for config_item in config_items:
                item_node = {
                    "name": config_item.key,
                    "description": config_item.description,
                    "value_type": config_item.value_type,
                    "children": []
                }
                
                # Get values for this config item
                item_values = [v for v in config_values if v.config_item_key == config_item.key]
                
                # Group by scope type
                for scope_type in scope_types:
                    scope_values = [v for v in item_values if v.scope_type == scope_type.name]
                    
                    if scope_values:
                        scope_node = {
                            "name": scope_type.name,
                            "priority": scope_type.priority,
                            "children": []
                        }
                        
                        # Add values for this scope
                        for value in scope_values:
                            converted_value = config_manager._convert_value(value.value, config_item.value_type)
                            value_node = {
                                "name": value.scope_value if value.scope_value else "global",
                                "value": converted_value
                            }
                            scope_node["children"].append(value_node)
                        
                        item_node["children"].append(scope_node)
                
                hierarchy_data["children"].append(item_node)
            
            return jsonify(hierarchy_data)
    
    @app.route('/api/visualization/comparison', methods=['GET'])
    def get_comparison_data():
        """Get data for comparison charts"""
        config_item_key = request.args.get('config_item_key')
        
        if not config_item_key:
            return jsonify({"error": "Missing config_item_key parameter"}), 400
        
        # Get the config item
        config_item = config_manager.get_config_item(config_item_key)
        if not config_item:
            return jsonify({"error": f"Config item '{config_item_key}' not found"}), 404
        
        # Get values for this config item
        config_values = config_manager.get_config_values_for_item(config_item_key)
        
        # Organize by scope type
        comparison_data = {
            "config_item": {
                "key": config_item.key,
                "description": config_item.description,
                "value_type": config_item.value_type
            },
            "scope_types": []
        }
        
        # Group data by scope type
        scope_types = config_manager.get_scope_types()
        for scope_type in scope_types:
            scope_values = [v for v in config_values if v.scope_type == scope_type.name]
            
            if scope_values:
                scope_data = {
                    "name": scope_type.name,
                    "priority": scope_type.priority,
                    "values": []
                }
                
                for value in scope_values:
                    # Convert the value to the appropriate type
                    converted_value = config_manager._convert_value(value.value, config_item.value_type)
                    
                    scope_data["values"].append({
                        "scope_value": value.scope_value if value.scope_value else "global",
                        "value": converted_value
                    })
                
                comparison_data["scope_types"].append(scope_data)
        
        return jsonify(comparison_data)
    
    @app.route('/api/visualization/heatmap', methods=['GET'])
    def get_heatmap_data():
        """Get data for heatmap visualization"""
        # Get all config items
        config_items = config_manager.get_config_items()
        
        # Get all scope types
        scope_types = config_manager.get_scope_types()
        
        # Get all config values
        config_values = config_manager.get_config_values()
        
        # Create a map of scope values for each scope type
        scope_values_by_type = {}
        for scope_type in scope_types:
            values = set()
            for value in config_values:
                if value.scope_type == scope_type.name and value.scope_value:
                    values.add(value.scope_value)
            if values:
                scope_values_by_type[scope_type.name] = list(values)
        
        # Create heatmap data structure
        heatmap_data = {
            "config_items": [],
            "scope_types": [st.name for st in scope_types],
            "scope_values": scope_values_by_type
        }
        
        # Add data for each config item
        for config_item in config_items:
            item_values = [v for v in config_values if v.config_item_key == config_item.key]
            
            item_data = {
                "key": config_item.key,
                "description": config_item.description,
                "value_type": config_item.value_type,
                "values": {}
            }
            
            # Organize values by scope type and scope value
            for scope_type in scope_types:
                item_data["values"][scope_type.name] = {}
                
                # Get values for this scope type
                scope_type_values = [v for v in item_values if v.scope_type == scope_type.name]
                
                # Add values for each scope value
                for value in scope_type_values:
                    scope_value = value.scope_value if value.scope_value else "global"
                    converted_value = config_manager._convert_value(value.value, config_item.value_type)
                    item_data["values"][scope_type.name][scope_value] = converted_value
            
            heatmap_data["config_items"].append(item_data)
        
        return jsonify(heatmap_data)
    
    @app.route('/api/visualization/impact', methods=['GET'])
    def get_impact_data():
        """Get data for impact analysis"""
        config_item_key = request.args.get('config_item_key')
        
        if not config_item_key:
            return jsonify({"error": "Missing config_item_key parameter"}), 400
        
        # Get the config item
        config_item = config_manager.get_config_item(config_item_key)
        if not config_item:
            return jsonify({"error": f"Config item '{config_item_key}' not found"}), 404
        
        # Get values for this config item
        config_values = config_manager.get_config_values_for_item(config_item_key)
        
        # Organize impact data
        impact_data = {
            "config_item": {
                "key": config_item.key,
                "description": config_item.description,
                "value_type": config_item.value_type
            },
            "impact": []
        }
        
        # Sort config values by scope priority
        scope_types = {st.name: st.priority for st in config_manager.get_scope_types()}
        
        # Group values by scope
        for value in config_values:
            scope_type = value.scope_type
            scope_value = value.scope_value if value.scope_value else "global"
            converted_value = config_manager._convert_value(value.value, config_item.value_type)
            
            impact_entry = {
                "scope_type": scope_type,
                "scope_value": scope_value,
                "value": converted_value,
                "priority": scope_types.get(scope_type, 999),  # Default high number for unknown scope types
                "affected_objects": []
            }
            
            # Add to impact data
            impact_data["impact"].append(impact_entry)
        
        # Sort by priority
        impact_data["impact"].sort(key=lambda x: x["priority"])
        
        return jsonify(impact_data)