import { useAudio } from "../../context/useAudioContext";
import LangSelector from "../Bhashini/LangSelector";
import styles from "./styles.module.css";
import { SpeakerWaveIcon } from "@heroicons/react/16/solid";


//import QchatLogoFull from "/src/_images/chat/footer/qchat-logo-full.svg?react"

export default function Footer() {

  const {dispatch, isSpeakerEnabled} = useAudio()

  function handleClick() {
    dispatch({type: "TOGGLE_SPEAKER"})
  }
  return (
    <div className={styles.footer}>
      <button onClick={handleClick} >
        <SpeakerWaveIcon height={24} width={24} className={`${isSpeakerEnabled ? 'bg-green-400' : 'bg-slate-400'} rounded-full p-1`} />
      </button>
        <LangSelector />
    </div>
  )
}