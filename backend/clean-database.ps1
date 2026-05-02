# Clean Database Script for RBAC Implementation (PowerShell)
# This script truncates the users table to allow schema synchronization

Write-Host "🧹 Cleaning database for RBAC implementation..." -ForegroundColor Cyan

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
# Format: postgresql://user:password@host:port/database
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
    
    # Truncate users table
    Write-Host "🗑️  Truncating users table..." -ForegroundColor Cyan
    
    $query = "TRUNCATE TABLE users CASCADE;"
    $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $query 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database cleaned successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Run: npm run start:dev"
        Write-Host "2. Verify roles are seeded: curl http://localhost:3000/seed"
        Write-Host "3. Register a new user with roles"
    } else {
        Write-Host "❌ Error cleaning database: $result" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Error: Invalid DATABASE_URL format" -ForegroundColor Red
    exit 1
}
