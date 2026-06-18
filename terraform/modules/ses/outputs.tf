# NOTE: After terraform apply, check your Gmail inbox for the SES verification email
# and click the link before Cognito email delivery will work.
output "sender_arn" {
  value = aws_ses_email_identity.sender.arn
}
