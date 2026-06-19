resource "aws_cognito_user_pool" "main" {
  name = "${var.app_name}-user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  username_configuration {
    case_sensitive = false
  }

  password_policy {
    minimum_length                   = 8
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  schema {
    name                     = "member_since"
    attribute_data_type      = "String"
    mutable                  = true
    required                 = false
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 0
      max_length = 64
    }
  }

  email_configuration {
    email_sending_account = "DEVELOPER"
    source_arn            = var.ses_sender_arn
    from_email_address    = var.from_email_address
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your Worth Flow verification code"
    email_message        = <<-HTML
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 16px;">
        <div style="max-width: 460px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px 36px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
          <p style="font-size: 22px; font-weight: 700; color: #1c1c1e; margin: 0 0 4px;">Worth Flow</p>
          <p style="font-size: 13px; color: #8e8e93; margin: 0 0 32px;">Personal Finance Planner</p>
          <p style="font-size: 15px; color: #3a3a3c; margin: 0 0 20px;">Your verification code:</p>
          <div style="background-color: #f0f3ff; border-radius: 10px; padding: 20px 0; text-align: center; margin: 0 0 28px;">
            <span style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #4263eb;">{####}</span>
          </div>
          <p style="font-size: 13px; color: #8e8e93; margin: 0;">This code expires in 15 minutes. If you didn&apos;t request this, you can safely ignore this email.</p>
        </div>
      </body>
      </html>
    HTML
  }

  lambda_config {
    post_confirmation = var.post_confirmation_lambda_arn
  }
}

resource "aws_lambda_permission" "cognito_invoke" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.post_confirmation_lambda_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.app_name}-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"
}
