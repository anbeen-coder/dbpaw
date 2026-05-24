# Oracle Instant Client Libraries

This directory contains Oracle Instant Client libraries for bundling with the application.

## Download Instructions

Oracle Instant Client Basic Lite is required for each platform.

### Download URLs

| Platform | Version | URL |
|----------|---------|-----|
| macOS ARM64 | 19.x | https://www.oracle.com/database/technologies/instant-client/macos-arm64-downloads.html |
| macOS x86_64 | 19.x | https://www.oracle.com/database/technologies/instant-client/macos-intel-x86-downloads.html |
| Windows x86_64 | 19.x | https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html |
| Linux x86_64 | 19.x | https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html |

### Required Files

#### macOS (ARM64 / x86_64)
```
libclntsh.dylib.19.1 -> libclntsh.dylib (symlink)
libocci.dylib.19.1 -> libocci.dylib (symlink)
libnnz19.dylib
```

#### Windows (x86_64)
```
oci.dll
oraociei19.dll
orannzsbb19.dll
```

#### Linux (x86_64)
```
libclntsh.so.19.1 -> libclntsh.so (symlink)
libocci.so.19.1 -> libocci.so (symlink)
libnnz19.so
```

## Setup Script

Run the setup script to download and extract Oracle Instant Client:

```bash
./setup.sh
```

## License

Oracle Instant Client is subject to the [Oracle Technology Network License Agreement](https://www.oracle.com/downloads/licenses/instant-client-license.html).
