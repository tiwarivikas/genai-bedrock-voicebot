# utils/schema_generator.py
import boto3
import json
import os

def generate_and_upload_schema(schema, agent_name):
    s3_client = boto3.client('s3')
    
    # Get the common bucket name from environment variable
    bucket_name = os.environ['QCHAT_RESOURCES_BUCKET']
    
    # Create versioned key under customer-specific prefix
    version = 1
    while True:
        prefix = f'openapi-schemas/{agent_name}'
        key = f'{prefix}/schema-ver{version}.json'
        
        try:
            s3_client.head_object(Bucket=bucket_name, Key=key)
            version += 1
        except s3_client.exceptions.ClientError as e:
            if e.response['Error']['Code'] == '404':
                break
            else:
                raise e
    
    # Ensure schema is properly formatted
    schema_json = json.dumps(schema, indent=2)
    
    # Upload schema with proper content type
    s3_client.put_object(
        Bucket=bucket_name,
        Key=key,
        Body=schema_json,
        ContentType='application/json'  # Set proper content type
    )
    
    return {
        's3BucketName': bucket_name,
        's3ObjectKey': key
    }