// Persistent PowerShell host: spawns a single long-lived powershell.exe process,
// communicates via stdin/stdout JSON-lines. Each `run(script, args)` sends one
// command and awaits exactly one JSON response line back.
//
// Cold-start overhead: ~300ms per invocation in legacy approach.
// With this host: ~5–30ms (script parse + exec) — 10×+ faster for short scripts.

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::Write as IoWrite;
use std::path::PathBuf;
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::Mutex;

#[derive(Serialize)]
struct Req<'a> {
    id: u64,
    script: &'a str,
    args: &'a [String],
}

#[derive(Deserialize)]
struct Resp {
    id: u64,
    success: bool,
    #[serde(default)]
    data: Option<Value>,
    #[serde(default)]
    error: Option<String>,
}

struct Host {
    child: Child,
    stdin: ChildStdin,
    reader: std::io::BufReader<ChildStdout>,
    next_id: u64,
    scripts_dir: PathBuf,
}

static HOST: Lazy<Mutex<Option<Host>>> = Lazy::new(|| Mutex::new(None));

const RUNNER_SCRIPT: &str = r#"
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
$ScriptsDir = $args[0]

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  if ($line.Trim() -eq "") { continue }
  try {
    $req = $line | ConvertFrom-Json
    $script = Join-Path $ScriptsDir $req.script
    if (-not (Test-Path $script)) {
      $resp = @{ id = $req.id; success = $false; error = "Script not found: $($req.script)" }
    } else {
      $argList = @()
      if ($req.args) { $argList = @($req.args) }
      $out = & $script @argList 2>&1 | Out-String
      $trimmed = $out.Trim()
      $data = $null
      if ($trimmed.Length -gt 0) {
        try { $data = $trimmed | ConvertFrom-Json -Depth 20 } catch { $data = $trimmed }
      }
      # If the script already returned { success, data, error }, unwrap it so the
      # host's wrapper matches the existing IPC shape.
      $success = $true; $err = $null
      if ($data -is [PSCustomObject] -and ($data.PSObject.Properties.Name -contains 'success')) {
        $success = [bool]$data.success
        if ($data.PSObject.Properties.Name -contains 'error') { $err = $data.error }
        if ($data.PSObject.Properties.Name -contains 'data') { $data = $data.data } else { $data = $null }
      }
      $resp = @{ id = $req.id; success = $success; data = $data; error = $err }
    }
  } catch {
    $resp = @{ id = $req.id; success = $false; error = $_.Exception.Message }
  }
  $json = $resp | ConvertTo-Json -Depth 25 -Compress
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}
"#;

pub fn init(app: &tauri::AppHandle) -> anyhow::Result<()> {
    let scripts_dir = crate::services::paths::ps_scripts_dir(app);
    let runner_path = crate::services::paths::app_data_dir(app).join("ps-host-runner.ps1");
    std::fs::create_dir_all(runner_path.parent().unwrap())?;
    std::fs::write(&runner_path, RUNNER_SCRIPT)?;

    let mut cmd = Command::new("powershell");
    cmd.arg("-NoProfile")
        .arg("-NonInteractive")
        .arg("-ExecutionPolicy").arg("Bypass")
        .arg("-File").arg(&runner_path)
        .arg(&scripts_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());

    #[cfg(target_os = "windows")]
    {
        #[allow(unused_imports)]
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }

    let mut child = cmd.spawn()?;
    let stdin = child.stdin.take().ok_or_else(|| anyhow::anyhow!("no stdin"))?;
    let stdout = child.stdout.take().ok_or_else(|| anyhow::anyhow!("no stdout"))?;
    let reader = std::io::BufReader::new(stdout);

    let host = Host { child, stdin, reader, next_id: 1, scripts_dir };
    *HOST.lock().unwrap() = Some(host);
    Ok(())
}

pub fn run(script: &str, args: &[String]) -> Result<crate::commands::ps::PsResult, String> {
    use std::io::BufRead;
    let mut guard = HOST.lock().unwrap();
    let host = guard.as_mut().ok_or_else(|| "PS host not initialized".to_string())?;

    let id = host.next_id;
    host.next_id = host.next_id.wrapping_add(1);

    let req = Req { id, script, args };
    let line = serde_json::to_string(&req).map_err(|e| e.to_string())?;
    host.stdin.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
    host.stdin.write_all(b"\n").map_err(|e| e.to_string())?;
    host.stdin.flush().map_err(|e| e.to_string())?;

    // Read one response line
    let mut buf = String::new();
    host.reader.read_line(&mut buf).map_err(|e| e.to_string())?;
    if buf.is_empty() {
        return Err("PS host closed".into());
    }
    let resp: Resp = serde_json::from_str(buf.trim()).map_err(|e| format!("{}: {}", e, buf))?;
    if resp.id != id {
        return Err(format!("response id mismatch: expected {id} got {}", resp.id));
    }
    Ok(crate::commands::ps::PsResult {
        success: resp.success,
        data: resp.data,
        error: resp.error,
    })
}

pub fn shutdown() {
    let mut guard = HOST.lock().unwrap();
    if let Some(mut host) = guard.take() {
        let _ = host.child.kill();
    }
}
