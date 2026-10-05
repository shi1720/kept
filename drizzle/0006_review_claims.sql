CREATE TABLE review_claims (
 submission_id TEXT PRIMARY KEY NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
 token TEXT NOT NULL,
 started_at INTEGER NOT NULL
);
