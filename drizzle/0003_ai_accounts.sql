CREATE TABLE ai_accounts (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL DEFAULT 'gemini',
 model TEXT NOT NULL DEFAULT '',
 encrypted_key TEXT,
 requests_used INTEGER NOT NULL DEFAULT 0 CHECK(requests_used BETWEEN 0 AND 5)
);
