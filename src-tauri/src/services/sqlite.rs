use once_cell::sync::OnceCell;
use rusqlite::{params, Connection};
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

static DB: OnceCell<Mutex<Connection>> = OnceCell::new();

pub fn init(app: &tauri::AppHandle) -> anyhow::Result<()> {
    let dir = crate::services::paths::app_data_dir(app);
    std::fs::create_dir_all(&dir)?;
    let path = dir.join("aras.db");
    let conn = Connection::open(&path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;

    conn.execute_batch(r#"
        CREATE TABLE IF NOT EXISTS history (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            action TEXT,
            target TEXT,
            details TEXT,
            size_bytes INTEGER DEFAULT 0,
            risk_score INTEGER DEFAULT 0,
            status TEXT,
            raw TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_history_ts ON history(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_history_action ON history(action);
        CREATE INDEX IF NOT EXISTS idx_history_status ON history(status);

        CREATE TABLE IF NOT EXISTS threats (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            type TEXT,
            name TEXT,
            path TEXT,
            severity TEXT,
            action TEXT,
            risk_score INTEGER DEFAULT 0,
            raw TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_threats_ts ON threats(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_threats_type ON threats(type);
        CREATE INDEX IF NOT EXISTS idx_threats_action ON threats(action);

        CREATE VIRTUAL TABLE IF NOT EXISTS history_fts USING fts5(
            content, content='history', content_rowid='rowid'
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS threats_fts USING fts5(
            content, content='threats', content_rowid='rowid'
        );
    "#)?;

    let _ = DB.set(Mutex::new(conn));

    // One-time migration from old JSON files
    migrate_from_json(app);
    Ok(())
}

fn migrate_from_json(app: &tauri::AppHandle) {
    let dir = crate::services::paths::app_data_dir(app);
    let hist = dir.join("history.json");
    if hist.exists() {
        if let Ok(raw) = std::fs::read_to_string(&hist) {
            if let Ok(items) = serde_json::from_str::<Vec<Value>>(&raw) {
                for it in items { let _ = history_insert(it); }
                let _ = std::fs::rename(&hist, hist.with_extension("json.migrated"));
            }
        }
    }
    let th = dir.join("threats.json");
    if th.exists() {
        if let Ok(raw) = std::fs::read_to_string(&th) {
            if let Ok(items) = serde_json::from_str::<Vec<Value>>(&raw) {
                for it in items { let _ = threat_insert(it); }
                let _ = std::fs::rename(&th, th.with_extension("json.migrated"));
            }
        }
    }
}

fn s(v: &Value, k: &str) -> Option<String> {
    v.get(k).and_then(|x| x.as_str()).map(String::from)
}

fn s_any(v: &Value, keys: &[&str]) -> Option<String> {
    for k in keys {
        if let Some(val) = s(v, k) {
            if !val.is_empty() {
                return Some(val);
            }
        }
    }
    None
}

fn i(v: &Value, k: &str) -> i64 {
    v.get(k).and_then(|x| x.as_i64()).unwrap_or(0)
}

pub fn history_insert(mut entry: Value) -> anyhow::Result<Value> {
    let id = s(&entry, "id").unwrap_or_else(|| Uuid::new_v4().to_string());
    let ts = s(&entry, "timestamp").unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
    if let Value::Object(ref mut m) = entry {
        m.insert("id".into(), json!(id.clone()));
        m.insert("timestamp".into(), json!(ts.clone()));
    }
    let raw = serde_json::to_string(&entry)?;
    let m = DB.get().ok_or_else(|| anyhow::anyhow!("db not init"))?;
    let conn = m.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO history (id, timestamp, action, target, details, size_bytes, risk_score, status, raw)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        params![
            id, ts,
            s(&entry, "action").unwrap_or_default(),
            s(&entry, "target").unwrap_or_default(),
            s(&entry, "details").unwrap_or_default(),
            i(&entry, "sizeBytes"),
            i(&entry, "riskScore"),
            s(&entry, "status").unwrap_or_default(),
            raw,
        ],
    )?;
    // FTS update
    let content = format!("{} {} {} {}",
        s(&entry, "action").unwrap_or_default(),
        s(&entry, "target").unwrap_or_default(),
        s(&entry, "details").unwrap_or_default(),
        s(&entry, "status").unwrap_or_default(),
    );
    let _ = conn.execute(
        "INSERT INTO history_fts (rowid, content) SELECT rowid, ?1 FROM history WHERE id=?2",
        params![content, id],
    );
    Ok(entry)
}

pub fn history_list(limit: usize, offset: usize) -> Vec<Value> {
    let Some(m) = DB.get() else { return vec![] };
    let conn = m.lock().unwrap();
    let mut stmt = match conn.prepare("SELECT raw FROM history ORDER BY timestamp DESC LIMIT ?1 OFFSET ?2") {
        Ok(s) => s, Err(_) => return vec![],
    };
    let it = stmt.query_map(params![limit as i64, offset as i64], |r| r.get::<_, String>(0)).ok();
    let mut out = vec![];
    if let Some(rows) = it {
        for r in rows.flatten() {
            if let Ok(v) = serde_json::from_str::<Value>(&r) { out.push(v); }
        }
    }
    out
}

pub fn history_search(q: &str) -> Vec<Value> {
    let Some(m) = DB.get() else { return vec![] };
    let conn = m.lock().unwrap();
    let mut stmt = match conn.prepare(
        "SELECT h.raw FROM history_fts f JOIN history h ON h.rowid = f.rowid
         WHERE history_fts MATCH ?1 ORDER BY h.timestamp DESC LIMIT 500"
    ) { Ok(s) => s, Err(_) => return vec![] };
    let pattern = format!("{}*", q.replace('"', ""));
    let it = stmt.query_map(params![pattern], |r| r.get::<_, String>(0)).ok();
    let mut out = vec![];
    if let Some(rows) = it {
        for r in rows.flatten() {
            if let Ok(v) = serde_json::from_str::<Value>(&r) { out.push(v); }
        }
    }
    out
}

pub fn history_by_action(action: &str) -> Vec<Value> {
    let Some(m) = DB.get() else { return vec![] };
    let conn = m.lock().unwrap();
    let mut stmt = match conn.prepare("SELECT raw FROM history WHERE action=?1 ORDER BY timestamp DESC LIMIT 500") {
        Ok(s) => s, Err(_) => return vec![],
    };
    let it = stmt.query_map(params![action], |r| r.get::<_, String>(0)).ok();
    let mut out = vec![];
    if let Some(rows) = it {
        for r in rows.flatten() {
            if let Ok(v) = serde_json::from_str::<Value>(&r) { out.push(v); }
        }
    }
    out
}

pub fn history_stats() -> Value {
    let Some(m) = DB.get() else { return json!({}) };
    let conn = m.lock().unwrap();
    let total: i64 = conn.query_row("SELECT COUNT(*) FROM history", [], |r| r.get(0)).unwrap_or(0);
    let success: i64 = conn.query_row("SELECT COUNT(*) FROM history WHERE status='success'", [], |r| r.get(0)).unwrap_or(0);
    let error: i64 = conn.query_row("SELECT COUNT(*) FROM history WHERE status='error'", [], |r| r.get(0)).unwrap_or(0);
    let total_size: i64 = conn.query_row("SELECT COALESCE(SUM(size_bytes),0) FROM history", [], |r| r.get(0)).unwrap_or(0);
    json!({ "total": total, "success": success, "error": error, "totalSize": total_size })
}

pub fn threat_insert(mut entry: Value) -> anyhow::Result<Value> {
    let id = s(&entry, "id").unwrap_or_else(|| Uuid::new_v4().to_string());
    let ts = s(&entry, "timestamp").unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
    if let Value::Object(ref mut m) = entry {
        m.insert("id".into(), json!(id.clone()));
        m.insert("timestamp".into(), json!(ts.clone()));
    }
    let raw = serde_json::to_string(&entry)?;
    let m = DB.get().ok_or_else(|| anyhow::anyhow!("db not init"))?;
    let conn = m.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO threats (id, timestamp, type, name, path, severity, action, risk_score, raw)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        params![
            id, ts,
            s_any(&entry, &["type", "threatType"]).unwrap_or_default(),
            s_any(&entry, &["name", "fileName", "threatName"]).unwrap_or_default(),
            s_any(&entry, &["path", "filePath"]).unwrap_or_default(),
            s(&entry, "severity").unwrap_or_default(),
            s(&entry, "action").unwrap_or_default(),
            i(&entry, "riskScore"),
            raw,
        ],
    )?;
    let content = format!("{} {} {} {} {}",
        s_any(&entry, &["type", "threatType"]).unwrap_or_default(),
        s_any(&entry, &["name", "fileName", "threatName"]).unwrap_or_default(),
        s_any(&entry, &["path", "filePath"]).unwrap_or_default(),
        s(&entry, "severity").unwrap_or_default(),
        s(&entry, "action").unwrap_or_default(),
    );
    let _ = conn.execute(
        "INSERT INTO threats_fts (rowid, content) SELECT rowid, ?1 FROM threats WHERE id=?2",
        params![content, id],
    );
    Ok(entry)
}

pub fn threat_list(limit: usize, offset: usize) -> Vec<Value> {
    let Some(m) = DB.get() else { return vec![] };
    let conn = m.lock().unwrap();
    let mut stmt = match conn.prepare("SELECT raw FROM threats ORDER BY timestamp DESC LIMIT ?1 OFFSET ?2") {
        Ok(s) => s, Err(_) => return vec![],
    };
    let it = stmt.query_map(params![limit as i64, offset as i64], |r| r.get::<_, String>(0)).ok();
    let mut out = vec![];
    if let Some(rows) = it {
        for r in rows.flatten() {
            if let Ok(v) = serde_json::from_str::<Value>(&r) { out.push(v); }
        }
    }
    out
}

pub fn threat_search(q: &str) -> Vec<Value> {
    let Some(m) = DB.get() else { return vec![] };
    let conn = m.lock().unwrap();
    let mut stmt = match conn.prepare(
        "SELECT t.raw FROM threats_fts f JOIN threats t ON t.rowid = f.rowid
         WHERE threats_fts MATCH ?1 ORDER BY t.timestamp DESC LIMIT 500"
    ) { Ok(s) => s, Err(_) => return vec![] };
    let pattern = format!("{}*", q.replace('"', ""));
    let it = stmt.query_map(params![pattern], |r| r.get::<_, String>(0)).ok();
    let mut out = vec![];
    if let Some(rows) = it {
        for r in rows.flatten() {
            if let Ok(v) = serde_json::from_str::<Value>(&r) { out.push(v); }
        }
    }
    out
}

pub fn threat_by_type(t: &str) -> Vec<Value> {
    let Some(m) = DB.get() else { return vec![] };
    let conn = m.lock().unwrap();
    let mut stmt = match conn.prepare("SELECT raw FROM threats WHERE type=?1 ORDER BY timestamp DESC LIMIT 500") {
        Ok(s) => s, Err(_) => return vec![],
    };
    let it = stmt.query_map(params![t], |r| r.get::<_, String>(0)).ok();
    let mut out = vec![];
    if let Some(rows) = it {
        for r in rows.flatten() {
            if let Ok(v) = serde_json::from_str::<Value>(&r) { out.push(v); }
        }
    }
    out
}

pub fn threat_stats() -> Value {
    let Some(m) = DB.get() else { return json!({}) };
    let conn = m.lock().unwrap();
    let total: i64 = conn.query_row("SELECT COUNT(*) FROM threats", [], |r| r.get(0)).unwrap_or(0);
    let today: i64 = conn.query_row(
        "SELECT COUNT(*) FROM threats WHERE date(timestamp) = date('now')",
        [],
        |r| r.get(0),
    ).unwrap_or(0);
    let pending: i64 = conn.query_row("SELECT COUNT(*) FROM threats WHERE action='pending'", [], |r| r.get(0)).unwrap_or(0);
    let quarantined: i64 = conn.query_row(
        "SELECT COUNT(*) FROM threats WHERE action IN ('quarantine', 'quarantined')",
        [],
        |r| r.get(0),
    ).unwrap_or(0);
    let deleted: i64 = conn.query_row("SELECT COUNT(*) FROM threats WHERE action='deleted'", [], |r| r.get(0)).unwrap_or(0);

    let count_type = |t: &str| -> i64 {
        conn.query_row("SELECT COUNT(*) FROM threats WHERE type=?1", params![t], |r| r.get(0)).unwrap_or(0)
    };
    let count_sev = |s: &str| -> i64 {
        conn.query_row("SELECT COUNT(*) FROM threats WHERE severity=?1", params![s], |r| r.get(0)).unwrap_or(0)
    };

    json!({
      "total": total,
      "today": today,
      "pending": pending,
      "quarantined": quarantined,
      "deleted": deleted,
      "byType": {
        "virus": count_type("virus"),
        "trojan": count_type("trojan"),
        "malware": count_type("malware"),
        "adware": count_type("adware"),
        "spyware": count_type("spyware"),
        "ransomware": count_type("ransomware"),
        "pup": count_type("pup"),
        "unknown": count_type("unknown")
      },
      "bySeverity": {
        "critical": count_sev("critical"),
        "high": count_sev("high"),
        "medium": count_sev("medium"),
        "low": count_sev("low")
      }
    })
}

pub fn threat_update_action(id: &str, action: &str) -> Value {
    let Some(m) = DB.get() else { return json!({}) };
    let conn = m.lock().unwrap();
    let _ = conn.execute("UPDATE threats SET action=?1 WHERE id=?2", params![action, id]);
    let raw: Option<String> = conn.query_row("SELECT raw FROM threats WHERE id=?1", params![id], |r| r.get(0)).ok();
    if let Some(r) = raw {
        if let Ok(mut v) = serde_json::from_str::<Value>(&r) {
            if let Value::Object(ref mut m) = v { m.insert("action".into(), json!(action)); }
            return v;
        }
    }
    json!({})
}

pub fn threat_delete(id: &str) {
    let Some(m) = DB.get() else { return };
    let conn = m.lock().unwrap();
    let _ = conn.execute("DELETE FROM threats WHERE id=?1", params![id]);
}
