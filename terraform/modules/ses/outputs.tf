output "sender_arn" {
  description = "ARN of the verified SES domain identity — passed to Cognito email_configuration."
  value       = data.aws_ses_domain_identity.main.arn
}
