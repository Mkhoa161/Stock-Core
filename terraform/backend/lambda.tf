resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Name        = "${var.project_name}-lambda-role"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "lambda_execution_policy" {
  name = "${var.project_name}-lambda-execution"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses",
          "ec2:UnassignPrivateIpAddresses"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_lambda_function" "daily_collector" {
  function_name = "${var.project_name}-daily-collector"
  filename      = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  handler       = "lambda-handler.handler"
  runtime       = "nodejs18.x"
  timeout       = 900
  memory_size   = 512
  role          = aws_iam_role.lambda_execution.arn

  vpc_config {
    subnet_ids         = [aws_subnet.private_1.id, aws_subnet.private_2.id]
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      NODE_ENV     = "production"
      DB_HOST      = aws_db_instance.main.address
      DB_PORT      = "5432"
      DB_USERNAME  = var.db_username
      DB_PASSWORD  = var.db_password
      DB_NAME      = "stock_insight"
      FRONTEND_URL = "https://${var.frontend_cloudfront_domain}"
    }
  }

  depends_on = [aws_iam_role_policy.lambda_execution_policy]

  tags = {
    Name        = "${var.project_name}-daily-collector"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_rule" "daily_collection" {
  name                = "${var.project_name}-daily-collection"
  description         = "Trigger daily S&P 500 data collection at 2 AM UTC"
  schedule_expression = "cron(0 2 * * ? *)"
  state               = "ENABLED"

  tags = {
    Name        = "${var.project_name}-daily-collection"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.daily_collection.name
  target_id = "LambdaDailyCollector"
  arn       = aws_lambda_function.daily_collector.arn
}

resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.daily_collector.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_collection.arn
}
