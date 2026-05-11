// Encrypted quarantine: every isolated file is AES-256-GCM encrypted with a
// per-install key (derived from a random seed stored in app data). Restoring
// decrypts to a chosen target; deletion just removes the encrypted blob.
//
// File format on disk:
//   [12-byte nonce][ciphertext + 16-byte GCM tag]
// Metadata (original path, SHA256, size, timestamp) lives in SQLite.

use aes_gcm::{aead::{Aead, KeyInit, OsRng}, Aes256Gcm, Nonce};
use anyhow::Context;
use rand::RngCore;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;

fn key_path(app: &tauri::AppHandle) -> PathBuf {
    crate::services::paths::app_data_dir(app).join("quarantine.key")
}

fn quarantine_dir(app: &tauri::AppHandle) -> PathBuf {
    let p = crate::services::paths::app_data_dir(app).join("quarantine");
    let _ = fs::create_dir_all(&p);
    p
}

fn get_or_create_key(app: &tauri::AppHandle) -> anyhow::Result<[u8; 32]> {
    let path = key_path(app);
    if path.exists() {
        let bytes = fs::read(&path)?;
        if bytes.len() != 32 { anyhow::bail!("invalid key length"); }
        let mut out = [0u8; 32];
        out.copy_from_slice(&bytes);
        return Ok(out);
    }
    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    fs::write(&path, &key)?;
    // Lock down on Windows: best-effort hidden+readonly
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("attrib").args(&["+H", "+S"]).arg(&path).status();
    }
    Ok(key)
}

fn sha256_file(path: &PathBuf) -> anyhow::Result<String> {
    let mut f = std::fs::File::open(path)?;
    let mut h = Sha256::new();
    let mut buf = [0u8; 8192];
    use std::io::Read;
    loop {
        let n = f.read(&mut buf)?;
        if n == 0 { break; }
        h.update(&buf[..n]);
    }
    Ok(hex(&h.finalize()))
}

fn hex(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes { s.push_str(&format!("{:02x}", b)); }
    s
}

pub fn isolate(app: &tauri::AppHandle, file_path: &str) -> anyhow::Result<Value> {
    let src = PathBuf::from(file_path);
    if !src.exists() { anyhow::bail!("File not found: {file_path}"); }
    let plain = fs::read(&src).with_context(|| format!("read {}", src.display()))?;
    let original_size = plain.len() as i64;
    let hash = sha256_file(&src).unwrap_or_default();

    let key = get_or_create_key(app)?;
    let cipher = Aes256Gcm::new((&key).into());
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ct = cipher.encrypt(nonce, plain.as_ref())
        .map_err(|e| anyhow::anyhow!("encrypt failed: {e}"))?;

    let id = uuid::Uuid::new_v4().to_string();
    let blob_path = quarantine_dir(app).join(format!("{id}.bin"));
    let mut out = Vec::with_capacity(12 + ct.len());
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ct);
    fs::write(&blob_path, &out)?;

    // Best-effort remove of original
    let _ = fs::remove_file(&src);

    let entry = json!({
        "id": id,
        "type": "quarantine",
        "name": src.file_name().and_then(|s| s.to_str()).unwrap_or(""),
        "path": file_path,
        "blob": blob_path.display().to_string(),
        "size": original_size,
        "sha256": hash,
        "action": "quarantine",
        "severity": "high"
    });
    crate::services::sqlite::threat_insert(entry.clone()).ok();
    Ok(entry)
}

pub fn restore(app: &tauri::AppHandle, id: &str, dest: Option<&str>) -> anyhow::Result<Value> {
    let m = crate::services::sqlite::threat_list(5000, 0);
    let rec = m.into_iter().find(|v| v.get("id").and_then(|x| x.as_str()) == Some(id))
        .ok_or_else(|| anyhow::anyhow!("Quarantine record not found"))?;
    let blob = rec.get("blob").and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("blob path missing"))?;
    let original = rec.get("path").and_then(|v| v.as_str()).unwrap_or("");
    let target = dest.unwrap_or(original);
    if target.is_empty() { anyhow::bail!("No destination"); }

    let raw = fs::read(blob)?;
    if raw.len() < 12 { anyhow::bail!("blob too small"); }
    let (nonce_bytes, ct) = raw.split_at(12);
    let key = get_or_create_key(app)?;
    let cipher = Aes256Gcm::new((&key).into());
    let nonce = Nonce::from_slice(nonce_bytes);
    let pt = cipher.decrypt(nonce, ct)
        .map_err(|e| anyhow::anyhow!("decrypt failed (key mismatch or corrupted): {e}"))?;

    fs::write(target, &pt)?;
    let _ = fs::remove_file(blob);
    crate::services::sqlite::threat_update_action(id, "restored");
    Ok(json!({ "success": true, "restoredTo": target }))
}

pub fn purge(app: &tauri::AppHandle, id: &str) -> anyhow::Result<Value> {
    let m = crate::services::sqlite::threat_list(5000, 0);
    if let Some(rec) = m.into_iter().find(|v| v.get("id").and_then(|x| x.as_str()) == Some(id)) {
        if let Some(blob) = rec.get("blob").and_then(|v| v.as_str()) {
            let _ = fs::remove_file(blob);
        }
    }
    crate::services::sqlite::threat_delete(id);
    let _ = app;
    Ok(json!({ "success": true }))
}
