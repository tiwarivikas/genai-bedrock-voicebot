//import TranslationImpl from "../_impl/bhashini/TranslationImpl";
import { Configuration, MessageType } from "../_interfaces"
import QchatApi from "../_lib/api"
import { useAudio } from "../context/useAudioContext"
import Compose from "./Compose"
import Footer from "./Footer"
import Header from "./Header"
import Message from "./Message"
import styles from "./styles.module.css"
//import localizations from "../_lib/localization"
import { EventSourcePolyfill } from "event-source-polyfill"
import { FormEvent, useEffect, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"

const chatScreenIndent = 20

export default function Chat({
  configuration,
  qchatAPI,
  setIsCollapsed,
  isMobile,
  isExpanded,
  setIsExpanded,
  messages,
  setMessages,
  composeValue,
  setComposeValue,
  isMessageLoading,
  setIsMessageLoading,
  handleClearConversation,
}: {
  configuration: Configuration
  qchatAPI: QchatApi
  setIsCollapsed: (value: boolean) => void
  isMobile: boolean
  isExpanded: boolean
  setIsExpanded: (value: boolean) => void
  messages: MessageType[]
  setMessages: (value: MessageType[]) => void
  composeValue: string
  setComposeValue: (value: string) => void
  isMessageLoading: boolean
  setIsMessageLoading: (value: boolean) => void
  handleClearConversation: () => void
}) {
  //const regexPattern = new RegExp(qchatAPI.sourcePattern)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [conversation, setConversation] = useState<ChatInput>({
    conversationId: "",
    parentMessageId: "",
    userMessage: "",
    clientToken: "",
  })

  const sourceRef = useRef<any>(null)

  const { startListening, isSpeakerEnabled, speaking, dispatch, translationLanguage } = useAudio()

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (sourceRef.current && !speaking) {
      sourceRef.current.stop()
      //sourceRef.current = null; // Clean up the reference
      console.log("Audio stopped")
    }
  }, [speaking])

  function scrollToBottom() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  function handleCollapseButtonClick() {
    setIsCollapsed(true)
  }

  function handleResizeClick() {
    setIsExpanded(!isExpanded)
  }

  /*   function checkForHumanHelp(messageText: string) {
      if (messageText.includes("live") && messageText.includes("agent")) {
        return true
      }
      return false
    } */
  type ChatInput = {
    conversationId: string | undefined
    parentMessageId: string | undefined
    userMessage: string | undefined
    clientToken: string | undefined
  }

  type ChatResponse = {
    conversationId: string | undefined
    failedAttachments: string[] | undefined
    sourceAttributions: { title: string; url: string }[] | undefined
    systemMessage: string
    systemMessageId: string | undefined
    userMessageId: string | undefined
  }
  async function handleSubmitUserMessage(event: FormEvent<HTMLFormElement>) {
    console.log("handleSubmitUserMessage ", composeValue)

    if (event instanceof Object) {
      event.preventDefault()
    }

    let defLang = translationLanguage === "" ? "en" : translationLanguage

    let englishText = composeValue

    /*     if (defLang !== "en") {
      console.log("not gettng english, but ", defLang)

      englishText = await new TranslationImpl().translateWithBhashini(qchatAPI, defLang, "en", composeValue)
      console.log(composeValue, defLang, englishText)
      composeValue = englishText == composeValue ? "" : composeValue + "<br/>"
    } else {
      console.log("getting english lang", composeValue)
      composeValue = ""
    } */
    composeValue = ""

    setConversation({ ...conversation, userMessage: englishText })
    const inputObj = { ...conversation, userMessage: englishText, clientToken: uuidv4() }
    const newMessagesUser: MessageType[] = [
      ...messages,
      { role: "user", content: composeValue + englishText, lang: defLang },
    ]
    const newMessagesAssistant: MessageType[] = [...newMessagesUser, { role: "assistant", content: "", lang: defLang }]
    setComposeValue("")
    setMessages(newMessagesAssistant)
    setIsMessageLoading(true)

    let completeAnswer = ""

    const answerStream = await qchatAPI.getAnswer({
      chat: inputObj,
      bedrockEngine: configuration.bedrockEngine,
      isSpeakerEnabled,
      translationLanguage,
    })

    async function setConversationFinalMessage(outputResponse: ChatResponse) {
      let outResponseText: string = outputResponse.systemMessage
      if (outputResponse.sourceAttributions && outputResponse.sourceAttributions?.length > 0) {
        outResponseText = outResponseText + "<br /> <b>Sources:</b> <p>"
        outResponseText =
          outResponseText +
          outputResponse.sourceAttributions
            .map((source: any, index) => {
              const tmpValue = ` ${index + 1}.<a href="${source.url}" target="_blank">${source.title}</a>`
              return tmpValue
            })
            .toString() +
          "</p>"
      }

      setConversation({
        ...conversation,
        parentMessageId: outputResponse.systemMessageId,
        conversationId: outputResponse.conversationId,
        userMessage: "",
      })
      const outputMessagesAssistant: MessageType[] = [
        ...newMessagesUser,
        { role: "assistant", content: outResponseText, lang: "en", requestId: outputResponse.systemMessageId },
      ]
      setIsMessageLoading(false)
      setMessages(outputMessagesAssistant)
      /* if (translationLanguage !== "") {
        setIsMessageLoading(true)
        const translatedText = await new TranslationImpl().translateWithBhashini(
          qchatAPI,
          "en",
          translationLanguage,
          outputResponse.systemMessage,
        )
        setMessages([
          ...outputMessagesAssistant,
          { role: "assistant", content: translatedText, lang: translationLanguage },
        ])
        setIsMessageLoading(false)
      } */
    }

    async function setConversationPartialMessage(systemMessage: string) {
      let outResponseText: string = systemMessage
      const outputMessagesAssistant: MessageType[] = [
        ...newMessagesUser,
        { role: "assistant", content: outResponseText, lang: "en", requestId: "TMP" },
      ]
      setMessages(outputMessagesAssistant)
    }

    if (answerStream instanceof EventSourcePolyfill) {
      let currentResponse = ""
      let blnResponseComplete: boolean = false
      let blnResponseStart: boolean = false
      let blnAudioStart: boolean = false

      const audioChunks: any = []
      const audioContext = new window.AudioContext()

      answerStream.addEventListener("open", (_event) => {
        try {
        } catch (e) {
          console.log("Error on 'open' event of 'getAnswer':", e)
        }
      })
      answerStream.addEventListener("message", async (event) => {
        switch (event.data) {
          case "[START]":
            blnResponseStart = true
            break
          case "[COMPLETE]":
            blnResponseComplete = true
            console.log("Stream completed")
            break
          case "[END]":
            answerStream.close()
            break
          case "[AUDIO]":
            blnAudioStart = true
            break
          default:
            if (blnResponseComplete) {
              setConversationFinalMessage(JSON.parse(event.data))
              blnResponseComplete = false
              blnResponseStart = false
            } else if (blnResponseStart) {
              try {
                const data = currentResponse + event.data
                currentResponse = data
                setConversationPartialMessage(data)
              } catch (error) {
                console.error("Exception:", error)
              }
            } else if (blnAudioStart) {
              const audioData = Uint8Array.from(atob(event.data), (c) => c.charCodeAt(0)).buffer
              audioChunks.push(audioData)
            }
        }
      })

      // Helper function to concatenate multiple ArrayBuffers
      const concatArrayBuffers = (buffers: any) => {
        let totalLength = buffers.reduce((acc: any, buf: any) => acc + buf.byteLength, 0)
        let tempBuffer = new Uint8Array(totalLength)
        let offset = 0
        buffers.forEach((buf: any) => {
          tempBuffer.set(new Uint8Array(buf), offset)
          offset += buf.byteLength
        })
        return tempBuffer.buffer
      }

      answerStream.addEventListener("end", async () => {
        answerStream.close()

        if (blnAudioStart) {
          // Concatenate all audio chunks
          const audioBuffer = await audioContext.decodeAudioData(concatArrayBuffers(audioChunks))
          dispatch({ type: "START_SPEAKING" })

          // Play the concatenated audio
          const source = audioContext.createBufferSource()
          source.buffer = audioBuffer
          source.connect(audioContext.destination)
          source.start(0)
          // Store the source in a ref to stop it later
          sourceRef.current = source

          // Attach the onended event listener
          source.onended = () => {
            console.log("Audio playback finished")
            startListening()
            dispatch({ type: "STOP_SPEAKING" })
            // Clean up the reference when the audio ends
            sourceRef.current = null
          }
          blnAudioStart = false
        } else {
          startListening()
          //dispatch({ type: "TOGGLE_LISTENING" });
        }
      })

      answerStream.addEventListener("error", (_event) => {
        let newMessages: MessageType[] = [...newMessagesAssistant]
        if (!completeAnswer) {
          newMessages[newMessagesAssistant.length - 1].content =
            "An error has occurred in retrieving the response from server. Please try again."
          setMessages(newMessages)
        } else {
          newMessages[newMessagesAssistant.length - 1].content = completeAnswer
        }
        setIsMessageLoading(false)
        answerStream.close()
        localStorage.setItem(`qchat-chat-history-${configuration.token}`, JSON.stringify(newMessages))
        setTimeout(() => {
          scrollToBottom()
        }, 25)
      })
    } else {
      const outputResponse: ChatResponse = { ...answerStream.data }
      setConversationFinalMessage(outputResponse)
    }
  }

  return (
    <div
      className={`${styles.chat} ${
        isMobile
          ? styles.chatMobile
          : `${styles.chatDesktop} ${isExpanded ? styles.chatDesktopExpanded : styles.chatDesktopNormal}`
      }`}
      style={{
        bottom: isMobile ? 0 : configuration.bottomIndent + configuration.buttonSize + configuration.buttonSize / 8,
        right: isMobile ? 0 : configuration.rightIndent,
        borderRadius: isMobile ? "0px" : "16px",
        zIndex: configuration.zIndex,
        width: isMobile
          ? "100%"
          : isExpanded
          ? `calc(100vw - ${configuration.rightIndent + chatScreenIndent}px)`
          : "450px",
        height: isMobile
          ? "100%"
          : isExpanded
          ? `calc(100vh - ${
              configuration.bottomIndent + configuration.buttonSize + configuration.buttonSize / 8 + chatScreenIndent
            }px)`
          : "650px",
        maxWidth: isMobile ? "unset" : `calc(100vw - ${configuration.rightIndent + chatScreenIndent}px)`,
        maxHeight: isMobile
          ? "unset"
          : `calc(100vh - ${
              configuration.bottomIndent + configuration.buttonSize + configuration.buttonSize / 8 + chatScreenIndent
            }px)`,
      }}
    >
      <Header
        configuration={configuration}
        onClearButtonClick={handleClearConversation}
        isMobile={isMobile}
        onCollapseButtonClick={handleCollapseButtonClick}
      />
      <div className={styles.content}>
        {messages.map((message, index) => {
          return (
            <Message
              key={index}
              message={message}
              selectedColor={"#" + configuration.color}
              isFirst={index === 0}
              isLast={messages.length - 1 === index}
              isLoading={isMessageLoading}
              qchatAPI={qchatAPI}
            />
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <Compose
        configuration={configuration}
        composeValue={composeValue}
        setComposeValue={setComposeValue}
        isLoading={isMessageLoading}
        onSubmitUserMessage={handleSubmitUserMessage}
        onResizeClick={handleResizeClick}
        isMobile={isMobile}
      />
      {!configuration.whitelabel && <Footer />}
    </div>
  )
}
