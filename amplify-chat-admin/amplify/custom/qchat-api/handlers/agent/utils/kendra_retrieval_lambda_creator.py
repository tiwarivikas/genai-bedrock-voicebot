import boto3
import json
import zipfile
import os
from io import BytesIO

def create_kendra_retrieval_lambda(data_source_id, agent_name):
    """
    Creates a Lambda function for Kendra retrieval operations using zip deployment
    """
    lambda_client = boto3.client('lambda')
    iam = boto3.client('iam')
    role_name = f"KendraRetrievalRole-{agent_name}"

    def check_if_role_exists(role_name, iam):
        try:
            iam.get_role(RoleName=role_name)
            return True
        except iam.exceptions.NoSuchEntityException:
            return False

    # Create role only if it doesn't exist
    role_response = None
    if not check_if_role_exists(role_name, iam):
        role_response = iam.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps({
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Principal": {"Service": "lambda.amazonaws.com"},
                    "Action": "sts:AssumeRole"
                }]
            })
        )
        
        # Add permissions for Kendra and CloudWatch Logs
        iam.put_role_policy(
            RoleName=role_name,
            PolicyName=f"KendraRetrievalPolicy-{agent_name}",
            PolicyDocument=json.dumps({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "kendra:Retrieve",
                            "kendra:Query"
                        ],
                        "Resource": "arn:aws:kendra:*:*:index/*"
                    },
                    {
                        "Effect": "Allow", 
                        "Action": [
                            "logs:CreateLogGroup",
                            "logs:CreateLogStream",
                            "logs:PutLogEvents"
                        ],
                        "Resource": "arn:aws:logs:*:*:*"
                    }
                ]
            })
        )
        
        # Wait for role to be available
        import time
        time.sleep(10)
    else:
        # Get existing role
        role_response = iam.get_role(RoleName=role_name)

    # Lambda function code
    lambda_code = """
import boto3
import json
import os

def get_named_parameter(event, name):
    return next(item for item in event['parameters'] if item['name'] == name)['value']

def get_named_property(event, name):
    return next(
        item for item in 
        event['requestBody']['content']['application/json']['properties']
        if item['name'] == name)['value']

def lambda_handler(event, context):
    print(f"Received event: {json.dumps(event, indent=2)}")
    
    # Initialize Kendra client
    kendra = boto3.client('kendra')
    kendra_index_id = os.environ['KENDRA_INDEX_ID']
    data_source_id = os.environ['DATA_SOURCE_ID']

    try:
        # Extract query based on HTTP method
        query = ""
        if event['httpMethod'] == 'POST':
            query = get_named_property(event, 'query')
        elif event['httpMethod'] == 'GET':
            query = get_named_parameter(event, 'query')

        # Query Kendra index with data source filter
        response = kendra.retrieve(
            IndexId=kendra_index_id,
            QueryText=query,
            PageSize=3,
            AttributeFilter={
                'EqualsTo': {
                    'Key': '_data_source_id',
                    'Value': {
                        'StringValue': data_source_id
                    }
                }
            }
        )

        # Format results
        results = []
        for result in response['ResultItems']:
            results.append({
                'type': 'URL',
                'url': result.get('DocumentURI', ''),
                'title': result.get('DocumentTitle', ''),
                'generation': result.get('Content', ''),
                'score': result.get('ScoreAttributes', {}).get('ScoreConfidence', '')
            })

        response_data = {
            'citations': results,
            'query': query
        }

        return {
            'messageVersion': '1.0',
            'response': {
                'actionGroup': event['actionGroup'],
                'apiPath': event['apiPath'],
                'httpMethod': event['httpMethod'],
                'httpStatusCode': 200,
                'responseBody': {
                    'application/json': {
                        'body': json.dumps(response_data)
                    }
                }
            }
        }

    except Exception as e:
        print(f"Error querying Kendra: {str(e)}")
        return {
            'messageVersion': '1.0',
            'response': {
                'actionGroup': event['actionGroup'],
                'apiPath': event['apiPath'],
                'httpMethod': event['httpMethod'],
                'httpStatusCode': 500,
                'responseBody': {
                    'application/json': {
                        'body': json.dumps({
                            'error': f"Failed to query knowledge base: {str(e)}"
                        })
                    }
                }
            }
        }
"""

    # Check if Lambda function already exists
    def check_lambda_exists(function_name):
        try:
            lambda_client.get_function(FunctionName=function_name)
            return True
        except lambda_client.exceptions.ResourceNotFoundException:
            return False

    # Create versioned function name
    version = 1
    while True:
        function_name = f"{agent_name}-kendra-ver{version}"
        if not check_lambda_exists(function_name):
            break
        version += 1

    # Package Lambda code
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr('lambda_function.py', lambda_code)

    # Create or update Lambda function
    try:
        response = lambda_client.create_function(
            FunctionName=f"{agent_name}-kendra",
            Runtime='python3.9',
            Role=role_response['Role']['Arn'],
            Handler='lambda_function.lambda_handler',
            Code={'ZipFile': zip_buffer.getvalue()},
            Environment={
                'Variables': {
                    'KENDRA_INDEX_ID': os.environ['KENDRA_INDEXID'],
                    'DATA_SOURCE_ID': data_source_id
                }
            },
            Timeout=300
        )
    except lambda_client.exceptions.ResourceConflictException:
        # Update existing function
        response = lambda_client.update_function_code(
            FunctionName=f"{agent_name}-kendra",
            ZipFile=zip_buffer.getvalue()
        )
        
        # Wait for the function update to complete
        waiter = lambda_client.get_waiter('function_updated')
        waiter.wait(
            FunctionName=f"{agent_name}-kendra",
            WaiterConfig={
                'Delay': 5,
                'MaxAttempts': 30
            }
        )
        
        # Wait again for the configuration update to complete
        waiter.wait(
            FunctionName=f"{agent_name}-kendra",
            WaiterConfig={
                'Delay': 5,
                'MaxAttempts': 30
            }
        )
        # Update environment variables
        lambda_client.update_function_configuration(
            FunctionName=f"{agent_name}-kendra",
            Environment={
                'Variables': {
                    'KENDRA_INDEX_ID': os.environ['KENDRA_INDEXID'],
                    'DATA_SOURCE_ID': data_source_id
                }
            }
        )

    return response['FunctionArn']
