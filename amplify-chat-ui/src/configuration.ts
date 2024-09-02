import { Configuration, QchatConfiguration } from "./_interfaces"

// When adding non-string values, do not forget to
// parse them in `parseSearchParams` function in `App.tsx`
export const defaultConfiguration: Configuration = {
  token:
    "",
  color: "15BE6C",
  popupIcon: "", // if empty, /images/popup/icon-default.svg will be used
  popupMessage: "Experience <b>Amazon Bedrock powered</b> search!",
  addUnreadDot: true,
  whitelabel: false,
  lang: "en-US",
  windowHeading: "Chat with Amazon Bedrock",
  welcomeMessage: "👋 Hi! Ask me anything...",
  bottomIndent: 24,
  rightIndent: 24,
  zIndex: 99999,
  buttonSize: 64,
  bedrockEngine: false,
  streamGetAnswer: true
} 


export const defaultQchatConfiguration: QchatConfiguration = {
  token:
    "",
  apiUrl: import.meta.env.VITE_APIGW_ENDPOINT || '', //Used for Like/Dislike API calls
  apiStreamingUrl: import.meta.env.VITE_STREAMING_API_ENDPOINT || '' , //Used for Streaming Chat Response (default)
  apiVersion: "v2",
  streamGetAnswer: true,
  sourcePattern: "{ *doc_idx *: *([^}]*)}",
}
