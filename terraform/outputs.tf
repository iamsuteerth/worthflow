output "cognito_user_pool_id" {
  value = module.cognito.user_pool_id
}

output "cognito_client_id" {
  value = module.cognito.client_id
}

output "cognito_identity_pool_id" {
  value = module.identity_pool.identity_pool_id
}

output "s3_bucket_name" {
  value = module.storage.bucket_name
}

output "aws_region" {
  value = var.aws_region
}
