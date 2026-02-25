#!/bin/bash
# Build Enkana Fresh for cPanel deployment
# Output: dist/public/ — upload contents to cPanel public_html/

set -e

echo "Building Enkana Fresh static site..."

# Build the frontend
npx vite build --config vite.config.ts

echo ""
echo "Build complete! Files are in dist/public/"
echo ""
echo "To deploy to cPanel:"
echo "  1. Upload all files from dist/public/ to public_html/ on cPanel"
echo "  2. The .htaccess file is included for SPA routing"
echo "  3. Make sure mod_rewrite is enabled on your hosting"
echo ""
echo "Before deploying, run the RLS migration in Supabase SQL Editor:"
echo "  supabase/migrations/001_rls_admin_policies.sql"
echo ""
echo "Deploy M-Pesa Edge Functions to Supabase:"
echo "  supabase functions deploy mpesa-stkpush"
echo "  supabase functions deploy mpesa-callback --no-verify-jwt"
echo "  supabase functions deploy mpesa-status"
