import Chat from "./Chat"
import PopupButton from "./PopupButton"
import { Configuration, MessageType, QchatConfiguration } from "./_interfaces"
import QchatApi from "./_lib/api"
import { defaultConfiguration, defaultQchatConfiguration } from "./configuration"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

const mobileWindowWidthThreshold = 450

function parseSearchParams(params: { [k: string]: string }): Partial<Configuration> {
  const parsed: Partial<Configuration> = { ...params }
  if (params.whitelabel !== undefined) parsed.whitelabel = params.whitelabel.toLowerCase() === "true"
  if (params.addUnreadDot !== undefined) parsed.addUnreadDot = params.addUnreadDot.toLowerCase() === "true"
  if (params.bottomIndent !== undefined) parsed.bottomIndent = parseInt(params.bottomIndent)
  if (params.rightIndent !== undefined) parsed.rightIndent = parseInt(params.rightIndent)
  if (params.zIndex !== undefined) parsed.zIndex = parseInt(params.zIndex)
  if (params.buttonSize !== undefined) parsed.buttonSize = parseInt(params.buttonSize)
  if (params.bedrockEngine !== undefined) parsed.bedrockEngine = params.bedrockEngine.toLowerCase() === "true"
  if (params.streamGetAnswer !== undefined) parsed.streamGetAnswer = params.streamGetAnswer.toLowerCase() === "true"
  return parsed
}

export default function App() {
  // State of Chat component live here to save it
  // during collapses
  const [searchParams, _setSearchParams] = useSearchParams()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<MessageType[]>([])
  const [composeValue, setComposeValue] = useState("")
  const [isMessageLoading, setIsMessageLoading] = useState(false)
  //const [isBedrockEngine, setIsBedrockEngine] = useState(false)
  
  const configuration: Configuration = {
    ...defaultConfiguration,
    ...parseSearchParams(Object.fromEntries(window.qchatQueryParams ? window.qchatQueryParams : searchParams)),
  }

  function parseJwt (token:any) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}
const tokenVars = parseJwt(configuration.token);
configuration.windowHeading= "Chat with "+ tokenVars.chatbotname;
configuration.welcomeMessage = `"Hello! My name is <b>${tokenVars.chatbotname}</b>, an AI assistant of <a href='${tokenVars.website}'>${tokenVars.customer}</a>.`;
  /* {token:
  "",
color: "15BE6C",
popupIcon: "", // if empty, /images/popup/icon-default.svg will be used
popupMessage: "Experience <b>Amazon Q powered</b> search!",
addUnreadDot: true,
whitelabel: false,
lang: "en-US",
windowHeading: "Chat with Amazon Q",
welcomeMessage: "👋 Hi! Ask me anything...",
bottomIndent: 24,
rightIndent: 24,
zIndex: 99999,
buttonSize: 64,
} */
//configuration

  const qchatConfiguration: QchatConfiguration = {
    ...defaultQchatConfiguration,
    token: configuration.token,
    streamGetAnswer: configuration.streamGetAnswer || true
  }

  const qchatAPI = new QchatApi({ qchatConfiguration })

  const messagesInitialState: MessageType[] = [{ role: "assistant", content: configuration.welcomeMessage , lang: configuration.lang}]

  function handleResize() {
    setIsMobile(window.innerWidth < mobileWindowWidthThreshold)
  }

  function handleClearConversation() {
    setMessages(messagesInitialState)
    localStorage.setItem(`qchat-chat-history-${configuration.token}`, JSON.stringify(messagesInitialState))
  }

  useEffect(() => {
    // console.log("QChat chat pop-up configuration:", configuration)

    const messagesHistory = localStorage.getItem(`qchat-chat-history-${configuration.token}`)
    if (messagesHistory) {
      setMessages(JSON.parse(messagesHistory))
    } else {
      setMessages(messagesInitialState)
    }

    if (!localStorage.getItem(`qchat-has-interacted-${configuration.token}`)) {
      setHasInteracted(false)
    }

    handleResize()
    window.addEventListener("resize", () => handleResize())
    return () => {
      window.removeEventListener("resize", () => handleResize())
    }
  }, [])

  return (
    <>
      {configuration.token && (isCollapsed || !isMobile) && (
        <PopupButton
          configuration={configuration}
          qchatAPI={qchatAPI}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          hasInteracted={hasInteracted}
          setHasInteracted={setHasInteracted}
        />
      )}
      {configuration.token && !isCollapsed && (
        <Chat
          configuration={configuration}
          qchatAPI={qchatAPI}
          setIsCollapsed={setIsCollapsed}
          isMobile={isMobile}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          messages={messages}
          setMessages={setMessages}
          composeValue={composeValue}
          setComposeValue={setComposeValue}
          isMessageLoading={isMessageLoading}
          setIsMessageLoading={setIsMessageLoading}
          handleClearConversation={handleClearConversation}
        />
      )}
    </>
  )
}
