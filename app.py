import os
import logging
from flask import Flask
from flask_cors import CORS
from models import ConfigItem, ConfigValue, ScopeType
from config_manager import ConfigManager

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET")
CORS(app)

# Initialize the configuration manager
config_manager = ConfigManager()

# Initialize default scope types
scope_types = [
    ScopeType(name="account", priority=10),
    ScopeType(name="model", priority=20),
    ScopeType(name="model family", priority=30),
    ScopeType(name="model provider", priority=40),
    ScopeType(name="default", priority=50)
]

for scope_type in scope_types:
    config_manager.add_scope_type(scope_type)

# Define sample config items (these would normally be created through the UI)
config_manager.add_config_item(ConfigItem(key="min_acct_size", description="Minimum account size", value_type="number"))
config_manager.add_config_item(ConfigItem(key="default_timeout", description="Default timeout in seconds", value_type="number"))
config_manager.add_config_item(ConfigItem(key="welcome_message", description="Welcome message for users", value_type="string"))

# Configure routes
def configure_routes():
    from routes import register_routes
    register_routes(app, config_manager)

# Export app and configure_routes for use in main.py
__all__ = ['app', 'configure_routes']
