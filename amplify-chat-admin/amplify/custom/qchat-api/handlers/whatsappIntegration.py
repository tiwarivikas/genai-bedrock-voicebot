import json
import boto3
import os
import requests
from urllib.parse import urlparse, parse_qs
from botocore.exceptions import ClientError
import datetime
from urllib.parse import quote

# Initialize the social messaging client
social = boto3.client('socialmessaging')
dynamodb =  boto3.resource('dynamodb')

token_table = "amplify-d2g5mu3x9el4bc-main-branch-493143a352-qChatApiAFD0327D-184DAGZ58IDCA-qChatApiURLShortenerTableDDB87FE75D1-1Q5BXNLOHL17"
qchat_table = "QChatRequest-7dib5id6x5ehfgtjw6iik7v5da-NONE"
conversation_table = "WtpConversationTable"

ORIGINATION_PHONE_NUMBER_ID = os.environ.get('ORIGINATION_PHONE_NUMBER_ID', 
    'phone-number-id-fdf39cb8e4ae4878aacbbb4e9acfb613')
QCHAT_TABLE_NAME = os.environ.get('QCHAT_TABLE_NAME', qchat_table)
CONVERSATION_TABLE_NAME = os.environ.get('CONVERSATION_TABLE_NAME', conversation_table)
TOKEN_TABLE_NAME = os.environ.get('TOKEN_TABLE_NAME', token_table)

def is_valid_application_id_format(application_id):
    """
    Validate if the application ID matches the expected UUID format
    Args:
        application_id (str): The application ID to validate
    Returns:
        bool: True if valid format, False otherwise
    """
    import re
    
    # UUID pattern: 8-4-4-4-12 hexadecimal digits
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    
    if not application_id:
        return False
        
    return bool(re.match(uuid_pattern, application_id.lower()))

def validate_application_id(application_id):
    """
    Validate if the application ID exists in DynamoDB and is active
    Args:
        application_id (str): The application ID to validate
    Returns:
        bool: True if valid, False otherwise
    """
    try:
        table = dynamodb.Table(QCHAT_TABLE_NAME)

        response = table.query(
            IndexName='applicationIdQ-index',
            KeyConditionExpression='applicationIdQ = :appId',
            ExpressionAttributeValues={
                ':appId': application_id
            }
        )

        if not response.get('Items'):
            print(f"Application ID {application_id} not found in database")
            return False, "NotFound"
        item = response['Items'][0]
        token = item.get('token')
        print("item: ", item)
        return True, token
    except ClientError as e:
        print(f"DynamoDB error while validating application ID: {str(e)}")
        return False, "NotFound"
    except Exception as e:
        print(f"Unexpected error while validating application ID: {str(e)}")
        return False, "NotFound"

def parse_sns_message(sns_event):
    """
    Parse the SNS event to extract the webhook message
    Args:
        sns_event (dict): The SNS event
    Returns:
        dict: Extracted webhook data
    """
    try:
        # Extract message from SNS event
        if 'Records' not in sns_event:
            raise ValueError("No Records found in SNS event")

        sns_record = sns_event['Records'][0]['Sns']
        message = json.loads(sns_record.get('Message', '{}'))
        
        return message
    except Exception as e:
        raise Exception(f"Error parsing SNS message: {str(e)}")

def parse_webhook_message(webhook_data):
    """
    Parse the webhook message to extract recipient information
    Args:
        webhook_data (dict): The webhook data from SNS message
    Returns:
        dict: Extracted message details
    """
    try:
        # Parse the WhatsApp webhook entry
        webhook_entry = json.loads(webhook_data.get('whatsAppWebhookEntry', '{}'))
        print("webhook_data: ", webhook_entry)
        if 'changes' in webhook_entry:
            for change in webhook_entry['changes']:
                if change.get('field') == 'messages':
                    value = change.get('value', {})
                    messages = value.get('messages', [])
                    if messages:
                        message = messages[0]  # Get the first message
                        text_body = message.get('text')
                        return {
                            'recipient_id': '+' + message.get('from') ,  # Get the 'from' number
                            'message_text': text_body.get('body'),
                            'timestamp': message.get('timestamp'),
                            'sender_name': value.get('contacts', [{}])[0].get('profile', {}).get('name')
                        }
        return None
    except Exception as e:
        print("parsing error in parse webhook message")
        raise Exception(f"Error parsing webhook message: {str(e)}")

def save_to_conversation_table(recipient_id, application_id, conversation_id):
    """
    Save conversation details to WTP conversation table
    """
    try:
        table = dynamodb.Table(CONVERSATION_TABLE_NAME)

        # Delete any existing entry for recipient id
        delete_existing_conversation(recipient_id)
                     
        # Create item to save
        item = {
            'recipient_id': recipient_id,
            'application_id': application_id,
            'conversation_id': conversation_id,
            'created_at': datetime.datetime.now().isoformat()
        }
        
        # Save to DynamoDB
        response = table.put_item(Item=item)
        
        print(f"Saved conversation details to table: {item}")
        return True
        
    except Exception as e:
        print(f"Error saving to conversation table: {e}")
        return False

