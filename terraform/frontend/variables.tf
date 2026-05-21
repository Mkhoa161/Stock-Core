variable "bucket_name" {
  type        = string
  description = "S3 bucket name for the static frontend site"
}

variable "ec2_hostname" {
  type        = string
  description = "EC2 public DNS hostname — used as the backend origin for CloudFront /api/* routing"
}
