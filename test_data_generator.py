"""
Script to generate test configuration data for visualization demos.
This creates a set of realistic configuration scenarios that demonstrate
the hierarchical nature of configuration resolution.
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
import os
from models import Base, ConfigItem, ConfigValue, ScopeType

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_test_data():
    """Generate test configuration data for visualization demos."""
    # Database connection
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is not set")
        
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)
    session = Session(engine)
    
    # Clear existing data
    try:
        logger.info("Clearing existing configuration data...")
        session.query(ConfigValue).delete()
        session.query(ConfigItem).delete()
        session.query(ScopeType).delete()
        session.commit()
        logger.info("Existing data cleared.")
    except Exception as e:
        session.rollback()
        logger.error(f"Error clearing data: {e}")
        raise
    
    # Create scope types
    logger.info("Creating scope types...")
    scope_types = [
        ScopeType(name="account", priority=10),
        ScopeType(name="model", priority=20),
        ScopeType(name="model family", priority=30),
        ScopeType(name="model provider", priority=40),
        ScopeType(name="default", priority=50)
    ]
    
    for scope_type in scope_types:
        session.add(scope_type)
    session.commit()
    logger.info("Scope types created.")
    
    # Create configuration items
    logger.info("Creating configuration items...")
    config_items = [
        ConfigItem(
            key="risk_tolerance", 
            description="Risk tolerance level for investment decisions",
            value_type="number"
        ),
        ConfigItem(
            key="trade_frequency", 
            description="Maximum number of trades per day",
            value_type="number"
        ),
        ConfigItem(
            key="cash_reserve", 
            description="Percentage of portfolio to keep as cash reserve",
            value_type="number"
        ),
        ConfigItem(
            key="market_hours_only", 
            description="Whether to trade only during market hours",
            value_type="string"
        ),
        ConfigItem(
            key="rebalance_threshold", 
            description="Portfolio deviation threshold for rebalancing",
            value_type="number"
        )
    ]
    
    for item in config_items:
        session.add(item)
    session.commit()
    logger.info("Configuration items created.")
    
    # Create configuration values with cascading patterns
    logger.info("Creating configuration values...")
    
    # Define scope values for each scope type
    accounts = ["retail", "institutional", "high_net_worth", "retirement"]
    models = ["growth", "value", "income", "balanced"]
    model_families = ["active", "passive", "hybrid"]
    model_providers = ["provider_a", "provider_b", "provider_c"]
    
    # Create configuration values for risk_tolerance
    # This demonstrates a cascading pattern where lower scopes override higher scopes
    config_values = [
        # Default value
        ConfigValue(config_item_key="risk_tolerance", scope_type="default", scope_value=None, value="5.0"),
        
        # Provider-level overrides
        ConfigValue(config_item_key="risk_tolerance", scope_type="model provider", scope_value="provider_a", value="4.5"),
        ConfigValue(config_item_key="risk_tolerance", scope_type="model provider", scope_value="provider_b", value="5.5"),
        
        # Family-level overrides
        ConfigValue(config_item_key="risk_tolerance", scope_type="model family", scope_value="active", value="6.0"),
        ConfigValue(config_item_key="risk_tolerance", scope_type="model family", scope_value="passive", value="4.0"),
        
        # Model-level overrides
        ConfigValue(config_item_key="risk_tolerance", scope_type="model", scope_value="growth", value="7.0"),
        ConfigValue(config_item_key="risk_tolerance", scope_type="model", scope_value="income", value="3.0"),
        
        # Account-level overrides
        ConfigValue(config_item_key="risk_tolerance", scope_type="account", scope_value="retail", value="4.0"),
        ConfigValue(config_item_key="risk_tolerance", scope_type="account", scope_value="high_net_worth", value="8.0"),
    ]
    
    # Create configuration values for trade_frequency
    # This demonstrates fewer overrides, making resolution simpler in some cases
    config_values.extend([
        # Default value
        ConfigValue(config_item_key="trade_frequency", scope_type="default", scope_value=None, value="10"),
        
        # Family-level overrides
        ConfigValue(config_item_key="trade_frequency", scope_type="model family", scope_value="active", value="25"),
        ConfigValue(config_item_key="trade_frequency", scope_type="model family", scope_value="passive", value="5"),
        
        # Account-level overrides
        ConfigValue(config_item_key="trade_frequency", scope_type="account", scope_value="institutional", value="30"),
    ])
    
    # Create configuration values for cash_reserve
    # This demonstrates deeper nesting with multiple layers of overrides
    config_values.extend([
        # Default value
        ConfigValue(config_item_key="cash_reserve", scope_type="default", scope_value=None, value="0.05"),
        
        # Provider-level overrides
        ConfigValue(config_item_key="cash_reserve", scope_type="model provider", scope_value="provider_c", value="0.07"),
        
        # Family-level overrides
        ConfigValue(config_item_key="cash_reserve", scope_type="model family", scope_value="hybrid", value="0.06"),
        
        # Model-level overrides
        ConfigValue(config_item_key="cash_reserve", scope_type="model", scope_value="balanced", value="0.08"),
        ConfigValue(config_item_key="cash_reserve", scope_type="model", scope_value="income", value="0.10"),
        
        # Account-level overrides
        ConfigValue(config_item_key="cash_reserve", scope_type="account", scope_value="retirement", value="0.12"),
    ])
    
    # Create configuration values for market_hours_only
    # This demonstrates string values with simple overrides
    config_values.extend([
        # Default value
        ConfigValue(config_item_key="market_hours_only", scope_type="default", scope_value=None, value="true"),
        
        # Model-level overrides
        ConfigValue(config_item_key="market_hours_only", scope_type="model", scope_value="growth", value="false"),
        
        # Account-level overrides
        ConfigValue(config_item_key="market_hours_only", scope_type="account", scope_value="institutional", value="false"),
    ])
    
    # Create configuration values for rebalance_threshold
    # This demonstrates numeric values with multiple overrides
    config_values.extend([
        # Default value
        ConfigValue(config_item_key="rebalance_threshold", scope_type="default", scope_value=None, value="0.1"),
        
        # Provider-level overrides
        ConfigValue(config_item_key="rebalance_threshold", scope_type="model provider", scope_value="provider_a", value="0.08"),
        
        # Family-level overrides 
        ConfigValue(config_item_key="rebalance_threshold", scope_type="model family", scope_value="active", value="0.05"),
        
        # Model-level overrides
        ConfigValue(config_item_key="rebalance_threshold", scope_type="model", scope_value="value", value="0.12"),
        
        # Account-level overrides
        ConfigValue(config_item_key="rebalance_threshold", scope_type="account", scope_value="high_net_worth", value="0.03"),
    ])
    
    # Add all config values to the session
    for value in config_values:
        session.add(value)
    
    session.commit()
    logger.info(f"Created {len(config_values)} configuration values.")
    
    # Return the summary of created data
    return {
        "scope_types": len(scope_types),
        "config_items": len(config_items),
        "config_values": len(config_values)
    }

if __name__ == "__main__":
    try:
        results = create_test_data()
        logger.info(f"Test data generation complete: {results}")
    except Exception as e:
        logger.error(f"Error generating test data: {e}")