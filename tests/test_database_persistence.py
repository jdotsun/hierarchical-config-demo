import unittest
from unittest.mock import MagicMock, patch, call
import sys
import os

# Add the parent directory to sys.path to import the modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config_manager import ConfigManager
from models import ScopeType, ConfigItem, ConfigValue, ObjectProperties


class TestDatabasePersistence(unittest.TestCase):
    """Test case for the database persistence features of ConfigManager"""

    def setUp(self):
        """Set up test fixtures before each test method is run"""
        self.config_manager = ConfigManager()
        
        # Create a mock database session
        self.mock_session = MagicMock()
        self.config_manager.db_session = self.mock_session
        
        # Create test data
        self.scope_type = ScopeType(name="account", priority=10)
        self.config_item = ConfigItem(key="test_param", description="A test parameter", value_type="number")
        self.config_value = ConfigValue(
            config_item_key="test_param",
            scope_type="account",
            scope_value="account123",
            value="42"
        )

    def test_add_scope_type_with_db_persistence(self):
        """Test adding a scope type with database persistence"""
        # Mock the query result for existing scope type check
        mock_query = self.mock_session.query.return_value
        mock_filter = mock_query.filter_by.return_value
        mock_filter.first.return_value = None  # No existing scope type
        
        # Add the scope type
        self.config_manager.add_scope_type(self.scope_type)
        
        # Verify the session was used correctly
        self.mock_session.query.assert_called_once_with(ScopeType)
        self.mock_session.query.return_value.filter_by.assert_called_once_with(name=self.scope_type.name)
        self.mock_session.add.assert_called_once_with(self.scope_type)
        self.mock_session.commit.assert_called_once()
        
        # Verify the scope type was added to the in-memory cache
        scope_types = self.config_manager.get_scope_types()
        self.assertEqual(len(scope_types), 1)
        self.assertEqual(scope_types[0].name, "account")

    def test_add_scope_type_already_exists(self):
        """Test adding a scope type that already exists in the database"""
        # Mock the query result for existing scope type check
        mock_query = self.mock_session.query.return_value
        mock_filter = mock_query.filter_by.return_value
        mock_filter.first.return_value = self.scope_type  # Scope type already exists
        
        # Add the scope type
        self.config_manager.add_scope_type(self.scope_type)
        
        # Verify the session was used correctly
        self.mock_session.query.assert_called_once_with(ScopeType)
        self.mock_session.query.return_value.filter_by.assert_called_once_with(name=self.scope_type.name)
        
        # Verify add and commit were not called
        self.mock_session.add.assert_not_called()
        self.mock_session.commit.assert_not_called()
        
        # Verify the scope type was still added to the in-memory cache
        scope_types = self.config_manager.get_scope_types()
        self.assertEqual(len(scope_types), 1)
        self.assertEqual(scope_types[0].name, "account")

    def test_add_config_item_with_db_persistence(self):
        """Test adding a config item with database persistence"""
        # Mock the query result for existing config item check
        mock_query = self.mock_session.query.return_value
        mock_filter = mock_query.filter_by.return_value
        mock_filter.first.return_value = None  # No existing config item
        
        # Add the config item
        self.config_manager.add_config_item(self.config_item)
        
        # Verify the session was used correctly
        self.mock_session.query.assert_called_once_with(ConfigItem)
        self.mock_session.query.return_value.filter_by.assert_called_once_with(key=self.config_item.key)
        self.mock_session.add.assert_called_once_with(self.config_item)
        self.mock_session.commit.assert_called_once()
        
        # Verify the config item was added to the in-memory cache
        config_items = self.config_manager.get_config_items()
        self.assertEqual(len(config_items), 1)
        self.assertEqual(config_items[0].key, "test_param")

    def test_set_config_value_with_db_persistence_new_value(self):
        """Test setting a new config value with database persistence"""
        # Add prerequisites to in-memory cache
        self.config_manager.add_scope_type(self.scope_type)
        self.config_manager.add_config_item(self.config_item)
        
        # Reset mock to clear calls from add_scope_type and add_config_item
        self.mock_session.reset_mock()
        
        # Mock the query result for existing config value check
        mock_query = self.mock_session.query.return_value
        mock_filter = mock_query.filter_by.return_value
        mock_filter.first.return_value = None  # No existing config value
        
        # Set the config value
        self.config_manager.set_config_value(self.config_value)
        
        # Verify the session was used correctly
        self.mock_session.query.assert_called_once_with(ConfigValue)
        self.mock_session.query.return_value.filter_by.assert_called_once_with(
            config_item_key=self.config_value.config_item_key,
            scope_type=self.config_value.scope_type,
            scope_value=self.config_value.scope_value
        )
        self.mock_session.add.assert_called_once_with(self.config_value)
        self.mock_session.commit.assert_called_once()
        
        # Verify the config value was added to the in-memory cache
        config_values = self.config_manager.get_config_values()
        self.assertEqual(len(config_values), 1)
        self.assertEqual(config_values[0].value, "42")

    def test_set_config_value_with_db_persistence_update_existing(self):
        """Test updating an existing config value with database persistence"""
        # Add prerequisites to in-memory cache
        self.config_manager.add_scope_type(self.scope_type)
        self.config_manager.add_config_item(self.config_item)
        
        # Reset mock to clear calls from add_scope_type and add_config_item
        self.mock_session.reset_mock()
        
        # Create an existing config value with the same key but different value
        existing_value = ConfigValue(
            config_item_key="test_param",
            scope_type="account",
            scope_value="account123",
            value="24"  # Different value
        )
        
        # Mock the query result for existing config value check
        mock_query = self.mock_session.query.return_value
        mock_filter = mock_query.filter_by.return_value
        mock_filter.first.return_value = existing_value  # Existing config value
        
        # Set the new config value
        self.config_manager.set_config_value(self.config_value)
        
        # Verify the session was used correctly
        self.mock_session.query.assert_called_once_with(ConfigValue)
        self.mock_session.query.return_value.filter_by.assert_called_once_with(
            config_item_key=self.config_value.config_item_key,
            scope_type=self.config_value.scope_type,
            scope_value=self.config_value.scope_value
        )
        
        # Verify add was not called
        self.mock_session.add.assert_not_called()
        
        # Verify commit was called
        self.mock_session.commit.assert_called_once()
        
        # Verify the existing value was updated
        self.assertEqual(existing_value.value, "42")
        
        # Verify the config value was updated in the in-memory cache
        config_values = self.config_manager.get_config_values()
        self.assertEqual(len(config_values), 1)
        self.assertEqual(config_values[0].value, "42")

    def test_delete_config_value_with_db_persistence(self):
        """Test deleting a config value with database persistence"""
        # Add prerequisites to in-memory cache
        self.config_manager.add_scope_type(self.scope_type)
        self.config_manager.add_config_item(self.config_item)
        self.config_manager.set_config_value(self.config_value)
        
        # Reset mock to clear calls from setup
        self.mock_session.reset_mock()
        
        # Mock the query result for existing config value check
        mock_query = self.mock_session.query.return_value
        mock_filter = mock_query.filter_by.return_value
        mock_filter.first.return_value = self.config_value  # Existing config value
        
        # Delete the config value
        result = self.config_manager.delete_config_value(
            "test_param",  # Using string value directly instead of the property
            "account",
            "account123"
        )
        
        # Verify the result
        self.assertTrue(result)
        
        # Verify the session was used correctly
        self.mock_session.query.assert_called_once_with(ConfigValue)
        self.mock_session.query.return_value.filter_by.assert_called_once_with(
            config_item_key=self.config_value.config_item_key,
            scope_type=self.config_value.scope_type,
            scope_value=self.config_value.scope_value
        )
        self.mock_session.delete.assert_called_once_with(self.config_value)
        self.mock_session.commit.assert_called_once()
        
        # Verify the config value was removed from the in-memory cache
        config_values = self.config_manager.get_config_values()
        self.assertEqual(len(config_values), 0)

    def test_delete_config_item_with_db_persistence(self):
        """Test deleting a config item with database persistence"""
        # Add prerequisites to in-memory cache
        self.config_manager.add_scope_type(self.scope_type)
        self.config_manager.add_config_item(self.config_item)
        self.config_manager.set_config_value(self.config_value)
        
        # Reset mock to clear calls from setup
        self.mock_session.reset_mock()
        
        # Mock the query result for existing config item check
        mock_query = self.mock_session.query.return_value
        mock_filter = mock_query.filter_by.return_value
        mock_filter.first.return_value = self.config_item  # Existing config item
        
        # Delete the config item
        result = self.config_manager.delete_config_item("test_param")
        
        # Verify the result
        self.assertTrue(result)
        
        # Verify the session was used correctly
        self.mock_session.query.assert_called_once_with(ConfigItem)
        self.mock_session.query.return_value.filter_by.assert_called_once_with(key=self.config_item.key)
        self.mock_session.delete.assert_called_once_with(self.config_item)
        self.mock_session.commit.assert_called_once()
        
        # Verify the config item was removed from the in-memory cache
        config_items = self.config_manager.get_config_items()
        self.assertEqual(len(config_items), 0)
        
        # Verify the config values were also removed from the in-memory cache
        config_values = self.config_manager.get_config_values()
        self.assertEqual(len(config_values), 0)

    def test_get_scope_types_with_db_refresh(self):
        """Test refreshing scope types from the database"""
        # Create scope types in the database
        db_scope_type1 = ScopeType(name="account", priority=10)
        db_scope_type2 = ScopeType(name="model", priority=20)
        
        # Mock the query result for all scope types
        mock_query = self.mock_session.query.return_value
        mock_query.all.return_value = [db_scope_type1, db_scope_type2]
        
        # Get the scope types
        scope_types = self.config_manager.get_scope_types()
        
        # Verify the session was used correctly
        self.mock_session.query.assert_called_once_with(ScopeType)
        self.mock_session.query.return_value.all.assert_called_once()
        
        # Verify the scope types were added to the in-memory cache
        self.assertEqual(len(scope_types), 2)
        self.assertEqual(scope_types[0].name, "account")
        self.assertEqual(scope_types[1].name, "model")

    def test_get_config_items_with_db_refresh(self):
        """Test refreshing config items from the database"""
        # Create config items in the database
        db_config_item1 = ConfigItem(key="param1", description="Parameter 1", value_type="number")
        db_config_item2 = ConfigItem(key="param2", description="Parameter 2", value_type="string")
        
        # Mock the query result for all config items
        mock_query = self.mock_session.query.return_value
        mock_query.all.return_value = [db_config_item1, db_config_item2]
        
        # Get the config items
        config_items = self.config_manager.get_config_items()
        
        # Verify the session was used correctly
        self.mock_session.query.assert_called_once_with(ConfigItem)
        self.mock_session.query.return_value.all.assert_called_once()
        
        # Verify the config items were added to the in-memory cache
        self.assertEqual(len(config_items), 2)
        self.assertEqual(config_items[0].key, "param1")
        self.assertEqual(config_items[1].key, "param2")

    def test_get_config_values_with_db_refresh(self):
        """Test refreshing config values from the database"""
        # Add prerequisites to in-memory cache
        self.config_manager.add_scope_type(self.scope_type)
        self.config_manager.add_config_item(self.config_item)
        
        # Reset mock to clear calls from setup
        self.mock_session.reset_mock()
        
        # Create config values in the database
        db_value1 = ConfigValue(
            config_item_key="test_param",
            scope_type="account",
            scope_value="account123",
            value="42"
        )
        db_value2 = ConfigValue(
            config_item_key="test_param",
            scope_type="model",
            scope_value="model456",
            value="24"
        )
        
        # Mock the query result for all config values
        mock_query = self.mock_session.query.return_value
        mock_query.all.return_value = [db_value1, db_value2]
        
        # Get the config values
        config_values = self.config_manager.get_config_values()
        
        # Verify the session was used correctly
        self.mock_session.query.assert_called_once_with(ConfigValue)
        self.mock_session.query.return_value.all.assert_called_once()
        
        # Verify the config values were added to the in-memory cache
        self.assertEqual(len(config_values), 2)
        
        # Verify the correct keys were generated for the in-memory cache
        # We check the entire collection since the order is not guaranteed
        keys = [(v.config_item_key, v.scope_type, v.scope_value) for v in config_values]
        self.assertIn(("test_param", "account", "account123"), keys)
        self.assertIn(("test_param", "model", "model456"), keys)

    def test_db_session_exception_handling(self):
        """Test exception handling for database operations"""
        # Add prerequisites to in-memory cache
        self.config_manager.add_scope_type(self.scope_type)
        self.config_manager.add_config_item(self.config_item)
        
        # Reset mock to clear calls from setup
        self.mock_session.reset_mock()
        
        # Make the mock session raise an exception on query
        self.mock_session.query.side_effect = Exception("Database error")
        
        # Get the scope types (should handle the exception gracefully)
        scope_types = self.config_manager.get_scope_types()
        
        # Verify the session was used correctly
        self.mock_session.query.assert_called_once_with(ScopeType)
        
        # Verify the in-memory cache was still used
        self.assertEqual(len(scope_types), 1)
        self.assertEqual(scope_types[0].name, "account")


if __name__ == '__main__':
    unittest.main()