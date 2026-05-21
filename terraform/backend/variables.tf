variable "project_name" {
  type        = string
  description = "Project name prefix used in resource names and tags"
  default     = "stock-core"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
  default     = "production"
}

variable "db_username" {
  type        = string
  description = "RDS master username"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "RDS master password (minimum 8 characters)"
}

variable "ec2_public_key" {
  type        = string
  description = "SSH public key content for EC2 key pair — paste content of ~/.ssh/id_rsa.pub"
}

variable "frontend_bucket_name" {
  type        = string
  description = "Existing S3 bucket name from terraform/frontend — used to scope CI/CD IAM policy"
}

variable "frontend_cloudfront_arn" {
  type        = string
  description = "Existing CloudFront distribution ARN from terraform/frontend — used to scope CI/CD IAM invalidation policy"
}

variable "frontend_cloudfront_domain" {
  type        = string
  description = "CloudFront domain name (*.cloudfront.net) from terraform/frontend — injected as FRONTEND_URL in EC2 user-data and Lambda env vars"
}

variable "lambda_zip_path" {
  type        = string
  description = "Path to esbuild-bundled Lambda zip relative to terraform/backend/"
  default     = "../../backend/dist/lambda.zip"
}
