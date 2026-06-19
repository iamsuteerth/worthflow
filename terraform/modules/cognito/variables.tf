variable "app_name" {
  type = string
}

variable "ses_sender_arn" {
  type = string
}

variable "from_email_address" {
  type        = string
  description = "Full sender address shown in Cognito emails, e.g. 'Worth Flow <noreply@worthflow.in>'."
}

variable "post_confirmation_lambda_arn" {
  type = string
}

variable "post_confirmation_lambda_name" {
  type = string
}
