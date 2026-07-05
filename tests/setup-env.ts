process.env.DATABASE_URL ??= "postgresql://ta_admin:ta_admin_password@localhost:5432/ta_management?schema=public";
process.env.AUTH_SECRET ??= "test-auth-secret-at-least-16-characters";
process.env.AUTH_ENCRYPTION_KEY ??= "test-encryption-key-at-least-32-characters";
process.env.AUTH_URL ??= "http://localhost:3000";
process.env.S3_BUCKET ??= "ta-management-test";
process.env.S3_ENDPOINT ??= "http://localhost:9000";
process.env.S3_ACCESS_KEY_ID ??= "ta_minio_admin";
process.env.S3_SECRET_ACCESS_KEY ??= "ta_minio_password";
