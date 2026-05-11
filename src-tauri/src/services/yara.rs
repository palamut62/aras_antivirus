// YARA scanner using the pure-Rust `yara-x` crate (no system YARA library needed).
// Rule sources:
//   1) Bundled defaults (this file's DEFAULT_RULES)
//   2) Any *.yar / *.yara files under <app_data>/yara/
// Compiled rules are cached in memory; reload on demand.

use anyhow::Context;
use once_cell::sync::OnceCell;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use walkdir::WalkDir;

static RULES: OnceCell<Mutex<Option<yara_x::Rules>>> = OnceCell::new();

const DEFAULT_RULES: &str = r#"
rule SuspiciousPowerShellEncoded {
    meta:
        description = "Encoded PowerShell command (base64 -EncodedCommand)"
        severity = "high"
    strings:
        $a = /-(e|en|enc|EncodedCommand)\s+[A-Za-z0-9+\/=]{40,}/ nocase
    condition:
        $a
}

rule SuspiciousMimikatzStrings {
    meta:
        description = "Mimikatz credential dumper strings"
        severity = "critical"
    strings:
        $a = "sekurlsa::logonpasswords" nocase
        $b = "lsadump::sam" nocase
        $c = "kerberos::list" nocase
        $d = "Invoke-Mimikatz" nocase
    condition:
        any of them
}

rule SuspiciousReverseShell {
    meta:
        description = "Reverse shell patterns"
        severity = "high"
    strings:
        $a = "TcpClient" nocase
        $b = "GetStream" nocase
        $c = "powershell -nop -w hidden -c" nocase
        $d = /nc(?:\.exe)?\s+-[el]+\s+/ nocase
    condition:
        ($a and $b) or $c or $d
}

rule SuspiciousCobaltStrikeIndicators {
    meta:
        description = "Cobalt Strike beacon indicators"
        severity = "critical"
    strings:
        $a = "beacon.dll" nocase
        $b = "MZ"
        $c = "ReflectiveLoader"
        $d = "%COMSPEC%" nocase
        $e = "rundll32.exe shell32.dll,Control_RunDLL" nocase
    condition:
        $b at 0 and (2 of ($a, $c, $d, $e))
}

