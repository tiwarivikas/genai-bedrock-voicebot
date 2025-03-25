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
from utils.lambda_creator import create_agent_lambda
from utils.agent_creator import create_bedrock_agent
from utils.kendra_retrieval_lambda_creator import create_kendra_retrieval_lambda

bedrock = boto3.client('bedrock-runtime', region_name='us-west-2')
REFERENCE_LAMBDA = """
import json
import random
from datetime import datetime, timedelta

def get_named_parameter(event, name):
    return next(item for item in event['parameters'] if item['name'] == name)['value']

def get_named_property(event, name):
    return next(
        item for item in
        event['requestBody']['content']['application/json']['properties']
        if item['name'] == name)['value']

def generate_dummy_slots(location, date):
    slots = []
    times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
    
    for time in times:
        if random.choice([True, False]):  # Randomly make some slots available
            slots.append({
                'slotId': f"SLOT_{location}_{date}_{time}".replace(":", ""),
                'time': time,
                'date': date,
                'location': location
            })
    
    return slots

def lambda_handler(event, context):
    try:
        action_group = event['actionGroup']
        api_path = event['apiPath']
        http_method = event['httpMethod']
        
        response_body = {}
        
        # Handle different API paths
        if api_path == '/available-slots' and http_method == 'GET':
            location = get_named_parameter(event, 'location')
            date = get_named_parameter(event, 'date')
            
            slots = generate_dummy_slots(location, date)
            response_body = {
                'application/json': {
                    'body': json.dumps(slots)
                }
            }

        elif api_path == '/book-appointment' and http_method == 'POST':
            slot_id = get_named_property(event, 'slotId')
            applicant_name = get_named_property(event, 'applicantName')
            
            # Generate dummy booking confirmation
            booking_confirmation = {
                'bookingId': f"BOOK_{random.randint(10000, 99999)}",
                'confirmationDetails': {
                    'appointmentDate': '2024-02-20',
                    'appointmentTime': '10:00',
                    'location': 'Mumbai Passport Office'
                }
            }
            
            response_body = {
                'application/json': {
                    'body': json.dumps(booking_confirmation)
                }
            }

        elif api_path.startswith('/appointment-status/'):
            booking_id = get_named_parameter(event, 'bookingId')
            
            # Generate dummy status
            status_details = {
                'bookingId': booking_id,
                'status': random.choice(['CONFIRMED', 'CANCELLED', 'COMPLETED']),
                'appointmentDetails': {
                    'date': '2024-02-20',
                    'time': '10:00',
                    'location': 'Mumbai Passport Office'
                }
            }
            
            response_body = {
                'application/json': {
                    'body': json.dumps(status_details)
                }
            }

        action_response = {
            'actionGroup': event['actionGroup'],
            'apiPath': event['apiPath'],
            'httpMethod': event['httpMethod'],
            'httpStatusCode': 200,
            'responseBody': response_body
        }

        return {
            'messageVersion': '1.0',
            'response': action_response
        }

    except Exception as e:
        print(f"Error: {str(e)}")
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
                            'error': str(e)
                        })
                    }
                }
            }
        }
"""
REFERENCE_INSTRUCTIONS = """
You are a digital assistant dedicated to DigiLocker services, interacting directly with users. 
Your purpose is to help users with their DigiLocker needs through clear, direct communication. 
You have access to two action groups, one for Kendra retrieval to get static information and another one for all other dynamic functionalities such as booking, status checks etc.
Focus solely on responding to the user's queries without internal dialogue or self-talk. 
Always maintain a professional, straightforward conversation focused on assisting the user.
1. GREETING AND INTRODUCTION
- Start every conversation with "Hello" or "Namaste"
- Introduce yourself: "I am your DigiLocker assistant, here to help you access and manage your digital documents"
- Add: "I will guide you through DigiLocker services and answer your queries"

2. CORE BEHAVIOR GUIDELINES
- Never provide information from self-knowledge, always use Kendra retrieval action group to get information on static information
- Never respond to any query from self knowledge, always use action groups
- Only use authorized action groups for responses
- Always verify user's requirements before proceeding
- Request specific information like DigiLocker ID, Aadhaar number, or other credentials as needed
- Do not make assumptions about user information - always ask explicitly

3. COMMUNICATION STYLE
- Maintain professional and courteous tone
- Use "sir/ma'am" appropriately
- Keep language simple and clear
- Show patience and empathy
- Use positive language
- Acknowledge user concerns promptly

4. QUERY HANDLING
- Listen carefully to user queries
- Confirm understanding: "Let me make sure I understand your request correctly"
- Use only approved action groups for responses
- If a query cannot be handled through available action groups, politely inform the user

5. ERROR HANDLING
- Acknowledge errors calmly
- Explain situation clearly: "I apologize, but I cannot process this request currently"
- Guide users to alternative solutions
- Maintain professional demeanor with frustrated users
- Never guess or provide uncertain information

6. FOLLOW-UP PROTOCOL
- Verify if the query is resolved
- Ask: "Is there anything else you'd like to know about DigiLocker?"
- Ensure user understands next steps
- Offer additional assistance if needed

7. CLOSURE
- Summarize assistance provided
- Confirm user satisfaction
- End with: "Thank you for using DigiLocker services. Have a great day!"

8. STANDARD RESPONSES FOR LIMITATIONS
- "I'll need to check this through official DigiLocker channels"
- "Let me direct you to the appropriate service option"
- "This requires verification through authorized channels"
- "I can only provide information through approved action groups"

9. IMPORTANT REMINDERS
- Never provide responses based on general knowledge
- Always use action groups for information
- Request specific user inputs when needed
- Maintain focus on DigiLocker-related queries only
- Ensure data privacy and security in all interactions

10. SELF-TALK PREVENTION
- Always direct responses to the user only
- Do not verbalize internal thought processes
- Avoid metacommentary about your own actions
- Never explain your reasoning process to yourself
- Keep responses focused and externally directed
- If using action groups, execute them without narrating the process
"""

