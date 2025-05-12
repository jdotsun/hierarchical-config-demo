from typing import Dict, List, Optional, Union, Any
from models import ConfigItem, ConfigValue, ScopeType, ObjectProperties
from sqlalchemy.orm import Session
import logging

class ConfigManager:
    """Manages configuration items, values, and scope types with database persistence"""
    
    def __init__(self):
        # Store config items by key
        self.config_items: Dict[str, ConfigItem] = {}
        
        # Store scope types by name
        self.scope_types: Dict[str, ScopeType] = {}
        
        # Store config values by a composite key: (config_item_key, scope_type, scope_value)
        self.config_values: Dict[tuple, ConfigValue] = {}
        
        # Database session
        self.db_session: Optional[Session] = None
    
    def add_scope_type(self, scope_type: ScopeType) -> None:
        """Add a new scope type to the hierarchy with database persistence"""
        # Store in memory
        self.scope_types[scope_type.name] = scope_type
        
        # If we have a database session, persist to database
        if self.db_session:
            # Check if this scope type already exists
            existing_scope = self.db_session.query(ScopeType).filter_by(name=scope_type.name).first()
            
            if not existing_scope:
                # Add the new scope type to the database
                self.db_session.add(scope_type)
                self.db_session.commit()
                
        logging.debug(f"Added scope type: {scope_type.name} with priority {scope_type.priority}")
    
    def get_scope_types(self) -> List[ScopeType]:
        """Get all scope types sorted by priority (local to global)"""
        # If we have a database session, get from database
        if self.db_session:
            try:
                # Query all scope types from the database
                db_scope_types = self.db_session.query(ScopeType).all()
                
                # Update our in-memory cache
                for scope_type in db_scope_types:
                    self.scope_types[scope_type.name] = scope_type
            except Exception as e:
                logging.error(f"Error fetching scope types from database: {e}")
        
        # Return sorted scope types from in-memory cache
        return sorted(self.scope_types.values(), key=lambda x: x.priority)
    
    def add_config_item(self, config_item: ConfigItem) -> None:
        """Add a new configuration item with database persistence"""
        # Store in memory
        self.config_items[config_item.key] = config_item
        
        # If we have a database session, persist to database
        if self.db_session:
            # Check if this config item already exists
            existing_item = self.db_session.query(ConfigItem).filter_by(key=config_item.key).first()
            
            if not existing_item:
                # Add the new config item to the database
                self.db_session.add(config_item)
                self.db_session.commit()
                
        logging.debug(f"Added config item: {config_item.key}")
    
    def get_config_items(self) -> List[ConfigItem]:
        """Get all configuration items with database refresh"""
        # If we have a database session, get from database
        if self.db_session:
            try:
                # Query all config items from the database
                db_config_items = self.db_session.query(ConfigItem).all()
                
                # Update our in-memory cache
                for config_item in db_config_items:
                    self.config_items[config_item.key] = config_item
            except Exception as e:
                logging.error(f"Error fetching config items from database: {e}")
        
        # Return config items from in-memory cache
        return list(self.config_items.values())
    
    def get_config_item(self, key: str) -> Optional[ConfigItem]:
        """Get a configuration item by key"""
        return self.config_items.get(key)
    
    def set_config_value(self, config_value: ConfigValue) -> None:
        """Set a configuration value with database persistence"""
        # Validate that the config item exists
        if config_value.config_item_key not in self.config_items:
            raise ValueError(f"Config item '{config_value.config_item_key}' does not exist")
        
        # Validate that the scope type exists
        if config_value.scope_type not in self.scope_types:
            raise ValueError(f"Scope type '{config_value.scope_type}' does not exist")
        
        # Create a tuple key for the config value
        key = (config_value.config_item_key, config_value.scope_type, config_value.scope_value)
        
        # Store the config value in memory
        self.config_values[key] = config_value
        
        # If we have a database session, persist to the database
        if self.db_session:
            # Check if this config value already exists in the database
            existing_value = self.db_session.query(ConfigValue).filter_by(
                config_item_key=config_value.config_item_key,
                scope_type=config_value.scope_type,
                scope_value=config_value.scope_value
            ).first()
            
            if existing_value:
                # Update existing value
                existing_value.value = config_value.value
            else:
                # Add new value
                self.db_session.add(config_value)
                
            # Commit the transaction
            self.db_session.commit()
        
        logging.debug(f"Set config value for {key}: {config_value.value}")
    
    def get_config_values(self) -> List[ConfigValue]:
        """Get all configuration values with database refresh"""
        # If we have a database session, get from database
        if self.db_session:
            try:
                # Query all config values from the database
                db_config_values = self.db_session.query(ConfigValue).all()
                
                # Update our in-memory cache
                for value in db_config_values:
                    key = (value.config_item_key, value.scope_type, value.scope_value)
                    self.config_values[key] = value
            except Exception as e:
                logging.error(f"Error fetching config values from database: {e}")
        
        # Return config values from in-memory cache
        return list(self.config_values.values())
    
    def get_config_values_for_item(self, config_item_key: str) -> List[ConfigValue]:
        """Get all configuration values for a specific config item"""
        return [v for k, v in self.config_values.items() if k[0] == config_item_key]
    
    def resolve_config_value(self, config_item_key: str, obj_properties: ObjectProperties) -> Optional[Any]:
        """
        Resolve a configuration value based on object properties.
        
        Args:
            config_item_key: The key of the configuration item
            obj_properties: The properties of the object to match against scopes
        
        Returns:
            The resolved configuration value, or None if not found
        """
        # Check if the config item exists
        if config_item_key not in self.config_items:
            raise ValueError(f"Config item '{config_item_key}' does not exist")
        
        # Get all scope types in order of priority (local to global)
        scope_types = self.get_scope_types()
        
        # Try to find a matching config value for each scope type
        for scope_type in scope_types:
            scope_type_name = scope_type.name
            
            # Skip if the object doesn't have this property
            if scope_type_name != "default" and scope_type_name not in obj_properties.properties:
                continue
            
            # Get the value of the property for this scope type
            prop_value = obj_properties.properties.get(scope_type_name)
            
            # If this is a "default" scope type, it doesn't need a property value
            if scope_type_name == "default":
                key = (config_item_key, scope_type_name, None)
                if key in self.config_values:
                    logging.debug(f"Resolved config value for {config_item_key} using default scope")
                    return self.config_values[key].value
            # For other scope types, we need to match the property value
            elif prop_value:
                key = (config_item_key, scope_type_name, prop_value)
                if key in self.config_values:
                    logging.debug(f"Resolved config value for {config_item_key} using {scope_type_name} scope with value {prop_value}")
                    return self.config_values[key].value
        
        # No matching config value found
        logging.debug(f"No config value found for {config_item_key}")
        return None
    
    def delete_config_value(self, config_item_key: str, scope_type: str, scope_value: Optional[str]) -> bool:
        """Delete a configuration value with database persistence"""
        key = (config_item_key, scope_type, scope_value)
        
        # Delete from in-memory cache
        found_in_memory = key in self.config_values
        if found_in_memory:
            del self.config_values[key]
            
        # Delete from database if we have a session
        found_in_db = False
        if self.db_session:
            # Find and delete the value in the database
            value = self.db_session.query(ConfigValue).filter_by(
                config_item_key=config_item_key,
                scope_type=scope_type,
                scope_value=scope_value
            ).first()
            
            if value:
                found_in_db = True
                self.db_session.delete(value)
                self.db_session.commit()
                
        success = found_in_memory or found_in_db
        if success:
            logging.debug(f"Deleted config value for {key}")
            
        return success
    
    def delete_config_item(self, key: str) -> bool:
        """Delete a configuration item and all associated values with database persistence"""
        found_in_memory = key in self.config_items
        
        if found_in_memory:
            # Delete all config values for this item from memory
            keys_to_delete = [k for k in self.config_values.keys() if k[0] == key]
            for k in keys_to_delete:
                del self.config_values[k]
            
            # Delete the config item from memory
            del self.config_items[key]
        
        # If we have a database session, delete from the database
        found_in_db = False
        if self.db_session:
            # Find the config item
            config_item = self.db_session.query(ConfigItem).filter_by(key=key).first()
            
            if config_item:
                found_in_db = True
                # SQLAlchemy cascade will handle deleting associated values
                self.db_session.delete(config_item)
                self.db_session.commit()
        
        success = found_in_memory or found_in_db
        if success:
            logging.debug(f"Deleted config item: {key}")
            
        return success
