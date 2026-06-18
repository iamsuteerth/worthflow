variable "aws_region" {
  default = "ap-south-1"
}

variable "app_name" {
  default = "worth-flow"
}

variable "sender_email" {
  description = "Verified SES sender email (dedicated Gmail). Must be verified manually after apply."
  type        = string
}

