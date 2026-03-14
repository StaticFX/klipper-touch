use std::process::Command;

#[tauri::command]
pub async fn perform_update() -> Result<String, String> {
    // Download and run the install script
    let output = Command::new("bash")
        .arg("-c")
        .arg("curl -fsSL https://raw.githubusercontent.com/StaticFX/klipper-touch/master/scripts/install.sh | bash 2>&1")
        .output()
        .map_err(|e| format!("Failed to start update: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        // Restart the service — this will kill the current process
        let _ = Command::new("sudo")
            .args(["systemctl", "restart", &format!("klipper-touch@{}", whoami::username())])
            .spawn();

        Ok(stdout)
    } else {
        Err(format!("Update failed:\n{}\n{}", stdout, stderr))
    }
}
