CREATE TABLE ai_jobs (
 id TEXT PRIMARY KEY NOT NULL,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL,
 input TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued',
 result TEXT,
 created_at INTEGER NOT NULL,
 started_at INTEGER,
 finished_at INTEGER
);
CREATE INDEX ai_jobs_owner ON ai_jobs(user_id,created_at);
CREATE UNIQUE INDEX ai_jobs_active ON ai_jobs(user_id,kind,input) WHERE status IN ('queued','running');
