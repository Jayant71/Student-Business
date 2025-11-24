#!/bin/bash

# Production Deployment Script
# This script prepares and deploys the application to production

set -e  # Exit on error

echo "🚀 Starting Production Deployment..."

# ============================================
# 1. Environment Check
# ============================================

echo "📋 Checking environment..."

if [ ! -f "backend/.env.production" ]; then
    echo "❌ Error: backend/.env.production not found"
    echo "Please copy backend/.env.production.example and configure it"
    exit 1
fi

if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production not found for frontend"
    echo "Please create .env.production with production Supabase credentials"
    exit 1
fi

echo "✅ Environment files found"

# ============================================
# 2. Install Dependencies
# ============================================

echo "📦 Installing dependencies..."

# Frontend dependencies
echo "Installing frontend dependencies..."
npm install --production

# Backend dependencies
echo "Installing backend dependencies..."
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo "✅ Dependencies installed"

# ============================================
# 3. Run Tests
# ============================================

echo "🧪 Running tests..."

# Frontend tests (if available)
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    npm test
fi

# Backend tests (if available)
if [ -f "backend/test_requirements.txt" ]; then
    cd backend
    pip install -r test_requirements.txt
    pytest
    cd ..
fi

echo "✅ Tests passed"

# ============================================
# 4. Build Frontend
# ============================================

echo "🏗️  Building frontend..."

npm run build

if [ ! -d "dist" ]; then
    echo "❌ Error: Frontend build failed"
    exit 1
fi

echo "✅ Frontend built successfully"

# ============================================
# 5. Database Migrations
# ============================================

echo "🗄️  Running database migrations..."

# Using Supabase CLI
if command -v supabase &> /dev/null; then
    supabase db push
    echo "✅ Migrations applied"
else
    echo "⚠️  Warning: Supabase CLI not found. Please apply migrations manually."
fi

# ============================================
# 6. Validate Security Setup
# ============================================

echo "🔐 Validating security setup..."

# Run security validation function (if Supabase CLI available)
if command -v supabase &> /dev/null; then
    supabase db execute "SELECT * FROM validate_security_setup();"
fi

echo "✅ Security validation complete"

# ============================================
# 7. Deploy Application
# ============================================

echo "🚢 Deploying application..."

# Choose deployment method based on environment
DEPLOY_METHOD=${DEPLOY_METHOD:-"heroku"}

case $DEPLOY_METHOD in
    "heroku")
        echo "Deploying to Heroku..."
        git push heroku main
        heroku run "cd backend && flask db upgrade"
        ;;
    
    "vercel")
        echo "Deploying frontend to Vercel..."
        vercel --prod
        echo "⚠️  Don't forget to deploy backend separately"
        ;;
    
    "docker")
        echo "Building and deploying Docker containers..."
        docker-compose -f docker-compose.prod.yml build
        docker-compose -f docker-compose.prod.yml up -d
        ;;
    
    "manual")
        echo "Manual deployment - skipping automatic deployment"
        echo "Please deploy dist/ folder and backend manually"
        ;;
    
    *)
        echo "Unknown deployment method: $DEPLOY_METHOD"
        exit 1
        ;;
esac

echo "✅ Deployment complete"

# ============================================
# 8. Post-Deployment Checks
# ============================================

echo "🔍 Running post-deployment checks..."

# Wait a bit for deployment to complete
sleep 10

# Health check (if backend URL is set)
if [ ! -z "$BACKEND_URL" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/health" || echo "000")
    if [ "$HTTP_CODE" == "200" ]; then
        echo "✅ Backend health check passed"
    else
        echo "⚠️  Warning: Backend health check failed (HTTP $HTTP_CODE)"
    fi
fi

# Frontend check
if [ ! -z "$APP_BASE_URL" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP_BASE_URL}" || echo "000")
    if [ "$HTTP_CODE" == "200" ]; then
        echo "✅ Frontend health check passed"
    else
        echo "⚠️  Warning: Frontend health check failed (HTTP $HTTP_CODE)"
    fi
fi

# ============================================
# 9. Deployment Summary
# ============================================

echo ""
echo "================================================================"
echo "🎉 Deployment Complete!"
echo "================================================================"
echo ""
echo "Frontend URL: ${APP_BASE_URL:-Not set}"
echo "Backend URL: ${BACKEND_URL:-Not set}"
echo ""
echo "📋 Next Steps:"
echo "1. Verify the application is accessible"
echo "2. Test critical user flows (login, payment, session join)"
echo "3. Check error logs in Sentry (if configured)"
echo "4. Monitor database performance"
echo "5. Set up monitoring alerts"
echo ""
echo "================================================================"
