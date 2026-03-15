use serde::Serialize;
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct NetworkInfo {
    pub hostname: String,
    pub ip_address: Option<String>,
    pub wifi_ssid: Option<String>,
    pub wifi_signal: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct WifiNetwork {
    pub ssid: String,
    pub signal: i32,
    pub security: String,
    pub connected: bool,
}

#[derive(Debug, Serialize)]
pub struct SavedNetwork {
    pub name: String,
}

#[tauri::command]
pub fn get_network_info() -> Result<NetworkInfo, String> {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    let ip_address = get_ip_address();
    let (wifi_ssid, wifi_signal) = get_wifi_info();

    Ok(NetworkInfo {
        hostname,
        ip_address,
        wifi_ssid,
        wifi_signal,
    })
}

#[tauri::command]
pub fn scan_wifi() -> Result<Vec<WifiNetwork>, String> {
    let output = Command::new("nmcli")
        .args([
            "-t", "-f", "SSID,SIGNAL,SECURITY,ACTIVE",
            "device", "wifi", "list", "--rescan", "yes",
        ])
        .output()
        .map_err(|e| format!("Failed to scan WiFi: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("nmcli error: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut networks: Vec<WifiNetwork> = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for line in stdout.lines() {
        // nmcli -t uses : as delimiter. Escaped colons in SSIDs appear as \:
        let parts = split_nmcli_line(line);
        if parts.len() >= 4 && !parts[0].is_empty() {
            let ssid = parts[0].clone();
            if seen.contains(&ssid) {
                continue;
            }
            seen.insert(ssid.clone());
            networks.push(WifiNetwork {
                ssid,
                signal: parts[1].parse().unwrap_or(0),
                security: parts[2].clone(),
                connected: parts[3] == "yes",
            });
        }
    }

    networks.sort_by(|a, b| b.signal.cmp(&a.signal));
    Ok(networks)
}

#[tauri::command]
pub fn connect_wifi(ssid: String, password: String) -> Result<String, String> {
    let output = if password.is_empty() {
        Command::new("nmcli")
            .args(["device", "wifi", "connect", &ssid])
            .output()
    } else {
        Command::new("nmcli")
            .args(["device", "wifi", "connect", &ssid, "password", &password])
            .output()
    };

    match output {
        Ok(o) if o.status.success() => {
            Ok(String::from_utf8_lossy(&o.stdout).trim().to_string())
        }
        Ok(o) => Err(String::from_utf8_lossy(&o.stderr).trim().to_string()),
        Err(e) => Err(format!("Failed to connect: {e}")),
    }
}

#[tauri::command]
pub fn forget_wifi(name: String) -> Result<String, String> {
    let output = Command::new("nmcli")
        .args(["connection", "delete", &name])
        .output()
        .map_err(|e| format!("Failed to forget network: {e}"))?;

    if output.status.success() {
        Ok("Connection removed".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
pub fn list_saved_wifi() -> Result<Vec<SavedNetwork>, String> {
    let output = Command::new("nmcli")
        .args(["-t", "-f", "NAME,TYPE", "connection", "show"])
        .output()
        .map_err(|e| format!("Failed to list saved networks: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let networks: Vec<SavedNetwork> = stdout
        .lines()
        .filter_map(|line| {
            let parts = split_nmcli_line(line);
            if parts.len() >= 2 && parts[1].contains("wireless") {
                Some(SavedNetwork {
                    name: parts[0].clone(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(networks)
}

/// Split an nmcli terse-mode line on `:`, handling `\:` as escaped literal colons.
fn split_nmcli_line(line: &str) -> Vec<String> {
    let mut parts = Vec::new();
    let mut current = String::new();
    let chars: Vec<char> = line.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '\\' && i + 1 < chars.len() && chars[i + 1] == ':' {
            current.push(':');
            i += 2;
        } else if chars[i] == ':' {
            parts.push(current.clone());
            current.clear();
            i += 1;
        } else {
            current.push(chars[i]);
            i += 1;
        }
    }
    parts.push(current);
    parts
}

fn get_ip_address() -> Option<String> {
    let output = Command::new("hostname").arg("-I").output().ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout.split_whitespace().next().map(|s| s.to_string())
}

fn get_wifi_info() -> (Option<String>, Option<String>) {
    let output = Command::new("iwconfig").output().ok();
    if let Some(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let ssid = stdout
            .lines()
            .find(|l| l.contains("ESSID:"))
            .and_then(|l| {
                let start = l.find("ESSID:\"")? + 7;
                let end = l[start..].find('"')? + start;
                Some(l[start..end].to_string())
            });
        let signal = stdout
            .lines()
            .find(|l| l.contains("Signal level"))
            .and_then(|l| {
                let start = l.find("Signal level=")? + 13;
                let rest = &l[start..];
                let end = rest.find(' ').unwrap_or(rest.len());
                Some(rest[..end].to_string())
            });
        (ssid, signal)
    } else {
        (None, None)
    }
}
