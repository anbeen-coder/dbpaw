use std::env;
use std::fs;
use std::path::Path;

fn main() {
    // Copy platform-specific Oracle Instant Client libraries
    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    let target_arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default();

    let platform = match (target_os.as_str(), target_arch.as_str()) {
        ("macos", "aarch64") => "macos-arm64",
        ("macos", "x86_64") => "macos-x86_64",
        ("windows", "x86_64") => "windows-x86_64",
        ("linux", "x86_64") => "linux-x86_64",
        _ => {
            println!("cargo:warning=Oracle Instant Client not available for this platform");
            tauri_build::build();
            return;
        }
    };

    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let src_dir = Path::new(&manifest_dir).join("libs/oracle").join(platform);
    let dest_dir = Path::new(&manifest_dir).join("libs/oracle/current");

    // Clean and recreate dest directory
    if dest_dir.exists() {
        fs::remove_dir_all(&dest_dir).ok();
    }

    // Create destination directory
    fs::create_dir_all(&dest_dir).ok();

    if src_dir.exists() && src_dir.read_dir().map_or(false, |mut d| d.next().is_some()) {
        // Copy all files from platform directory to current directory
        for entry in fs::read_dir(&src_dir).unwrap() {
            let entry = entry.unwrap();
            let file_name = entry.file_name();
            let dest_path = dest_dir.join(&file_name);

            if entry.path().is_symlink() {
                // Handle symlinks
                if let Ok(target) = fs::read_link(entry.path()) {
                    #[cfg(unix)]
                    std::os::unix::fs::symlink(&target, &dest_path).ok();
                }
            } else if entry.path().is_file() {
                fs::copy(entry.path(), &dest_path).ok();
            }
        }

        println!(
            "cargo:warning=Oracle Instant Client copied for {}",
            platform
        );
    } else {
        println!(
            "cargo:warning=Oracle Instant Client not found for {}. Run setup.sh first.",
            platform
        );
        // Create a placeholder file so the glob pattern doesn't fail
        let placeholder = dest_dir.join(".placeholder");
        fs::write(&placeholder, "").ok();
    }

    tauri_build::build()
}
