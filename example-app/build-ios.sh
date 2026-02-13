#!/bin/bash

# Build and Run iOS App with Bun
# This script automates the build process for iOS

set -e  # Exit on error

echo "🚀 Building PowerSync iOS App with Bun..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Build plugin
echo -e "${BLUE}🔧 Building PowerSync plugin...${NC}"
pushd packages/ppal-powersync
bun run build
popd

# Step 2: Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
bun install --forced

# Step 3: Build web app
echo -e "${BLUE}🌐 Building web app...${NC}"
bun run build

# Step 4: Sync with iOS (SPM will resolve dependencies automatically)
echo -e "${BLUE}📱 Syncing with iOS (using Swift Package Manager)...${NC}"
bunx cap sync ios

echo -e "${GREEN}✅ Build complete!${NC}"
echo -e "${BLUE}Opening Xcode...${NC}"

# # Step 5: Open or run ios
bunx cap open ios
# bunx cap run ios

echo -e "${GREEN}🎉 Ready to run! Press ⌘+R in Xcode to launch the app.${NC}"
