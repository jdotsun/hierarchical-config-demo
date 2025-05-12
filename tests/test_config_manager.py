import unittest
from unittest.mock import MagicMock, patch
import sys
import os

# Add the parent directory to sys.path to import the modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config_manager import ConfigManager
from models import ScopeType, ConfigItem, ConfigValue, ObjectProperties


class TestConfigManager(unittest.TestCase):
    """Test case for the ConfigManager class"""

    def setUp(self):
        """Set up test fixtures before each test method is run"""
        self.config_manager = ConfigManager()
        
        # Create test scope types with different priorities (local to global)
        self.account_scope = ScopeType(name="account", priority=10)
        self.model_scope = ScopeType(name="model", priority=20)
        self.model_family_scope = ScopeType(name="model family", priority=30)
        self.provider_scope = ScopeType(name="model provider", priority=40)
        self.default_scope = ScopeType(name="default", priority=50)
        
        # Add scope types to the config manager
        self.config_manager.add_scope_type(self.account_scope)
        self.config_manager.add_scope_type(self.model_scope)
        self.config_manager.add_scope_type(self.model_family_scope)
        self.config_manager.add_scope_type(self.provider_scope)
        self.config_manager.add_scope_type(self.default_scope)
        
        # Create test config items with different value types
        self.number_config = ConfigItem(key="number_param", description="A number parameter", value_type="number")
        self.string_config = ConfigItem(key="string_param", description="A string parameter", value_type="string")
        self.blob_config = ConfigItem(key="blob_param", description="A blob parameter", value_type="blob")
        
        # Add config items to the config manager
        self.config_manager.add_config_item(self.number_config)
        self.config_manager.add_config_item(self.string_config)
        self.config_manager.add_config_item(self.blob_config)

    def test_scope_type_resolution_order(self):
        """Test that scope types are resolved in the correct order (local to global)"""
        # Get scope types and check their order
        scope_types = self.config_manager.get_scope_types()
        
        # Verify they are sorted by priority (lowest number = highest priority)
        self.assertEqual(len(scope_types), 5)
        self.assertEqual(scope_types[0].name, "account")  # Most local
        self.assertEqual(scope_types[1].name, "model")
        self.assertEqual(scope_types[2].name, "model family")
        self.assertEqual(scope_types[3].name, "model provider")
        self.assertEqual(scope_types[4].name, "default")  # Most global

    def test_resolve_config_value_account_scope(self):
        """Test resolving a configuration value at account scope"""
        # Add a config value at account scope
        account_value = ConfigValue(
            config_item_key="number_param",
            scope_type="account",
            scope_value="account123",
            value="42"
        )
        self.config_manager.set_config_value(account_value)
        
        # Add a config value at model scope that should be overshadowed
        model_value = ConfigValue(
            config_item_key="number_param",
            scope_type="model",
            scope_value="model456",
            value="24"
        )
        self.config_manager.set_config_value(model_value)
        
        # Object with matching properties
        obj_properties = ObjectProperties(properties={
            "account": "account123",
            "model": "model456"
        })
        
        # Resolve the value
        resolved_value = self.config_manager.resolve_config_value("number_param", obj_properties)
        
        # Should resolve to the account value since it has higher priority
        self.assertEqual(resolved_value, 42)  # Should be converted to int

    def test_resolve_config_value_model_scope(self):
        """Test resolving a configuration value at model scope when no account scope matches"""
        # Add a config value at model scope
        model_value = ConfigValue(
            config_item_key="number_param",
            scope_type="model",
            scope_value="model456",
            value="24"
        )
        self.config_manager.set_config_value(model_value)
        
        # Add a config value at account scope that shouldn't match
        account_value = ConfigValue(
            config_item_key="number_param",
            scope_type="account",
            scope_value="different_account",
            value="42"
        )
        self.config_manager.set_config_value(account_value)
        
        # Object with properties matching only the model scope
        obj_properties = ObjectProperties(properties={
            "account": "account789",  # Different from the one in the config
            "model": "model456"
        })
        
        # Resolve the value
        resolved_value = self.config_manager.resolve_config_value("number_param", obj_properties)
        
        # Should resolve to the model value
        self.assertEqual(resolved_value, 24)  # Should be converted to int

    def test_resolve_config_value_default_scope(self):
        """Test resolving to default scope when no other scopes match"""
        # Add only a default scope value
        default_value = ConfigValue(
            config_item_key="number_param",
            scope_type="default",
            scope_value=None,  # No scope value for default scope
            value="99"
        )
        self.config_manager.set_config_value(default_value)
        
        # Object with properties that don't match any specific config
        obj_properties = ObjectProperties(properties={
            "account": "non_existent_account",
            "model": "non_existent_model"
        })
        
        # Resolve the value
        resolved_value = self.config_manager.resolve_config_value("number_param", obj_properties)
        
        # Should resolve to the default value
        self.assertEqual(resolved_value, 99)  # Should be converted to int

    def test_resolve_config_value_with_missing_properties(self):
        """Test resolving when the object is missing some properties"""
        # Add config values at multiple scopes
        account_value = ConfigValue(
            config_item_key="number_param",
            scope_type="account",
            scope_value="account123",
            value="42"
        )
        self.config_manager.set_config_value(account_value)
        
        model_value = ConfigValue(
            config_item_key="number_param",
            scope_type="model",
            scope_value="model456",
            value="24"
        )
        self.config_manager.set_config_value(model_value)
        
        # Object missing the account property
        obj_properties = ObjectProperties(properties={
            "model": "model456"
        })
        
        # Resolve the value
        resolved_value = self.config_manager.resolve_config_value("number_param", obj_properties)
        
        # Should resolve to the model value since account property is missing
        self.assertEqual(resolved_value, 24)

    def test_resolve_nonexistent_config_item(self):
        """Test resolving a configuration that doesn't exist"""
        obj_properties = ObjectProperties(properties={
            "account": "account123"
        })
        
        # Try to resolve a non-existent config item
        with self.assertRaises(ValueError):
            self.config_manager.resolve_config_value("nonexistent_param", obj_properties)

    def test_resolve_no_matching_config_value(self):
        """Test resolving a configuration when no values match the properties"""
        # Add a config value that won't match our properties
        account_value = ConfigValue(
            config_item_key="number_param",
            scope_type="account",
            scope_value="different_account",
            value="42"
        )
        self.config_manager.set_config_value(account_value)
        
        # Object with properties that don't match any specific config
        obj_properties = ObjectProperties(properties={
            "account": "account123",
            "model": "model456"
        })
        
        # Resolve the value (no error, but should return None)
        resolved_value = self.config_manager.resolve_config_value("number_param", obj_properties)
        
        # Should resolve to None
        self.assertIsNone(resolved_value)

    def test_resolve_string_config_value(self):
        """Test resolving a string configuration value"""
        # Add a string config value
        string_value = ConfigValue(
            config_item_key="string_param",
            scope_type="account",
            scope_value="account123",
            value="Hello, world!"
        )
        self.config_manager.set_config_value(string_value)
        
        # Object with matching properties
        obj_properties = ObjectProperties(properties={
            "account": "account123"
        })
        
        # Resolve the value
        resolved_value = self.config_manager.resolve_config_value("string_param", obj_properties)
        
        # Should resolve to the string value
        self.assertEqual(resolved_value, "Hello, world!")
        self.assertIsInstance(resolved_value, str)

    def test_resolve_float_config_value(self):
        """Test resolving a float configuration value"""
        # Add a float config value
        float_value = ConfigValue(
            config_item_key="number_param",
            scope_type="account",
            scope_value="account123",
            value="3.14159"
        )
        self.config_manager.set_config_value(float_value)
        
        # Object with matching properties
        obj_properties = ObjectProperties(properties={
            "account": "account123"
        })
        
        # Resolve the value
        resolved_value = self.config_manager.resolve_config_value("number_param", obj_properties)
        
        # Should resolve to the float value
        self.assertEqual(resolved_value, 3.14159)
        self.assertIsInstance(resolved_value, float)

    def test_convert_value_with_various_types(self):
        """Test the _convert_value helper method with various types"""
        # Test converting to number (int)
        int_result = self.config_manager._convert_value("42", "number")
        self.assertEqual(int_result, 42)
        self.assertIsInstance(int_result, int)
        
        # Test converting to number (float)
        float_result = self.config_manager._convert_value("3.14159", "number")
        self.assertEqual(float_result, 3.14159)
        self.assertIsInstance(float_result, float)
        
        # Test converting to string
        string_result = self.config_manager._convert_value(42, "string")
        self.assertEqual(string_result, "42")
        self.assertIsInstance(string_result, str)
        
        # Test converting to blob (should pass through)
        blob_result = self.config_manager._convert_value(b"binary data", "blob")
        self.assertEqual(blob_result, b"binary data")
        
        # Test handling invalid number conversion
        invalid_number = self.config_manager._convert_value("not a number", "number")
        self.assertEqual(invalid_number, "not a number")  # Should return as-is
        self.assertIsInstance(invalid_number, str)

    def test_delete_config_value(self):
        """Test deleting a configuration value"""
        # Add a config value
        config_value = ConfigValue(
            config_item_key="number_param",
            scope_type="account",
            scope_value="account123",
            value="42"
        )
        self.config_manager.set_config_value(config_value)
        
        # Verify it exists
        obj_properties = ObjectProperties(properties={"account": "account123"})
        self.assertEqual(self.config_manager.resolve_config_value("number_param", obj_properties), 42)
        
        # Delete the config value
        result = self.config_manager.delete_config_value("number_param", "account", "account123")
        self.assertTrue(result)  # Should return True on successful deletion
        
        # Verify it's gone
        self.assertIsNone(self.config_manager.resolve_config_value("number_param", obj_properties))
        
        # Try to delete it again
        result = self.config_manager.delete_config_value("number_param", "account", "account123")
        self.assertFalse(result)  # Should return False since it doesn't exist

    def test_delete_config_item(self):
        """Test deleting a configuration item and all its values"""
        # Add a couple of config values for the same item
        value1 = ConfigValue(
            config_item_key="number_param",
            scope_type="account",
            scope_value="account123",
            value="42"
        )
        value2 = ConfigValue(
            config_item_key="number_param",
            scope_type="model",
            scope_value="model456",
            value="24"
        )
        self.config_manager.set_config_value(value1)
        self.config_manager.set_config_value(value2)
        
        # Delete the config item
        result = self.config_manager.delete_config_item("number_param")
        self.assertTrue(result)  # Should return True on successful deletion
        
        # Verify the item is gone
        with self.assertRaises(ValueError):
            obj_properties = ObjectProperties(properties={"account": "account123"})
            self.config_manager.resolve_config_value("number_param", obj_properties)
        
        # Try to delete it again
        result = self.config_manager.delete_config_item("number_param")
        self.assertFalse(result)  # Should return False since it doesn't exist
        

if __name__ == '__main__':
    unittest.main()