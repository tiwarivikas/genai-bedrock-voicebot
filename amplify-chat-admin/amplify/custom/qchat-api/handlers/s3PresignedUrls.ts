// s3PresignedUrls.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const BUCKET_NAME = process.env.QCHAT_RESOURCES_BUCKET || '';

async function generatePresignedUrl(
  command: PutObjectCommand,
  options?: { expiresIn: number }
): Promise<string> {
  const client = new S3Client({});
  return getSignedUrl(client as any, command as any, options);
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    };

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Missing request body' })
      };
    }

    const requestBody = JSON.parse(event.body);
    const { customer, files } = requestBody;

    if (!customer || !files || !Array.isArray(files) || files.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Customer and files are required' })
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const folderPath = `uploads/${customer}/${today}`;

    const presignedUrls = await Promise.all(
      files.map(async (file: { name: string; type: string }) => {
        const fileName = `${folderPath}/${file.name.replace(/\s+/g, '_')}`;
        
        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileName,
          ContentType: file.type
        });
        
        const presignedUrl = await generatePresignedUrl(command, { expiresIn: 3600 });
        
        return {
          fileName: file.name,
          url: presignedUrl,
          key: fileName
        };
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        presignedUrls,
        folderPath
      })
    };
  } catch (error: any) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      },
      body: JSON.stringify({ message: 'Internal server error', error: error.message || 'Unknown error' })
    };
  }
};