import { config } from '@dotenvx/dotenvx';

config({ path: '.env.local' });
// Define your configuration interface
interface AppConfig {
    JWT_SECRET: string;
    APPRUNNER_GITHUB_URL: string;
    APPRUNNER_GITHUB_BRANCH_MAIN: string;
    APPRUNNER_GITHUB_BRANCH_SANDBOX: string;
    APPRUNNER_GITHUB_CONNECTION_ARN: string;
    KENDRA_INDEXID: string;
    CHAT_PROD_API: string;
}

// Create a configuration object
const _config: AppConfig = {
    JWT_SECRET: process.env.JWT_SECRET || '',
    APPRUNNER_GITHUB_URL: process.env.APPRUNNER_GITHUB_URL || '',
    APPRUNNER_GITHUB_BRANCH_MAIN: process.env.APPRUNNER_GITHUB_BRANCH_MAIN || 'main',
    APPRUNNER_GITHUB_BRANCH_SANDBOX: process.env.APPRUNNER_GITHUB_BRANCH_SANDBOX || 'sandbox',
    APPRUNNER_GITHUB_CONNECTION_ARN: process.env.APPRUNNER_GITHUB_CONNECTION_ARN || '',
    KENDRA_INDEXID: process.env.KENDRA_INDEXID || '',
    CHAT_PROD_API: process.env.CHAT_PROD_API || '',
};

console.log("config", _config);

// Export the configuration
export default _config;