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
            // Regular expression to validate URL format
            const regex = /^(https:\/\/)([a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+.*)$/;
            // Test the URL against the regex
            return regex.test(url);
          }
          //var myWebsiteRegEx = /^(https:\/\/)([a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+.*)$/
          //var isValidWebsite = !myWebsiteRegEx.test(value);
          //console.log("*****: " + isValidWebsite)
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
      }}
      onSubmit={(fields: any): any => {
        const updatedFields: any = {};
        Object.keys(fields).forEach((key) => {
          if (typeof fields[key] === "string") {
            updatedFields[key] = fields[key].trim();
          } else {
            updatedFields[key] = fields[key];
          }
        });

        //add additional fields
        updatedFields.qchatform_status = "Submitted";
        updatedFields.requester_email = emailId;
        updatedFields.chatbotname =
          updatedFields.chatbotname || default_chatbot;
        updatedFields.initial_text =
          updatedFields.initial_text || default_initial_text;
        updatedFields.guardrails =
          updatedFields.guardrails || default_guardrails;
        return updatedFields;
      }}
      overrides={{
        customer: {
          placeholder:
            "Enter the name of Customer in short without spaces. For example: AWS",
          label: "Customer name (required)",
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
      }}
    />
  );
}
