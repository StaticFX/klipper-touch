use std::collections::HashMap;

/// Download printer.cfg from Moonraker's file API.
#[tauri::command]
pub async fn fetch_printer_config(moonraker_url: String) -> Result<String, String> {
    let url = format!(
        "{}/server/files/config/printer.cfg",
        moonraker_url.trim_end_matches('/')
    );
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to fetch printer.cfg: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("Moonraker returned status {}", resp.status()));
    }
    resp.text()
        .await
        .map_err(|e| format!("Failed to read response: {e}"))
}

/// Upload printer.cfg to Moonraker's file API.
#[tauri::command]
pub async fn upload_printer_config(moonraker_url: String, content: String) -> Result<(), String> {
    let url = format!(
        "{}/server/files/upload",
        moonraker_url.trim_end_matches('/')
    );
    let part = reqwest::multipart::Part::text(content)
        .file_name("printer.cfg")
        .mime_str("text/plain")
        .map_err(|e| format!("Failed to create multipart: {e}"))?;
    let form = reqwest::multipart::Form::new()
        .text("root", "config")
        .part("file", part);
    let resp = reqwest::Client::new()
        .post(&url)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Failed to upload printer.cfg: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("Moonraker returned status {}", resp.status()));
    }
    Ok(())
}

const SAVE_CONFIG_MARKER: &str = "#*# <---------------------- SAVE_CONFIG ---------------------->";

/// Update a section inside Klipper's `#*# SAVE_CONFIG` override block at the
/// bottom of printer.cfg.  Creates the block and/or section if they don't exist.
///
/// Format:
/// ```text
/// #*# <---------------------- SAVE_CONFIG ---------------------->
/// #*# DO NOT EDIT THIS BLOCK OR BELOW. The contents are auto-generated.
/// #*#
/// #*# [input_shaper]
/// #*# shaper_type_x = mzv
/// #*# shaper_freq_x = 48.4
/// ```
#[tauri::command]
pub fn update_config_override(
    content: String,
    section: String,
    values: HashMap<String, String>,
) -> Result<String, String> {
    let mut lines: Vec<String> = content.lines().map(|l| l.to_string()).collect();
    let override_header = format!("#*# [{}]", section);

    // Find the SAVE_CONFIG block
    let block_start = lines.iter().position(|l| l.trim() == SAVE_CONFIG_MARKER);

    if let Some(block_idx) = block_start {
        // Find our section within the override block
        let mut section_start: Option<usize> = None;
        let mut section_end: Option<usize> = None;

        for i in (block_idx + 1)..lines.len() {
            let trimmed = lines[i].trim();
            if trimmed == override_header {
                section_start = Some(i);
            } else if section_start.is_some()
                && section_end.is_none()
                && trimmed.starts_with("#*# [")
            {
                section_end = Some(i);
            }
        }

        if let Some(start) = section_start {
            let end = section_end.unwrap_or(lines.len());
            let mut remaining = values.clone();

            // Update existing keys
            for i in (start + 1)..end {
                let trimmed = lines[i].trim();
                // Strip the #*# prefix to get the actual content
                let inner = trimmed.strip_prefix("#*#").map(|s| s.trim()).unwrap_or("");
                if inner.is_empty() {
                    continue;
                }
                if let Some(eq_pos) = inner.find('=') {
                    let key = inner[..eq_pos].trim();
                    if let Some(new_val) = remaining.remove(key) {
                        lines[i] = format!("#*# {} = {}", key, new_val);
                    }
                }
            }

            // Append new keys before section_end
            if !remaining.is_empty() {
                let insert_at = end;
                let mut new_lines: Vec<String> = remaining
                    .iter()
                    .map(|(k, v)| format!("#*# {} = {}", k, v))
                    .collect();
                new_lines.sort();
                for (offset, line) in new_lines.into_iter().enumerate() {
                    lines.insert(insert_at + offset, line);
                }
            }
        } else {
            // Section doesn't exist in override block — append it
            lines.push(format!("#*#"));
            lines.push(override_header);
            let mut sorted: Vec<_> = values.iter().collect();
            sorted.sort_by_key(|(k, _)| (*k).clone());
            for (k, v) in sorted {
                lines.push(format!("#*# {} = {}", k, v));
            }
        }
    } else {
        // No SAVE_CONFIG block at all — create it
        lines.push(String::new());
        lines.push(SAVE_CONFIG_MARKER.to_string());
        lines.push("#*# DO NOT EDIT THIS BLOCK OR BELOW. The contents are auto-generated.".to_string());
        lines.push("#*#".to_string());
        lines.push(override_header);
        let mut sorted: Vec<_> = values.iter().collect();
        sorted.sort_by_key(|(k, _)| (*k).clone());
        for (k, v) in sorted {
            lines.push(format!("#*# {} = {}", k, v));
        }
    }

    Ok(lines.join("\n"))
}
