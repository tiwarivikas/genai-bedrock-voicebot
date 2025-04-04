"use client";

import { useState } from "react";
import type { Schema } from "@/amplify/data/resource";
import QChatListRequests from "./components/listRequests";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import NewRequest from "./components/newRequest";
import config from "@/amplify_outputs.json";
import { fetchAuthSession } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import { toast } from "sonner";

export default function Page() {
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState([""]);

  const queryClient = useQueryClient();
  const handleSubmission = async function (payload: any) {
    const id = payload.id;
    setIsSubmitting(true);
    setProgress(30);
    setProgressMessage(["Request Submitted...", ...progressMessage]);
    toast("Request submitted... 👍 ");
  
    try {
      const { idToken } = (await fetchAuthSession()).tokens ?? {};
      const endpoint_url = config.custom.apiExecuteStepFnEndpoint;
  
      setProgress(60);
      setProgressMessage([
        `Creating Kendra Data Source... ⏳`,
        ...progressMessage,
      ]);
      console.log('Original payload.openApiSchema:', payload.openApiSchema);

    // Just pass the schema as-is
    const requestBody = {
      ...payload,
      openApiSchema: payload.useAgent ? payload.openApiSchema : undefined
    };

    console.log('Final request body:', requestBody);


    const requestOptions: any = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: idToken,
      },
      body: JSON.stringify(requestBody)
    };
  
      console.log('Request body being sent:', JSON.parse(requestOptions.body)); // Debug log
  
      const response = await fetch(
        `${endpoint_url}createBRApp`,
        requestOptions
      );
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
  
      if (!data.applicationIdQ) {
        throw new Error('No applicationIdQ received in response');
      }
  
      // Update database with initial results
      const client = generateClient<Schema>();
      await client.models.QChatRequest.update({
        qchatform_status: "Completed",
        applicationIdQ: data.applicationIdQ,
        token: data.publicURL || data.token,
        id: id,
        useAgent: payload.useAgent,
        bot_status: payload.useAgent ? 'IN_PROGRESS' : 'Active'
      });
  
      // Success handling
      setProgress(100);
      if (payload.useAgent) {
        setProgressMessage([
          "Kendra Data Source created. Agent creation started...", 
          ...progressMessage
        ]);
        toast("Kendra Data Source created. Agent creation in progress... 🔄");
      } else {
        setProgressMessage([
          "Kendra Data Source created successfully.", 
          ...progressMessage
        ]);
        toast("Kendra Data Source created successfully! 😎");
      }
      
      // Reset state
      setIsCreatingForm(false);
      queryClient.invalidateQueries({ queryKey: ["listQChatRequests"] });
      setProgress(0);
      setProgressMessage([]);
      setIsSubmitting(false);
  
    } catch (err) {
      console.error('Submission error:', err);
      let errorMessage = 'An unexpected error occurred';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      toast.error(`❌ Error: ${errorMessage}`);
      setProgress(0);
      setProgressMessage([`Error: ${errorMessage}`, ...progressMessage]);
      setIsCreatingForm(false);
      setIsSubmitting(false);
    }
  };

  const handleOnCancel = async function () {
    setIsCreatingForm(false);
  };

  return (
    <main>
      <div className="hidden md:block sm:text-lg md:text-2xl text-bold bg-blue-600 text-white p-8 rounded-lg w-full mb-4 sm:mb-2 sm:p-2">
        White-labeled Chatbots powered by Amazon Bedrock and Kendra!
      </div>
      {isCreatingForm ? (
        <>
          <Button variant={"link"} onClick={handleOnCancel} className="m-4">
            ← Go Back
          </Button>
          {isSubmitting ? (
            <>
              <Progress
                className="mt-24 ml-4 w-5/6 items-center "
                value={progress}
              />
              <div className="container items-center mt-12 ml-20">
                {progressMessage.map((msg) => (
                  <p className="text-xl" key={msg}>
                    {msg}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <NewRequest handleSubmission={handleSubmission} />
          )}
        </>
      ) : (
        <QChatListRequests onNewFormRequest={() => setIsCreatingForm(true)} />
      )}
    </main>
  );
}