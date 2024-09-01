import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function DownloadTamperMonekyScript() {
  const scriptContent = `
    // ==UserScript==
    // @name         QChatBot Integration
    // @namespace    http://tampermonkey.net/
    // @version      2024-02-14
    // @description  try to take over the world!
    // @author       You
    // @match        https://www.du.ac.in/*
    // @icon         https://www.google.com/s2/favicons?sz=64&domain=undefined.localhost
    // @grant        none
    // ==/UserScript==

    (function() {
        'use strict';

        // Your code here...
        var my_awesome_script = document.createElement('script');
        my_awesome_script.setAttribute("id", "QChatparams")
        my_awesome_script.setAttribute('src',"https://main.d153z7r4wirmkz.amplifyapp.com/serve.js?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInVzZXJuYW1lIjoidmlrYXMiLCJlbWFpbCI6InRpd2FyaS52aWthc0BnbWFpbC5jb20iLCJpYXQiOjE3MDgzMTY0MjYsImV4cCI6MTcxMTMxNjQyNn0.mcnlfm0zPZELFIvVF2Z18e4byIYCbXLG8wLo-pfa7gA")
        document.head.appendChild(my_awesome_script);
    })();`;

  const downloadScript = () => {
    const blob = new Blob([scriptContent], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    return url;
    /* const a = document.createElement("a");
    a.href = url;
    a.download = `phone-tool-who's-hiring!%3F!.user.js`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url); */
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="">
            <ArrowDownTrayIcon className="h-4 inline-flex" />
          </Link>
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
