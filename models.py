from dataclasses import dataclass
from typing import Dict, List, Optional, Union, Any

@dataclass
class ScopeType:
    """Represents a scope type in the configuration hierarchy"""
    name: str
    priority: int  # Lower number means more local (higher priority)

    def __eq__(self, other):
        if not isinstance(other, ScopeType):
            return False
        return self.name == other.name

    def __hash__(self):
        return hash(self.name)

@dataclass
class ConfigItem:
    """Represents a configuration item"""
    key: str
    description: str
    value_type: str  # 'string', 'number', or 'blob'

    def __eq__(self, other):
        if not isinstance(other, ConfigItem):
            return False
        return self.key == other.key

    def __hash__(self):
        return hash(self.key)

@dataclass
class ConfigValue:
    """Represents a configuration value with its scope"""
    config_item_key: str
    scope_type: str
    scope_value: Optional[str]  # None for global scope
    value: Union[str, int, float, bytes]
    
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
