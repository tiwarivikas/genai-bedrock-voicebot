import boto3
import time
import json
import os

def create_bedrock_agent(agent_name, agent_instructions, role_arn, lambda_arn, schema_location, kendra_lambda_arn):
    bedrock_agent = boto3.client('bedrock-agent')
    lambda_client = boto3.client('lambda')
    iam_client = boto3.client('iam')
    session = boto3.session.Session()
    region = session.region_name
    account_id = boto3.client('sts').get_caller_identity()["Account"]
    kendra_api_schema = {
    "openapi": "3.0.0",
    "info": {
        "title": "Kendra Retrieval API",
        "version": "1.0.0",
        "description": "API for retrieving information from Amazon Kendra index"
    },
    "paths": {
        "/retrieve": {
            "post": {
                "summary": "Retrieve information from Kendra index",
                "description": "Performs a search query against the Kendra index and returns relevant results with citations",
                "operationId": "kendraRetrieval",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "query": {
                                        "type": "string",
                                        "description": "The search query to execute against the Kendra index"
                                    }
                                },
                                "required": ["query"]
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Successful retrieval of search results",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "citations": {
                                            "type": "array",
                                            "description": "List of retrieved citations",
                                            "items": {
                                                "type": "object",
                                                "properties": {
                                                    "type": {
                                                        "type": "string",
                                                        "description": "Type of the citation"
                                                    },
                                                    "url": {
                                                        "type": "string",
                                                        "description": "URL of the source document"
                                                    },
                                                    "title": {
                                                        "type": "string",
                                                        "description": "Title of the source document"
                                                    },
                                                    "generation": {
                                                        "type": "string",
                                                        "description": "Generation details of the citation"
                                                    },
                                                    "score": {
                                                        "type": "string",
                                                        "description": "Relevance score of the citation"
                                                    }
                                                },
                                                "required": ["type", "url", "title"]
                                            }
                                        },
                                        "query": {
                                            "type": "string",
                                            "description": "The original search query"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "400": {
                        "description": "Bad request. The query parameter is missing or invalid."
                    }
                }
            }
        }
    }
    }
    def check_agent_exists(name):
        try:
            response = bedrock_agent.list_agents()
            return any(agent['agentName'] == name for agent in response['agentSummaries'])
        except:
            return False

    version = 1
    while True:
        versioned_agent_name = f"{agent_name}-ver{version}"
        if not check_agent_exists(versioned_agent_name):
            break
        version += 1

    # Create Bedrock model invocation policy
    bedrock_allow_policy_name = f"{agent_name}-allow-{region}-{account_id}"
    bedrock_agent_bedrock_allow_policy_statement = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AmazonBedrockAgentBedrockFoundationModelPolicy",
                "Effect": "Allow",
                "Action": "bedrock:InvokeModel",
                "Resource": [
                    f"arn:aws:bedrock:{region}::foundation-model/*"
                ]
            }
        ]
    }

    try:
        agent_bedrock_policy = iam_client.create_policy(
            PolicyName=bedrock_allow_policy_name,
            PolicyDocument=json.dumps(bedrock_agent_bedrock_allow_policy_statement)
        )
        iam_client.attach_role_policy(
            RoleName=role_arn.split('/')[-1],
            PolicyArn=agent_bedrock_policy['Policy']['Arn']
        )
    except iam_client.exceptions.EntityAlreadyExistsException:
        policy_arn = f"arn:aws:iam::{account_id}:policy/{bedrock_allow_policy_name}"
        iam_client.attach_role_policy(
            RoleName=role_arn.split('/')[-1],
            PolicyArn=policy_arn
        )

    # Create S3 access policy for OpenAPI schema
    s3_policy_name = f"{agent_name}-s3-allow-{region}-{account_id}"
    bedrock_agent_s3_allow_policy_statement = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowAgentAccessOpenAPISchema",
                "Effect": "Allow",
                "Action": ["s3:GetObject"],
                "Resource": [
                    f"arn:aws:s3:::{schema_location['s3BucketName']}/{schema_location['s3ObjectKey']}"
                ]
            }
        ]
    }

    try:
        agent_s3_schema_policy = iam_client.create_policy(
            PolicyName=s3_policy_name,
            Description="Policy to allow Bedrock agent to access OpenAPI schema in S3",
            PolicyDocument=json.dumps(bedrock_agent_s3_allow_policy_statement)
        )
        iam_client.attach_role_policy(
            RoleName=role_arn.split('/')[-1],
            PolicyArn=agent_s3_schema_policy['Policy']['Arn']
        )
    except iam_client.exceptions.EntityAlreadyExistsException:
        policy_arn = f"arn:aws:iam::{account_id}:policy/{s3_policy_name}"
        iam_client.attach_role_policy(
            RoleName=role_arn.split('/')[-1],
            PolicyArn=policy_arn
        )


    # Wait for policies to propagate
    time.sleep(15)
    
    # Create agent
    agent_response = bedrock_agent.create_agent(
        agentName=versioned_agent_name,
        agentResourceRoleArn=role_arn,
        description="Qchat Custom.",
        idleSessionTTLInSeconds=1800,
        foundationModel="anthropic.claude-3-haiku-20240307-v1:0",
        instruction=agent_instructions,
    )
    
    agent_id = agent_response['agent']['agentId']
    
    # Wait for agent creation
    time.sleep(30)

    # Create user input action group
    user_input_action_group = bedrock_agent.create_agent_action_group(
        agentId=agent_id,
        agentVersion='DRAFT',
        actionGroupName="UserInputAction",
        actionGroupState="ENABLED",
        parentActionGroupSignature="AMAZON.UserInput"
    )

    # Create custom action group with OpenAPI schema
    custom_action_group = bedrock_agent.create_agent_action_group(
        agentId=agent_id,
        agentVersion='DRAFT',
        actionGroupExecutor={
            'lambda': lambda_arn
        },
        actionGroupName=f'{agent_name}-custom-action-group',
        apiSchema={
            's3': schema_location
        },
        description='Qchat custom actions'
    )

    # Create Kendra retrieval action group
    kendra_action_group = bedrock_agent.create_agent_action_group(
        agentId=agent_id,
        agentVersion='DRAFT',
        actionGroupExecutor={
            'lambda': kendra_lambda_arn
        },
        actionGroupName=f'{agent_name}-kendra-retrieval',
        description='Kendra retrieval actions',
        apiSchema={
            'payload': json.dumps(kendra_api_schema)
        }
    )
    
    # Add Lambda permissions for both action groups
    for lambda_function_name, lambda_function_arn in [
        (agent_name, lambda_arn),
        (f"{agent_name}-kendra", kendra_lambda_arn)
    ]:
        try:
            lambda_client.add_permission(
                FunctionName=lambda_function_name,
                StatementId=f'allow_bedrock_{lambda_function_name}',
                Action='lambda:InvokeFunction',
                Principal='bedrock.amazonaws.com',
                SourceArn=f"arn:aws:bedrock:{region}:{account_id}:agent/{agent_id}"
            )
        except lambda_client.exceptions.ResourceConflictException:
            pass
    
    # Prepare agent
    prepare_response = bedrock_agent.prepare_agent(
        agentId=agent_id
    )
    
    time.sleep(30)
    
    # Create agent alias
    alias_response = bedrock_agent.create_agent_alias(
        agentId=agent_id,
        agentAliasName=f'{agent_name}-alias'
    )
    
    return {
        'agent': agent_response,
        'custom_action_group': custom_action_group,
        'kendra_action_group': kendra_action_group,
        'prepare': prepare_response,
        'alias': alias_response
    }
