# utils/lambda_creator.py
import boto3
import json
import zipfile
from io import BytesIO

def create_agent_lambda(code, role_arn, agent_name):
    lambda_client = boto3.client('lambda')
    def check_lambda_exists(function_name):
        try:
            lambda_client.get_function(FunctionName=function_name)
            return True
        except lambda_client.exceptions.ResourceNotFoundException:
            return False
    version=1
    while True:
        function_name = f"{agent_name}-ver{version}"
        if not check_lambda_exists(function_name):
            break
        version += 1
    # Package Lambda code
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr('lambda_function.py', code)
    
    # Create Lambda function
    try:
        response = lambda_client.create_function(
            FunctionName=agent_name,
            Runtime='python3.9',
            Role=role_arn,
            Handler='lambda_function.lambda_handler',
            Code={'ZipFile': zip_buffer.getvalue()},
            Timeout=30
        )
    except lambda_client.exceptions.ResourceConflictException:
        # Update existing function
        response = lambda_client.update_function_code(
            FunctionName=agent_name,
            ZipFile=zip_buffer.getvalue()
        )
    
    return response['FunctionArn']