use chrono::Utc;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::Mutex;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ActivityEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

static LOG: Lazy<Mutex<VecDeque<ActivityEntry>>> = Lazy::new(|| Mutex::new(VecDeque::with_capacity(50)));

pub fn push(level: &str, message: impl Into<String>) {
    let mut g = LOG.lock().unwrap();
    if g.len() >= 50 { g.pop_back(); }
    g.push_front(ActivityEntry {
        timestamp: Utc::now().format("%H:%M:%S").to_string(),
        level: level.into(),
        message: message.into(),
    });
}

pub fn recent(n: usize) -> Vec<ActivityEntry> {
    let g = LOG.lock().unwrap();
    g.iter().take(n).cloned().collect()
}