def delete_existing_conversation(recipient_id):
    """
    Delete any existing conversation entry for a recipient ID from the conversation table
    
    Args:
        recipient_id (str): The recipient's phone number
        
    Returns:
        bool: True if deletion successful, False otherwise
    """
    try:
        table = dynamodb.Table(CONVERSATION_TABLE_NAME)
        
        # Query to get existing items for recipient_id
        response = table.query(
            KeyConditionExpression='recipient_id = :rid',
            ExpressionAttributeValues={
                ':rid': str(recipient_id)
            }
        )
        
        # Delete each item found
        for item in response.get('Items', []):

            table.delete_item(
                Key={
                    'recipient_id': recipient_id,
                    'application_id': item['application_id']
                }
            )
            
        print(f"Successfully deleted existing conversations for recipient: {recipient_id}")
        return True
        
    except ClientError as e:
        print(f"DynamoDB error while deleting conversation: {str(e)}")
        return False
    except Exception as e:
        print(f"Unexpected error while deleting conversation: {str(e)}")
        return False   
        
def send_greeting_message(recipient_id, message_text, sender_name=None):
    """
    Send a greeting message via WhatsApp and call chat API if application is validated
    """
    try:
        if not recipient_id:
            raise ValueError("Recipient ID is required")
        
        # Initialize with blank value
        conversation_id = ''

        if is_valid_application_id_format(message_text):

            # If the message is Application ID, start a new conversation 
            applicationIDQ = message_text
            # If no conversation exists, validate application ID
            is_valid, token = validate_application_id(applicationIDQ)
            
            if not is_valid:
                print("Not valid application id!")
                greeting_text = (f"Hello {sender_name}! " if sender_name else "Hello! ") + \
                              "Please enter a valid application ID to start a conversation."
            else:
                print("Valid application ID, but new!")
                # Call chat API with the validated application
                chat_response = invoke_chat_api(applicationIDQ, "Hello")
                if chat_response['statusCode'] == 200:
                    new_conversation_id = json.loads(chat_response['body'])['conversationId']
                    save_to_conversation_table(recipient_id, applicationIDQ, new_conversation_id)
                    chat_result = json.loads(chat_response['body'])
                    greeting_text = chat_result['message']
                else:
                    greeting_text = (f"Hello {sender_name}! " if sender_name else "Hello! ") + \
                                  "Thank you for providing the application ID, the chatbot agent will be here shortly. " + \
                                  token
        else:
        
            # First check for existing conversation
            conversation_id, application_id = get_conversation_id(recipient_id)
            
            if conversation_id:
                # If conversation exists, call the chat API
                chat_response = invoke_chat_api(application_id, message_text, conversation_id)
                if chat_response['statusCode'] == 200:
                    chat_result = json.loads(chat_response['body'])
                    greeting_text = chat_result['message']
                    sourceAttributions = chat_result['sourceAttributions']
                    # Format sources with titles and URLs
                    if sourceAttributions:
                        greeting_text += "\n\nSources:"
                        for idx, source in enumerate(sourceAttributions, 1):
                            greeting_text += f"\n{idx}. {source['title']}"
                            # URL encode the URL while preserving the base structure
                            encoded_url = quote(source['url'], safe=':/?=')
                            greeting_text += f"\n   URL: {encoded_url}\n"
                else:
                    greeting_text = (f"Hello {sender_name}! " if sender_name else "Hello! ") + \
                                f"Welcome back! Your existing conversation ID is: {conversation_id}"
            else:
                print("Not valid application id!")
                greeting_text = (f"Hello {sender_name}! " if sender_name else "Hello! ") + \
                            "Please enter a valid application ID to start a conversation."

        greeting_message = {
            "messaging_product": "whatsapp",
            "to": recipient_id,
            "type": "text",
            "text": {
                "body": greeting_text
            }
        }
        print("greeting msg: ", greeting_message)

        response = social.send_whatsapp_message(
            originationPhoneNumberId=ORIGINATION_PHONE_NUMBER_ID,
            message=json.dumps(greeting_message).encode('utf-8'),
            metaApiVersion="v20.0"
        )


        return {
            'statusCode': 200,
            'body': {
                'message': 'Greeting message sent successfully',
                'messageId': response['messageId'],
                'conversation_id': conversation_id
            }
        }

    except Exception as e:
        raise Exception(f"Error sending greeting message: {str(e)}")

