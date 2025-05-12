import os
import logging
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from models import Base, ConfigItem, ConfigValue, ScopeType
from config_manager import ConfigManager
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET")
CORS(app)

# Configure SQLAlchemy
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Create database engine and session
db_url = os.environ.get("DATABASE_URL")
if not db_url:
    raise ValueError("DATABASE_URL environment variable is not set")
    
engine = create_engine(db_url)
Session = sessionmaker(bind=engine)
db_session = Session()

# Create all tables
Base.metadata.create_all(engine)

# Initialize the configuration manager
config_manager = ConfigManager()
config_manager.db_session = db_session

# Initialize default scope types if they don't exist yet
default_scope_types = [
    {"name": "account", "priority": 10},
    {"name": "model", "priority": 20},
    {"name": "model family", "priority": 30},
    {"name": "model provider", "priority": 40},
    {"name": "default", "priority": 50}
]

# Add scope types to database if they don't exist
for scope_data in default_scope_types:
    existing_scope = db_session.query(ScopeType).filter_by(name=scope_data["name"]).first()
    if not existing_scope:
        scope_type = ScopeType(name=scope_data["name"], priority=scope_data["priority"])
        db_session.add(scope_type)
        db_session.commit()
        config_manager.add_scope_type(scope_type)
        logging.debug(f"Added scope type to database: {scope_type.name}")
    else:
        config_manager.add_scope_type(existing_scope)

# Load all existing config items from the database
existing_items = db_session.query(ConfigItem).all()
for item in existing_items:
    config_manager.add_config_item(item)
    logging.debug(f"Loaded config item from database: {item.key}")

# Load existing config values from database, but only for config items we already know about
existing_values = db_session.query(ConfigValue).all()
for value in existing_values:
    if value.config_item_key in [item.key for item in config_manager.get_config_items()]:
        try:
            config_manager.set_config_value(value)
            logging.debug(f"Loaded config value from database: {value.config_item_key}/{value.scope_type}/{value.scope_value}")
        except Exception as e:
            logging.error(f"Error loading config value: {e}")

# Close the database session
db_session.close()

# Configure routes
def configure_routes():
    from routes import register_routes
    register_routes(app, config_manager)

# Teardown app context
@app.teardown_appcontext
def shutdown_session(exception=None):
    if hasattr(config_manager, 'db_session') and config_manager.db_session is not None:
        config_manager.db_session.close()

# Create a new database session for each request
@app.before_request
def before_request():
    # Create a new session for this request
    db_session = Session()
    # Assign it to the config manager
    config_manager.db_session = db_session

# Export app and configure_routes for use in main.py
__all__ = ['app', 'configure_routes']
