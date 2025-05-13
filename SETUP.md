# Configuration Manager - Local Setup Guide

This guide will help you set up the configuration management system on your local machine.

## Prerequisites

1. Python 3.8 or higher
2. PostgreSQL database server
3. Required Python packages (see `requirements.txt`)

## Setup Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd config-manager
```

### 2. Create a Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r dependencies.txt
```

### 4. Set Up PostgreSQL

1. Install PostgreSQL on your local machine if not already installed
2. Create a new database:
   ```bash
   createdb config_manager
   ```

### 5. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file to set your database connection string:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/config_manager
   SESSION_SECRET=your_secret_key_here
   ```

3. Load the environment variables:
   ```bash
   export $(cat .env | grep -v '#' | xargs)  # On Windows use a different approach
   ```

### 6. Initialize the Database

Run the setup script to create the database schema and initialize default values:

```bash
python local_setup.py
```

If you want to start with a clean database, use the `--drop` flag:

```bash
python local_setup.py --drop
```

### 7. Run the Application

```bash
python run.py
```

The application should now be running at http://localhost:5000

## Migrating Data from an Existing Installation

### Export Data from Source

1. On the source system, generate export SQL commands:
   ```bash
   python local_setup.py --export-sql > export_commands.sql
   ```

2. Execute these commands to create CSV files with your data:
   ```bash
   psql -U username -d source_database -f export_commands.sql
   ```

3. Copy the generated CSV files to your local machine:
   ```bash
   scp user@source:/tmp/*.csv /tmp/
   ```

### Import Data to Local Installation

1. Generate import SQL commands:
   ```bash
   python local_setup.py --import-sql > import_commands.sql
   ```

2. Execute these commands to import the data:
   ```bash
   psql -U username -d config_manager -f import_commands.sql
   ```

## Database Schema

The configuration management system uses three main tables:

1. `scope_types` - Defines the hierarchy of scopes (e.g., account, model, default)
2. `config_items` - Stores configuration item definitions
3. `config_values` - Stores the actual values at different scopes

## Troubleshooting

- **Database Connection Issues**: Verify your DATABASE_URL is correct and that PostgreSQL is running
- **Missing Tables**: Run `local_setup.py` again to ensure all tables are created
- **Import/Export Problems**: Check PostgreSQL permissions for reading/writing CSV files