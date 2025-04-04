import { Configuration } from "../_interfaces"
import QchatApi from "../_lib/api"
import styles from "./styles.module.css"
import Chevron from "/src/_images/popup/chevron.svg?react"
//import DefaultIcon from "/src/_images/popup/icon-default.svg?react"
import MessageCloseIcon from "/src/_images/popup/message-close.svg?react"
import { useEffect } from "react"

export default function PopupButton({
  configuration,
  qchatAPI,
  isCollapsed,
  setIsCollapsed,
  hasInteracted,
  setHasInteracted,
}: {
  configuration: Configuration
  qchatAPI: QchatApi
  isCollapsed: boolean
  setIsCollapsed: (value: boolean) => void
  hasInteracted: boolean
  setHasInteracted: (value: boolean) => void
}) {
  useEffect(() => {
    qchatAPI.logEvent({ eventType: "POPUP_SEEN" })
  }, [])

  function handleClick(): void {
    setIsCollapsed(!isCollapsed)
    setHasInteracted(true)
    localStorage.setItem(`qchat-has-interacted-${configuration.token}`, "true")
    qchatAPI.logEvent({ eventType: "POPUP_CALLED" })
  }

  function handleMessageCloseClick(): void {
    setHasInteracted(true)
    localStorage.setItem(`qchat-has-interacted-${configuration.token}`, "true")
  }

  return (
    <>
      <button
        className={styles.button}
        style={{
          bottom: configuration.bottomIndent,
          right: configuration.rightIndent,
          zIndex: configuration.zIndex,
          width: configuration.buttonSize,
          height: configuration.buttonSize,
          borderRadius: configuration.buttonSize,
          padding: configuration.buttonSize / 5,
          backgroundColor: "#05a88d",
          overflow: "hidden"
        }}
        onClick={() => handleClick()}
      >
        <div className={styles.imageContainer}>
          {configuration.popupIcon ? (
            <img
              className={`${styles.fadingImage} ${!isCollapsed && styles.hiddenImage}`}
              alt=""
              src={configuration.popupIcon}
              width={configuration.buttonSize}
              height={configuration.buttonSize}
            />
          ) : (
            <>
              {/* <DefaultIcon
                className={`${styles.fadingImage} ${!isCollapsed && styles.hiddenImage}`}
                width={configuration.buttonSize}
                height={configuration.buttonSize}
              /> */}
              {/* <img
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDQiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0NCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE4LjA5IDAuOTlMMy42OSA5LjNDMS40MSAxMC42MiAwIDEzLjA1IDAgMTUuNjlWMzIuMzJDMCAzNC45NSAxLjQxIDM3LjM5IDMuNjkgMzguNzFMMTguMDkgNDcuMDJDMjAuMzcgNDguMzQgMjMuMTggNDguMzQgMjUuNDYgNDcuMDJMMzkuODYgMzguNzFDNDIuMTQgMzcuMzkgNDMuNTUgMzQuOTYgNDMuNTUgMzIuMzJWMTUuNjlDNDMuNTUgMTMuMDYgNDIuMTQgMTAuNjIgMzkuODYgOS4zTDI1LjQ2IDAuOTlDMjMuMTggLTAuMzMgMjAuMzcgLTAuMzMgMTguMDkgMC45OVoiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcl83NDA1XzM0Nzk1KSIvPgo8cGF0aCBkPSJNMzQuMzU5OSAxNC42NkwyMy41Njk5IDguNDNDMjMuMDc5OSA4LjE0IDIyLjQxOTkgOCAyMS43Njk5IDhDMjEuMTE5OSA4IDIwLjQ2OTkgOC4xNCAxOS45Njk5IDguNDNMOS4xNzk4OCAxNC42NkM4LjE4OTg4IDE1LjIzIDcuMzc5ODggMTYuNjMgNy4zNzk4OCAxNy43N1YzMC4yM0M3LjM3OTg4IDMxLjM3IDguMTg5ODggMzIuNzcgOS4xNzk4OCAzMy4zNEwxOS45Njk5IDM5LjU3QzIwLjQ1OTkgMzkuODYgMjEuMTE5OSA0MCAyMS43Njk5IDQwQzIyLjQxOTkgNDAgMjMuMDY5OSAzOS44NiAyMy41Njk5IDM5LjU3TDM0LjM1OTkgMzMuMzRDMzUuMzQ5OSAzMi43NyAzNi4xNTk5IDMxLjM3IDM2LjE1OTkgMzAuMjNWMTcuNzdDMzYuMTU5OSAxNi42MyAzNS4zNDk5IDE1LjIzIDM0LjM1OTkgMTQuNjZaTTIyLjA1OTkgMzYuOTlDMjIuMDU5OSAzNi45OSAyMS45MTk5IDM3LjAyIDIxLjc3OTkgMzcuMDJDMjEuNjM5OSAzNy4wMiAyMS41Mzk5IDM3IDIxLjQ5OTkgMzYuOTlMMTAuNjc5OSAzMC43NEMxMC41Njk5IDMwLjY0IDEwLjQyOTkgMzAuMzkgMTAuMzk5OSAzMC4yNVYxNy43NUMxMC40Mjk5IDE3LjYxIDEwLjU3OTkgMTcuMzYgMTAuNjc5OSAxNy4yNkwyMS40OTk5IDExLjAxQzIxLjQ5OTkgMTEuMDEgMjEuNjM5OSAxMC45OCAyMS43Nzk5IDEwLjk4QzIxLjkxOTkgMTAuOTggMjIuMDE5OSAxMSAyMi4wNTk5IDExLjAxTDMyLjg3OTkgMTcuMjZDMzIuOTg5OSAxNy4zNiAzMy4xMjk5IDE3LjYxIDMzLjE1OTkgMTcuNzVWMjguODRMMjQuNzc5OSAyNFYyMi42OEMyNC43Nzk5IDIyLjQyIDI0LjYzOTkgMjIuMTkgMjQuNDE5OSAyMi4wNkwyMi4xMzk5IDIwLjc0QzIyLjAyOTkgMjAuNjggMjEuODk5OSAyMC42NCAyMS43Nzk5IDIwLjY0QzIxLjY1OTkgMjAuNjQgMjEuNTI5OSAyMC42NyAyMS40MTk5IDIwLjc0TDE5LjEzOTkgMjIuMDZDMTguOTE5OSAyMi4xOSAxOC43Nzk5IDIyLjQzIDE4Ljc3OTkgMjIuNjhWMjUuMzFDMTguNzc5OSAyNS41NyAxOC45MTk5IDI1LjggMTkuMTM5OSAyNS45M0wyMS40MTk5IDI3LjI1QzIxLjUyOTkgMjcuMzEgMjEuNjU5OSAyNy4zNSAyMS43Nzk5IDI3LjM1QzIxLjg5OTkgMjcuMzUgMjIuMDI5OSAyNy4zMiAyMi4xMzk5IDI3LjI1TDIzLjI3OTkgMjYuNTlMMzEuNjU5OSAzMS40M0wyMi4wNTk5IDM2Ljk3VjM2Ljk5WiIgZmlsbD0id2hpdGUiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl83NDA1XzM0Nzk1IiB4MT0iNDEuMDkiIHkxPSItMy41OSIgeDI9IjQuODUiIHkyPSI0OC4xNyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjQTdGOEZGIi8+CjxzdG9wIG9mZnNldD0iMC4wMyIgc3RvcC1jb2xvcj0iIzlERjFGRiIvPgo8c3RvcCBvZmZzZXQ9IjAuMDgiIHN0b3AtY29sb3I9IiM4NEUxRkYiLz4KPHN0b3Agb2Zmc2V0PSIwLjE1IiBzdG9wLWNvbG9yPSIjNUFDN0ZGIi8+CjxzdG9wIG9mZnNldD0iMC4yMiIgc3RvcC1jb2xvcj0iIzIxQTJGRiIvPgo8c3RvcCBvZmZzZXQ9IjAuMjYiIHN0b3AtY29sb3I9IiMwMDhERkYiLz4KPHN0b3Agb2Zmc2V0PSIwLjY2IiBzdG9wLWNvbG9yPSIjN0YzM0ZGIi8+CjxzdG9wIG9mZnNldD0iMC45OSIgc3RvcC1jb2xvcj0iIzM5MTI3RCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo="
                alt="Amazon Q"
                data-testid="bot-icon-svg"
              ></img> */}
              <img
                height={64}
                width={64}
                style={{ objectFit: "contain"}}
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+SWNvbi1BcmNoaXRlY3R1cmUvNjQvQXJjaF9BbWF6b24tQmVkcm9ja182NDwvdGl0bGU+CiAgICA8ZyBpZD0iSWNvbi1BcmNoaXRlY3R1cmUvNjQvQXJjaF9BbWF6b24tQmVkcm9ja182NCIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgaWQ9Ikljb24tQXJjaGl0ZWN0dXJlLUJHLzY0L01hY2hpbmUtTGVhcm5pbmciIGZpbGw9IiMwMUE4OEQiPgogICAgICAgICAgICA8cmVjdCBpZD0iUmVjdGFuZ2xlIiB4PSIwIiB5PSIwIiB3aWR0aD0iODAiIGhlaWdodD0iODAiPjwvcmVjdD4KICAgICAgICA8L2c+CiAgICAgICAgPGcgaWQ9Ikljb24tU2VydmljZS82NC9BbWF6b24tQmVkcm9ja182NCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIuMDAwMDAwLCAxMi4wMDAwMDApIiBmaWxsPSIjRkZGRkZGIj4KICAgICAgICAgICAgPHBhdGggZD0iTTUyLDI2Ljk5OTg5MTggQzUwLjg5NywyNi45OTk4OTE4IDUwLDI2LjEwMjg5MTggNTAsMjQuOTk5ODkxOCBDNTAsMjMuODk2ODkxOCA1MC44OTcsMjIuOTk5ODkxOCA1MiwyMi45OTk4OTE4IEM1My4xMDMsMjIuOTk5ODkxOCA1NCwyMy44OTY4OTE4IDU0LDI0Ljk5OTg5MTggQzU0LDI2LjEwMjg5MTggNTMuMTAzLDI2Ljk5OTg5MTggNTIsMjYuOTk5ODkxOCBMNTIsMjYuOTk5ODkxOCBaIE0yMC4xMTMsNTMuOTA3ODkxOCBMMTYuODY1LDUyLjAxMzg5MTggTDIzLjUzLDQ3Ljg0Nzg5MTggTDIyLjQ3LDQ2LjE1MTg5MTggTDE0LjkxMyw1MC44NzQ4OTE4IEw5LDQ3LjQyNTg5MTggTDksMzguNTM0ODkxOCBMMTQuNTU1LDM0LjgzMTg5MTggTDEzLjQ0NSwzMy4xNjc4OTE4IEw3Ljk1OSwzNi44MjQ4OTE4IEwyLDMzLjQxOTg5MTggTDIsMjguNTc5ODkxOCBMOC40OTYsMjQuODY3ODkxOCBMNy41MDQsMjMuMTMxODkxOCBMMiwyNi4yNzY4OTE4IEwyLDIyLjU3OTg5MTggTDgsMTkuMTUxODkxOCBMMTQsMjIuNTc5ODkxOCBMMTQsMjYuNDMzODkxOCBMOS40ODUsMjkuMTQyODkxOCBMMTAuNTE1LDMwLjg1Njg5MTggTDE1LDI4LjE2NTg5MTggTDE5LjQ4NSwzMC44NTY4OTE4IEwyMC41MTUsMjkuMTQyODkxOCBMMTYsMjYuNDMzODkxOCBMMTYsMjIuNTM0ODkxOCBMMjEuNTU1LDE4LjgzMTg5MTggQzIxLjgzMywxOC42NDU4OTE4IDIyLDE4LjMzMzg5MTggMjIsMTcuOTk5ODkxOCBMMjIsMTAuOTk5ODkxOCBMMjAsMTAuOTk5ODkxOCBMMjAsMTcuNDY0ODkxOCBMMTQuOTU5LDIwLjgyNDg5MTggTDksMTcuNDE5ODkxOCBMOSw4LjU3Mzg5MTgxIEwxNCw1LjY1Nzg5MTgxIEwxNCwxMy45OTk4OTE4IEwxNiwxMy45OTk4OTE4IEwxNiw0LjQ5MDg5MTgxIEwyMC4xMTMsMi4wOTE4OTE4MSBMMjgsNC43MjA4OTE4MSBMMjgsMzMuNDMzODkxOCBMMTMuNDg1LDQyLjE0Mjg5MTggTDE0LjUxNSw0My44NTY4OTE4IEwyOCwzNS43NjU4OTE4IEwyOCw1MS4yNzg4OTE4IEwyMC4xMTMsNTMuOTA3ODkxOCBaIE01MCwzNy45OTk4OTE4IEM1MCwzOS4xMDI4OTE4IDQ5LjEwMywzOS45OTk4OTE4IDQ4LDM5Ljk5OTg5MTggQzQ2Ljg5NywzOS45OTk4OTE4IDQ2LDM5LjEwMjg5MTggNDYsMzcuOTk5ODkxOCBDNDYsMzYuODk2ODkxOCA0Ni44OTcsMzUuOTk5ODkxOCA0OCwzNS45OTk4OTE4IEM0OS4xMDMsMzUuOTk5ODkxOCA1MCwzNi44OTY4OTE4IDUwLDM3Ljk5OTg5MTggTDUwLDM3Ljk5OTg5MTggWiBNNDAsNDcuOTk5ODkxOCBDNDAsNDkuMTAyODkxOCAzOS4xMDMsNDkuOTk5ODkxOCAzOCw0OS45OTk4OTE4IEMzNi44OTcsNDkuOTk5ODkxOCAzNiw0OS4xMDI4OTE4IDM2LDQ3Ljk5OTg5MTggQzM2LDQ2Ljg5Njg5MTggMzYuODk3LDQ1Ljk5OTg5MTggMzgsNDUuOTk5ODkxOCBDMzkuMTAzLDQ1Ljk5OTg5MTggNDAsNDYuODk2ODkxOCA0MCw0Ny45OTk4OTE4IEw0MCw0Ny45OTk4OTE4IFogTTM5LDcuOTk5ODkxODEgQzM5LDYuODk2ODkxODEgMzkuODk3LDUuOTk5ODkxODEgNDEsNS45OTk4OTE4MSBDNDIuMTAzLDUuOTk5ODkxODEgNDMsNi44OTY4OTE4MSA0Myw3Ljk5OTg5MTgxIEM0Myw5LjEwMjg5MTgxIDQyLjEwMyw5Ljk5OTg5MTgxIDQxLDkuOTk5ODkxODEgQzM5Ljg5Nyw5Ljk5OTg5MTgxIDM5LDkuMTAyODkxODEgMzksNy45OTk4OTE4MSBMMzksNy45OTk4OTE4MSBaIE01MiwyMC45OTk4OTE4IEM1MC4xNDEsMjAuOTk5ODkxOCA0OC41ODksMjIuMjc5ODkxOCA0OC4xNDIsMjMuOTk5ODkxOCBMMzAsMjMuOTk5ODkxOCBMMzAsMTguOTk5ODkxOCBMNDEsMTguOTk5ODkxOCBDNDEuNTUzLDE4Ljk5OTg5MTggNDIsMTguNTUxODkxOCA0MiwxNy45OTk4OTE4IEw0MiwxMS44NTc4OTE4IEM0My43MiwxMS40MTA4OTE4IDQ1LDkuODU3ODkxODEgNDUsNy45OTk4OTE4MSBDNDUsNS43OTM4OTE4MSA0My4yMDYsMy45OTk4OTE4MSA0MSwzLjk5OTg5MTgxIEMzOC43OTQsMy45OTk4OTE4MSAzNyw1Ljc5Mzg5MTgxIDM3LDcuOTk5ODkxODEgQzM3LDkuODU3ODkxODEgMzguMjgsMTEuNDEwODkxOCA0MCwxMS44NTc4OTE4IEw0MCwxNi45OTk4OTE4IEwzMCwxNi45OTk4OTE4IEwzMCwzLjk5OTg5MTgxIEMzMCwzLjU2ODg5MTgxIDI5LjcyNSwzLjE4Nzg5MTgxIDI5LjMxNiwzLjA1MDg5MTgxIEwyMC4zMTYsMC4wNTA4OTE4MTEgQzIwLjA0MiwtMC4wMzkxMDgxODkgMTkuNzQ0LC0wLjAwOTEwODE4OTA0IDE5LjQ5NiwwLjEzNTg5MTgxMSBMNy40OTYsNy4xMzU4OTE4MSBDNy4xODgsNy4zMTQ4OTE4MSA3LDcuNjQ0ODkxODEgNyw3Ljk5OTg5MTgxIEw3LDE3LjQxOTg5MTggTDAuNTA0LDIxLjEzMTg5MTggQzAuMTkyLDIxLjMwOTg5MTggMCwyMS42NDA4OTE4IDAsMjEuOTk5ODkxOCBMMCwzMy45OTk4OTE4IEMwLDM0LjM1ODg5MTggMC4xOTIsMzQuNjg5ODkxOCAwLjUwNCwzNC44Njc4OTE4IEw3LDM4LjU3OTg5MTggTDcsNDcuOTk5ODkxOCBDNyw0OC4zNTQ4OTE4IDcuMTg4LDQ4LjY4NDg5MTggNy40OTYsNDguODYzODkxOCBMMTkuNDk2LDU1Ljg2Mzg5MTggQzE5LjY1LDU1Ljk1Mzg5MTggMTkuODI1LDU1Ljk5OTg5MTggMjAsNTUuOTk5ODkxOCBDMjAuMTA2LDU1Ljk5OTg5MTggMjAuMjEzLDU1Ljk4Mjg5MTggMjAuMzE2LDU1Ljk0ODg5MTggTDI5LjMxNiw1Mi45NDg4OTE4IEMyOS43MjUsNTIuODExODkxOCAzMCw1Mi40MzA4OTE4IDMwLDUxLjk5OTg5MTggTDMwLDM5Ljk5OTg5MTggTDM3LDM5Ljk5OTg5MTggTDM3LDQ0LjE0MTg5MTggQzM1LjI4LDQ0LjU4ODg5MTggMzQsNDYuMTQxODkxOCAzNCw0Ny45OTk4OTE4IEMzNCw1MC4yMDU4OTE4IDM1Ljc5NCw1MS45OTk4OTE4IDM4LDUxLjk5OTg5MTggQzQwLjIwNiw1MS45OTk4OTE4IDQyLDUwLjIwNTg5MTggNDIsNDcuOTk5ODkxOCBDNDIsNDYuMTQxODkxOCA0MC43Miw0NC41ODg4OTE4IDM5LDQ0LjE0MTg5MTggTDM5LDM4Ljk5OTg5MTggQzM5LDM4LjQ0Nzg5MTggMzguNTUzLDM3Ljk5OTg5MTggMzgsMzcuOTk5ODkxOCBMMzAsMzcuOTk5ODkxOCBMMzAsMzIuOTk5ODkxOCBMNDIuNSwzMi45OTk4OTE4IEw0NC42MzgsMzUuODQ5ODkxOCBDNDQuMjM5LDM2LjQ3MTg5MTggNDQsMzcuMjA2ODkxOCA0NCwzNy45OTk4OTE4IEM0NCw0MC4yMDU4OTE4IDQ1Ljc5NCw0MS45OTk4OTE4IDQ4LDQxLjk5OTg5MTggQzUwLjIwNiw0MS45OTk4OTE4IDUyLDQwLjIwNTg5MTggNTIsMzcuOTk5ODkxOCBDNTIsMzUuNzkzODkxOCA1MC4yMDYsMzMuOTk5ODkxOCA0OCwzMy45OTk4OTE4IEM0Ny4zMTYsMzMuOTk5ODkxOCA0Ni42ODIsMzQuMTg3ODkxOCA0Ni4xMTksMzQuNDkxODkxOCBMNDMuOCwzMS4zOTk4OTE4IEM0My42MTEsMzEuMTQ3ODkxOCA0My4zMTQsMzAuOTk5ODkxOCA0MywzMC45OTk4OTE4IEwzMCwzMC45OTk4OTE4IEwzMCwyNS45OTk4OTE4IEw0OC4xNDIsMjUuOTk5ODkxOCBDNDguNTg5LDI3LjcxOTg5MTggNTAuMTQxLDI4Ljk5OTg5MTggNTIsMjguOTk5ODkxOCBDNTQuMjA2LDI4Ljk5OTg5MTggNTYsMjcuMjA1ODkxOCA1NiwyNC45OTk4OTE4IEM1NiwyMi43OTM4OTE4IDU0LjIwNiwyMC45OTk4OTE4IDUyLDIwLjk5OTg5MTggTDUyLDIwLjk5OTg5MTggWiIgaWQ9IkZpbGwtMSI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+"
                alt="Amazon Bedrock"
                data-testid="bot-icon-svg"
              ></img>
            </>
          )}
          <Chevron
            className={`${styles.fadingImage} ${isCollapsed && styles.hiddenImage}`}
            width={configuration.buttonSize / 2}
            height={configuration.buttonSize / 2}
            style={{ color: "yellow", marginTop: "22px" }}
          />
        </div>
        {configuration.addUnreadDot && !hasInteracted && (
          <div
            className={styles.unreadDot}
            style={{
              width: configuration.buttonSize / 5.5,
              height: configuration.buttonSize / 5.5,
              borderRadius: configuration.buttonSize / 5.5,
              borderWidth: configuration.buttonSize / 22,
            }}
          />
        )}
      </button>
      {configuration.popupMessage && !hasInteracted && (
        <div
          className={styles.popupWidget}
          style={{
            bottom: configuration.bottomIndent + configuration.buttonSize / 3,
            right: configuration.rightIndent + configuration.buttonSize + configuration.buttonSize / 8,
            zIndex: configuration.zIndex,
          }}
        >
          <p
            style={{
              margin: 0,
            }}
            dangerouslySetInnerHTML={{ __html: configuration.popupMessage }}
          />
          <button className="qchat-small-btn" onClick={() => handleMessageCloseClick()}>
            <MessageCloseIcon width={16} height={16} />
          </button>
        </div>
      )}
    </>
  )
}