def invoke_claude(prompt):
    """
    Invoke Claude model for schema and code generation.
    """
    try:
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
                
        elif 'Create a Lambda' in prompt:
            # For Lambda code generation
            # Remove any markdown indicators
            cleaned_code = response_text
            if '```python' in cleaned_code:
                cleaned_code = cleaned_code.split('```python')[1].split('```')[0]
            elif '```' in cleaned_code:
                cleaned_code = cleaned_code.split('```')[1].split('```')[0]
            return cleaned_code.strip()
            
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

        response = response = bedrock.invoke_model(
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
    print("boto3 version",boto3.__version__)
    request_id = event['request_id']
    body = event['body']
    
    dynamodb = boto3.resource('dynamodb')
    status_table = dynamodb.Table(os.environ['AGENT_STATUS_TABLE'])
    url_shortener_table = dynamodb.Table(os.environ['DDBTable_URLShortener'])

    try:
        # Get the stored request data
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
            print("Schema validation completed", openapi_schema)
            
        except Exception as e:
            print(f"Error processing OpenAPI schema: {str(e)}")
            raise Exception(f"Invalid OpenAPI schema: {str(e)}")
        
        # Generate agent instructions
        instruction_prompt = f"""
        Create clear instructions for a Bedrock agent that will handle this service: {service_description}
        The bedrock agent will have access to 2 action groups:
        1. Which can retrive information from a Kendra index which serves as a knowledge base that has all static information related to the service .
        2. Which is responsible for performing all dynamic functional operations such as booking appointments, getting statuses etc .
        Make sure to generate instructions asking the agent to be polite and customer centric.
        Include examples wherever applicable. 
        Important: Respond ONLY with the instruction text itself, no explanation, headings or other text.
        NOTE: Do NOT include any functional guidelines as it'll be handeled through action groups. Only include guidlines such as Greeting & Introduction ,
        General Queries, Communication Guidelines, Error handling , Follow-Ups , Closure etc .
        Refer these instructions : {REFERENCE_INSTRUCTIONS} .
        Most importantly ask the agent not to answer to any queries from it's self knowlegde , and only use the relevant action groups .
        For static information always use the Kendra Retrieval Action group . For dynamic , functional queries use other relevant action group .
        Also make sure to include instructions to avoid self talk and avoiding responses with internal dialgoue . 
        Make sure to explicitly mention to the agent not to make any assumptions about user inputs required for action group invocation and always prompt the user for the required info.
        """
        
        agent_instructions = invoke_claude(instruction_prompt)
        print(f"Generated Agent Instructions")

        # Generate Lambda function code using the provided schema
        lambda_prompt = f"""
        Using this OpenAPI schema: {json.dumps(openapi_schema)}
        And this reference Lambda implementation :
        {REFERENCE_LAMBDA}
        Create a Lambda function that implements the API defined in the schema with dummy responses for each path.
        Important: Respond ONLY with the Python code itself, no explanation or other text.
        The code should be a valid Lambda handler function that follows this pattern for parameters:
        - Use get_named_parameter(event, param_name) for GET parameters
        - Use get_named_property(event, prop_name) for POST body properties
        
        The response should follow this structure:
        return {{
            'messageVersion': '1.0',
            'response': {{
                'actionGroup': event['actionGroup'],
                'apiPath': event['apiPath'],
                'httpMethod': event['httpMethod'],
                'httpStatusCode': 200,
                'responseBody': {{
                    'application/json': {{
                        'body': json.dumps(response_data)
                    }}
                }}
            }}
        }}
        """
        
        lambda_code = invoke_claude(lambda_prompt)
        print("Lambda code generated")
        
        # Setup IAM roles and policies
        role_arns = create_agent_roles_policies(agent_name)
        
        # Upload schema to S3
        schema_location = generate_and_upload_schema(openapi_schema, agent_name)
        
        # Create Lambda function
        lambda_arn = create_agent_lambda(lambda_code, role_arns['lambda_role_arn'], agent_name)
        # Create Kendra retrieval Lambda
        kendra_lambda_arn = create_kendra_retrieval_lambda(
            data_source_id=request_id,  # Using request_id which is same as data_source_id
            agent_name=agent_name
        )
        
        # Create and prepare agent
        agent_creation_response = create_bedrock_agent(
            agent_name=agent_name,
            agent_instructions=agent_instructions,
            role_arn=role_arns['agent_role_arn'],
            lambda_arn=lambda_arn,
            schema_location=schema_location,
            kendra_lambda_arn=kendra_lambda_arn
        )
        
        # Extract agent and alias IDs from the nested response
        agent_id = agent_creation_response['agent']['agent']['agentId']
        agent_alias_id = agent_creation_response['alias']['agentAlias']['agentAliasId']
        # knowledge_base_id = agent_creation_response['kb_id']  # Get the knowledge base ID

        # Update URL shortener table with agent details
        url_shortener_table.update_item(
        Key={
            'id': request_id
        },
        UpdateExpression='SET agentId = :aid, agentAliasId = :aliasId',
        ExpressionAttributeValues={
            ':aid': agent_id,
            ':aliasId': agent_alias_id
        }
        )

        # Update status table with success
        status_table.update_item(
            Key={'id': request_id},
            UpdateExpression='SET #s=:s, agentId=:aid, agentAliasId=:aliasId, bot_status=:bs',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={
                ':s': 'COMPLETED',
                ':aid': agent_id,
                ':aliasId': agent_alias_id,
                ':bs': 'Active'
            }
        )
        
    except Exception as e:
        print(f"Error in agent creation: {str(e)}")
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
