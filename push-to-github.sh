#!/bin/bash
# Script to push to GitHub after creating your repository
# Replace YOUR_USERNAME and REPO_NAME with your actual values

set -e

echo "=== GitHub Push Script ==="
echo ""
echo "1. First, create a new repository on GitHub: https://github.com/new"
echo "   - Name: fulmen-empire (or your choice)"
echo "   - Do NOT initialize with README, .gitignore, or license"
echo ""
echo "2. Enter your GitHub details:"
read -p "GitHub username: " GITHUB_USERNAME
read -p "Repository name (default: fulmen-empire): " REPO_NAME
REPO_NAME=${REPO_NAME:-fulmen-empire}

echo ""
echo "3. Adding remote and pushing..."
cd "$(dirname "$0")"

# Rename branch to main
git branch -M main 2>/dev/null || git branch -M main

# Add remote
git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git 2>/dev/null || {
    echo "Remote already exists, updating..."
    git remote set-url origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git
}

# Push to GitHub
echo ""
echo "Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Done! Your code is now on GitHub at:"
echo "   https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo ""
echo "Next steps:"
echo "   1. Go to https://vercel.com/new"
echo "   2. Import your repository"
echo "   3. Deploy ecom (Root: ecom)"
echo "   4. Deploy dashboard_next (Root: dashboard_next)"
