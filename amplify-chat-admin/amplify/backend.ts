import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { QChatApi } from "./custom/qchat-api/resource";
import _config from "./custom/qchat-api/config/configuration"
import { AmplifyClient, GetAppCommand } from '@aws-sdk/client-amplify';
/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
});

//Accessing backend DDB Table
const cognito_user_pool = backend.auth.resources.userPool.userPoolId;

// backend.auth.resources.cfnResources.cfnUserPool.attrUserPoolId;
const appSync_url = backend.data.resources.graphqlApi.apiId;
// backend.data.resources.cfnResources.cfnGraphqlApi.attrGraphQlUrl;

const amplifyBackendType = backend.auth.resources.userPool.node.tryGetContext(
  "amplify-backend-type"
);

const amplifyBackendName = backend.auth.resources.userPool.node.tryGetContext(
  "amplify-backend-name"
);
console.log("amplifyBackendName: ", amplifyBackendName)

const amplifyBackendNamespace = backend.auth.resources.userPool.node.tryGetContext(
  "amplify-backend-namespace"
);
console.log("amplifyBackendNamespace: ", amplifyBackendNamespace)

// The Amplify app name or ID
const amplifyAppNameOrId = 'your-amplify-app-id-or-name';

const amplifyClient = new AmplifyClient({});

// Function to retrieve the Amplify repository URL
const getAmplifyRepoUrl = async () => {
  try {
    const command = new GetAppCommand({ appId: amplifyAppNameOrId });
    const response = await amplifyClient.send(command);
    const repositoryUrl = response.app?.repository;

    console.log("repositoryUrl: ", JSON.stringify(response.app))
    
    // You can use the repositoryUrl in your CDK logic here
    console.log('Repository URL:', repositoryUrl);

    return repositoryUrl;
  } catch (error) {
    console.error('Error fetching Amplify project:', error);
    throw error;
  }
};

 // Retrieve the Amplify repository URL
 await getAmplifyRepoUrl()

let qChatApi: any = null;
if(_config.JWT_SECRET != "") {
  console.log("Creating QChatApi")
  qChatApi = new QChatApi(backend.createStack("qChatApi"), "qChatApi", {
    cognito_user_pool,
    appSync_url,
    amplifyBackendType
  });
}
  
backend.addOutput({
  custom: {
    amplifyBackendType,
    amplifyBackendName,
    amplifyBackendNamespace,
    apiGatewayv2Endpoint: qChatApi?.apiEndpoint,
    graphQLAPIId: backend.data.resources.graphqlApi.apiId,
    apiExecuteStepFnEndpoint: qChatApi?.apiExecuteStepFn,
    conversationDDBTableName: qChatApi?.conversationDDBTableName,
    DDBTable_ConversationSummary: qChatApi?.DDBTable_ConversationSummary,
  },
}); 
