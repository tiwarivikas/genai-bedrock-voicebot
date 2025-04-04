import * as cdk from 'aws-cdk-lib';
import { Duration, aws_apigatewayv2 as apigwv2 } from "aws-cdk-lib";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as url from "node:url";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as apprunner from "aws-cdk-lib/aws-apprunner"
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import _config from "./config/configuration";
import * as lambda_core from "aws-cdk-lib/aws-lambda";  // For core Lambda functionality (Python Lambda)
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

import { Construct } from "constructs";

type QChatApiProps = { cognito_user_pool: string; appSync_url: string; amplifyBackendType: string; amplifyBackendNamespace: string };

export class QChatApi extends Construct {
  public readonly apiEndpoint: string;
  public readonly apiExecuteStepFn: string;
  public readonly conversationDDBTableName: string;
  public readonly DDBTable_ConversationSummary: string;
  public readonly apiStreamingUrl: string;
  public readonly fileDistributionDomainName: string;

  constructor(scope: Construct, id: string, props: QChatApiProps) {
    super(scope, id);

    const cognito_user_pool = props.cognito_user_pool;
    const appSync_url = props.appSync_url;
    
    // Create S3 bucket for QChat resources
    const qchatResourcesBucket = new s3.Bucket(this, 'QChatResourcesBucket', {
      bucketName: `qchatresources-${cdk.Stack.of(this).region}-${cdk.Stack.of(this).account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: true,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'],
          exposedHeaders: [
            'ETag',
            'Content-Type',
            'Content-Disposition',
            'Content-Length',
            'x-amz-server-side-encryption',
            'x-amz-request-id',
            'x-amz-id-2'
          ],
          maxAge: 3600
        }
      ],
    });

    // Create CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'QChatOriginAccessIdentity', {
      comment: 'Access to QChat resources bucket'
    });

    qchatResourcesBucket.grantRead(originAccessIdentity);
    // Create a basic error page
    const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Access Denied</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #333; }
            .container { max-width: 800px; margin: 0 auto; text-align: center; }
            h1 { color: #d32f2f; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Access Denied</h1>
            <p>You don't have permission to access this resource.</p>
        </div>
    </body>
    </html>
    `;

    // Upload the error page to S3
    new s3deploy.BucketDeployment(this, 'DeployErrorPage', {
      sources: [s3deploy.Source.data('error.html', errorHtml)],
      destinationBucket: qchatResourcesBucket,
    });

    // Upload robots.txt to S3
    new s3deploy.BucketDeployment(this, 'DeployRobotsTxt', {
      sources: [s3deploy.Source.data('robots.txt', 
        `User-agent: *
        Allow: /
        Allow: /*.pdf$
        Allow: /*.doc$
        Allow: /*.docx$
        Allow: /*.txt$
        Allow: /*.xlsx$
        Allow: /*.xls$
        Allow: /*.pptx$
        Allow: /*.ppt$
        Allow: /*.csv$
        Disallow: /private/`
     )],
      destinationBucket: qchatResourcesBucket,
    });

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'KendraCrawlerFriendlyPolicy', {
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'X-Robots-Tag',
            value: 'all',
            override: true,
          }
        ],
      },
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        referrerPolicy: { 
          referrerPolicy: cloudfront.HeadersReferrerPolicy.ORIGIN, 
          override: true 
        },
        strictTransportSecurity: { 
          accessControlMaxAge: Duration.seconds(63072000), 
          includeSubdomains: true, 
          override: true 
        }
      }
    });


    const fileDistribution = new cloudfront.Distribution(this, 'QChatFileDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(qchatResourcesBucket, {
          originAccessIdentity: new cloudfront.OriginAccessIdentity(this, 'QChatOAI', {
            comment: 'Access to QChat resources bucket'
          }),

        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        // Use managed CORS-S3Origin policy
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        // Use managed CORS-with-Preflight policy
        responseHeadersPolicy: responseHeadersPolicy,
        cachePolicy: new cloudfront.CachePolicy(this, 'QChatCachePolicy', {
          defaultTtl: Duration.minutes(5),
          minTtl: Duration.seconds(1),
          maxTtl: Duration.minutes(10),
          enableAcceptEncodingBrotli: true,
          enableAcceptEncodingGzip: true,
          headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
            'Access-Control-Request-Headers',
            'Access-Control-Request-Method',
            'Origin'
          ),
          queryStringBehavior: cloudfront.CacheQueryStringBehavior.all()
        }),
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 403,
          responsePagePath: '/error.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        }
      ],
      enableLogging: true,
      logIncludesCookies: true
    });

    // Add output property to expose the CloudFront URL
    this.fileDistributionDomainName = fileDistribution.distributionDomainName;
    // ****************************************************************
    // ***** DynamoDB Table: URL Shortener  ********
    // ****************************************************************
    const URLShortenerTable = new dynamodb.TableV2(this, 'URLShortenerTableDDB', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      pointInTimeRecovery: true,
      billing: dynamodb.Billing.onDemand(),
      deletionProtection: false,
    });

    // ****************************************************************
    // ***** DynamoDB Table: Conversation List by Application  ********
    // ****************************************************************
    const conversationListTable = new dynamodb.TableV2(this, 'chatBRConversationListDDB', {
      partitionKey: { name: 'appId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'conversationDate', type: dynamodb.AttributeType.STRING },
      pointInTimeRecovery: true,
      billing: dynamodb.Billing.onDemand(),
      deletionProtection: false,
    });
    this.DDBTable_ConversationSummary = conversationListTable.tableName;

    // ********************************************************
    // ***** DynamoDB Table: Conversation Records API  ********
    // ********************************************************
    const conversationTable = new dynamodb.TableV2(this, 'chatBRConversationsDDB', {
      partitionKey: { name: 'messageId', type: dynamodb.AttributeType.STRING },
      pointInTimeRecovery: true,
      billing: dynamodb.Billing.onDemand(),
      deletionProtection: false,
      globalSecondaryIndexes: [{
        indexName: "byConversationId",
        partitionKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'conversationDate', type: dynamodb.AttributeType.STRING },
      }]
    });
    this.conversationDDBTableName = conversationTable.tableName;
    // Create status tracking table
    const agentCreationStatusTable = new dynamodb.TableV2(this, 'AgentCreationStatusDDB', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      pointInTimeRecovery: true,
      billing: dynamodb.Billing.onDemand(),
      deletionProtection: false,
    });

    // ****************************************************************
    // ***** Lambda: Handle Chat Response with Amazon Q backend *******
    // ****************************************************************
    //Create IAM role
    const lambdaQrole = new iam.Role(this, "QChatLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "QChat Lambda Role to execute Amazon Q chat.",
    });

    //Add a policy
    lambdaQrole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["logs:*", "qbusiness:ChatSync"],
        effect: iam.Effect.ALLOW,
      }),
    );

    //Create API Gateway
    const httpApi = new apigwv2.HttpApi(this, "QChatApi"/* ,
      {
        corsPreflight: {
          allowHeaders: ['Authorization'],
          allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.OPTIONS],
          allowOrigins: ['*'],
          maxAge: Duration.days(10), // Cache CORS preflight responses for 10 days
        },
      } */
    );
    this.apiEndpoint = httpApi.apiEndpoint;

    // ********************************************************
    // ***** Lambda to Create a new Q Application *************
    // ********************************************************
    //Create IAM role
    const lambdaCreateQAppRole = new iam.Role(this, "CreateQAppLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "QChat Lambda Role to create Q application.",
    });

    //Add a policy
    lambdaCreateQAppRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["logs:*", "iam:PassRole", "dynamodb:*", "kendra:*"],
        effect: iam.Effect.ALLOW,
      }),
    );
    lambdaCreateQAppRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [agentCreationStatusTable.tableArn],
        actions: ["dynamodb:Query", "dynamodb:GetItem"],
        effect: iam.Effect.ALLOW,
      })
    );

    lambdaCreateQAppRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [URLShortenerTable.tableArn],
        actions: [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ],
        effect: iam.Effect.ALLOW,
      })
    );

    lambdaCreateQAppRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "bedrock:DeleteAgent",
          "bedrock:DeleteAgentActionGroup",
          "bedrock:DeleteAgentAlias"
        ],
        resources: [
          "arn:aws:bedrock:*:*:agent/*",
          "arn:aws:bedrock:*:*:agent-alias/*",
          "arn:aws:bedrock:*::foundation-model/*"
        ],
      })
    );

    // ************************ Create APIGW+LAMBDA with Cognito Integration ********************************
    // Description: API to be called from the Web app to initiate Step function QChat application creation workflow via Lambda.


    // Create API Gateway
    const api = new apigateway.RestApi(this, "qChatBackendAPIv2", {
      restApiName: "qChatBackendAPIv2",
      deployOptions: {
        stageName: "prod",
      },
    });
    this.apiExecuteStepFn = api.url;

    //console.log(config.aws_cognito_identity_pool_id);

    // Define existing Cognito User Pool
    const existingUserPool = cognito.UserPool.fromUserPoolId(
      this,
      "ExistingUserPool",
      cognito_user_pool,
    );

    // Define authorizer
    const auth = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "MyAuthorizerv2",
      {
        cognitoUserPools: [existingUserPool],
      },
    );

    // Define API Gateway resource
    const apiResource = api.root.addResource("createApp");


    // ****************************************************************
    // ************ Create Kendra Index *******************************
    // ****************************************************************
    // Create the Kendra Index IAM Role
    const kendraRole = new iam.Role(this, 'KendraIndexRole', {
      assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
      description: 'IAM Role for Kendra Index',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonKendraFullAccess'),
      ],
    });
    kendraRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["logs:*"],
        effect: iam.Effect.ALLOW,
      }),
    );

    const region = cdk.Stack.of(this).region;
    const account = cdk.Stack.of(this).account;

    //Create Index only if KENDRA_INDEXID not provided in environment variable
    let kendraIndex:any = null;
    if(_config.KENDRA_INDEXID == "") {
      // Create the Kendra Index
      kendraIndex = new kendra.CfnIndex(this, 'MyKendraIndex', {
        name: 'GenAIBedrockVoiceBotKendraIndex',
        edition: 'ENTERPRISE_EDITION',
        roleArn: kendraRole.roleArn,
        description: 'An Enterprise Edition Kendra index for searching documents',
      });


      // Add custom fields to Kendra Index
      const customFields = [
        {
          name: 'wc_file_name',
          type: 'STRING_VALUE',
          description: 'File name for web crawler documents',
        },
        {
          name: 'wc_title',
          type: 'STRING_VALUE',
          description: 'Title for web crawler documents',
        },
        {
          name: 's3_document_id',
          type: 'STRING_VALUE',
          description: 'Document ID for S3 documents',
        },
      ];

      // Add custom fields to the Kendra Index
      kendraIndex.addPropertyOverride('DocumentMetadataConfigurations', [
        ...customFields.map(field => ({
          Name: field.name,
          Type: field.type,
          Search: {
            Facetable: true,
            Searchable: true,
            Displayable: true,
          },
        })),
        {
          Name: '_data_source_id',
          Type: 'STRING_VALUE',
          Search: {
            Facetable: true,
            Searchable: true,
            Displayable: true,
          },
        }
      ]);

    }

    // Create the Kendra Data Source IAM Role
    const kendraDataSourceRole = new iam.Role(this, 'KendraDataSourceRole', {
      assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'), // Trust relationship
      description: 'IAM Role for Kendra Data Source (Web Crawler)',
    });

    // Attach custom policies to the Kendra Data Source Role

    // Kendra Principal Mapping actions
    kendraDataSourceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'kendra:PutPrincipalMapping',
        'kendra:DeletePrincipalMapping',
        'kendra:ListGroupsOlderThanOrderingId',
        'kendra:DescribePrincipalMapping',
      ],
      resources: [
        `arn:aws:kendra:${region}:${account}:index/*`,
        `arn:aws:kendra:${region}:${account}:index/*/data-source/*`,
      ],
    }));

    //Add a policy
    kendraDataSourceRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["logs:*"],
        effect: iam.Effect.ALLOW,
      }),
    );

    // Kendra Document actions
    kendraDataSourceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'kendra:BatchPutDocument',
        'kendra:BatchDeleteDocument',
      ],
      resources: [`arn:aws:kendra:${region}:${account}:index/*`],
    }));

    // EC2 Network Interface conditional access
    kendraDataSourceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ec2:CreateNetworkInterface'],
      resources: [`arn:aws:ec2:${region}:${account}:network-interface/*`],
      conditions: {
        'StringLike': {
          'aws:RequestTag/AWS_KENDRA': `kendra_${account}_*`,
        },
      },
    }));

    // EC2 CreateTags action
    kendraDataSourceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ec2:CreateTags'],
      resources: [`arn:aws:ec2:${region}:${account}:network-interface/*`],
      conditions: {
        'StringEquals': {
          'ec2:CreateAction': 'CreateNetworkInterface',
        },
      },
    }));

    // EC2 Network Interface Permission access
    kendraDataSourceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ec2:CreateNetworkInterfacePermission'],
      resources: [`arn:aws:ec2:${region}:${account}:network-interface/*`],
      conditions: {
        'StringLike': {
          'aws:ResourceTag/AWS_KENDRA': `kendra_${account}_*`,
        },
      },
    }));

    // Describe EC2 resources access
    kendraDataSourceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ec2:DescribeNetworkInterfaces',
        'ec2:DescribeAvailabilityZones',
        'ec2:DescribeNetworkInterfaceAttribute',
        'ec2:DescribeVpcs',
        'ec2:DescribeRegions',
        'ec2:DescribeNetworkInterfacePermissions',
        'ec2:DescribeSubnets',
      ],
      resources: ['*'],
    }));



    // ****************************************************************
    // ***** LAMBDA: Execute Commands - Refresh Token, Delete App ***
    // *****  Index status, Bedrock chat - List Conversation  *********
    // ****************************************************************
    const executeCommandLambda = new lambda.NodejsFunction(
      this,
      "executeCommandLambda",
      {
        entry: url.fileURLToPath(
          new URL("handlers/executeCommand.ts", import.meta.url),
        ),
        runtime: Runtime.NODEJS_18_X,
        role: lambdaCreateQAppRole,
        timeout: Duration.minutes(1),
        environment: { 
          JWT_SECRET: _config.JWT_SECRET, 
          DDBTable_URLShortener: URLShortenerTable.tableName, 
          DDBTable_ConversationsList: conversationListTable.tableName, 
          conversationDDBTableName: conversationTable.tableName, 
          KENDRA_INDEXID: kendraIndex? kendraIndex.attrId: _config.KENDRA_INDEXID, 
          CHAT_PROD_API: _config.CHAT_PROD_API, 
          AGENT_STATUS_TABLE: agentCreationStatusTable.tableName,
          API_Endpoint: httpApi.apiEndpoint
        },      
      },
    );

    // Define API Gateway resource
    const apiResourceexecuteCommand = api.root.addResource("executeCommand");

    // Integrate API Gateway with Lambda function
    const integrationexecuteCommand = new apigateway.LambdaIntegration(
      executeCommandLambda,
      { proxy: true },
    );

    // Add method to API Gateway resource
    apiResourceexecuteCommand.addMethod("POST", integrationexecuteCommand, {
      authorizer: auth,
    });

    //add OPTIONS without Auth
    apiResourceexecuteCommand.addMethod("OPTIONS", integrationexecuteCommand);

    // ********************************************************
    // ***** Bedrock Chat API Lambda  *************
    // ********************************************************

    //Create IAM role
    const lambdachatBRrole = new iam.Role(this, "chatBRLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "QChat Lambda Role to execute Amazon Bedrock chat.",
    });

    //Add a policy
    lambdachatBRrole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["logs:*", "bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream", "kendra:Query", "kendra:Retrieve", "dynamodb:PutItem", "dynamodb:Query"],
        effect: iam.Effect.ALLOW,
      }),
    );

    //Create Lambda function
    const fnchatBR = new lambda.NodejsFunction(this, "chatBRResponseAPI", {
      entry: url.fileURLToPath(
        new URL("handlers/chatBRResponseAPIHandler.ts", import.meta.url),
      ),
      runtime: Runtime.NODEJS_18_X,
      environment: { JWT_SECRET: _config.JWT_SECRET, conversationDDBTableName: conversationTable.tableName, DDBTable_ConversationSummary: conversationListTable.tableName, KENDRA_INDEXID: kendraIndex? kendraIndex.attrId: _config.KENDRA_INDEXID },
      role: lambdachatBRrole,
      timeout: Duration.minutes(5),
    });

    //Create Integration
    const chatBRIntegration = new HttpLambdaIntegration(
      "chatBRIntegration",
      fnchatBR,
    );

    httpApi.addRoutes({
      path: "/v2/chatbr",
      methods: [apigwv2.HttpMethod.ANY],
      integration: chatBRIntegration,
    });

    // ********************************************************
    // ***** Lambda: Create New Bedrock Agent *********
    // ********************************************************
    //Create IAM role for Bedrock Agent Lambda
    const lambdaCreateAgentRole = new iam.Role(this, "CreateAgentLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Lambda Role to create Bedrock Agent application.",
    });

    //Add the comprehensive policy for Bedrock Agent creation
    lambdaCreateAgentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "iam:CreateRole",
          "iam:GetRole",
          "iam:DeleteRole",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:CreatePolicy",
          "iam:DeletePolicy",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:ListAttachedRolePolicies",
          "iam:PassRole"
        ],
        resources: [
          "arn:aws:iam::*:role/*",
          "arn:aws:iam::*:policy/*"
        ],
      })
    );

    lambdaCreateAgentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:CreateBucket",
          "s3:DeleteBucket",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ],
        resources: [
          "arn:aws:s3:::*",
          "arn:aws:s3:::*/*"
        ],
      })
    );

    lambdaCreateAgentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "lambda:CreateFunction",
          "lambda:DeleteFunction", 
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:AddPermission",
          "lambda:RemovePermission",
          "lambda:GetFunction",
          "lambda:GetFunctionConfiguration"
        ],
        resources: ["arn:aws:lambda:*:*:function:*"],
      })
    );

    lambdaCreateAgentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "bedrock:CreateAgent",
          "bedrock:DeleteAgent",
          "bedrock:CreateAgentActionGroup",
          "bedrock:DeleteAgentActionGroup",
          "bedrock:PrepareAgent",
          "bedrock:CreateAgentAlias",
          "bedrock:DeleteAgentAlias",
          "bedrock:CreateKnowledgeBase",
          "bedrock:AssociateAgentKnowledgeBase"
        ],
        resources: [
          "arn:aws:bedrock:*:*:agent/*",
          "arn:aws:bedrock:*:*:agent-alias/*",
          "arn:aws:bedrock:*::foundation-model/*",
          "arn:aws:bedrock:*:*:knowledge-base/*"
        ],
      })
    );

    lambdaCreateAgentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        resources: ["arn:aws:bedrock:*::foundation-model/anthropic.claude-*"],
      })
    );

    lambdaCreateAgentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["sts:GetCallerIdentity"],
        resources: ["*"],
      })
    );

    // Add CloudWatch Logs permissions
    lambdaCreateAgentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["logs:*"],
        resources: ["*"],
      })
    );

    // Add permissions for the agent status table
    lambdaCreateAgentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [agentCreationStatusTable.tableArn],
        actions: [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ],
      })
    );
    // Add bucket permissions to the agent creator lambda role
    lambdaCreateAgentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ],
        resources: [
          qchatResourcesBucket.bucketArn,
          `${qchatResourcesBucket.bucketArn}/*`
        ],
      })
    );

    lambdaCreateAgentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [URLShortenerTable.tableArn],
        actions: [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ],
      })
    );

    //Create Lambda function for Agent creation
    const fnAgentCreator = new lambda_core.Function(this, "fnAgentCreator", {
      runtime: Runtime.PYTHON_3_12,
      handler: "app.lambda_handler",
      code: lambda_core.Code.fromAsset("amplify/custom/qchat-api/handlers/agent"),
      role: lambdaCreateAgentRole,
      timeout: Duration.minutes(15),
      environment: { 
        JWT_SECRET: _config.JWT_SECRET,
        DDBTable_URLShortener: URLShortenerTable.tableName,
        API_Endpoint: httpApi.apiEndpoint,
        CHAT_PROD_API: _config.CHAT_PROD_API,  
        BEDROCK_REGION: _config.BEDROCK_REGION, 
        BEDROCK_MODEL: _config.BEDROCK_MODEL,   
        DDBTable_ConversationSummary: conversationListTable.tableName, 
        conversationDDBTableName: conversationTable.tableName,
        AGENT_STATUS_TABLE: agentCreationStatusTable.tableName,
        KENDRA_INDEXID: kendraIndex ? kendraIndex.attrId : _config.KENDRA_INDEXID,
        KENDRA_DATASOURCE_ROLE: kendraDataSourceRole.roleArn,
        QCHAT_RESOURCES_BUCKET: qchatResourcesBucket.bucketName,
      },
    });
    
    // Create IAM role for file upload Lambda
    const fileUploadLambdaRole = new iam.Role(this, "FileUploadLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Lambda Role to handle file uploads and index generation",
    });

    // Add policies for S3 access and CloudWatch logs
    fileUploadLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [qchatResourcesBucket.bucketArn, `${qchatResourcesBucket.bucketArn}/*`],
        actions: ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
        effect: iam.Effect.ALLOW,
      }),
    );

    fileUploadLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["logs:*"],
        effect: iam.Effect.ALLOW,
      }),
    );

    // Create the file upload Lambda function
    const fileUploadLambda = new lambda.NodejsFunction(this, "fileUploadLambda", {
      entry: url.fileURLToPath(
        new URL("handlers/fileUploadHandler.ts", import.meta.url),
      ),
      runtime: Runtime.NODEJS_18_X,
      role: fileUploadLambdaRole,
      timeout: Duration.minutes(3),
      environment: {
        JWT_SECRET: _config.JWT_SECRET,
        QCHAT_RESOURCES_BUCKET: qchatResourcesBucket.bucketName,
        CLOUDFRONT_DOMAIN: fileDistribution.distributionDomainName
      },
    });

    const apiResourceFileManager = api.root.addResource("fileManager");

    // Integrate API Gateway with Lambda function for file management
    const integrationFileManager = new apigateway.LambdaIntegration(
      fileUploadLambda,
      { proxy: true },
    );

    // Add method to API Gateway resource
    apiResourceFileManager.addMethod("POST", integrationFileManager, {
      authorizer: auth,
    });
    apiResourceFileManager.addMethod("OPTIONS", integrationFileManager);

    // Create the S3 presigned URLs Lambda function
    const s3PresignedUrlLambda = new lambda.NodejsFunction(this, "s3PresignedUrlLambda", {
      entry: url.fileURLToPath(
        new URL("handlers/s3PresignedUrls.ts", import.meta.url),
      ),
      runtime: Runtime.NODEJS_18_X,
      role: fileUploadLambdaRole, // Reuse the same role as the file upload Lambda
      timeout: Duration.minutes(1),
      environment: {
        JWT_SECRET: _config.JWT_SECRET,
        QCHAT_RESOURCES_BUCKET: qchatResourcesBucket.bucketName,
      },
    });

    // Define API Gateway resource for presigned URLs
    const apiResourcePresignedUrls = api.root.addResource("presignedUrls");
    // Integrate API Gateway with Lambda function for presigned URLs
    const integrationPresignedUrls = new apigateway.LambdaIntegration(
      s3PresignedUrlLambda,
      { proxy: true },
    );

    // Add method to API Gateway resource
    apiResourcePresignedUrls.addMethod("POST", integrationPresignedUrls, {
      authorizer: auth,
    });

    //add OPTIONS without Auth
    apiResourcePresignedUrls.addMethod("OPTIONS", integrationPresignedUrls);
      
    // ********************************************************
    // ***** Like/Dislike chat API Lambda  *************
    // ********************************************************

    //Create IAM role
    const lambdachatBRLikeDislikerole = new iam.Role(this, "chatBRLikeDislikeLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "QChat Lambda Role to execute Amazon Bedrock chat Like Dislike.",
    });

    //Add a policy
    lambdachatBRLikeDislikerole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["logs:*", "dynamodb:UpdateItem", "dynamodb:GetItem"],
        effect: iam.Effect.ALLOW,
      }),
    );

    //Create Lambda function
    const fnchatBRLikeDislike = new lambda.NodejsFunction(this, "chatBRLikeDislikeResponseAPI", {
      entry: url.fileURLToPath(
        new URL("handlers/chatBRLikeDislikeAPIHandler.ts", import.meta.url),
      ),
      runtime: Runtime.NODEJS_18_X,
      environment: { JWT_SECRET: _config.JWT_SECRET, conversationDDBTableName: conversationTable.tableName },
      role: lambdachatBRLikeDislikerole,
      timeout: Duration.minutes(5),
    });

    //Create Integration
    const chatBRLikeDislikeIntegration = new HttpLambdaIntegration(
      "chatBRLikeDislikeIntegration",
      fnchatBRLikeDislike,
    );

    httpApi.addRoutes({
      path: "/v2/reactions",
      methods: [apigwv2.HttpMethod.ANY],
      integration: chatBRLikeDislikeIntegration,
    });



    // ********************************************************
    // ***** Lambda: URL Shortener Redirection    *************
    // ********************************************************

    //Create IAM role
    const lambdaURLShorternerrole = new iam.Role(this, "chatURLShorternerLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Lambda Role to provide redirection URLs.",
    });

    //Add a policy
    lambdaURLShorternerrole.addToPolicy(
      new iam.PolicyStatement({
        resources: [URLShortenerTable.tableArn],
        actions: ["dynamodb:GetItem"],
        effect: iam.Effect.ALLOW,
      }),
    );
    //Add a policy
    lambdaURLShorternerrole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["logs:*"],
        effect: iam.Effect.ALLOW,
      }),
    );

    //Create Lambda function
    const fnURLShorterner = new lambda.NodejsFunction(this, "URLShorternerResponseAPI", {
      entry: url.fileURLToPath(
        new URL("handlers/urlShortener.ts", import.meta.url),
      ),
      runtime: Runtime.NODEJS_18_X,
      environment: { DDBTable_URLShortener: URLShortenerTable.tableName },
      role: lambdaURLShorternerrole,
      timeout: Duration.minutes(5),
    });

    //Create Integration
    const URLShorternerIntegration = new HttpLambdaIntegration(
      "URLShorternerIntegration",
      fnURLShorterner,
    );

    httpApi.addRoutes({
      path: "/v2/tiny",
      methods: [apigwv2.HttpMethod.ANY],
      integration: URLShorternerIntegration,
    });

    // ********************************************************
    // ***** Lambda: Create New Bedrock Chatbot *********
    // ********************************************************
    //Create IAM role
    const lambdaCreateBRAppRole = new iam.Role(this, "CreateBRAppLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "QChat Lambda Role to create Bedrock application.",
    });

    //Add a policy
    lambdaCreateBRAppRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["logs:*", "dynamodb:Query", "kendra:*", "iam:PassRole", "dynamodb:PutItem"],
        effect: iam.Effect.ALLOW,
      }),
    );
    // Add Lambda invoke permissions for createKendraDS
    lambdaCreateBRAppRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [fnAgentCreator.functionArn],
        actions: ["lambda:InvokeFunction"],
      })
    );
    //Create Lambda function
    const fnBRAppCreate = new lambda.NodejsFunction(this, "fnBRAppCreate", {
      entry: url.fileURLToPath(
        new URL("handlers/createKendraDS.ts", import.meta.url),
      ),
      runtime: Runtime.NODEJS_18_X,
      role: lambdaCreateBRAppRole,
      timeout: Duration.minutes(5),
      environment: { 
        JWT_SECRET: _config.JWT_SECRET, 
        DDBTable_URLShortener: URLShortenerTable.tableName, 
        API_Endpoint: httpApi.apiEndpoint, 
        CHAT_PROD_API: _config.CHAT_PROD_API, 
        KENDRA_INDEXID: kendraIndex? kendraIndex.attrId: _config.KENDRA_INDEXID, 
        KENDRA_DATASOURCE_ROLE: kendraDataSourceRole.roleArn,
        AGENT_CREATOR_LAMBDA: fnAgentCreator.functionName
      },    
    });

    // Define API Gateway resource
    const apiBRResource = api.root.addResource("createBRApp");

    // Integrate API Gateway with Lambda function
    const integrationBR = new apigateway.LambdaIntegration(
      fnBRAppCreate,
      { proxy: true },
    );

    // Add method to API Gateway resource
    apiBRResource.addMethod("POST", integrationBR, {
      authorizer: auth,
    });

    //add OPTIONS without Auth
    apiBRResource.addMethod("OPTIONS", integrationBR);

    // ********************************************************
    // ***** AppRunner: Bedrock Streaming API *********
    // ********************************************************

    // Create a new secret in Secrets Manager with a simple secret key
    const secret = new secretsmanager.Secret(this, 'AppSecret', {
      secretName: 'jwt-secret-' + props.amplifyBackendType + "-" + props.amplifyBackendNamespace,
      secretStringValue: cdk.SecretValue.unsafePlainText(_config.JWT_SECRET), // Replace with your actual secret value
    });

    // Define the IAM role for App Runner with permissions for Bedrock, DynamoDB, and Secrets Manager
    const appRunnerRole = new iam.Role(this, 'AppRunnerRole', {
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
    });

    appRunnerRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        "logs:*",
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:InvokeAgent", 
        "kendra:Query",
        "kendra:Retrieve",
        "dynamodb:PutItem",
        "dynamodb:Query",
        'secretsmanager:GetSecretValue',
        "polly:SynthesizeSpeech",
        "translate:Translate*"
      ],
      resources: ['*'], // Adjust to specific resources as needed
    }));

    // Define the App Runner service
    const appRunnerService = new apprunner.CfnService(this, 'AppRunnerService', {

      sourceConfiguration: {
        authenticationConfiguration: {
          connectionArn: _config.APPRUNNER_GITHUB_CONNECTION_ARN,
        },
        autoDeploymentsEnabled: true,
        codeRepository: {
          repositoryUrl: _config.APPRUNNER_GITHUB_URL,
          sourceCodeVersion: {
            type: 'BRANCH',
            value: props.amplifyBackendType == "sandbox" ? _config.APPRUNNER_GITHUB_BRANCH_SANDBOX : _config.APPRUNNER_GITHUB_BRANCH_MAIN,
          },
          sourceDirectory: 'apprunner-chat-api',
          codeConfiguration: {
            configurationSource: 'API',
            codeConfigurationValues: {
              runtime: 'NODEJS_18',
              buildCommand: 'npm install',
              startCommand: 'npm start',
              port: '8080',
              runtimeEnvironmentSecrets: [
                {
                  name: 'SECRET_KEY',
                  value: secret.secretArn
                }
              ],
              runtimeEnvironmentVariables: [
                {
                  name: "conversationDDBTableName",
                  value: conversationTable.tableName
                },
                {
                  name: "DDBTable_ConversationSummary",
                  value: conversationListTable.tableName
                },
                {
                  name: "KENDRA_INDEXID",
                  value: kendraIndex? kendraIndex.attrId: _config.KENDRA_INDEXID
                },
                {
                  name: "BHASHINI_USER_ID",
                  value: _config.BHASHINI_USER_ID
                },
                {
                  name: "BHASHINI_API_KEY", 
                  value: _config.BHASHINI_API_KEY
                },
                {
                  name: "BEDROCK_REGION",
                  value: _config.BEDROCK_REGION
                },
                {
                  name: "BEDROCK_MODEL",
                  value: _config.BEDROCK_MODEL
                }
              ]
            },
          },
        },
      },
      instanceConfiguration: {
        instanceRoleArn: appRunnerRole.roleArn,
      }
    }); 
    this.apiStreamingUrl = appRunnerService.attrServiceUrl;
  }
}
