#!/bin/bash

# Clean Database Script for RBAC Implementation
# This script truncates the users table to allow schema synchronization

echo "🧹 Cleaning database for RBAC implementation..."

# Read database credentials from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found"
    exit 1
fi

# Extract database name from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')

echo "📊 Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo "🖥️  Host: $DB_HOST"
echo ""

# Truncate users table
echo "🗑️  Truncating users table..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "TRUNCATE TABLE users CASCADE;"

if [ $? -eq 0 ]; then
    echo "✅ Database cleaned successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Run: npm run start:dev"
    echo "2. Verify roles are seeded: curl http://localhost:3000/seed"
    echo "3. Register a new user with roles"
else
    echo "❌ Error cleaning database"
    exit 1
fi
