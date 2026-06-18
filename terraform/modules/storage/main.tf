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

  rule {
    id     = "expire-noncurrent"
    status = "Enabled"
    filter {} # applies to all objects
    noncurrent_version_expiration { noncurrent_days = 90 }
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
    expose_headers  = []
  }
}