rule SuspiciousScriptDownloader {
    meta:
        description = "Inline script downloader pattern"
        severity = "medium"
    strings:
        $a = /(IEX|Invoke-Expression)\s*\(\s*(New-Object\s+)?(Net\.)?WebClient/ nocase
        $b = /DownloadString\s*\(\s*['"]https?:\/\// nocase
        $c = "bitsadmin /transfer" nocase
        $d = /certutil\s+-urlcache/ nocase
    condition:
        any of them
}

rule SuspiciousRansomwareNotes {
    meta:
        description = "Ransomware note keywords"
        severity = "high"
    strings:
        $a = "your files have been encrypted" nocase
        $b = "decryption key" nocase
        $c = "send bitcoin" nocase
        $d = "tor browser" nocase
        $e = ".onion" nocase
    condition:
        2 of them
}

rule HardcodedPrivateKey {
    meta:
        description = "Embedded PEM private key"
        severity = "medium"
    strings:
        $a = "-----BEGIN PRIVATE KEY-----"
        $b = "-----BEGIN RSA PRIVATE KEY-----"
        $c = "-----BEGIN OPENSSH PRIVATE KEY-----"
        $d = "-----BEGIN EC PRIVATE KEY-----"
    condition:
        any of them
}

rule LolbasCertutilDecoder {
    meta:
        description = "certutil used to decode payload"
        severity = "high"
    strings:
        $a = /certutil(\.exe)?\s+-decode/ nocase
        $b = /certutil(\.exe)?\s+-urlcache\s+-split\s+-f/ nocase
    condition:
        any of them
}

rule LolbasRegsvr32Squiblydoo {
    meta:
        description = "regsvr32 squiblydoo technique"
        severity = "high"
    strings:
        $a = /regsvr32(\.exe)?\s+\/s\s+\/n\s+\/u\s+\/i:https?:\/\// nocase
    condition:
        $a
}

rule SuspiciousProcessHollowing {
    meta:
        description = "Process hollowing API string indicators"
        severity = "high"
    strings:
        $a = "NtUnmapViewOfSection"
        $b = "ZwUnmapViewOfSection"
        $c = "WriteProcessMemory"
        $d = "CreateRemoteThread"
        $e = "VirtualAllocEx"
    condition:
        3 of them
}
"#;

#[derive(Serialize, Clone)]
pub struct YaraMatch {
    pub file: String,
    pub rule: String,
    pub severity: String,
    pub description: String,
    pub matched_strings: usize,
    pub size_bytes: u64,
}

#[derive(Serialize)]
pub struct ScanReport {
    pub matches: Vec<YaraMatch>,
    pub files_scanned: usize,
    pub bytes_scanned: u64,
    pub rules_loaded: usize,
}

fn rules_dir(app: &tauri::AppHandle) -> PathBuf {
    let d = crate::services::paths::app_data_dir(app).join("yara");
    let _ = std::fs::create_dir_all(&d);
    d
}

fn compile_all(app: &tauri::AppHandle) -> anyhow::Result<yara_x::Rules> {
    let mut compiler = yara_x::Compiler::new();
    compiler.add_source(DEFAULT_RULES).context("compile default rules")?;

    // User-provided rule files
    for entry in WalkDir::new(rules_dir(app)).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() { continue; }
        let path = entry.path();
        let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
        if ext != "yar" && ext != "yara" { continue; }
        if let Ok(src) = std::fs::read_to_string(path) {
            if let Err(e) = compiler.add_source(src.as_str()) {
                log::warn!("yara: failed to compile {}: {}", path.display(), e);
            }
        }
    }
    Ok(compiler.build())
}

pub fn init(app: &tauri::AppHandle) -> anyhow::Result<()> {
    let rules = compile_all(app)?;
    let _ = RULES.set(Mutex::new(Some(rules)));
    Ok(())
}

pub fn reload(app: &tauri::AppHandle) -> anyhow::Result<()> {
    let rules = compile_all(app)?;
    if let Some(m) = RULES.get() {
        *m.lock().unwrap() = Some(rules);
    } else {
        let _ = RULES.set(Mutex::new(Some(rules)));
    }
    Ok(())
}

pub fn rule_count() -> usize {
    if let Some(m) = RULES.get() {
        if let Some(ref r) = *m.lock().unwrap() {
            return r.iter().count();
        }
    }
    0
}

fn meta_string(rule: &yara_x::Rule, key: &str) -> Option<String> {
    for (k, v) in rule.metadata() {
        if k == key {
            if let yara_x::MetaValue::String(s) = v {
                return Some(s.to_string());
            }
        }
    }
    None
}

fn scan_path(scanner: &mut yara_x::Scanner, path: &Path, max_bytes: u64, out: &mut Vec<YaraMatch>) -> anyhow::Result<u64> {
    let meta = std::fs::metadata(path)?;
    let size = meta.len();
    if size == 0 || size > max_bytes { return Ok(0); }
    let data = std::fs::read(path)?;
    let results = scanner.scan(&data).map_err(|e| anyhow::anyhow!("{e}"))?;
    for m in results.matching_rules() {
        out.push(YaraMatch {
            file: path.display().to_string(),
            rule: m.identifier().to_string(),
            severity: meta_string(&m, "severity").unwrap_or_else(|| "medium".into()),
            description: meta_string(&m, "description").unwrap_or_default(),
            matched_strings: m.patterns().count(),
            size_bytes: size,
        });
    }
    Ok(size)
}

pub fn scan_dir(target: &str, max_file_mb: u64) -> anyhow::Result<ScanReport> {
    let max_bytes = max_file_mb.max(1) * 1024 * 1024;
    let m = RULES.get().ok_or_else(|| anyhow::anyhow!("yara: rules not loaded"))?;
    let guard = m.lock().unwrap();
    let rules = guard.as_ref().ok_or_else(|| anyhow::anyhow!("yara: no rules"))?;
    let mut scanner = yara_x::Scanner::new(rules);
    scanner.set_timeout(std::time::Duration::from_secs(10));

    let mut matches = Vec::new();
    let mut files_scanned = 0usize;
    let mut bytes_scanned = 0u64;

    let root = Path::new(target);
    if root.is_file() {
        if let Ok(b) = scan_path(&mut scanner, root, max_bytes, &mut matches) {
            files_scanned = 1; bytes_scanned = b;
        }
    } else {
        for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
            if !entry.file_type().is_file() { continue; }
            let path = entry.path();
            match scan_path(&mut scanner, path, max_bytes, &mut matches) {
                Ok(b) => { files_scanned += 1; bytes_scanned += b; }
                Err(_) => continue,
            }
        }
    }

    let rules_loaded = rules.iter().count();
    Ok(ScanReport { matches, files_scanned, bytes_scanned, rules_loaded })
}
