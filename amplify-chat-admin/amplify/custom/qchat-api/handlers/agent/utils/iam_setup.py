# utils/iam_setup.py
import boto3
import json
import time

def create_agent_roles_policies(agent_name):
    iam_client = boto3.client('iam')
    sts_client = boto3.client('sts')
    account_id = sts_client.get_caller_identity()["Account"]
    region = boto3.session.Session().region_name
    
    # Create Lambda role
    lambda_role_name = f'{agent_name}-lambda-role'
    lambda_assume_role_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }]
    }
    
    try:
        lambda_role = iam_client.create_role(
            RoleName=lambda_role_name,
            AssumeRolePolicyDocument=json.dumps(lambda_assume_role_policy)
        )
        
        # Attach basic Lambda execution policy
        iam_client.attach_role_policy(
            RoleName=lambda_role_name,
            PolicyArn='arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        )
    except iam_client.exceptions.EntityAlreadyExistsException:
        lambda_role = iam_client.get_role(RoleName=lambda_role_name)
    
    # Create Agent role
    agent_role_name = f'{agent_name}-agent-role'
    agent_assume_role_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {
                "Service": "bedrock.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }]
    }
    
    try:
        agent_role = iam_client.create_role(
            RoleName=agent_role_name,
            AssumeRolePolicyDocument=json.dumps(agent_assume_role_policy)
        )
        
        # Create and attach Bedrock policy
        bedrock_policy = {
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Action": "bedrock:InvokeModel",
                "Resource": [f"arn:aws:bedrock:{region}::foundation-model/anthropic.claude-*"]
            }]
        }
        
        bedrock_policy_name = f'{agent_name}-bedrock-policy'
        bedrock_policy_response = iam_client.create_policy(
            PolicyName=bedrock_policy_name,
            PolicyDocument=json.dumps(bedrock_policy)
        )
        
        iam_client.attach_role_policy(
            RoleName=agent_role_name,
            PolicyArn=bedrock_policy_response['Policy']['Arn']
        )
        
    except iam_client.exceptions.EntityAlreadyExistsException:
        agent_role = iam_client.get_role(RoleName=agent_role_name)
    
    # Wait for roles to be available
    time.sleep(10)
    
    return {
        'lambda_role_arn': lambda_role['Role']['Arn'],
        'agent_role_arn': agent_role['Role']['Arn']
    }