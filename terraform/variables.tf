variable "aws_region" {
  default = "ap-south-1"
}

variable "app_name" {
  default = "worth-flow"
}

variable "domain" {
  default     = "worthflow.in"
  description = "Primary domain. Drives the SES domain identity lookup and Cognito sender address. Override in tfvars for a staging environment."
}
