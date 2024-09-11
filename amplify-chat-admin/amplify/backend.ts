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
const appSync_url = backend.data.resources.graphqlApi.apiId;
const amplifyBackendType = backend.auth.resources.userPool.node.tryGetContext("amplify-backend-type");
const amplifyBackendNamespace = backend.auth.resources.userPool.node.tryGetContext("amplify-backend-namespace");



let qChatApi: any = null;
if(_config.JWT_SECRET != "") {
  console.log("Creating QChatApi")
  qChatApi = new QChatApi(backend.createStack("qChatApi"), "qChatApi", {
    cognito_user_pool,
    appSync_url,
    amplifyBackendType,
    amplifyBackendNamespace
  });
} else {
  console.log(
    `********************************************************************************
    ****************** ERROR: ENVIRONMENT VARIABLES NOT SET *************************
    *********************************************************************************`)
}
  
backend.addOutput({
  custom: {
    amplifyBackendType,
    amplifyBackendNamespace,
    apiGatewayv2Endpoint: qChatApi?.apiEndpoint,
    graphQLAPIId: backend.data.resources.graphqlApi.apiId,
    apiExecuteStepFnEndpoint: qChatApi?.apiExecuteStepFn,
    conversationDDBTableName: qChatApi?.conversationDDBTableName,
    DDBTable_ConversationSummary: qChatApi?.DDBTable_ConversationSummary,
    VITE_STREAMING_API_ENDPOINT: "https://" + qChatApi?.apiStreamingUrl,
    VITE_APIGW_ENDPOINT: qChatApi?.apiEndpoint 
  },
}); 
