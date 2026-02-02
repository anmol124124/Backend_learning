#!/bin/bash

# Test Runner Script for Backend Learning Project
# This script helps you run tests easily

echo "🧪 Backend Test Runner"
echo "====================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if service is running
check_service() {
    if systemctl is-active --quiet $1; then
        echo -e "${GREEN}✓${NC} $1 is running"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is NOT running"
        return 1
    fi
}

# Check prerequisites
echo "📋 Checking Prerequisites..."
echo ""

# Check PostgreSQL
if command -v psql &> /dev/null; then
    check_service postgresql
    POSTGRES_OK=$?
else
    echo -e "${RED}✗${NC} PostgreSQL not found"
    POSTGRES_OK=1
fi

# Check Redis
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓${NC} Redis is running"
        REDIS_OK=0
    else
        echo -e "${RED}✗${NC} Redis is NOT running"
        REDIS_OK=1
    fi
else
    echo -e "${RED}✗${NC} Redis not found"
    REDIS_OK=1
fi

echo ""

# If services not running, offer to start them
if [ $POSTGRES_OK -ne 0 ] || [ $REDIS_OK -ne 0 ]; then
    echo -e "${YELLOW}⚠${NC}  Some services are not running!"
    echo ""
    echo "To start services, run:"
    if [ $POSTGRES_OK -ne 0 ]; then
        echo "  sudo systemctl start postgresql"
    fi
    if [ $REDIS_OK -ne 0 ]; then
        echo "  sudo systemctl start redis"
    fi
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if test database exists
echo "🗄️  Checking test database..."
if psql -U postgres -p 5433 -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw test_database; then
    echo -e "${GREEN}✓${NC} test_database exists"
else
    echo -e "${YELLOW}⚠${NC}  test_database does not exist"
    echo ""
    echo "Creating test database..."
    psql -U postgres -p 5433 -c "CREATE DATABASE test_database;" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} test_database created"
    else
        echo -e "${RED}✗${NC} Failed to create test_database"
        echo "Please create it manually:"
        echo "  psql -U postgres -p 5433"
        echo "  CREATE DATABASE test_database;"
    fi
fi

echo ""
echo "🚀 Running Tests..."
echo ""

# Show menu
echo "Select test type:"
echo "1) Run ALL tests"
echo "2) Run validation tests only (fast)"
echo "3) Run auth controller tests"
echo "4) Run post controller tests"
echo "5) Run comment controller tests"
echo "6) Run with coverage report"
echo "7) Run in watch mode"
echo ""
read -p "Enter choice [1-7]: " choice

case $choice in
    1)
        echo "Running all tests..."
        npm test
        ;;
    2)
        echo "Running validation tests..."
        npm test -- inputValidation.test.js
        ;;
    3)
        echo "Running auth controller tests..."
        npm test -- authController.test.js
        ;;
    4)
        echo "Running post controller tests..."
        npm test -- postController.test.js
        ;;
    5)
        echo "Running comment controller tests..."
        npm test -- commentController.test.js
        ;;
    6)
        echo "Running all tests with coverage..."
        npm test -- --coverage
        ;;
    7)
        echo "Running in watch mode..."
        npm run test:watch
        ;;
    *)
        echo "Invalid choice. Running all tests..."
        npm test
        ;;
esac

echo ""
echo "✅ Test run complete!"
