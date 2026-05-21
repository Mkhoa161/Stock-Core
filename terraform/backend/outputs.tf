output "ecr_repository_url" {
  value       = aws_ecr_repository.backend.repository_url
  description = "ECR repository URL for backend Docker images — set as ECR_REGISTRY in GitHub Actions secrets"
}

output "ec2_elastic_ip" {
  value       = aws_eip.backend.public_ip
  description = "EC2 Elastic IP address — set as EC2_HOST in GitHub Actions secrets; SSH target for container restarts"
}

output "rds_endpoint" {
  value       = aws_db_instance.main.address
  description = "RDS PostgreSQL instance endpoint hostname — set as DB_HOST in backend environment config"
}

output "lambda_function_name" {
  value       = aws_lambda_function.daily_collector.function_name
  description = "Lambda function name for the daily S&P 500 data collector"
}

output "cicd_user_name" {
  value       = aws_iam_user.cicd.name
  description = "CI/CD IAM user name"
}

output "cicd_access_key_id" {
  value       = aws_iam_access_key.cicd.id
  description = "CI/CD IAM access key ID — set as AWS_ACCESS_KEY_ID in GitHub Actions secrets"
}

output "cicd_secret_access_key" {
  value       = aws_iam_access_key.cicd.secret
  sensitive   = true
  description = "CI/CD IAM secret access key — set as AWS_SECRET_ACCESS_KEY in GitHub Actions (retrieve with: terraform output -raw cicd_secret_access_key)"
}
