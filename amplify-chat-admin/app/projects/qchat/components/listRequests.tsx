import { generateClient } from "aws-amplify/data";
import { Schema } from "@/amplify/data/resource";
import { useUser } from "../../UserContext";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ArrowPathIcon,
  GlobeAltIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Skeleton from "@/app/ui/Skeleton";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import DownloadTamperMonekyScript from "./downloadTamperMonkeyScript";
import StatusUpdate from "./statusUpdate";
import config from "@/amplify_outputs.json";
import { fetchAuthSession } from "aws-amplify/auth";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@radix-ui/react-select";
import { Select } from "@/components/ui/select";
import { Label as LocalLabel } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const [showToolsModal, setShowToolsModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

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
              <TableHead className="w-[200px]">Website URL</TableHead>
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
                    <span className="text-red-500">
                      <GlobeAltIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    </span>
                  </AddTooltip>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowToolsModal(true)}
                  >
                    <PlusCircleIcon className="h-4 text-green-600" />
                  </Button>
                  <Dialog
                    open={showToolsModal}
                    onOpenChange={setShowToolsModal}
                  >
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add Tools</DialogTitle>
                        <DialogDescription>
                          Add additional tools to enhance your chatbot.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <LocalLabel className="text-right">
                            Tool Type
                          </LocalLabel>
                          <Select
                            onValueChange={(value) => setSelectedTool(value)}
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select a tool" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="document">
                                Upload Document
                              </SelectItem>
                              <SelectItem value="website">
                                Additional Website
                              </SelectItem>
                              <SelectItem value="api">
                                API Integration
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedTool === "document" && (
                          <div className="grid grid-cols-4 items-center gap-4">
                            <LocalLabel
                              htmlFor="document"
                              className="text-right"
                            >
                              Document
                            </LocalLabel>
                            <Input
                              id="document"
                              type="file"
                              className="col-span-3"
                            />
                          </div>
                        )}
                        {selectedTool === "website" && (
                          <div className="grid grid-cols-4 items-center gap-4">
                            <LocalLabel
                              htmlFor="website"
                              className="text-right"
                            >
                              Website URL
                            </LocalLabel>
                            <Input
                              id="website"
                              placeholder="https://example.com"
                              className="col-span-3"
                            />
                          </div>
                        )}
                        {selectedTool === "api" && (
                          <>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <LocalLabel
                                htmlFor="api-url"
                                className="text-right"
                              >
                                API URL
                              </LocalLabel>
                              <Input
                                id="api-url"
                                placeholder="https://api.example.com"
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <LocalLabel
                                htmlFor="api-key"
                                className="text-right"
                              >
                                API Key
                              </LocalLabel>
                              <Input
                                id="api-key"
                                type="password"
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <LocalLabel
                                htmlFor="api-params"
                                className="text-right"
                              >
                                Parameters
                              </LocalLabel>
                              <Input
                                id="api-params"
                                placeholder="param1=value1&param2=value2"
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <LocalLabel
                                htmlFor="api-description"
                                className="text-right"
                              >
                                Description
                              </LocalLabel>
                              <Textarea
                                id="api-description"
                                placeholder="Describe the API..."
                                className="col-span-3"
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          onClick={async (e) => {
                            e.preventDefault();
                            const apiUrl = (
                              document.getElementById(
                                "api-url"
                              ) as HTMLInputElement
                            ).value;
                            const apiKey = (
                              document.getElementById(
                                "api-key"
                              ) as HTMLInputElement
                            ).value;
                            const apiParams = (
                              document.getElementById(
                                "api-params"
                              ) as HTMLInputElement
                            ).value;
                            const apiDescription = (
                              document.getElementById(
                                "api-description"
                              ) as HTMLTextAreaElement
                            ).value;

                            try {
                              const { idToken } =
                                (await fetchAuthSession()).tokens ?? {};
                              const endpoint_url = (config as any).custom
                                .apiExecuteStepFnEndpoint;

                              const response = await fetch(
                                `${endpoint_url}executeCommand`,
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: idToken?.toString() ?? "",
                                  },
                                  body: JSON.stringify({
                                    url: apiUrl,
                                    key: apiKey,
                                    params: apiParams,
                                    description: apiDescription,
                                  }),
                                }
                              );

                              if (response.ok) {
                                // Close the dialog or show success message
                                // You might want to update this part based on your UI structure
                                console.log("Tool added successfully");
                              } else {
                                console.error("Failed to add tool");
                              }
                            } catch (error) {
                              console.error("Error adding tool:", error);
                            }
                          }}
                        >
                          Add Tool
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
                      <Link
                        href={item.token.includes("?id=") ? item.token : ""}
                        target="_blank"
                        className="text-blue-500 underline hover:text-purple-500"
                      >
                        {item.chatbotname}
                        <ArrowTopRightOnSquareIcon className="h-4 pl-2 inline-flex" />
                      </Link>
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
