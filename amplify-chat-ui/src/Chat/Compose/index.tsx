import { Configuration } from "../../_interfaces";
import localizations from "../../_lib/localization";
import { useAudio } from "../../context/useAudioContext";
import styles from "./styles.module.css";
import ResizeIcon from "/src/_images/chat/message/compose-resize.svg?react";
import SendIcon from "/src/_images/chat/message/compose-send.svg?react";
import MicIcon from "/src/_images/chat/message/mic-listen.svg?react";
import { SpeakerWaveIcon } from "@heroicons/react/24/outline";
import { FormEvent, useEffect } from "react";


export default function Compose({
  configuration,
  composeValue,
  setComposeValue,
  isLoading,
  onResizeClick,
  onSubmitUserMessage,
  isMobile,
}: {
  configuration: Configuration
  composeValue: string
  setComposeValue: (value: string) => void
  isLoading: boolean
  onResizeClick: () => void
  onSubmitUserMessage: (event: FormEvent<HTMLFormElement>) => void
  isMobile: boolean
}) {
  const { isMicEnabled, listening, transcript, status, speaking, startListening, stopListening, dispatch } = useAudio()

  function submitFormVoiceInput() {
    let e: any = null
    onSubmitUserMessage(e)
  }

  function handleMicClick() {
    if (speaking) dispatch({ type: "RESET" })
    else if (listening) {
      stopListening()
      dispatch({ type: "RESET" })
    } else startListening()
  }

  useEffect(() => {
    setComposeValue(transcript)
  }, [transcript])

  useEffect(() => {
    if (status == "TRANSCRIPT_COMPLETE") {
      dispatch({ type: "UPDATE_STATUS", payload: "" })
      submitFormVoiceInput()
    }
  }, [status])

  var userAgent = navigator.userAgent
  const isChrome = userAgent.indexOf("Chrome") > -1 ? true : false

  return (
    <div className={styles.compose}>
      {!isMobile && (
        <button
          aria-label={localizations[configuration.lang].resize}
          className="qchat-small-btn"
          onClick={() => onResizeClick()}
        >
          <ResizeIcon width={24} height={24} />
          {!isMobile && (
            <div className={`qchat-tooltip ${styles.composeTooltipLeft}`}>
              {localizations[configuration.lang].resize}
            </div>
          )}
        </button>
      )}
      <form style={{ display: "flex", gap: "8px", width: "100%" }} onSubmit={(event) => onSubmitUserMessage(event)}>
        <input
          type="text"
          name="Query Field"
          autoComplete="off"
          value={composeValue}
          onChange={(e) => setComposeValue(e.target.value)}
          placeholder={localizations[configuration.lang].inputPlaceholder}
          className={`${styles.input}`}
        />
        {isChrome && (
          <button
            type="button"
            disabled={isLoading}
            className="qchat-small-btn bg-slate-200"
            onClick={handleMicClick}
          >
            <span className="relative flex h-8 w-8">
              {(speaking || listening) && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-800 opacity-75"></span>
              )}
              {isMicEnabled && (
                <>
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-75" />
                  {!speaking && (
                    <MicIcon
                      width={24}
                      height={24}
                      className={`inline-flex h-full w-full rounded-full p-2 ${
                        !listening ? "bg-blue-400" : "bg-red-600"
                      } `}
                    />
                  )}
                  {speaking && (
                    <SpeakerWaveIcon
                      width={24}
                      height={24}
                      className={`inline-flex h-full w-full rounded-full p-2 ${
                        !speaking ? "bg-blue-400" : "bg-green-600"
                      } `}
                    />
                  )}
                </>
              )}
            </span>
          </button>
        )}
        <button
          id="compose-form-submit"
          aria-label={localizations[configuration.lang].send}
          type="submit"
          disabled={isLoading || !composeValue}
          className="qchat-small-btn"
        >
          <SendIcon width={28} height={28} />
          {!isMobile && (
            <div className={`qchat-tooltip ${styles.composeTooltipRight}`}>
              {localizations[configuration.lang].send}
            </div>
          )}
        </button>
      </form>
    </div>
  )
}