output "bucket_name" {
  value = aws_s3_bucket.saves.bucket
}

output "bucket_arn" {
  value = aws_s3_bucket.saves.arn
}
