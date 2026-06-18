terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
  required_version = ">= 1.6"

  backend "s3" {
    bucket       = "worth-flow-tf-state"
    key          = "terraform.tfstate"
    region       = "ap-south-1"
    use_lockfile = true
    encrypt      = true
    profile      = "worth-flow"
  }
}

provider "aws" {
  region  = var.aws_region
  profile = "worth-flow"
}

module "ses" {
  source       = "./modules/ses"
  sender_email = var.sender_email
}

module "post_confirmation" {
  source   = "./modules/post_confirmation"
  app_name = var.app_name
}

module "cognito" {
  source                        = "./modules/cognito"
  app_name                      = var.app_name
  ses_sender_arn                = module.ses.sender_arn
  sender_email                  = var.sender_email
  post_confirmation_lambda_arn  = module.post_confirmation.lambda_arn
  post_confirmation_lambda_name = module.post_confirmation.lambda_name
}

module "storage" {
  source          = "./modules/storage"
  app_name        = var.app_name
  allowed_origins = ["https://worthflow.vercel.app", "http://localhost:5173"]
}

module "identity_pool" {
  source          = "./modules/identity_pool"
  app_name        = var.app_name
  user_pool_id    = module.cognito.user_pool_id
  user_pool_arn   = module.cognito.user_pool_arn
  client_id       = module.cognito.client_id
  bucket_name     = module.storage.bucket_name
}
