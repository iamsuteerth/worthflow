resource "aws_s3_bucket" "saves" {
  bucket = "${var.app_name}-saves"
}

resource "aws_s3_bucket_public_access_block" "saves" {
  bucket = aws_s3_bucket.saves.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "saves" {
  bucket = aws_s3_bucket.saves.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_lifecycle_configuration" "saves" {
  bucket     = aws_s3_bucket.saves.id
  depends_on = [aws_s3_bucket_versioning.saves]

  # Plan saves: keep noncurrent versions 90 days so users can recover an old save.
  rule {
    id     = "expire-noncurrent-saves"
    status = "Enabled"
    filter {} # all objects (plan saves don't carry tags)
    noncurrent_version_expiration { noncurrent_days = 90 }
  }

  # AI objects (keyblob + encrypted chat) are tagged ObjectType=ai on write.
  # After forgotPassphrase or removeKey, old versions become noncurrent;
  # 30 days is enough — they're zero-knowledge ciphertext but shouldn't linger.
  rule {
    id     = "expire-noncurrent-ai"
    status = "Enabled"
    filter {
      tag {
        key   = "ObjectType"
        value = "ai"
      }
    }
    noncurrent_version_expiration { noncurrent_days = 30 }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "saves" {
  bucket = aws_s3_bucket.saves.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_cors_configuration" "saves" {
  bucket = aws_s3_bucket.saves.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "DELETE"]
    allowed_origins = var.allowed_origins
    # ETag must be exposed so the browser SDK can read it from GetObject responses;
    # the manifest's optimistic-concurrency writes (If-Match / If-None-Match) depend on it.
    expose_headers  = ["ETag"]
  }
}
