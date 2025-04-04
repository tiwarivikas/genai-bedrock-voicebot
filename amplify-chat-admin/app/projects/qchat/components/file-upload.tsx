// app/projects/qchat/components/file-upload.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Button, Card, Flex, Heading, Text, View, 
  Alert, Loader, Badge
} from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useSearchParams } from 'next/navigation'; 
import config from "@/amplify_outputs.json";
import { toast } from "sonner";

export default function FileUploadPage() {
  const searchParams = useSearchParams(); 
  const customerFromUrl = searchParams.get('customer'); 
  
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [indexGenerating, setIndexGenerating] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState('');
  const [indexUrl, setIndexUrl] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [authToken, setAuthToken] = useState('');
  const endpoint_url = (config as any).custom.apiExecuteStepFnEndpoint;
  
  useEffect(() => {
    // Get the customer name from searchParams
    if (customerFromUrl) {
      setCustomerName(customerFromUrl);
    }
    
    // Get the auth token for API calls
    async function getAuthSession() {
      try {
        const { idToken } = (await fetchAuthSession()).tokens ?? {};
        if (idToken) {
            setAuthToken(`Bearer ${idToken.toString()}`);
        } else {
          throw new Error('No ID token available');
        }
      } catch (error) {
        console.error('Error getting auth session:', error);
        setError('Authentication error. Please sign in and try again.');
        toast.error('Authentication error. Please sign in and try again.');
      }
    }
    
    getAuthSession();
  }, [customerFromUrl]); 
  
  const generateFolderPath = () => {
    const today = new Date().toISOString().split('T')[0]; 
    return `uploads/${customerName || 'temp'}/${today}`;
  };
  
  const handleUpload = async () => {
    if (!files.length) {
      setError('Please select at least one file to upload');
      toast.error('Please select at least one file to upload');
      return;
    }
    
    if (!customerName) {
      setError('Customer name is required. Please enter a name.');
      toast.error('Customer name is required.');
      return;
    }
    
    setUploading(true);
    setError('');
    
    try {
      // Step 1: Get presigned URLs for each file
      const fileInfos = files.map(file => ({
        name: file.name.replace(/\s+/g, '_'),
        type: file.type,
        size: file.size
      }));
      
      toast('Preparing upload...');
      
      // Get presigned URLs 
      const presignedUrlsResponse = await fetch(`${endpoint_url}presignedUrls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer: customerName,
          files: fileInfos
        })
      });
      
      if (!presignedUrlsResponse.ok) {
        throw new Error(`Failed to get upload URLs: ${presignedUrlsResponse.statusText}`);
      }
      
      const presignedData = await presignedUrlsResponse.json();
      
      // Step 2: Upload files using the presigned URLs
      toast(`Uploading ${files.length} files...`);
      
      const uploadPromises = presignedData.presignedUrls.map(async (presigned, index) => {
        const file = files[index];
        
        const uploadResponse = await fetch(presigned.url, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file
        });
        
        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}: ${uploadResponse.statusText}`);
        }
        
        return presigned.key;
      });
      
      await Promise.all(uploadPromises);
      setUploadComplete(true);
      toast.success('Files uploaded successfully!');
      
      // Step 3: Generate index
      await generateIndex(presignedData.folderPath);
      
    } catch (err: any) {
      console.error('Error uploading files:', err);
      setError(`Error uploading files: ${err.message || 'Unknown error'}`);
      toast.error(`Upload error: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };
  
  const generateIndex = async (folderPath: string) => {
    if (!authToken) {
      setError('Authentication error. Please sign in and try again.');
      return;
    }
    
    setIndexGenerating(true);
    toast('Generating file index...');
    
    try {
      
      const response = await fetch(`${endpoint_url}fileManager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'generateIndex',
          customer: customerName,
          folder: folderPath
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate index: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.indexUrl) {
        setIndexUrl(data.indexUrl);
        toast.success('Index generated successfully!');
      } else {
        throw new Error(data.message || 'Failed to generate index');
      }
    } catch (err: any) {
      console.error('Error generating index:', err);
      setError(`Error generating file index: ${err.message || 'Unknown error'}`);
      toast.error(`Index generation error: ${err.message || 'Unknown error'}`);
    } finally {
      setIndexGenerating(false);
    }
  };

  // Handle file selection using standard input
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      
      // Validate file size
      const oversizedFiles = fileList.filter(file => file.size > 25 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast.error(`Some files exceed the 25MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }
      
      // Limit number of files
      if (fileList.length > 20) {
        toast.error('Maximum 20 files allowed per upload');
        return;
      }
      
      setFiles(prev => [...prev, ...fileList]);
    }
  };

  // Remove a file from the selection
  const removeFile = (fileToRemove: File) => {
    setFiles(files.filter(file => file !== fileToRemove));
  };
  
  return (
    <Card variation="elevated" padding="2rem" maxWidth="800px" margin="2rem auto">
      <Heading level={3} marginBottom="1rem">Upload Files for QChat</Heading>
      
      <Text variation="secondary" marginBottom="1.5rem">
        Files uploaded here will be processed and indexed for your QChat application.
        The generated URL can be used as a website to be crawled in the QChat form.
      </Text>
      
      {/* File type guidance */}
      <Card marginBottom="1.5rem" backgroundColor="rgba(0, 0, 0, 0.03)" padding="1rem">
        <Heading level={5} marginBottom="0.5rem">Supported File Types</Heading>
        <Text fontSize="small">
          For best results with QChat, upload the following file types:
        </Text>
        <Flex direction="row" wrap="wrap" gap="0.5rem" marginTop="0.5rem">
          <Badge size="small" variation="info">PDF (.pdf)</Badge>
          <Badge size="small" variation="info">Word (.doc, .docx)</Badge>
          <Badge size="small" variation="info">Text (.txt)</Badge>
          <Badge size="small" variation="info">Markdown (.md)</Badge>
          <Badge size="small" variation="info">HTML (.html)</Badge>
          <Badge size="small" variation="info">Excel (.xls, .xlsx)</Badge>
          <Badge size="small" variation="info">PowerPoint (.ppt, .pptx)</Badge>
          <Badge size="small" variation="info">CSV (.csv)</Badge>
        </Flex>
        <Text fontSize="small" marginTop="0.5rem">
          Each file must be under 25MB. Maximum 20 files per upload.
        </Text>
      </Card>
      
      {/* Customer name input if not provided in URL */}
    {!customerFromUrl && (  
        <View marginBottom="1.5rem">
        <Text fontWeight="bold" marginBottom="0.5rem">Customer Name (required)</Text>
        <Flex direction="column" gap="0.5rem">
            <input 
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
            placeholder="Enter customer name (alphanumeric, no spaces)"
            style={{
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                width: '100%'
            }}
            />
            <Text fontSize="small" color="gray.500">
            Use only letters, numbers, and hyphens, no spaces
            </Text>
        </Flex>
        </View>
    )}
        
      {/* File upload section using standard input */}
      <View marginBottom="2rem">
        <Text fontWeight="bold" marginBottom="0.5rem">Upload Files</Text>
        <Flex direction="column" gap="0.5rem">
          <input
            type="file"
            onChange={handleFileSelection}
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.csv,.ppt,.pptx,.xls,.xlsx,.html"
            style={{
              padding: '0.5rem',
              border: '1px dashed #ccc',
              borderRadius: '4px',
              width: '100%'
            }}
          />
          <Text fontSize="small" color="gray.500">
            Select up to 20 files, 25MB maximum per file
          </Text>
        </Flex>
      </View>
      
      {/* File list */}
      {files.length > 0 && (
        <View marginBottom="2rem">
          <Text fontWeight="bold" marginBottom="0.5rem">Selected Files ({files.length})</Text>
          <Flex direction="column" gap="0.5rem">
            {files.map((file, index) => (
              <Flex 
                key={index}
                justifyContent="space-between"
                alignItems="center" 
                padding="0.5rem"
                backgroundColor="rgba(0,0,0,0.05)"
                borderRadius="medium"
              >
                <Text>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </Text>
                <Button 
                  onClick={() => removeFile(file)}
                  size="small"
                  variation="link"
                >
                  Remove
                </Button>
              </Flex>
            ))}
          </Flex>
        </View>
      )}
      
      {error && (
        <Alert variation="error" marginBottom="1.5rem">
          {error}
        </Alert>
      )}
      
      {/* Upload button */}
      <Flex justifyContent="space-between" marginTop="1.5rem">
        <Button onClick={() => window.close()}>Cancel</Button>
        <Button
          variation="primary"
          onClick={handleUpload}
          isDisabled={uploading || indexGenerating || uploadComplete || files.length === 0 || !customerName}
        >
          {uploading ? <Loader size="small" /> : 'Upload Files and Generate Index'}
        </Button>
      </Flex>
      
      {/* Results section */}
      {uploadComplete && (
  <Card marginTop="2rem" padding="1.5rem" backgroundColor="rgba(232, 245, 233, 0.4)" borderRadius="medium">
    <Heading level={5} marginBottom="1rem">Upload Complete!</Heading>
    
    {indexGenerating ? (
      <Flex direction="row" alignItems="center" gap="0.5rem">
        <Loader size="small" />
        <Text>Generating file index...</Text>
      </Flex>
    ) : indexUrl ? (
      <>
        <Text marginBottom="1rem">Your files have been uploaded successfully. You can now use this URL in the Website field:</Text>
        <View 
          backgroundColor="rgba(0, 0, 0, 0.05)" 
          padding="1rem" 
          borderRadius="medium"
          marginBottom="1.5rem"
        >
          <Text fontFamily="monospace" fontSize="0.9rem" style={{ wordBreak: "break-word" }}>
            {indexUrl}
          </Text>
        </View>
        <Flex justifyContent="space-between">
          <Button 
            onClick={() => {
              navigator.clipboard.writeText(indexUrl);
              toast.success('URL copied to clipboard!');
            }}
          >
            Copy URL
          </Button>
          <Button 
            variation="primary"
            onClick={() => {
              if (window.opener && typeof window.opener.postMessage === 'function') {
                window.opener.postMessage({ type: 'FILE_UPLOAD_SUCCESS', url: indexUrl }, '*');
              }
              window.close();
            }}
          >
            Use this URL & Close
          </Button>
        </Flex>
      </>
    ) : (
      <Flex direction="column" alignItems="center" gap="0.5rem">
        <Text>Index generation failed. Please try again.</Text>
        <Button onClick={() => generateIndex(generateFolderPath())}>
          Retry Generate Index
        </Button>
      </Flex>
    )}
  </Card>
)}
    </Card>
  );
}
