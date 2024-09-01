import styles from "./styles.module.css"
import SpeakIcon from "/src/_images/chat/message/audio-play.svg?react"
import { useState } from "react"

export default function ImageButton({
  name,
  hoverColor,
  onButtonLoad,
  onButtonClick,
}: {
  name: string
  hoverColor: string
  onButtonLoad: (name: string) => void
  onButtonClick: (name: string) => void
}) {
  const [hoverReactionButton, setHoverReactionButton] = useState(false)
  return (
    <button
      className={styles.messageRatingButton}
      style={{
        backgroundColor: hoverReactionButton ? hoverColor : "",
        color: hoverReactionButton ? "white" : "rgb(56, 56, 56)",
      }}
      onMouseEnter={() => setHoverReactionButton(true)}
      onMouseLeave={() => setHoverReactionButton(false)}
      onLoad={() => onButtonLoad(name)}
      onClick={() => onButtonClick(name)}
    >
    <SpeakIcon height={18} width={18} />
    Speak
    </button>
  )
}
