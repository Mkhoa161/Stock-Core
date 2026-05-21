resource "aws_key_pair" "ec2" {
  key_name   = "${var.project_name}-ec2-key"
  public_key = var.ec2_public_key

  tags = {
    Name        = "${var.project_name}-ec2-key"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_iam_role" "ec2_role" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Name        = "${var.project_name}-ec2-role"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "ec2_ecr_pull" {
  name = "${var.project_name}-ec2-ecr-pull"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = aws_ecr_repository.backend.arn
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2_role.name

  tags = {
    Name        = "${var.project_name}-ec2-profile"
    Project     = var.project_name
    Environment = var.environment
  }
}

data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_instance" "backend" {
  ami                         = data.aws_ami.amazon_linux_2.id
  instance_type               = "t3.micro"
  key_name                    = aws_key_pair.ec2.key_name
  iam_instance_profile        = aws_iam_instance_profile.ec2.name
  subnet_id                   = aws_subnet.public_1.id
  vpc_security_group_ids      = [aws_security_group.ec2.id]
  associate_public_ip_address = true

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }

  user_data = <<-EOF
    #!/bin/bash
    exec > /var/log/user-data.log 2>&1

    yum install -y docker
    systemctl start docker
    systemctl enable docker
    usermod -aG docker ec2-user

    ECR_REGION="us-east-1"
    ECR_URL="${aws_ecr_repository.backend.repository_url}"

    aws ecr get-login-password --region $ECR_REGION | docker login --username AWS --password-stdin $ECR_URL

    if docker pull $ECR_URL:latest; then
      docker run -d \
        --name stock-core-backend \
        --restart unless-stopped \
        -p 3000:3000 \
        -e NODE_ENV=production \
        -e PORT=3000 \
        -e DB_HOST="${aws_db_instance.main.address}" \
        -e DB_PORT=5432 \
        -e DB_NAME=stock_insight \
        -e DB_USERNAME="${var.db_username}" \
        -e DB_PASSWORD="${var.db_password}" \
        -e FRONTEND_URL="https://${var.frontend_cloudfront_domain}" \
        $ECR_URL:latest
    else
      echo "ECR image not yet available — container will start after first CI/CD push"
      exit 0
    fi
  EOF

  depends_on = [aws_internet_gateway.main]

  tags = {
    Name        = "${var.project_name}-backend"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_eip" "backend" {
  domain   = "vpc"
  instance = aws_instance.backend.id

  depends_on = [aws_internet_gateway.main]

  tags = {
    Name        = "${var.project_name}-eip"
    Project     = var.project_name
    Environment = var.environment
  }
}
