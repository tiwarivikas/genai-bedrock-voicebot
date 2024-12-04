import { config } from '@dotenvx/dotenvx';

config({ path: '.env.local' });
// Define your configuration interface
interface AppConfig {
    JWT_SECRET: string;
    APPRUNNER_GITHUB_URL: string;
    APPRUNNER_GITHUB_BRANCH_MAIN: string;
    APPRUNNER_GITHUB_BRANCH_SANDBOX: string;
    APPRUNNER_GITHUB_CONNECTION_ARN: string;
    CHAT_PROD_API: string;
    KENDRA_INDEXID: string;
    BHASHINI_API_KEY: string;
    BHASHINI_USER_ID: string;
    BEDROCK_MODEL: string;
    BEDROCK_REGION: string;
}

// Create a configuration object
const _config: AppConfig = {
    JWT_SECRET: process.env.JWT_SECRET || '', //Mandatory
    APPRUNNER_GITHUB_URL: process.env.APPRUNNER_GITHUB_URL || '', //Mandatory
    APPRUNNER_GITHUB_CONNECTION_ARN: process.env.APPRUNNER_GITHUB_CONNECTION_ARN || '', //Mandatory
    APPRUNNER_GITHUB_BRANCH_MAIN: process.env.APPRUNNER_GITHUB_BRANCH_MAIN || 'main',
    APPRUNNER_GITHUB_BRANCH_SANDBOX: process.env.APPRUNNER_GITHUB_BRANCH_SANDBOX || 'sandbox',
    CHAT_PROD_API: process.env.CHAT_PROD_API || 'UPDATE_ENVIRONMENT_VARIABLE_:_CHAT_PROD_API',
    KENDRA_INDEXID: process.env.KENDRA_INDEXID || '',
    BHASHINI_API_KEY: process.env.BHASHINI_API_KEY || '',
    BHASHINI_USER_ID: process.env.BHASHINI_USER_ID || '',
    BEDROCK_MODEL: process.env.BEDROCK_MODEL || "mistral.mixtral-8x7b-instruct-v0:1",
    BEDROCK_REGION: process.env.BEDROCK_REGION || '',
};
//test

// Export the configuration
export default _config;