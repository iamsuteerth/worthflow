output "lambda_arn" {
  value = aws_lambda_function.post_confirmation.arn
}

output "lambda_name" {
  value = aws_lambda_function.post_confirmation.function_name
}
