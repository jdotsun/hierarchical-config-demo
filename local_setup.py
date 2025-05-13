#!/usr/bin/env python3
"""
Script to help port the configuration system to a local PostgreSQL installation.
This script will:
1. Create the necessary database schema
2. Initialize default scope types
3. Provide SQL to export/import configuration data

Usage:
1. Install and set up a local PostgreSQL server
2. Create a database for your configuration
3. Set the DATABASE_URL environment variable to point to your local database:
   export DATABASE_URL="postgresql://username:password@localhost:5432/your_database"
4. Run this script: python local_setup.py
"""

import os
import sys
import logging
import argparse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Import models and configuration manager
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from models import Base, ScopeType, ConfigItem, ConfigValue
from config_manager import ConfigManager

def setup_database(db_url=None, drop_existing=False):
    """Set up the database schema and initialize default scope types"""
    # Use the provided db_url or get from environment variable
    db_url = db_url or os.environ.get("DATABASE_URL")
    if not db_url:
        logging.error("DATABASE_URL environment variable is not set")
        sys.exit(1)
    
    logging.info(f"Connecting to database: {db_url.split('@')[1] if '@' in db_url else db_url}")
    
    try:
        # Create database engine and session
        engine = create_engine(db_url)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Drop all tables if requested
        if drop_existing:
            logging.warning("Dropping all existing tables...")
            Base.metadata.drop_all(engine)
        
        # Create all tables
        logging.info("Creating tables...")
        Base.metadata.create_all(engine)
        
        # Initialize default scope types
        logging.info("Initializing default scope types...")
        default_scope_types = [
            {"name": "account", "priority": 10},
            {"name": "model", "priority": 20},
            {"name": "model family", "priority": 30},
            {"name": "model provider", "priority": 40},
            {"name": "default", "priority": 50}
        ]
        
        # Add scope types to database if they don't exist
        for scope_data in default_scope_types:
            existing_scope = session.query(ScopeType).filter_by(name=scope_data["name"]).first()
            if not existing_scope:
                scope_type = ScopeType(name=scope_data["name"], priority=scope_data["priority"])
                session.add(scope_type)
                logging.info(f"Added scope type: {scope_type.name}")
        
        # Commit changes
        session.commit()
        logging.info("Database setup completed successfully!")
        
        # Close the session
        session.close()
        
        return True
    
    except SQLAlchemyError as e:
        logging.error(f"Database error: {e}")
        return False

def generate_export_sql():
    """Generate SQL to export configuration data from the current database"""
    export_sql = """
-- Export scope types
COPY (SELECT * FROM scope_types) TO '/tmp/scope_types.csv' WITH CSV HEADER;

-- Export config items
COPY (SELECT * FROM config_items) TO '/tmp/config_items.csv' WITH CSV HEADER;

-- Export config values
COPY (SELECT * FROM config_values) TO '/tmp/config_values.csv' WITH CSV HEADER;
"""
    return export_sql

def generate_import_sql():
    """Generate SQL to import configuration data to a new database"""
    import_sql = """
-- Import scope types
COPY scope_types FROM '/tmp/scope_types.csv' WITH CSV HEADER;

-- Import config items
COPY config_items FROM '/tmp/config_items.csv' WITH CSV HEADER;

-- Import config values
COPY config_values FROM '/tmp/config_values.csv' WITH CSV HEADER;
"""
    return import_sql

def main():
    parser = argparse.ArgumentParser(description="Set up a local PostgreSQL database for the configuration management system")
    parser.add_argument("--db-url", help="Database URL (defaults to DATABASE_URL environment variable)")
    parser.add_argument("--drop", action="store_true", help="Drop existing tables before creating new ones")
    parser.add_argument("--export-sql", action="store_true", help="Print SQL commands to export configuration data")
    parser.add_argument("--import-sql", action="store_true", help="Print SQL commands to import configuration data")
    
    args = parser.parse_args()
    
    if args.export_sql:
        print(generate_export_sql())
        return
    
    if args.import_sql:
        print(generate_import_sql())
        return
    
    # Set up the database
    setup_database(args.db_url, args.drop)
    
    print("\n=== Local Installation Instructions ===")
    print("1. Install and set up PostgreSQL on your local machine")
    print("2. Create a new database: createdb config_manager")
    print("3. Set the DATABASE_URL environment variable:")
    print("   export DATABASE_URL=\"postgresql://username:password@localhost:5432/config_manager\"")
    print("4. Run the application with: python run.py")
    print("")
    print("To migrate data from an existing installation:")
    print("1. On the source database, run: python local_setup.py --export-sql > export_commands.sql")
    print("2. Execute the SQL commands in export_commands.sql")
    print("3. Copy the CSV files to your local machine")
    print("4. On your local database, run: python local_setup.py --import-sql > import_commands.sql")
    print("5. Execute the SQL commands in import_commands.sql")

if __name__ == "__main__":
    main()