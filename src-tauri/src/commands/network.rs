use serde::Serialize;
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct NetworkInfo {
    pub hostname: String,
    pub ip_address: Option<String>,
    pub wifi_ssid: Option<String>,
    pub wifi_signal: Option<String>,
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
