from flask import request, jsonify, render_template
from models import ConfigItem, ConfigValue, ObjectProperties
from visualization_routes import register_visualization_routes

def register_routes(app, config_manager):
    # Register visualization routes
    register_visualization_routes(app, config_manager)
    @app.route('/')
    def index():
        """Render the main page"""
        return render_template('index.html')
    
    @app.route('/api/scope-types', methods=['GET'])
    def get_scope_types():
        """Get all scope types"""
        scope_types = config_manager.get_scope_types()
        return jsonify([{
            'name': st.name,
            'priority': st.priority
        } for st in scope_types])
    
    @app.route('/api/config-items', methods=['GET'])
    def get_config_items():
        """Get all configuration items"""
        config_items = config_manager.get_config_items()
        return jsonify([{
            'key': item.key,
            'description': item.description,
            'value_type': item.value_type
        } for item in config_items])
    
    @app.route('/api/config-items', methods=['POST'])
    def create_config_item():
        """Create a new configuration item"""
        data = request.json
        if not data or 'key' not in data or 'description' not in data or 'value_type' not in data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        if data['value_type'] not in ['string', 'number', 'blob']:
            return jsonify({'error': 'Invalid value type'}), 400
        
        config_item = ConfigItem(
            key=data['key'],
            description=data['description'],
            value_type=data['value_type']
        )
        
        try:
            config_manager.add_config_item(config_item)
            return jsonify({
                'key': config_item.key,
                'description': config_item.description,
                'value_type': config_item.value_type
            }), 201
        except Exception as e:
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/config-items/<key>', methods=['DELETE'])
    def delete_config_item(key):
        """Delete a configuration item"""
        if config_manager.delete_config_item(key):
            return '', 204
        return jsonify({'error': 'Config item not found'}), 404
    
    @app.route('/api/config-values', methods=['GET'])
    def get_config_values():
        """Get all configuration values or values for a specific config item"""
        config_item_key = request.args.get('config_item_key')
        
        if config_item_key:
            values = config_manager.get_config_values_for_item(config_item_key)
        else:
            values = config_manager.get_config_values()
        
        return jsonify([value.serialize() for value in values])
    
    @app.route('/api/config-values', methods=['POST'])
    def set_config_value():
        """Set a configuration value"""
        data = request.json
        if not data or 'config_item_key' not in data or 'scope_type' not in data or 'value' not in data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Handle different types of values based on the config item's value_type
        config_item = config_manager.get_config_item(data['config_item_key'])
        if not config_item:
            return jsonify({'error': 'Config item not found'}), 404
        
        # Convert the value to the right type
        value = data['value']
        if config_item.value_type == 'number':
            try:
                value = float(value)
                # If it's a whole number, convert to int
                if value.is_integer():
                    value = int(value)
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid number value'}), 400
        
        # Ensure value is a string to prevent HTML encoding issues
        if not isinstance(value, (int, float)):
            value = str(value)
        
        config_value = ConfigValue(
            config_item_key=data['config_item_key'],
            scope_type=data['scope_type'],
            scope_value=data.get('scope_value'),  # This can be None for global scope
            value=value
        )
        
        try:
            config_manager.set_config_value(config_value)
            return jsonify(config_value.serialize()), 201
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/config-values', methods=['DELETE'])
    def delete_config_value():
        """Delete a configuration value"""
        data = request.json
        if not data or 'config_item_key' not in data or 'scope_type' not in data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        config_item_key = data['config_item_key']
        scope_type = data['scope_type']
        scope_value = data.get('scope_value')  # This can be None for global scope
        
        if config_manager.delete_config_value(config_item_key, scope_type, scope_value):
            return '', 204
        return jsonify({'error': 'Config value not found'}), 404
    
    @app.route('/api/resolve', methods=['POST'])
    def resolve_config_value():
        """Resolve a configuration value based on object properties"""
        data = request.json
        if not data or 'config_item_key' not in data or 'properties' not in data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        config_item_key = data['config_item_key']
        properties = data['properties']
        
        obj_properties = ObjectProperties(properties=properties)
        
        try:
            value = config_manager.resolve_config_value(config_item_key, obj_properties)
            if value is None:
                return jsonify({'error': 'No matching configuration value found'}), 404
            
            # Ensure value is properly converted before jsonifying
            # For string values, ensure they don't contain HTML tags that could break JSON
            if isinstance(value, str):
                # Simple conversion that avoids HTML parsing issues
                # by treating all values as plain strings
                return jsonify({'value': str(value)})
            else:
                # For numbers and other JSON-compatible values
                return jsonify({'value': value})
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
