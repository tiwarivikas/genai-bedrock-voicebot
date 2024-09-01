import { createContext, useContext, useEffect, useReducer, useRef } from "react";


declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }

  interface SpeechRecognition {
    start: () => void
    stop: () => void
    onstart: (() => void) | null
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onspeechend: (() => void) | null
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
    onend: (() => void) | null
    lang: string
    interimResults: boolean
    continuous: boolean
  }

  interface SpeechRecognitionEvent {
    resultIndex: number
    results: SpeechRecognitionResultList
  }

  interface SpeechRecognitionResultList {
    readonly length: number
    item(index: number): SpeechRecognitionResult
    [index: number]: SpeechRecognitionResult
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean
    readonly length: number
    item(index: number): SpeechRecognitionAlternative
    [index: number]: SpeechRecognitionAlternative
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string
    readonly confidence: number
  }

  interface SpeechRecognitionErrorEvent {
    error: string
  }
}
type InitialState = {
  isMicEnabled: boolean
  isSpeakerEnabled: boolean
  speaking: boolean
  listening: boolean
  transcript: string
  status: string
  translationLanguage: string
}

const initialState: InitialState = {
  isMicEnabled: true,
  isSpeakerEnabled: false,
  speaking: false,
  listening: false,
  transcript: "",
  status: "",
  translationLanguage: "en",
}

const AudioContext = createContext<any>(null)

function reducer(state: InitialState, action: any) {
  switch (action.type) {
    case "TOGGLE_SPEAKER":
      return {
        ...state,
        isSpeakerEnabled: !state.isSpeakerEnabled,
      }
    case "START_SPEAKING":
      return {
        ...state,
        speaking: true,
      }
    case "STOP_SPEAKING":
      return {
        ...state,
        speaking: false,
      }
    case "TOGGLE_LISTENING":
      return {
        ...state,
        listening: !state.listening,
      }
    case "START_LISTENING":
      return {
        ...state,
        listening: true,
        isSpeakerEnabled: true,
      }
    case "STOP_LISTENING":
      return {
        ...state,
        listening: false,
      }
    case "SET_TRANSCRIPT":
      return {
        ...state,
        transcript: action.payload,
      }
    case "UPDATE_STATUS":
      return {
        ...state,
        status: action.payload,
      }
    case "SET_TRANSLATION_LANGUAGE":
      return {
        ...state,
        translationLanguage: action.payload || "en",
      }
      case "RESET": 
      return {
        ...initialState,
        translationLanguage: state.translationLanguage

      }
    default:
      return state
  }
}

function AudioContextProvider({ children }: { children: any }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.lang = state.translationLanguage
      recognition.interimResults = true
      recognition.continuous = false

      recognition.onstart = () => {
        console.log("Microphone is on")
        dispatch({ type: "START_LISTENING" })
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ""
        const results = event.results

        for (let i = 0; i < results.length; i++) {
          interimTranscript += results[i][0].transcript
        }

        dispatch({ type: "SET_TRANSCRIPT", payload: interimTranscript })

        if (results[event.resultIndex].isFinal) {
          if (interimTranscript == "stop") {
            dispatch({ type: "SET_TRANSCRIPT", payload: "" })
          } else {
            dispatch({ type: "UPDATE_STATUS", payload: "TRANSCRIPT_COMPLETE" })
          }
        }

        /* if (results[event.resultIndex].isFinal) {
                    restartTimeoutRef.current = setTimeout(() => {
                        try {recognition.start();} catch(e) {console.log('Mic. already started.')}
                        dispatch({ type: "SET_TRANSCRIPT", payload: '' });
                    }, 5000);
                } */
      }

      recognition.onspeechend = () => {
        console.log("Speech ended due to silence.")
        recognition.stop()
        dispatch({ type: "STOP_LISTENING" })
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error)
        if (event.error === "no-speech") {
          console.log("No speech detected.")
          try {
            recognition.start()
          } catch (e) {
            console.log("Mic. already started.")
          }
        }
      }

      recognition.onend = () => {
        console.log("Microphone is off")
        dispatch({ type: "STOP_LISTENING" })
      }

      recognitionRef.current = recognition
    } else {
      console.error("Web Speech API is not supported in this browser.")
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
    }
  }, [dispatch, state.translationLanguage])

  const startListening = () => {
    console.log("startListening")
    if (state.isMicEnabled && recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.log("Mic. already started.")
      }
      dispatch({ type: "START_LISTENING" })
    }
  }

  const stopListening = () => {
    console.log("stopListening")
    if (state.isMicEnabled && recognitionRef.current) {
      recognitionRef.current.stop()
      dispatch({ type: "STOP_LISTENING" })
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
    }
  }

  return (
    <AudioContext.Provider
      value={{
        ...state,
        startListening,
        stopListening,
        dispatch,
      }}
    >
      {children}
    </AudioContext.Provider>
  )
}

function useAudio() {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioContextProvider")
  }
  return context
}

export { AudioContextProvider, useAudio }