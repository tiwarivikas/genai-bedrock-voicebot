import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default async function DownloadTamperMonekyScript({
  domainName,
  chatbotURL,
}: {
  domainName: string;
  chatbotURL: string;
}) {
  const scriptContent = `
    // ==UserScript==
    // @name         QChatBot Integration
    // @namespace    http://tampermonkey.net/
    // @version      2024-02-14
    // @description  Embed the Chatbot within any website!
    // @author       You
    // @match        https://${domainName}/*
    // @icon         https://www.google.com/s2/favicons?sz=64&domain=undefined.localhost
    // @grant        none
    // ==/UserScript==

    (function() {
        'use strict';

        // Your code here...
        var my_awesome_script = document.createElement('script');
        my_awesome_script.setAttribute("id", "QChatparams")
        my_awesome_script.setAttribute('src','##URL##')
        document.head.appendChild(my_awesome_script);
    })();`;

  const downloadScript = async () => {
    const urlWithToken = (await getRedirectUrl(chatbotURL)) || "";

    if (urlWithToken == "") return null;

    //Replace string ##URL## with urlWithToken in scriptContent
    const scriptContentWithToken = scriptContent.replace(
      "##URL##",
      urlWithToken
    );
    const blob = new Blob([scriptContentWithToken], {
      type: "text/javascript",
    });
    const url = URL.createObjectURL(blob);
    //return url;
    const a = document.createElement("a");
    a.href = url;
    a.download = `qchat-script.user.js`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={downloadScript}>
            <ArrowDownTrayIcon className="h-4 inline-flex" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>😇 Download Tampermonkey Script to embed Chatbot in website!</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
  /* <div>
      <input
        type="text"
        value={scriptName}
        onChange={(e) => setScriptName(e.target.value)}
        placeholder="Enter script name"
      />
      <button onClick={generateScript}>Generate Script</button>
      <button onClick={downloadScript} disabled={!scriptContent}>
        Download Script
      </button>
      <textarea
        value={scriptContent}
        onChange={(e) => setScriptContent(e.target.value)}
        rows={10}
        cols={50}
        placeholder="Generated Script Content"
      />
    </div> */
}
async function getRedirectUrl(url) {
  try {
    const response = await fetch(url + "&redirectUrl=true", {
      method: "GET",
    });

    const data = await response.json();

    return formatURL(data.redirectUrl);
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

function formatURL(url) {
  //Retrieve the URL hostname, queryparams and add serve.js as path before '?'
  const parsedUrl = new URL(url);
  const formattedUrl = `${parsedUrl.origin}${parsedUrl.pathname}/serve.js${parsedUrl.search}`;
  return formattedUrl;
}