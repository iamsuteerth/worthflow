# The domain identity is created and verified manually in the AWS console.
# This data source reads the existing verified identity without managing its lifecycle.
data "aws_ses_domain_identity" "main" {
  domain = var.domain
}
