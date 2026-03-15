use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub async fn perform_update(app: AppHandle) -> Result<String, String> {
    // Run the install script as the current user.
    // The script calls sudo internally for privileged operations.
    // The sudoers rule installed during first setup grants passwordless sudo
    // for apt-get, systemctl, etc. so this works without a TTY.
    // SUDO_ASKPASS=/bin/false prevents sudo from trying GUI password prompts.
    let mut child = Command::new("bash")
        .arg("-c")
        .arg("curl -fsSL https://raw.githubusercontent.com/StaticFX/klipper-touch/master/scripts/install.sh | bash 2>&1")
        .env("SUDO_ASKPASS", "/bin/false")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start update: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let reader = BufReader::new(stdout);

    let mut full_output = String::new();
    for line in reader.lines() {
        match line {
            Ok(text) => {
                let _ = app.emit("update-output", &text);
                full_output.push_str(&text);
                full_output.push('\n');
            }
            Err(e) => {
                let msg = format!("[read error: {}]", e);
                let _ = app.emit("update-output", &msg);
            }
        }
    }

    let status = child.wait().map_err(|e| format!("Process error: {}", e))?;

    if status.success() {
        let _ = app.emit("update-done", "success");

        // Restart the service — this will kill the current process
        let _ = Command::new("sudo")
            .arg("-n")
            .args(["systemctl", "restart", &format!("klipper-touch@{}", whoami::username())])
            .spawn();

        Ok(full_output)
    } else {
        let msg = format!("Update exited with code {}", status.code().unwrap_or(-1));
        let _ = app.emit("update-done", &msg);
        Err(format!("{}\n{}", msg, full_output))
    }
}
