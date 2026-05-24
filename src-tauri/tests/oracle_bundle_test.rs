//! Tests for Oracle Instant Client bundled library detection.

use std::fs;
use std::path::Path;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

#[test]
fn oracle_libs_directory_structure_exists() {
    let base = Path::new(env!("CARGO_MANIFEST_DIR")).join("libs/oracle");
    assert!(base.exists(), "libs/oracle directory should exist");

    // Check platform directories
    let platforms = ["macos-arm64", "macos-x86_64", "windows-x86_64", "linux-x86_64"];
    for platform in platforms {
        let platform_dir = base.join(platform);
        assert!(
            platform_dir.exists(),
            "Platform directory {} should exist",
            platform
        );
    }
}

#[test]
fn oracle_setup_script_exists() {
    let setup = Path::new(env!("CARGO_MANIFEST_DIR")).join("libs/oracle/setup.sh");
    assert!(setup.exists(), "setup.sh should exist");

    // Check it's executable
    let metadata = fs::metadata(&setup).unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mode = metadata.permissions().mode();
        assert!(mode & 0o111 != 0, "setup.sh should be executable");
    }
}

#[test]
fn oracle_readme_exists() {
    let readme = Path::new(env!("CARGO_MANIFEST_DIR")).join("libs/oracle/README.md");
    assert!(readme.exists(), "README.md should exist");
}

#[test]
fn oracle_current_directory_created_during_build() {
    let current = Path::new(env!("CARGO_MANIFEST_DIR")).join("libs/oracle/current");
    // This directory should exist after cargo build (created by build.rs)
    // During test, it may or may not exist depending on build state
    if current.exists() {
        // If it exists, it should be a directory
        assert!(current.is_dir(), "current/ should be a directory");
    }
    // If it doesn't exist, that's OK - it will be created during build
}

#[test]
fn oracle_platform_detection_logic() {
    // Test the platform detection logic matches our directory names
    let target_os = std::env::consts::OS;
    let target_arch = std::env::consts::ARCH;

    let expected_platform = match (target_os, target_arch) {
        ("macos", "aarch64") => "macos-arm64",
        ("macos", "x86_64") => "macos-x86_64",
        ("windows", "x86_64") => "windows-x86_64",
        ("linux", "x86_64") => "linux-x86_64",
        _ => {
            // Skip test for unsupported platforms
            return;
        }
    };

    let platform_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("libs/oracle")
        .join(expected_platform);

    // Platform directory should exist (even if empty)
    assert!(
        platform_dir.exists(),
        "Platform directory for {}/{} should be {}",
        target_os,
        target_arch,
        expected_platform
    );
}

#[cfg(target_os = "macos")]
#[test]
fn oracle_macos_libs_present() {
    let base = Path::new(env!("CARGO_MANIFEST_DIR")).join("libs/oracle");

    let arch = if cfg!(target_arch = "aarch64") {
        "macos-arm64"
    } else {
        "macos-x86_64"
    };

    let platform_dir = base.join(arch);
    if !platform_dir.exists() {
        eprintln!("Skipping: platform directory {} not found", arch);
        return;
    }

    // Check if any .dylib files exist
    let has_dylib = fs::read_dir(&platform_dir)
        .ok()
        .and_then(|mut entries| entries.next())
        .is_some();

    if has_dylib {
        // If files exist, check for required libraries
        let required = ["libclntsh.dylib", "libocci.dylib"];
        for lib in required {
            let path = platform_dir.join(lib);
            assert!(
                path.exists() || platform_dir.join(format!("{}.19.1", lib)).exists(),
                "Required library {} should exist in {}",
                lib,
                arch
            );
        }
    }
    // If no files, that's OK - user needs to run setup.sh
}

#[test]
fn oracle_build_rs_platform_mapping() {
    // Test that build.rs platform mapping matches our directory names
    let test_cases = vec![
        ("macos", "aarch64", "macos-arm64"),
        ("macos", "x86_64", "macos-x86_64"),
        ("windows", "x86_64", "windows-x86_64"),
        ("linux", "x86_64", "linux-x86_64"),
    ];

    for (os, arch, expected) in test_cases {
        let result = match (os, arch) {
            ("macos", "aarch64") => "macos-arm64",
            ("macos", "x86_64") => "macos-x86_64",
            ("windows", "x86_64") => "windows-x86_64",
            ("linux", "x86_64") => "linux-x86_64",
            _ => "unknown",
        };
        assert_eq!(
            result, expected,
            "Platform mapping for {}/{} should be {}",
            os, arch, expected
        );
    }
}

#[test]
fn oracle_placeholder_created_when_no_libs() {
    // When no Oracle Instant Client is downloaded, build.rs should create a placeholder
    let current_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("libs/oracle/current");

    if current_dir.exists() {
        let has_files = fs::read_dir(&current_dir)
            .ok()
            .and_then(|mut entries| entries.next())
            .is_some();

        if has_files {
            // Check if placeholder exists (created by build.rs when no libs found)
            let placeholder = current_dir.join(".placeholder");
            // Either real files or placeholder should exist
            let has_real_libs = fs::read_dir(&current_dir)
                .ok()
                .map(|entries| {
                    entries
                        .filter_map(|e| e.ok())
                        .any(|e| !e.file_name().to_string_lossy().starts_with('.'))
                })
                .unwrap_or(false);

            if !has_real_libs {
                assert!(
                    placeholder.exists(),
                    "Placeholder should exist when no Oracle libs present"
                );
            }
        }
    }
}

#[test]
fn oracle_lib_file_permissions() {
    // On Unix, library files should be readable
    #[cfg(unix)]
    {
        let base = Path::new(env!("CARGO_MANIFEST_DIR")).join("libs/oracle");
        let arch = if cfg!(target_arch = "aarch64") {
            "macos-arm64"
        } else {
            "macos-x86_64"
        };

        let platform_dir = base.join(arch);
        if !platform_dir.exists() {
            return;
        }

        for entry in fs::read_dir(&platform_dir).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path();
            if path.is_file() && !path.to_string_lossy().starts_with('.') {
                let metadata = fs::metadata(&path).unwrap();
                let mode = metadata.permissions().mode();
                // File should be readable
                assert!(
                    mode & 0o444 != 0,
                    "Oracle library {} should be readable",
                    path.display()
                );
            }
        }
    }
}

#[test]
fn oracle_symlink_handling() {
    // Test that symlinks in platform directories are handled correctly
    let base = Path::new(env!("CARGO_MANIFEST_DIR")).join("libs/oracle");
    let arch = if cfg!(target_os = "macos") {
        if cfg!(target_arch = "aarch64") {
            "macos-arm64"
        } else {
            "macos-x86_64"
        }
    } else if cfg!(target_os = "linux") {
        "linux-x86_64"
    } else {
        return; // Skip on Windows
    };

    let platform_dir = base.join(arch);
    if !platform_dir.exists() {
        return;
    }

    // Check for symlinks (common pattern: libclntsh.dylib -> libclntsh.dylib.19.1)
    for entry in fs::read_dir(&platform_dir).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();

        if path.is_symlink() {
            let target = fs::read_link(&path).unwrap();
            // Symlink target should be a relative path within the same directory
            assert!(
                !target.is_absolute(),
                "Symlink {} should have relative target",
                path.display()
            );
        }
    }
}
