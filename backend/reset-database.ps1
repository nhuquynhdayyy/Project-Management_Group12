# Reset Database Script - Drop All Tables and Let TypeORM Recreate
# This script drops all tables to allow clean schema recreation

Write-Host "🔄 Resetting database for RBAC implementation..." -ForegroundColor Cyan
Write-Host ""

# Read database credentials from .env file
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Variable -Name $name -Value $value -Scope Script
        }
    }
} else {
    Write-Host "❌ Error: .env file not found" -ForegroundColor Red
    exit 1
}

# Parse DATABASE_URL
if ($DATABASE_URL -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)') {
    $DB_USER = $matches[1]
    $DB_PASSWORD = $matches[2]
    $DB_HOST = $matches[3]
    $DB_PORT = $matches[4]
    $DB_NAME = $matches[5]
    
    Write-Host "📊 Database: $DB_NAME" -ForegroundColor Yellow
    Write-Host "👤 User: $DB_USER" -ForegroundColor Yellow
    Write-Host "🖥️  Host: $DB_HOST" -ForegroundColor Yellow
    Write-Host ""
    
    # Set PostgreSQL password environment variable
    $env:PGPASSWORD = $DB_PASSWORD
    
    Write-Host "⚠️  WARNING: This will DROP ALL TABLES in the database!" -ForegroundColor Red
    Write-Host "Tables to be dropped:" -ForegroundColor Yellow
    Write-Host "  - user_roles (junction table)" -ForegroundColor Yellow
    Write-Host "  - maintenance_tasks" -ForegroundColor Yellow
    Write-Host "  - trees" -ForegroundColor Yellow
    Write-Host "  - users" -ForegroundColor Yellow
    Write-Host "  - roles" -ForegroundColor Yellow
    Write-Host "  - tree_species" -ForegroundColor Yellow
    Write-Host "  - administrative_areas" -ForegroundColor Yellow
    Write-Host ""
    
    $confirmation = Read-Host "Are you sure you want to continue? (yes/no)"
    
    if ($confirmation -ne "yes") {
        Write-Host "❌ Operation cancelled" -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host ""
    Write-Host "🗑️  Dropping tables..." -ForegroundColor Cyan
    
    # Execute the SQL script
    $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f drop-and-recreate-schema.sql 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database reset successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Start the server: npm run start:dev" -ForegroundColor White
        Write-Host "2. TypeORM will automatically create all tables with correct schema" -ForegroundColor White
        Write-Host "3. SeederService will automatically populate:" -ForegroundColor White
        Write-Host "   - 3 roles: Admin, Manager, Staff" -ForegroundColor White
        Write-Host "   - 5 tree species" -ForegroundColor White
        Write-Host "   - 5 administrative areas" -ForegroundColor White
        Write-Host "   - 4 test users with roles:" -ForegroundColor White
        Write-Host "     • admin (Admin role) - password: Test@123" -ForegroundColor White
        Write-Host "     • manager (Manager role) - password: Test@123" -ForegroundColor White
        Write-Host "     • staff (Staff role) - password: Test@123" -ForegroundColor White
        Write-Host "     • supervisor (Manager + Staff roles) - password: Test@123" -ForegroundColor White
        Write-Host ""
        Write-Host "4. Test login with any of the test users" -ForegroundColor White
        Write-Host "5. Verify JWT contains roles array" -ForegroundColor White
    } else {
        Write-Host "❌ Error resetting database: $result" -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor Yellow
        Write-Host "1. Make sure PostgreSQL is running" -ForegroundColor White
        Write-Host "2. Verify database credentials in .env file" -ForegroundColor White
        Write-Host "3. Check if psql command is available in PATH" -ForegroundColor White
        exit 1
    }
} else {
    Write-Host "❌ Error: Invalid DATABASE_URL format" -ForegroundColor Red
    Write-Host "Expected format: postgresql://user:password@host:port/database" -ForegroundColor Yellow
    exit 1
}
