#!/bin/bash

# Reset Database Script - Drop All Tables and Let TypeORM Recreate
# This script drops all tables to allow clean schema recreation

echo "🔄 Resetting database for RBAC implementation..."
echo ""

# Read database credentials from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found"
    exit 1
fi

# Extract database info from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo "📊 Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo "🖥️  Host: $DB_HOST"
echo ""

echo "⚠️  WARNING: This will DROP ALL TABLES in the database!"
echo "Tables to be dropped:"
echo "  - user_roles (junction table)"
echo "  - maintenance_tasks"
echo "  - trees"
echo "  - users"
echo "  - roles"
echo "  - tree_species"
echo "  - administrative_areas"
echo ""

read -p "Are you sure you want to continue? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "❌ Operation cancelled"
    exit 0
fi

echo ""
echo "🗑️  Dropping tables..."

# Execute the SQL script
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f drop-and-recreate-schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database reset successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Start the server: npm run start:dev"
    echo "2. TypeORM will automatically create all tables with correct schema"
    echo "3. SeederService will automatically populate:"
    echo "   - 3 roles: Admin, Manager, Staff"
    echo "   - 5 tree species"
    echo "   - 5 administrative areas"
    echo "   - 4 test users with roles:"
    echo "     • admin (Admin role) - password: Test@123"
    echo "     • manager (Manager role) - password: Test@123"
    echo "     • staff (Staff role) - password: Test@123"
    echo "     • supervisor (Manager + Staff roles) - password: Test@123"
    echo ""
    echo "4. Test login with any of the test users"
    echo "5. Verify JWT contains roles array"
else
    echo "❌ Error resetting database"
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure PostgreSQL is running"
    echo "2. Verify database credentials in .env file"
    echo "3. Check if psql command is available in PATH"
    exit 1
fi
