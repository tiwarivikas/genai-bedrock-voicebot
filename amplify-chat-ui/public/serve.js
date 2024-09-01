;(function () {
  const baseUrl = "https://main.d153z7r4wirmkz.amplifyapp.com"
  const mountPointId = "qchat-chat-popup-container"

  function createAppMountPoint() {
    const appMountPoint = document.createElement("div")
    appMountPoint.id = mountPointId
    document.body.appendChild(appMountPoint)
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script")
      script.type = "text/javascript"
      script.onload = resolve
      script.onerror = reject
      script.src = src
      document.body.appendChild(script)
    })
  }

  function loadCSS(href) {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.type = "text/css"
    link.href = href
    document.head.appendChild(link)
  }

  function getQueryParams(scriptSrc) {
    const queryString = scriptSrc.split("?")[1]
    return new URLSearchParams(queryString)
  }

  // Parse the query parameters from the script tag that included current script
  const currentScript = document.getElementById("QChatparams")
  //const currentScript = scripts[scripts.length - 1]
  window.qchatQueryParams = getQueryParams(currentScript.src)

  // Disable zooming on text input on iPhones
  if (navigator.userAgent.indexOf("iPhone") > -1) {
    document
      .querySelector("[name=viewport]")
      .setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1")
  }

  createAppMountPoint()

  loadCSS(`${baseUrl}/index.css`);
  loadScript(`${baseUrl}/index.js`)
          .then(() => {})
          .catch((error) => {
            console.error("Error loading React app script:", error)
          })
})()
