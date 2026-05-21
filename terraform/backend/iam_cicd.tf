resource "aws_iam_user" "cicd" {
  name = "${var.project_name}-cicd"
  path = "/"

  tags = {
    Name        = "${var.project_name}-cicd"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_iam_user_policy" "cicd" {
  name = "${var.project_name}-cicd-policy"
  user = aws_iam_user.cicd.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ECRAuthToken"
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = ["*"]
      },
      {
        Sid    = "ECRImagePush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = [aws_ecr_repository.backend.arn]
      },
      {
        Sid      = "EC2Describe"
        Effect   = "Allow"
        Action   = ["ec2:DescribeInstances", "ec2:DescribeInstanceStatus"]
        Resource = ["*"]
      },
      {
        Sid    = "S3FrontendSync"
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.frontend_bucket_name}",
          "arn:aws:s3:::${var.frontend_bucket_name}/*"
        ]
      },
      {
        Sid      = "CloudFrontInvalidation"
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = [var.frontend_cloudfront_arn]
      }
    ]
  })
}

resource "aws_iam_access_key" "cicd" {
  user = aws_iam_user.cicd.name
}
