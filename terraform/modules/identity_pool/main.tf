resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.app_name} Identity Pool"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = var.client_id
    provider_name           = "cognito-idp.${data.aws_region.current.name}.amazonaws.com/${var.user_pool_id}"
    server_side_token_check = false
  }
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

resource "aws_iam_role" "authenticated" {
  name = "${var.app_name}-identity-authenticated"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = "cognito-identity.amazonaws.com" }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
        }
        "ForAnyValue:StringLike" = {
          "cognito-identity.amazonaws.com:amr" = "authenticated"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "authenticated_s3" {
  name = "s3-user-scoped"
  role = aws_iam_role.authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:PutObjectTagging", "s3:DeleteObject"]
        Resource = "arn:aws:s3:::${var.bucket_name}/users/$${cognito-identity.amazonaws.com:sub}/*"
      },
      {
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = "arn:aws:s3:::${var.bucket_name}"
        Condition = {
          StringLike = {
            "s3:prefix" = ["users/$${cognito-identity.amazonaws.com:sub}/*"]
          }
        }
      }
    ]
  })
}

resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    authenticated = aws_iam_role.authenticated.arn
  }
}
