use std::{
    env,
    net::SocketAddr,
    path::{Path, PathBuf},
};

use axum::{
    extract::{DefaultBodyLimit, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

const MAX_MESSAGE_CHARS: usize = 2_000;
const MAX_PAGE_CHARS: usize = 160;

#[derive(Clone)]
struct AppState {
    database_path: PathBuf,
    feedback_password: String,
}

#[derive(Deserialize)]
struct FeedbackRequest {
    kind: String,
    message: String,
    page: String,
    password: String,
    #[serde(default)]
    website: String,
}

#[derive(Serialize)]
struct FeedbackResponse {
    ok: bool,
    id: Option<i64>,
}

#[derive(Serialize)]
struct HealthResponse {
    ok: bool,
    stored_feedback: i64,
}

#[derive(Debug)]
enum ApiError {
    BadRequest(&'static str),
    Database,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            Self::BadRequest(message) => (StatusCode::BAD_REQUEST, message),
            Self::Database => (StatusCode::INTERNAL_SERVER_ERROR, "database error"),
        };
        (
            status,
            Json(serde_json::json!({ "ok": false, "error": message })),
        )
            .into_response()
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let database_path = env::var_os("DATABASE_PATH")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("feedback.sqlite3"));
    let bind_address: SocketAddr = env::var("BIND_ADDRESS")
        .unwrap_or_else(|_| "127.0.0.1:8789".to_owned())
        .parse()
        .expect("BIND_ADDRESS must be a socket address");
    let feedback_password =
        env::var("FEEDBACK_PASSWORD").expect("FEEDBACK_PASSWORD must be configured");
    assert!(
        !feedback_password.is_empty(),
        "FEEDBACK_PASSWORD must not be empty"
    );

    initialize_database(&database_path).expect("failed to initialize feedback database");

    let state = AppState {
        database_path,
        feedback_password,
    };
    let app = Router::new()
        .route("/health", get(health))
        .route("/feedback", post(create_feedback))
        .layer(DefaultBodyLimit::max(8 * 1024))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(bind_address)
        .await
        .expect("failed to bind feedback service");
    info!(%bind_address, "feedback service listening");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("feedback service failed");
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}

async fn create_feedback(
    State(state): State<AppState>,
    Json(payload): Json<FeedbackRequest>,
) -> Result<(StatusCode, Json<FeedbackResponse>), ApiError> {
    if !payload.website.trim().is_empty() {
        return Ok((
            StatusCode::CREATED,
            Json(FeedbackResponse { ok: true, id: None }),
        ));
    }
    if !password_matches(&payload.password, &state.feedback_password) {
        return Err(ApiError::BadRequest("invalid feedback password"));
    }
    let kind = validate_kind(&payload.kind)?;
    let message = validate_message(&payload.message)?;
    let page = validate_page(&payload.page)?;
    let database_path = state.database_path;

    let id = tokio::task::spawn_blocking(move || -> rusqlite::Result<i64> {
        let connection = open_database(&database_path)?;
        connection.execute(
            "INSERT INTO feedback (kind, page, message) VALUES (?1, ?2, ?3)",
            params![kind, page, message],
        )?;
        Ok(connection.last_insert_rowid())
    })
    .await
    .map_err(|join_error| {
        error!(%join_error, "feedback database task failed");
        ApiError::Database
    })?
    .map_err(|database_error| {
        error!(%database_error, "feedback insert failed");
        ApiError::Database
    })?;

    Ok((
        StatusCode::CREATED,
        Json(FeedbackResponse {
            ok: true,
            id: Some(id),
        }),
    ))
}

async fn health(State(state): State<AppState>) -> Result<Json<HealthResponse>, ApiError> {
    let database_path = state.database_path;
    let count = tokio::task::spawn_blocking(move || -> rusqlite::Result<i64> {
        open_database(&database_path)?
            .query_row("SELECT COUNT(*) FROM feedback", [], |row| row.get(0))
    })
    .await
    .map_err(|_| ApiError::Database)?
    .map_err(|_| ApiError::Database)?;
    Ok(Json(HealthResponse {
        ok: true,
        stored_feedback: count,
    }))
}

fn validate_kind(value: &str) -> Result<String, ApiError> {
    match value.trim() {
        "improvement" => Ok("improvement".to_owned()),
        "new_demo" => Ok("new_demo".to_owned()),
        _ => Err(ApiError::BadRequest("invalid feedback kind")),
    }
}

fn password_matches(candidate: &str, expected: &str) -> bool {
    let candidate = candidate.as_bytes();
    let expected = expected.as_bytes();
    let mut difference = candidate.len() ^ expected.len();
    for (index, expected_byte) in expected.iter().enumerate() {
        difference |= usize::from(candidate.get(index).copied().unwrap_or(0) ^ expected_byte);
    }
    difference == 0
}

fn validate_message(value: &str) -> Result<String, ApiError> {
    let trimmed = value.trim();
    let length = trimmed.chars().count();
    if length < 10 {
        return Err(ApiError::BadRequest(
            "feedback must contain at least 10 characters",
        ));
    }
    if length > MAX_MESSAGE_CHARS {
        return Err(ApiError::BadRequest("feedback is too long"));
    }
    Ok(trimmed.to_owned())
}

fn validate_page(value: &str) -> Result<String, ApiError> {
    let trimmed = value.trim();
    let is_space_page = trimmed == "/space" || trimmed.starts_with("/space/");
    if trimmed.is_empty() || trimmed.chars().count() > MAX_PAGE_CHARS || !is_space_page {
        return Err(ApiError::BadRequest("invalid page"));
    }
    Ok(trimmed.to_owned())
}

fn initialize_database(path: &Path) -> rusqlite::Result<()> {
    let connection = open_database(path)?;
    connection.execute_batch(
        "CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
            kind TEXT NOT NULL CHECK (kind IN ('improvement', 'new_demo')),
            page TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'planned', 'done', 'declined'))
        );
        CREATE INDEX IF NOT EXISTS feedback_status_created_idx ON feedback(status, created_at);",
    )?;
    Ok(())
}

fn open_database(path: &Path) -> rusqlite::Result<Connection> {
    let connection = Connection::open(path)?;
    connection.busy_timeout(std::time::Duration::from_secs(5))?;
    connection.pragma_update(None, "journal_mode", "WAL")?;
    connection.pragma_update(None, "foreign_keys", "ON")?;
    Ok(connection)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_feedback_fields() {
        assert_eq!(validate_kind("new_demo").unwrap(), "new_demo");
        assert!(validate_kind("spam").is_err());
        assert!(validate_message("too short").is_err());
        assert!(validate_message(&"x".repeat(MAX_MESSAGE_CHARS + 1)).is_err());
        assert!(validate_page("/not-space/").is_err());
        assert!(validate_page("/spacex/").is_err());
        assert_eq!(validate_page("/space/j2/").unwrap(), "/space/j2/");
        assert!(password_matches("class-password", "class-password"));
        assert!(!password_matches("wrong", "class-password"));
    }

    #[test]
    fn migration_is_idempotent_and_persists_feedback() {
        let temporary = tempfile::tempdir().unwrap();
        let path = temporary.path().join("feedback.sqlite3");
        initialize_database(&path).unwrap();
        initialize_database(&path).unwrap();
        let connection = open_database(&path).unwrap();
        connection
            .execute(
                "INSERT INTO feedback (kind, page, message) VALUES (?1, ?2, ?3)",
                params![
                    "improvement",
                    "/space/drag/",
                    "Please add a density profile."
                ],
            )
            .unwrap();
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM feedback", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }
}
