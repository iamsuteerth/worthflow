variable "app_name" {
  type = string
}

variable "allowed_origins" {
  type    = list(string)
  default = ["*"]
}
