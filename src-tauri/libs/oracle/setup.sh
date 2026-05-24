#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Oracle Instant Client Setup ==="
echo ""
echo "This script will help you download Oracle Instant Client."
echo "You need to accept Oracle's license agreement."
echo ""

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Darwin)
        if [[ "$ARCH" == "arm64" ]]; then
            PLATFORM="macos-arm64"
            DOWNLOAD_URL="https://www.oracle.com/database/technologies/instant-client/macos-arm64-downloads.html"
            PACKAGE_PATTERN="instantclient-basiclite-macos.arm64"
        else
            PLATFORM="macos-x86_64"
            DOWNLOAD_URL="https://www.oracle.com/database/technologies/instant-client/macos-intel-x86-downloads.html"
            PACKAGE_PATTERN="instantclient-basiclite-macos"
        fi
        ;;
    Linux)
        PLATFORM="linux-x86_64"
        DOWNLOAD_URL="https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html"
        PACKAGE_PATTERN="instantclient-basiclite-linux"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        PLATFORM="windows-x86_64"
        DOWNLOAD_URL="https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html"
        PACKAGE_PATTERN="instantclient-basiclite-windows"
        ;;
    *)
        echo "Unsupported OS: $OS"
        exit 1
        ;;
esac

echo "Detected platform: $PLATFORM"
echo ""

PLATFORM_DIR="$SCRIPT_DIR/$PLATFORM"

# Check if already exists
if [[ -d "$PLATFORM_DIR" ]] && [[ -n "$(ls -A "$PLATFORM_DIR" 2>/dev/null)" ]]; then
    echo "Oracle Instant Client already exists in $PLATFORM_DIR"
    echo "Files:"
    ls -la "$PLATFORM_DIR"
    echo ""
    read -p "Do you want to re-download? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

mkdir -p "$PLATFORM_DIR"

echo "Please download Oracle Instant Client Basic Lite from:"
echo ""
echo "  $DOWNLOAD_URL"
echo ""
echo "Select version 19.x (recommended) or 21.x"
echo ""

# Create temp directory for downloads
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "After downloading, please provide the path to the downloaded file:"
echo "(e.g., ~/Downloads/instantclient-basiclite-macos.arm64-19.8.0.0.0dbru.dmg)"
echo ""
read -p "File path: " DOWNLOAD_FILE

# Expand tilde
DOWNLOAD_FILE="${DOWNLOAD_FILE/#\~/$HOME}"

if [[ ! -f "$DOWNLOAD_FILE" ]]; then
    echo "Error: File not found: $DOWNLOAD_FILE"
    exit 1
fi

echo ""
echo "Extracting Oracle Instant Client..."

case "$PLATFORM" in
    macos-*)
        if [[ "$DOWNLOAD_FILE" == *.dmg ]]; then
            # Mount DMG
            MOUNT_POINT=$(hdiutil attach "$DOWNLOAD_FILE" -nobrowse -readonly 2>/dev/null | grep "/Volumes" | awk '{print $NF}')
            if [[ -z "$MOUNT_POINT" ]]; then
                echo "Error: Failed to mount DMG"
                exit 1
            fi
            
            # Find instantclient directory
            INSTANTCLIENT_DIR=$(find "$MOUNT_POINT" -maxdepth 2 -name "instantclient_*" -type d | head -1)
            if [[ -z "$INSTANTCLIENT_DIR" ]]; then
                echo "Error: Could not find instantclient directory in DMG"
                hdiutil detach "$MOUNT_POINT" 2>/dev/null
                exit 1
            fi
            
            # Copy files
            cp "$INSTANTCLIENT_DIR"/*.dylib "$PLATFORM_DIR/"
            
            # Create symlinks
            cd "$PLATFORM_DIR"
            for lib in libclntsh.dylib.* libocci.dylib.*; do
                if [[ -f "$lib" ]]; then
                    base_name=$(echo "$lib" | sed 's/\.[0-9]*\.[0-9]*$//')
                    ln -sf "$lib" "$base_name"
                fi
            done
            
            # Unmount DMG
            hdiutil detach "$MOUNT_POINT" 2>/dev/null
            
        elif [[ "$DOWNLOAD_FILE" == *.zip ]]; then
            unzip -q "$DOWNLOAD_FILE" -d "$TEMP_DIR"
            INSTANTCLIENT_DIR=$(find "$TEMP_DIR" -maxdepth 2 -name "instantclient_*" -type d | head -1)
            cp "$INSTANTCLIENT_DIR"/*.dylib "$PLATFORM_DIR/"
            
            cd "$PLATFORM_DIR"
            for lib in libclntsh.dylib.* libocci.dylib.*; do
                if [[ -f "$lib" ]]; then
                    base_name=$(echo "$lib" | sed 's/\.[0-9]*\.[0-9]*$//')
                    ln -sf "$lib" "$base_name"
                fi
            done
        fi
        ;;
    linux-*)
        if [[ "$DOWNLOAD_FILE" == *.zip ]]; then
            unzip -q "$DOWNLOAD_FILE" -d "$TEMP_DIR"
            INSTANTCLIENT_DIR=$(find "$TEMP_DIR" -maxdepth 2 -name "instantclient_*" -type d | head -1)
            cp "$INSTANTCLIENT_DIR"/*.so* "$PLATFORM_DIR/"
            
            cd "$PLATFORM_DIR"
            for lib in libclntsh.so.* libocci.so.*; do
                if [[ -f "$lib" ]]; then
                    base_name=$(echo "$lib" | sed 's/\.[0-9]*\.[0-9]*$//')
                    ln -sf "$lib" "$base_name"
                fi
            done
        fi
        ;;
    windows-*)
        if [[ "$DOWNLOAD_FILE" == *.zip ]]; then
            unzip -q "$DOWNLOAD_FILE" -d "$TEMP_DIR"
            INSTANTCLIENT_DIR=$(find "$TEMP_DIR" -maxdepth 2 -name "instantclient_*" -type d | head -1)
            cp "$INSTANTCLIENT_DIR"/*.dll "$PLATFORM_DIR/"
        fi
        ;;
esac

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Oracle Instant Client files installed to:"
echo "  $PLATFORM_DIR"
echo ""
echo "Files:"
ls -la "$PLATFORM_DIR"
