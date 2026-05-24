#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Oracle Instant Client Build Verification ==="
echo ""

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Darwin)
        if [[ "$ARCH" == "arm64" ]]; then
            PLATFORM="macos-arm64"
        else
            PLATFORM="macos-x86_64"
        fi
        ;;
    Linux)
        PLATFORM="linux-x86_64"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        PLATFORM="windows-x86_64"
        ;;
    *)
        echo "Unsupported OS: $OS"
        exit 1
        ;;
esac

echo "Platform: $PLATFORM"

# Check if Oracle Instant Client is available
ORACLE_DIR="$PROJECT_ROOT/src-tauri/libs/oracle/$PLATFORM"
CURRENT_DIR="$PROJECT_ROOT/src-tauri/libs/oracle/current"

echo ""
echo "1. Checking Oracle Instant Client files..."

if [[ ! -d "$ORACLE_DIR" ]] || [[ -z "$(ls -A "$ORACLE_DIR" 2>/dev/null)" ]]; then
    echo "   [FAIL] Oracle Instant Client not found in $ORACLE_DIR"
    echo "   Run: cd src-tauri/libs/oracle && ./setup.sh"
    exit 1
fi

echo "   [OK] Found Oracle Instant Client files:"
ls -la "$ORACLE_DIR" | grep -v "^total" | awk '{print "         " $NF}'

# Check required files
echo ""
echo "2. Checking required library files..."

case "$PLATFORM" in
    macos-*)
        REQUIRED_FILES=("libclntsh.dylib" "libocci.dylib")
        for file in "${REQUIRED_FILES[@]}"; do
            if [[ -e "$ORACLE_DIR/$file" ]] || [[ -L "$ORACLE_DIR/$file" ]]; then
                echo "   [OK] $file"
            else
                echo "   [FAIL] $file not found"
                exit 1
            fi
        done
        ;;
    linux-*)
        REQUIRED_FILES=("libclntsh.so" "libocci.so")
        for file in "${REQUIRED_FILES[@]}"; do
            if [[ -e "$ORACLE_DIR/$file" ]] || [[ -L "$ORACLE_DIR/$file" ]]; then
                echo "   [OK] $file"
            else
                echo "   [FAIL] $file not found"
                exit 1
            fi
        done
        ;;
    windows-*)
        REQUIRED_FILES=("oci.dll")
        for file in "${REQUIRED_FILES[@]}"; do
            if [[ -e "$ORACLE_DIR/$file" ]]; then
                echo "   [OK] $file"
            else
                echo "   [FAIL] $file not found"
                exit 1
            fi
        done
        ;;
esac

# Run cargo check
echo ""
echo "3. Running cargo check..."
cd "$PROJECT_ROOT/src-tauri"
if cargo check 2>&1 | grep -q "error"; then
    echo "   [FAIL] cargo check failed"
    cargo check
    exit 1
else
    echo "   [OK] cargo check passed"
fi

# Verify build.rs output
echo ""
echo "4. Checking build.rs output..."
if [[ -d "$CURRENT_DIR" ]] && [[ -n "$(ls -A "$CURRENT_DIR" 2>/dev/null)" ]]; then
    echo "   [OK] current/ directory populated:"
    ls -la "$CURRENT_DIR" | grep -v "^total" | awk '{print "         " $NF}'
else
    echo "   [WARN] current/ directory empty (will be populated during build)"
fi

echo ""
echo "=== All checks passed ==="