def get_conversation_id(recipient_id):
    """
    Get conversation ID from DynamoDB table based on recipient_id
    
    Args:
        recipient_id (str): The recipient's phone number
    
    Returns:
        str: conversation_id if found, None otherwise
    """
    try:
        # Assuming your table name is stored in an environment variable
        table = dynamodb.Table(CONVERSATION_TABLE_NAME)
        
        print(f"Checking conversation for recipient: {recipient_id}")
        print(f"Table name being used: {CONVERSATION_TABLE_NAME}")
        
        # Query the table for matching recipient_id and application_id
        response = table.query(
            KeyConditionExpression='recipient_id = :rid',
            ExpressionAttributeValues={
                ':rid': str(recipient_id)
            }
        )
        print("Response from ddb conversation chk: ", response)

        if response.get('Items'):
            conversation_id = response['Items'][0].get('conversation_id')
            application_id = response['Items'][0].get('application_id')
            print(f"Found existing conversation: {conversation_id} for {application_id}")
            return conversation_id, application_id
        
        print("No existing conversation found")
        return None, None
        
    except ClientError as e:
        print(f"DynamoDB error while getting conversation ID: {str(e)}")
        return None, None
    except Exception as e:
        print(f"Unexpected error while getting conversation ID: {str(e)}")
        return None, None

def get_token(application_id):
    # token = table.find(application_id) # write actual logic here
    table = dynamodb.Table(TOKEN_TABLE_NAME)
    try:
        response = table.query(
            KeyConditionExpression='id = :id',
            ExpressionAttributeValues={
                ':id': application_id
            }
        )

        if not response.get('Items'):
            print(f"Application ID {application_id} not found in database")
            return None
        redirect_url = response['Items'][0].get('redirectURL')

        if not redirect_url:
            print(f"Redirect URL not found for application ID {application_id}")
            return None
        parsed_url = urlparse(redirect_url)
        query_params = parse_qs(parsed_url.query)
        token = query_params.get('token', [None])[0]

        if not token:
            print(f"Token not found in redirect URL for application ID {application_id}")
            return None
        # print(f"Token found for application ID {application_id} successfully")
        return token
    
    except Exception as e:
        print(f"Error retrieving token: {e}")
        return None

def invoke_chat_api(application_id, user_msg, conversation_id=None):
    """
    Invoke the chat API with the given application ID
    """
    print("Inside invoke chatbr API!")
    try:
        # Prepare chat parameters
        chat_params = {
            "conversationId": conversation_id or "",
            "parentMessageId": "",
            "userMessage": user_msg or "Hello",
            "clientToken": ""
        }

        # Prepare URL parameters
        params = {
            "chat": json.dumps(chat_params),
            "stream": False,
            "isSpeakerEnabled": False
        }

        API_ENDPOINT = "https://fj7swvrp1g.execute-api.ap-south-1.amazonaws.com/v2/chatbr"
        auth_token = get_token(application_id)
        print("Got token: ", auth_token)

        if not auth_token:
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Invalid token'})
            }

        # Make API request
        response = requests.get(
            API_ENDPOINT,
            params=params,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': f'Bearer {auth_token}'
            }
        )

        # Process streaming response
        for line in response.iter_lines():
            if line:
                try:
                    data = json.loads(line.decode('utf-8'))
                    if 'systemMessage' in data:
                        return {
                            'statusCode': 200,
                            'body': json.dumps({
                                'message': data['systemMessage'],
                                'conversationId': data.get('conversationId', ''),
                                'systemMessageId': data.get('systemMessageId', ''),
                                'sourceAttributions': data.get('sourceAttributions', [])
                            })
                        }
                except json.JSONDecodeError:
                    continue

        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'No response received'})
        }

    except Exception as e:
        print(f"Error invoking chat API: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def lambda_handler(event, context):
    """
    Main Lambda handler that processes SNS events containing webhook data
    Args:
        event (dict): Lambda event containing SNS message
        context: Lambda context
    Returns:
        dict: Response containing status and result
    """
    try:
        # Log incoming event for debugging
        print(f"Received event: {json.dumps(event)}")
        
        # Parse the SNS message
        webhook_data = parse_sns_message(event)
        if not webhook_data:
            return {
                'statusCode': 400,
                'body': json.dumps('Invalid SNS message format')
            }
        
        # Parse the webhook message details
        message_details = parse_webhook_message(webhook_data)
        if not message_details:
            return {
                'statusCode': 400,
                'body': json.dumps('No valid message details found in webhook data')
            }
        
        # Send greeting for any message type if recipient_id exists
        if message_details['recipient_id']:
            recipient_id = message_details['recipient_id']
            sender_name = message_details['sender_name']
            message_text = message_details['message_text']
            print("message_details: ", message_details)
            
            # Send greeting message
            result = send_greeting_message(recipient_id, message_text, sender_name)
            
            return {
                'statusCode': result['statusCode'],
                'body': json.dumps({
                    'message': 'Greeting sent successfully',
                    'recipient': recipient_id,
                    'sender_name': sender_name,
                    'messageId': result['body']['messageId'],
                    'original_message': message_details['message_text'],
                    'timestamp': message_details['timestamp']
                })
            }
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Message processed but no response needed',
                'type': message_details['message_type'],
                'timestamp': message_details['timestamp']
            })
        }
    
    except Exception as e:
        print(f"Error: {str(e)}")  # Log the error for debugging
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error processing SNS event: {str(e)}')
        }
