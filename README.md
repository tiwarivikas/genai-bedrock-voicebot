# genai-bedrock-voicebot
This Codebase allows creation of Multi-tenant GenAI based Chat and Voicebots

Configure following environment variables in Amplify Console for the "amplify-chat-admin": 
JWT_SECRET='<Specify a random string>'
APPRUNNER_GITHUB_URL='<Github URL>'
APPRUNNER_GITHUB_BRANCH_MAIN='<Branch Name>' //Default is 'main'
APPRUNNER_GITHUB_BRANCH_SANDBOX='<Branch Name>' //Default is 'main'
APPRUNNER_GITHUB_CONNECTION_ARN='<ARN of Github Connection in AppRunner console>'
CHAT_PROD_API="<URL of the Amplify Chat UI project>" // To be configured later after deployment of Amplify Chat UI project. Initially keep it empty. 
BHASHINI_USER_ID="<User ID of Bhashini>"
BHASHINI_API_KEY="<API Key of Bhashini>"

Configure following environment variables in Amplify Console for the "amplify-chat-ui": 
apiGatewayEndpoint: <HTTP API Gateway URL>
streamingAPIEndpoint: <AppRunner URL>
