import { generateClient } from "aws-amplify/data";
import { Schema } from "@/amplify/data/resource";
import { useUser } from "../../UserContext";
import { SocialIcon } from "react-social-icons";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import DownloadTamperMonekyScript from "./downloadTamperMonkeyScript";
import StatusUpdate from "./statusUpdate";
import config from "@/amplify_outputs.json";
import { fetchAuthSession } from "aws-amplify/auth";
import { useEffect, useState } from "react";
import AddTooltip from "@/app/ui/addTooltip";

function sortByCreationDate(array: any) {
  return array.sort((a: any, b: any) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    if (dateA > dateB) return -1;
    if (dateA < dateB) return 1;
    return 0;
  });
}

export default function QChatListRequests({
  onNewFormRequest,
}: {
  onNewFormRequest: any;
}) {
  const client = generateClient<Schema>();
  const queryClient = useQueryClient();
  const { isAdmin, emailId } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);

  const [totalIndexedPages, setTotalIndexedPages] = useState(0);

  const { data: submissions, isFetching } = useQuery<Schema["QChatRequest"][]>({
    queryKey: ["listQChatRequests"],
    queryFn: () =>
      client.models.QChatRequest.list()
        .then((list) => list.data)
        .then((list) => list.filter((item) => item.bot_status != "Disabled"))
        .then((list) => sortByCreationDate(list)),
  });

  useEffect(() => {
    if (submissions === null || submissions === undefined) return;
    let total = 0;
    /*
    for (const submission of submissions) {
      if (submission.indexedPages && parseInt(submission.indexedPages, 10) > 0) {
        total += parseInt(submission.indexedPages, 10);
      }
    } */
    getTotalKendraIndexedDocs();
  }, [submissions]);

  /* if (isFetching) return <Skeleton />; */

  async function refreshIndexingStatus(submission: any) {
    try {
      const { idToken } = (await fetchAuthSession()).tokens ?? {};
      const endpoint_url = (config as any).custom.apiExecuteStepFnEndpoint;
      const client = generateClient<Schema>();

      var isOwner = false;
      emailId === submission.requester_email ? (isOwner = true) : "";

      if (
        /* !isAdmin && !isOwner &&  */ submission.indexedPages &&
        parseInt(submission.indexedPages, 10) > 0
      )
        return;

      const requestOptions: any = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
        },
        body: JSON.stringify({
          type: "getIndexingStatus",
          content: {
            regionQ: submission.regionQ,
            applicationIdQ: submission.applicationIdQ,
          },
        }),
      };

      const response = await fetch(
        `${endpoint_url}executeCommand`,
        requestOptions
      );
      const data = await response.json();
      const indexedPages = data.indexedPages;

      if (indexedPages > 0) {
        const respValue = await client.models.QChatRequest.update({
          indexedPages: indexedPages,
          id: submission.id,
        });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async function getTotalKendraIndexedDocs() {
    try {
      const { idToken } = (await fetchAuthSession()).tokens ?? {};
      const endpoint_url = (config as any).custom.apiExecuteStepFnEndpoint;
      const client = generateClient<Schema>();

      const requestOptions: any = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
        },
        body: JSON.stringify({
          type: "getTotalKendraIndexedDocs",
          content: {},
        }),
      };

      const response = await fetch(
        `${endpoint_url}executeCommand`,
        requestOptions
      );
      const data = await response.json();
      const totalPages = data.totalKendraIndexedDocs;

      setTotalIndexedPages(totalPages / 1000);
    } catch (err) {
      console.log(err);
    }
  }

  async function handleIndexedPageStatusRefresh() {
    try {
      if (submissions === null || submissions === undefined) return;
      setIsProcessing(true);
      for (const submission of submissions) {
        await refreshIndexingStatus(submission);
      }
      queryClient.invalidateQueries({ queryKey: ["listQChatRequests"] });
      setIsProcessing(false);
    } catch (err) {
      setIsProcessing(false);
      console.log(err);
    }
  }

  return (
    <main>
      <Button className="m-4 text-xl" onClick={() => onNewFormRequest()}>
        {" "}
        + Create New Request ☞
      </Button>
      <div className="flex">
        <div className="flex text-xl w-1/2">List of Submitted Forms</div>
        <div className="text-md w-1/2 flex grow right">
          Ongoing PoCs: {submissions?.length}, Indexing Consumption:{" "}
          {totalIndexedPages ? Math.round(totalIndexedPages) : 0}k / 100K
        </div>
      </div>
      <div className="">
        <Table>
          <TableCaption>Recently submitted QChat Requests</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Customer Name</TableHead>
              <TableHead className="w-[100px]">Knowledgebase</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Creation Date</TableHead>
              <TableHead className="w-[300px]">
                Status (Indexed Pages)
                <Button variant="link" onClick={handleIndexedPageStatusRefresh}>
                  <ArrowPathIcon
                    className={`h-4 ${isProcessing ? "animate-spin" : ""}`}
                  />
                </Button>
              </TableHead>
              <TableHead className="flex p-4 font-bold">
                ChatBot {<ArrowTopRightOnSquareIcon className="h-4 pl-2" />}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions?.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.customer}</TableCell>
                <TableCell className="truncate sm:max-w-24 md:max-w-48">
                  <AddTooltip title={item.website}>
                    <Link href={item.website} target="_blank">
                      <GlobeAltIcon className="w-6 inline-flex" />
                    </Link>
                  </AddTooltip>
                </TableCell>
                <TableCell>{item.requester_email}</TableCell>
                <TableCell>
                  {new Date(item.updatedAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <StatusUpdate item={item} />
                </TableCell>
                <TableCell>
                  {item.token ? (
                    <>
                      <AddTooltip
                        title={`${item.chatbotname} => Web ChatBot and VoiceBot`}
                      >
                        <Link
                          href={item.token.includes("?id=") ? item.token : ""}
                          target="_blank"
                        >
                          <ChatBubbleLeftRightIcon className="w-6 inline-flex" />
                        </Link>
                      </AddTooltip>
                      <AddTooltip title={`${item.chatbotname} => Whatsapp Bot`}>
                        <Link
                          href={`https://wa.me/9289104565?text=${item.applicationIdQ}`}
                          target="_blank"
                        >
                          <SocialIcon
                            network="whatsapp"
                            className="w-6 h-6 inline-flex"
                            style={{ width: "24px" }}
                          />
                        </Link>
                      </AddTooltip>
                      <DownloadTamperMonekyScript
                        domainName={new URL(item.website).hostname}
                        chatbotURL={item.token}
                        customerName={item.customer}
                      />
                    </>
                  ) : (
                    item.chatbotname
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {/* <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right">24</TableCell>
        </TableRow>
      </TableFooter> */}
        </Table>
      </div>
    </main>
  );
}
