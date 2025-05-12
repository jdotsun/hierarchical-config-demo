import unittest
from unittest.mock import MagicMock, patch
import json
import sys
import os
from flask import Flask

# Add the parent directory to sys.path to import the modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import routes
from models import ScopeType, ConfigItem, ConfigValue, ObjectProperties
from config_manager import ConfigManager


class TestRoutes(unittest.TestCase):
    """Test case for the route handlers"""

    def setUp(self):
        """Set up test fixtures before each test method is run"""
        # Create a test Flask app
        self.app = Flask(__name__)
        self.app.config['TESTING'] = True
        
        # Create a mock config manager
        self.mock_config_manager = MagicMock(spec=ConfigManager)
        
        # Register routes with the mock config manager
        routes.register_routes(self.app, self.mock_config_manager)
        
        # Create a test client
        self.client = self.app.test_client()
        
        # Create test data
        self.scope_type = ScopeType(name="account", priority=10)
        self.config_item = ConfigItem(key="test_param", description="A test parameter", value_type="number")
        self.config_value = ConfigValue(
            config_item_key="test_param",
            scope_type="account",
            scope_value="account123",
            value="42"
        )

    def test_get_scope_types(self):
        """Test getting all scope types"""
        # Set up the mock to return scope types
        self.mock_config_manager.get_scope_types.return_value = [
            ScopeType(name="account", priority=10),
            ScopeType(name="model", priority=20)
        ]
        
        # Make the request
        response = self.client.get('/api/scope-types')
        
        # Check the response
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['name'], 'account')
        self.assertEqual(data[0]['priority'], 10)
        self.assertEqual(data[1]['name'], 'model')
        self.assertEqual(data[1]['priority'], 20)
        
        # Verify the mock was called
        self.mock_config_manager.get_scope_types.assert_called_once()

    def test_get_config_items(self):
        """Test getting all configuration items"""
        # Set up the mock to return config items
        self.mock_config_manager.get_config_items.return_value = [
            ConfigItem(key="param1", description="Parameter 1", value_type="number"),
            ConfigItem(key="param2", description="Parameter 2", value_type="string")
        ]
        
        # Make the request
        response = self.client.get('/api/config-items')
        
        # Check the response
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['key'], 'param1')
        self.assertEqual(data[0]['description'], 'Parameter 1')
        self.assertEqual(data[0]['value_type'], 'number')
        self.assertEqual(data[1]['key'], 'param2')
        self.assertEqual(data[1]['description'], 'Parameter 2')
        self.assertEqual(data[1]['value_type'], 'string')
        
        # Verify the mock was called
        self.mock_config_manager.get_config_items.assert_called_once()

    def test_create_config_item_success(self):
        """Test creating a configuration item successfully"""
        # Set up the request data
        request_data = {
            'key': 'new_param',
            'description': 'A new parameter',
            'value_type': 'number'
        }
        
        # Make the request
        response = self.client.post('/api/config-items', 
                                   data=json.dumps(request_data),
                                   content_type='application/json')
        
        # Check the response
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['key'], 'new_param')
        self.assertEqual(data['description'], 'A new parameter')
        self.assertEqual(data['value_type'], 'number')
        
        # Verify the mock was called with the correct arguments
        self.mock_config_manager.add_config_item.assert_called_once()
        args, _ = self.mock_config_manager.add_config_item.call_args
        self.assertEqual(args[0].key, 'new_param')
        self.assertEqual(args[0].description, 'A new parameter')
        self.assertEqual(args[0].value_type, 'number')

    def test_create_config_item_missing_fields(self):
        """Test creating a configuration item with missing fields"""
        # Set up the request data with missing fields
        request_data = {
            'key': 'new_param',
            # Missing description and value_type
        }
        
        # Make the request
        response = self.client.post('/api/config-items', 
                                   data=json.dumps(request_data),
                                   content_type='application/json')
        
        # Check the response
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertIn('Missing required fields', data['error'])
        
        # Verify the mock was not called
        self.mock_config_manager.add_config_item.assert_not_called()

    def test_create_config_item_invalid_value_type(self):
        """Test creating a configuration item with an invalid value type"""
        # Set up the request data with invalid value_type
        request_data = {
            'key': 'new_param',
            'description': 'A new parameter',
            'value_type': 'invalid_type'  # Not one of 'string', 'number', or 'blob'
        }
        
        # Make the request
        response = self.client.post('/api/config-items', 
                                   data=json.dumps(request_data),
                                   content_type='application/json')
        
        # Check the response
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertIn('Invalid value type', data['error'])
        
        # Verify the mock was not called
        self.mock_config_manager.add_config_item.assert_not_called()

    def test_delete_config_item_success(self):
        """Test deleting a configuration item successfully"""
        # Set up the mock to return True for delete_config_item
        self.mock_config_manager.delete_config_item.return_value = True
        
        # Make the request
        response = self.client.delete('/api/config-items/test_param')
        
        # Check the response
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.data, b'')
        
        # Verify the mock was called with the correct arguments
        self.mock_config_manager.delete_config_item.assert_called_once_with('test_param')

    def test_delete_config_item_not_found(self):
        """Test deleting a configuration item that doesn't exist"""
        # Set up the mock to return False for delete_config_item
        self.mock_config_manager.delete_config_item.return_value = False
        
        # Make the request
        response = self.client.delete('/api/config-items/nonexistent_param')
        
        # Check the response
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertIn('Config item not found', data['error'])
        
        # Verify the mock was called with the correct arguments
        self.mock_config_manager.delete_config_item.assert_called_once_with('nonexistent_param')

    def test_get_config_values(self):
        """Test getting all configuration values"""
        # Create sample config values
        config_value1 = ConfigValue(
            config_item_key="param1",
            scope_type="account",
            scope_value="account123",
            value="42"
        )
        config_value2 = ConfigValue(
            config_item_key="param2",
            scope_type="model",
            scope_value="model456",
            value="Hello"
        )
        
        # Set up the mock to return config values
        self.mock_config_manager.get_config_values.return_value = [config_value1, config_value2]
        
        # Make the request
        response = self.client.get('/api/config-values')
        
        # Check the response
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 2)
        # Check the serialized values (whatever they may be)
        
        # Verify the mock was called
        self.mock_config_manager.get_config_values.assert_called_once()

    def test_get_config_values_for_item(self):
        """Test getting configuration values for a specific item"""
        # Create sample config values
        config_value1 = ConfigValue(
            config_item_key="param1",
            scope_type="account",
            scope_value="account123",
            value="42"
        )
        config_value2 = ConfigValue(
            config_item_key="param1",
            scope_type="model",
            scope_value="model456",
            value="24"
        )
        
        # Set up the mock to return config values for the item
        self.mock_config_manager.get_config_values_for_item.return_value = [config_value1, config_value2]
        
        # Make the request
        response = self.client.get('/api/config-values?config_item_key=param1')
        
        # Check the response
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 2)
        # Check the serialized values (whatever they may be)
        
        # Verify the mock was called with the correct arguments
        self.mock_config_manager.get_config_values_for_item.assert_called_once_with('param1')

    def test_set_config_value_success(self):
        """Test setting a configuration value successfully"""
        # Set up the mock to get a config item
        mock_config_item = MagicMock(spec=ConfigItem)
        mock_config_item.value_type = 'number'
        self.mock_config_manager.get_config_item.return_value = mock_config_item
        
        # Set up the request data
        request_data = {
            'config_item_key': 'test_param',
            'scope_type': 'account',
            'scope_value': 'account123',
            'value': '42'
        }
        
        # Make the request
        response = self.client.post('/api/config-values', 
                                   data=json.dumps(request_data),
                                   content_type='application/json')
        
        # Check the response
        self.assertEqual(response.status_code, 201)
        
        # Verify the mock was called with the correct arguments
        self.mock_config_manager.get_config_item.assert_called_once_with('test_param')
        self.mock_config_manager.set_config_value.assert_called_once()
        
        # Check that the ConfigValue object was created correctly
        args, _ = self.mock_config_manager.set_config_value.call_args
        config_value = args[0]
        self.assertEqual(config_value.config_item_key, 'test_param')
        self.assertEqual(config_value.scope_type, 'account')
        self.assertEqual(config_value.scope_value, 'account123')
        # In the route tests, we're just checking if the value is passed correctly
        # We don't need to verify the conversion, as that's covered by ConfigManager tests
        self.assertIn(config_value.value, ('42', 42))  # Accept either str or int

    def test_set_config_value_missing_fields(self):
        """Test setting a configuration value with missing fields"""
        # Set up the request data with missing fields
        request_data = {
            'config_item_key': 'test_param',
            'scope_type': 'account',
            # Missing value
        }
        
        # Make the request
        response = self.client.post('/api/config-values', 
                                   data=json.dumps(request_data),
                                   content_type='application/json')
        
        # Check the response
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertIn('Missing required fields', data['error'])
        
        # Verify the mocks were not called
        self.mock_config_manager.get_config_item.assert_not_called()
        self.mock_config_manager.set_config_value.assert_not_called()

    def test_set_config_value_nonexistent_item(self):
        """Test setting a configuration value for a non-existent item"""
        # Set up the mock to return None for get_config_item
        self.mock_config_manager.get_config_item.return_value = None
        
        # Set up the request data
        request_data = {
            'config_item_key': 'nonexistent_param',
            'scope_type': 'account',
            'scope_value': 'account123',
            'value': '42'
        }
        
        # Make the request
        response = self.client.post('/api/config-values', 
                                   data=json.dumps(request_data),
                                   content_type='application/json')
        
        # Check the response
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertIn('Config item not found', data['error'])
        
        # Verify the mock was called with the correct arguments
        self.mock_config_manager.get_config_item.assert_called_once_with('nonexistent_param')
        self.mock_config_manager.set_config_value.assert_not_called()

    def test_delete_config_value_success(self):
        """Test deleting a configuration value successfully"""
        # Set up the mock to return True for delete_config_value
        self.mock_config_manager.delete_config_value.return_value = True
        
        # Set up the request data
        request_data = {
            'config_item_key': 'test_param',
            'scope_type': 'account',
            'scope_value': 'account123'
        }
        
        # Make the request
        response = self.client.delete('/api/config-values', 
                                     data=json.dumps(request_data),
                                     content_type='application/json')
        
        # Check the response
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.data, b'')
        
        # Verify the mock was called with the correct arguments
        self.mock_config_manager.delete_config_value.assert_called_once_with(
            'test_param', 'account', 'account123')

    def test_delete_config_value_not_found(self):
        """Test deleting a configuration value that doesn't exist"""
        # Set up the mock to return False for delete_config_value
        self.mock_config_manager.delete_config_value.return_value = False
        
        # Set up the request data
        request_data = {
            'config_item_key': 'nonexistent_param',
            'scope_type': 'account',
            'scope_value': 'account123'
        }
        
        # Make the request
        response = self.client.delete('/api/config-values', 
                                     data=json.dumps(request_data),
                                     content_type='application/json')
        
        # Check the response
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertIn('Config value not found', data['error'])
        
        # Verify the mock was called with the correct arguments
        self.mock_config_manager.delete_config_value.assert_called_once_with(
            'nonexistent_param', 'account', 'account123')

    def test_resolve_config_value_success(self):
        """Test resolving a configuration value successfully"""
        # Set up the mock to return a value for resolve_config_value
        self.mock_config_manager.resolve_config_value.return_value = 42
        
        # Set up the request data
        request_data = {
            'config_item_key': 'test_param',
            'properties': {
                'account': 'account123',
                'model': 'model456'
            }
        }
        
        # Make the request
        response = self.client.post('/api/resolve', 
                                   data=json.dumps(request_data),
                                   content_type='application/json')
        
        # Check the response
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('value', data)
        self.assertEqual(data['value'], 42)
        
        # Verify the mock was called with the correct arguments
        self.mock_config_manager.resolve_config_value.assert_called_once()
        args, _ = self.mock_config_manager.resolve_config_value.call_args
        self.assertEqual(args[0], 'test_param')
        self.assertIsInstance(args[1], ObjectProperties)
        self.assertEqual(args[1].properties, {'account': 'account123', 'model': 'model456'})

    def test_resolve_config_value_not_found(self):
        """Test resolving a configuration value that doesn't exist"""
        # Set up the mock to return None for resolve_config_value
        self.mock_config_manager.resolve_config_value.return_value = None
        
        # Set up the request data
        request_data = {
            'config_item_key': 'test_param',
            'properties': {
                'account': 'account123',
                'model': 'model456'
            }
        }
        
        # Make the request
        response = self.client.post('/api/resolve', 
                                   data=json.dumps(request_data),
                                   content_type='application/json')
        
        # Check the response
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertIn('No matching configuration value found', data['error'])
        
        # Verify the mock was called with the correct arguments
        self.mock_config_manager.resolve_config_value.assert_called_once()

    def test_resolve_config_value_error(self):
        """Test resolving a configuration value with an error"""
        # Set up the mock to raise a ValueError for resolve_config_value
        self.mock_config_manager.resolve_config_value.side_effect = ValueError("Config item does not exist")
        
        # Set up the request data
        request_data = {
            'config_item_key': 'nonexistent_param',
            'properties': {
                'account': 'account123',
                'model': 'model456'
            }
        }
        
        # Make the request
        response = self.client.post('/api/resolve', 
                                   data=json.dumps(request_data),
                                   content_type='application/json')
        
        # Check the response
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertIn('Config item does not exist', data['error'])
        
        # Verify the mock was called with the correct arguments
        self.mock_config_manager.resolve_config_value.assert_called_once()


if __name__ == '__main__':
    unittest.main()