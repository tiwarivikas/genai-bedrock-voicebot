
// fileUploadHandler.ts

import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const BUCKET_NAME = process.env.QCHAT_RESOURCES_BUCKET || '';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    const { action, customer, folder } = requestBody;

    if (!customer) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Customer name is required' })
      };
    }

    const s3Client = new S3Client({});

    // Generate a file index for a specific folder
    if (action === 'generateIndex') {
      const folderPath = folder || `uploads/${customer}`;
      const folderPrefix = `${folderPath}/`;

      // List objects in the folder
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: folderPrefix
      });

      const response = await s3Client.send(listCommand);

      if (!response.Contents || response.Contents.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'No files found in the specified folder' })
        };
      }

      // Process files with proper null checks
      const files = response.Contents
        .filter(item => item.Key && item.Key !== folderPrefix && !item.Key.endsWith('.html'))
        .map(item => {
          // Safe access with defaults
          const key = item.Key || '';
          return {
            name: key.replace(folderPrefix, ''),
            size: item.Size || 0,
            lastModified: item.LastModified || new Date(),
            url: `https://${CLOUDFRONT_DOMAIN}/${key}`
          };
        })
        .sort((a, b) => {
          if (a.lastModified > b.lastModified) return -1;
          if (a.lastModified < b.lastModified) return 1;
          return 0;
        });

      // Generate HTML
      const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Files for ${customer}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="all">
    <meta name="googlebot" content="all">
    <meta http-equiv="X-Robots-Tag" content="all">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <style>
        :root {
            --primary-color: #0066cc;
            --background-color: #f8f9fa;
            --border-color: #e9ecef;
            --text-color: #333;
            --metadata-color: #666;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 2rem;
            color: var(--text-color);
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 1rem;
            margin-bottom: 2rem;
        }

        .summary {
            background: var(--background-color);
            padding: 0.5rem 1rem;
            border-radius: 4px;
            display: inline-block;
            margin-top: 1rem;
        }

        .file-list {
            list-style-type: none;
            padding: 0;
        }

        .file-item {
            margin: 1rem 0;
            padding: 1rem;
            background: var(--background-color);
            border-radius: 6px;
            border: 1px solid var(--border-color);
            transition: transform 0.2s ease-in-out;
        }

        .file-item:hover {
            transform: translateX(5px);
        }

        .file-link {
            color: var(--primary-color);
            text-decoration: none;
            font-weight: 500;
        }

        .file-link:hover {
            text-decoration: underline;
        }

        .file-metadata {
            color: var(--metadata-color);
            font-size: 0.9em;
            margin-top: 0.5rem;
        }

        .last-updated {
            font-size: 0.9em;
            color: var(--metadata-color);
            margin-top: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Files for ${customer}</h1>
            <div class="summary">
                Total files: ${files.length}
            </div>
            <div class="last-updated">
                Last updated: ${new Date().toLocaleString()}
            </div>
        </div>
        <ul class="file-list">
            ${files.map(file => `
                <li class="file-item">
                    <a href="${file.url}" class="file-link" target='_blank'>
                        ${file.name}
                    </a>
                    <div class="file-metadata">
                        Size: ${formatSize(file.size)} | 
                        Last Modified: ${new Date(file.lastModified).toLocaleString()}
                    </div>
                </li>
            `).join('')}
        </ul>
    </div>
</body>
</html>`;

      // Upload HTML file to S3
      const indexFileName = `${folderPath}/index.html`;
      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: indexFileName,
        Body: html,
        ContentType: 'text/html',
        CacheControl: 'max-age=300' // 5 minutes cache
      });

      await s3Client.send(putCommand);
      const robotsTxt = `
      User-agent: *
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
      Disallow: /private/
      `;

      const robotsCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${folderPath}/robots.txt`,
        Body: robotsTxt,
        ContentType: 'text/plain'
      });

await s3Client.send(robotsCommand);
      // Return the URL to the index file
      const indexUrl = `https://${CLOUDFRONT_DOMAIN}/${indexFileName}`;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          indexUrl,
          fileCount: files.length
        })
      };
    }

    // Unknown action
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Invalid action specified' })
    };
  } catch (error: any) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      },
      body: JSON.stringify({ message: 'Internal server error', error: error.message })
    };
  }
};
