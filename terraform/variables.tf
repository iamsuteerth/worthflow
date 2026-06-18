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

variable "app_domain" {
  description = "Production app URL for S3 CORS. Include https:// prefix."
  default     = "https://worthflow.vercel.app"
}
