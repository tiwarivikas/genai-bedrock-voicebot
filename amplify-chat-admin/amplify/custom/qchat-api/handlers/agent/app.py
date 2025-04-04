# import sys
# from pip._internal import main
# print('downloading boto3')
# main(['install', '-I', '-q', 'boto3', '--target', '/tmp/', '--no-cache-dir', '--disable-pip-version-check'])
# sys.path.insert(0,'/tmp/')
import json
import boto3
from botocore.exceptions import ClientError
import time
import os
from utils.iam_setup import create_agent_roles_policies
from utils.schema_generator import generate_and_upload_schema
import traceback

def invoke_claude(prompt):
    """
    Invoke Claude model for schema and code generation.
    """
    try:
        bedrock = boto3.client('bedrock-runtime', region_name='us-west-2')
        response = bedrock.invoke_model(
            modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 8192,
                "stop_sequences": [],
                "temperature": 0.7,
                "top_p": 0.999,
                "messages": [
                    {
                        "role": "user",
                        "content": [{"type": "text", "text": prompt}]
                    }
                ]
            })
        )
        print("Claude response received")
        response_body = json.loads(response['body'].read())
        
        response_text = response_body['content'][0]['text']

        # Clean up the response based on prompt type
        if 'Create a schema' in prompt:
            # For schema generation
            # Remove any markdown indicators and surrounding text
            cleaned_text = response_text
            if '```json' in cleaned_text:
                cleaned_text = cleaned_text.split('```json')[1].split('```')[0]
            elif '```' in cleaned_text:
                cleaned_text = cleaned_text.split('```')[1].split('```')[0]
            
            # Ensure it's valid JSON
            try:
                return json.loads(cleaned_text.strip())
            except json.JSONDecodeError as e:
                print(f"Invalid JSON in schema response: {cleaned_text}")
                raise Exception(f"Invalid schema JSON: {str(e)}")
                
        else:
            # For instructions or other text
            return response_text.strip()
            
    except Exception as e:
        print(f"Error in Claude invocation: {str(e)}")
        print(f"Prompt was: {prompt}")
        raise Exception(f"Error invoking Claude: {str(e)}")

def validate_openapi_schema(schema):
    """
    Validate and clean OpenAPI schema using Claude.
    """
    try:
        prompt = f"""
        You are an OpenAPI schema validator. I will provide you with an OpenAPI schema.
        Your task is to:
        1. Validate that it's a proper OpenAPI 3.0 schema
        2. Return the exact same schema if it's valid, or fix minor issues if needed
        3. Respond ONLY with the JSON schema itself, no explanations or other text

        Here's the schema to validate:
        {json.dumps(schema, indent=2)}
        """

        bedrock = boto3.client('bedrock-runtime', region_name='us-west-2')
        response = bedrock.invoke_model(
            modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 8192,
                "stop_sequences": [],
                "temperature": 0,
                "top_p": 0.999,
                "messages": [
                    {
                        "role": "user",
                        "content": [{"type": "text", "text": prompt}]
                    }
                ]
            })
        )

        response_body = json.loads(response['body'].read())
        response_text = response_body['content'][0]['text']

        # Clean up the response
        cleaned_text = response_text
        if '```json' in cleaned_text:
            cleaned_text = cleaned_text.split('```json')[1].split('```')[0]
        elif '```' in cleaned_text:
            cleaned_text = cleaned_text.split('```')[1].split('```')[0]

        # Parse and validate the returned schema
        validated_schema = json.loads(cleaned_text.strip())
        
        # Basic OpenAPI validation
        if not all(key in validated_schema for key in ['openapi', 'info', 'paths']):
            raise ValueError("Invalid OpenAPI schema: missing required fields")

        return validated_schema

    except Exception as e:
        print(f"Error validating OpenAPI schema: {str(e)}")
        raise Exception(f"Schema validation failed: {str(e)}")
           
def lambda_handler(event, context):
    print("boto3 version", boto3.__version__)
    request_id = event['request_id']
    body = event['body']
    
    dynamodb = boto3.resource('dynamodb')
    status_table = dynamodb.Table(os.environ['AGENT_STATUS_TABLE'])
    url_shortener_table = dynamodb.Table(os.environ['DDBTable_URLShortener'])

    try:
        # Get the stored request data
        service_description = body.get('agentDescription')
        agent_name = body.get('customer')
    
        # Safely parse the OpenAPI schema
        openapi_schema_str = body.get('openApiSchema')
        if not openapi_schema_str:
            raise Exception("OpenAPI schema is required")

        try:
            # Parse the schema if it's a string
            initial_schema = (
                json.loads(openapi_schema_str) 
                if isinstance(openapi_schema_str, str) 
                else openapi_schema_str
            )
            
            # Validate and clean the schema using Claude
            print("Validating OpenAPI schema...")
            openapi_schema = validate_openapi_schema(initial_schema)
            print("Schema validation completed")
            
        except Exception as e:
            print(f"Error processing OpenAPI schema: {str(e)}")
            traceback.print_exc()
            raise Exception(f"Invalid OpenAPI schema: {str(e)}")
        
        # Generate agent instructions
        instruction_prompt = f"""
        Create clear instructions for a Bedrock agent that will handle this service: {service_description}
        The bedrock agent will have access to 2 action groups:
        1. Which can retrive information from a Kendra index which serves as a knowledge base that has all static information related to the service.
        2. Which is responsible for performing all dynamic functional operations such as booking appointments, getting statuses etc.
        Make sure to generate instructions asking the agent to be polite and customer centric.
        Include examples wherever applicable. 
        Important: Respond ONLY with the instruction text itself, no explanation, headings or other text.
        NOTE: Do NOT include any functional guidelines as it'll be handeled through action groups. Only include guidlines such as Greeting & Introduction,
        General Queries, Communication Guidelines, Error handling, Follow-Ups, Closure etc.
        Most importantly ask the agent not to answer to any queries from it's self knowlegde, and only use the relevant action groups.
        For static information always use the Kendra Retrieval Action group. For dynamic, functional queries use other relevant action group.
        Also make sure to include instructions to avoid self talk and avoiding responses with internal dialgoue. 
        Make sure to explicitly mention to the agent not to make any assumptions about user inputs required for action group invocation and always prompt the user for the required info.
        """
        
        agent_instructions = invoke_claude(instruction_prompt)
        print(f"Generated Agent Instructions")
        mcp_agent_id = request_id
        # Update the URL shortener table with MCP info instead of agent details
        url_shortener_table.update_item(
            Key={
                'id': request_id
            },
            UpdateExpression='SET mcpAgentId = :id, agentDescription = :desc, openApiSchema = :schema, agentInstructions = :instr',
                ExpressionAttributeValues={
                    ':id': mcp_agent_id,
                    ':desc': service_description,
                    ':schema': json.dumps(openapi_schema),
                    ':instr': agent_instructions
                }
            )

        # Update status table with success
        status_table.update_item(
            Key={'id': request_id},
            UpdateExpression='SET #s=:s, bot_status=:bs',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={
                ':s': 'COMPLETED',
                ':bs': 'Active'
            }
        )
        
    except Exception as e:
        print(f"Error in agent creation: {str(e)}")
        traceback.print_exc()
        # Update status table with error
        status_table.update_item(
            Key={'id': request_id},
            UpdateExpression='SET #s=:s, error=:e',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={
                ':s': 'FAILED',
                ':e': str(e)
            }
        )