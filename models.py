from typing import Dict, List, Optional, Union, Any
from sqlalchemy import Column, String, Integer, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from dataclasses import dataclass

Base = declarative_base()

class ScopeType(Base):
    """Represents a scope type in the configuration hierarchy"""
    __tablename__ = "scope_types"
    
    name = Column(String(100), primary_key=True)
    priority = Column(Integer, nullable=False)  # Lower number means more local (higher priority)
    
    def __eq__(self, other) -> bool:
        if not isinstance(other, ScopeType):
            return False
        # Safely handle comparison with SQLAlchemy column objects
        name1 = str(self.name) if self.name is not None else None
        name2 = str(other.name) if other.name is not None else None
        return name1 == name2

    def __hash__(self):
        # Use string representation to avoid SQLAlchemy ColumnElement hash issues
        name_str = str(self.name) if self.name is not None else None
        return hash(name_str)
    
    def to_dict(self):
        return {
            "name": self.name,
            "priority": self.priority
        }


class ConfigItem(Base):
    """Represents a configuration item"""
    __tablename__ = "config_items"
    
    key = Column(String(100), primary_key=True)
    description = Column(String(255), nullable=False)
    value_type = Column(String(50), nullable=False)  # 'string', 'number', or 'blob'
    
    values = relationship("ConfigValue", back_populates="config_item", cascade="all, delete-orphan")
    
    def __eq__(self, other) -> bool:
        if not isinstance(other, ConfigItem):
            return False
        # Safely handle comparison with SQLAlchemy column objects
        key1 = str(self.key) if self.key is not None else None
        key2 = str(other.key) if other.key is not None else None
        return key1 == key2

    def __hash__(self):
        # Use string representation to avoid SQLAlchemy ColumnElement hash issues
        key_str = str(self.key) if self.key is not None else None
        return hash(key_str)
    
    def to_dict(self):
        return {
            "key": self.key,
            "description": self.description,
            "value_type": self.value_type
        }


class ConfigValue(Base):
    """Represents a configuration value with its scope"""
    __tablename__ = "config_values"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    config_item_key = Column(String(100), ForeignKey("config_items.key"), nullable=False)
    scope_type = Column(String(100), ForeignKey("scope_types.name"), nullable=False)
    scope_value = Column(String(255), nullable=True)  # None for global scope
    value = Column(Text, nullable=False)
    
    config_item = relationship("ConfigItem", back_populates="values")
    
    # Create a unique constraint for the composite key
    __table_args__ = (
        UniqueConstraint('config_item_key', 'scope_type', 'scope_value', name='unique_config_value'),
    )
    
    def serialize(self) -> Dict[str, Any]:
        """Convert the config value to a serializable dictionary"""
        return {
            "config_item_key": self.config_item_key,
            "scope_type": self.scope_type,
            "scope_value": self.scope_value,
            "value": self.value,
        }


@dataclass
class ObjectProperties:
    """Represents an object with properties used for configuration resolution"""
    properties: Dict[str, str]
