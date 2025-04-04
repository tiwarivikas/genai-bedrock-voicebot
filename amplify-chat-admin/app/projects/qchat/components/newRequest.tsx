import { Schema } from "@/amplify/data/resource";
import QChatRequestCreateForm, {
  QChatRequestCreateFormInputValues,
} from "@/ui-components/QChatRequestCreateForm";
import { useUser } from "../../UserContext";

const default_chatbot = "QChat";
const default_initial_text = "Hello, I am QChat. How can I help you?";
const default_guardrails =
  "You are a polite and honest chatbot, who responds to queries with empathy.";

export default function NewRequest({
  handleSubmission,
}: {
  handleSubmission: any;
}) {
  const { emailId } = useUser();
  const OPENAPI_SCHEMA_CREATOR_URL = 'https://console.harmony.a2z.com/internal-ai-assistant?persona=2079b900-1109-4318-96ef-3eaffbb67f02'; // Cedric URL
  
  return (
    <QChatRequestCreateForm
      onSuccess={(payload) => handleSubmission(payload)}
      onValidate={{
        customer: (value, validationResponse) => {
          var myRegEx = /[^a-z\d-]/i;
          var isValid = !myRegEx.test(value);
          if (!isValid) {
            return {
              hasError: true,
              errorMessage: "Customer name must be alphanumeric without space.",
            };
          }
          return validationResponse;
        },
        website: (value, validationResponse) => {
          function isValidURL(url) {
            const regex = /^(https:\/\/)([a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+.*)$/;
            return regex.test(url);
          }
          if (!isValidURL(value)) {
            return {
              hasError: true,
              errorMessage: "Please enter a proper website starting with https://",
            };
          }
          return validationResponse;
        },
        acceptTnC: (value, validationResponse) => {
          if (!value) {
            return {
              hasError: true,
              errorMessage: "You must accept the terms and conditions.",
            };
          }
          return validationResponse;
        },
        // Add validation for agent fields
        agentDescription: (value, validationResponse, context) => {
          if (context?.useAgent && (!value || value.trim() === "")) {
            return {
              hasError: true,
              errorMessage: "Agent description is required when using Bedrock Agent",
            };
          }
          return validationResponse;
        },
        openApiSchema: (value, validationResponse, context) => {
          if (!context?.useAgent) {
            return validationResponse;
          }
        
          if (!value) {
            return {
              hasError: true,
              errorMessage: "OpenAPI Schema is required when using Bedrock Agent",
            };
          }
        
          return validationResponse;
        },
      }}
      onSubmit={(fields: QChatRequestCreateFormInputValues): any => {
        const updatedFields: any = {};
        Object.keys(fields).forEach((key) => {
          // For all fields, just trim strings and pass through other values
          if (typeof fields[key] === "string") {
            updatedFields[key] = fields[key].trim();
          } else {
            updatedFields[key] = fields[key];
          }
        });

        // Add additional fields
        updatedFields.qchatform_status = "Submitted";
        updatedFields.requester_email = emailId;
        updatedFields.chatbotname = updatedFields.chatbotname || default_chatbot;
        updatedFields.initial_text = updatedFields.initial_text || default_initial_text;
        updatedFields.guardrails = updatedFields.guardrails || default_guardrails;

        // Handle agent-specific fields
        if (updatedFields.useAgent) {
          if (!updatedFields.agentDescription) {
            throw new Error("Agent Description is required when using Bedrock Agent");
          }
        } else {
          // If not using agent, remove agent-related fields
          delete updatedFields.agentDescription;
          delete updatedFields.openApiSchema;
        }
      
        return updatedFields;
      }}
      overrides={{
        customer: {
          placeholder: "Enter the name of Customer in short without spaces. For example: AWS",
          label: "Customer name (required)",
        },
        websiteContainer: {
          style: { gap: "8px" }
        },
        uploadFilesButton: {
          onClick: () => {
            
            const customerInput = document.querySelector('input[name="customer"]') as HTMLInputElement;
            const customerName = customerInput?.value || "";
            const origin = window.location.origin;
            const uploadUrl = `${origin}/projects/qchat/file-upload?customer=${encodeURIComponent(customerName)}`;
            window.open(uploadUrl, '_blank');
          },
          children: "Upload Files →"
        },
        website: {
          label: "Website URL to be crawled and indexed (required)",
          placeholder: "https://www.example.com",
        },
        additional_sites: {
          placeholder: "https://www.example.com",
          label: "Additional Sites (optional)",
        },
        chatbotname: {
          placeholder: default_chatbot,
          label: "Chatbot Name (optional)",
        },
        chatbot_logo_url: {
          placeholder: "https://www.example.com/logo.png",
          label: "Chatbot Logo URL (optional)",
        },
        initial_text: {
          placeholder: default_initial_text,
          label: "Initial Chat message to be displayed (optional)",
        },
        guardrails: {
          label: "Guardrails (optional)",
          placeholder: default_guardrails,
        },
        useAgent: {
          label: "Use Bedrock Agent instead of direct Bedrock",
        },
        agentDescription: {
          placeholder: "Describe what your agent should do...",
          label: "Agent Description (required when using Bedrock Agent)",
        },
        openApiSchema: {
          placeholder: "Paste your OpenAPI Schema in JSON format",
          label: "OpenAPI Schema (required when using Bedrock Agent)",
        },
        createSchemaButton: {
          onClick: () => window.open(OPENAPI_SCHEMA_CREATOR_URL, '_blank'),
          children: "Create OpenAPI Schema →"
        },
        openApiSchemaContainer: {
          style: {
            gap: "8px"
          }
        }
      }}
    />
  );
}
