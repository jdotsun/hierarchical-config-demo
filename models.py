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
        return self.name == other.name

    def __hash__(self):
        return hash(self.name)
    
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
        return self.key == other.key

    def __hash__(self):
        return hash(self.key)
    
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
