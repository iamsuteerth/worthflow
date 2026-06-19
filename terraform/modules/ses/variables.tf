variable "domain" {
  type        = string
  description = "The SES-verified domain (e.g. worthflow.in). Domain identity must already exist and be verified in AWS SES before running terraform plan."
}
