import { Button } from "@/components/ui/button";
import { generateClient } from "aws-amplify/data";
import { Schema } from "@/amplify/data/resource";
import config from "@/amplify_outputs.json";
import { fetchAuthSession } from "aws-amplify/auth";
import { toast } from "sonner";

import { useQueryClient } from "@tanstack/react-query";
import {
  TrashIcon,
  ArrowPathIcon,
  ChartBarIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useUser } from "../../UserContext";
import AddTooltip from "@/app/ui/addTooltip";
import { AddAlertDialog } from "@/app/ui/addAlertDialog";

export default function StatusUpdate({ item }: { item: any }) {
  const client = generateClient<Schema>();
  const queryClient = useQueryClient();

  const { emailId, isAdmin } = useUser();

  async function handleDelete(payload: any) {
    try {
      const id = payload.id;
      const applicationIdQ = payload.applicationIdQ;
      if (applicationIdQ) {
        //Delete Amazon Q application
        const endpoint_url = config.custom.apiExecuteStepFnEndpoint;
        const { accessToken, idToken } =
          (await fetchAuthSession()).tokens ?? {};
        const requestOptions: any = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: idToken,
          },
          body: JSON.stringify({
            type: "deleteQApplication",
            content: payload,
          }),
        };
        const response = await fetch(
          `${endpoint_url}executeCommand`,
          requestOptions
        );
        //const data = await response.json();
        console.log(response);
        //await client.models.QChatRequest.delete({ id: id });
        await client.models.QChatRequest.update({
          id: id,
          bot_status: "Disabled",
        });
        queryClient.invalidateQueries({ queryKey: ["listQChatRequests"] });
      } else {
        //await client.models.QChatRequest.delete({ id: id });
        await client.models.QChatRequest.update({
          id: id,
          bot_status: "Disabled",
        });
        queryClient.invalidateQueries({ queryKey: ["listQChatRequests"] });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async function handleRefreshToken(payload: any) {
    try {
      const { idToken } = (await fetchAuthSession()).tokens ?? {};
      const endpoint_url = config.custom.apiExecuteStepFnEndpoint;

      const requestOptions: any = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
        },
        body: JSON.stringify({
          type: "refreshToken",
          content: {
            ...payload,
            useAgent: payload.useAgent, 
          },
        }),
      };

      const response = await fetch(
        `${endpoint_url}executeCommand`,
        requestOptions
      );
      const data = await response.json();

      // Update form with new data
      const client = generateClient<Schema>();
      await client.models.QChatRequest.update({
        id: payload.id,
        ...(data.indexedPages && { indexedPages: data.indexedPages }),
        ...(data.token && { token: data.token }),
        ...(data.publicURL && { publicURL: data.publicURL })
      });

      toast("Token refreshed successfully. Try chatbot again. 😎");
      queryClient.invalidateQueries({ queryKey: ["listQChatRequests"] });
    } catch (err) {
      console.log(err);
      toast.error("Failed to refresh token");
    }
  }


  const a = new Date();
  const b = new Date();
  const c = new Date();
  const d = new Date(item.updatedAt);
  b.setDate(a.getDate() - 5);
  c.setDate(a.getDate() - 7);

  const getStatus = () => {
    if (item.useAgent) {
      switch (item.bot_status) {
        case 'COMPLETED':
          return "Active";
        case 'FAILED':
          return "Failed";
        case 'IN_PROGRESS':
          return "Creating";
        default:
          return item.bot_status || "Creating";
      }
    } else {
      // Existing Kendra-based logic
      if (d < c) return "Expired";
      if (d < b) return "Expiring";
      return "Active";
    }
  };

  const status = getStatus();

  var isOwner = false;

  emailId === item.requester_email ? (isOwner = true) : "";

  //calculate the indexed document value: <100, < 500, <1000, <5000, >5000
  const indexingColor =
    item.indexedPages < 100
      ? "text-red-200"
      : item.indexedPages < 500
        ? "text-green-200"
        : item.indexedPages < 5000
          ? "text-green-400"
          : "text-green-700";

          return (
            <div className="text-left flex items-center space-x-2">
              {/* Status Icons */}
              {item.qchatform_status === "Completed" ? (
                <>
                  {item.useAgent ? (
                    // For Agent-based chatbot
                    <AddTooltip title={`Agent Status: ${getStatus()}`}>
                      {item.bot_status === 'FAILED' ? (
                        <span className="text-red-500">
                          <XCircleIcon className="w-6" />
                        </span>
                      ) : item.bot_status === 'COMPLETED' || item.bot_status === 'Active' ? (
                        <span className="text-green-500">
                          <CheckCircleIcon className="w-6" />
                        </span>
                      ) : (
                        <span className="text-yellow-500">
                          <ClockIcon className="w-6" />
                        </span>
                      )}
                    </AddTooltip>
                  ) : (
                    // For Kendra-based chatbot
                    <>
                      {/* Status Icon */}
                      <AddTooltip title={`Status: ${status}`}>
                        {status === "Expired" ? (
                          <XCircleIcon className="w-6 text-red-500" />
                        ) : status === "Expiring" ? (
                          <ExclamationCircleIcon className="w-6 text-yellow-500" />
                        ) : (
                          <CheckCircleIcon className="w-6 text-green-500" />
                        )}
                      </AddTooltip>
          
                      {/* Indexing Status */}
                      {!item.useAgent && (
                        item.indexedPages ? (
                          <AddTooltip title={`${item.indexedPages} pages indexed`}>
                            <span className={indexingColor}>
                              <WalletIcon className="w-6" />
                            </span>
                          </AddTooltip>
                        ) : (
                          <AddTooltip title="Indexing Pending">
                            <span className="text-yellow-500">
                              <ClockIcon className="w-6" />
                            </span>
                          </AddTooltip>
                        )
                      )}
                    </>
                  )}
                </>
              ) : (
                // For items not yet completed
                <AddTooltip title="Setup Pending">
                  <span className="text-yellow-500">
                    <ClockIcon className="w-6" />
                  </span>
                </AddTooltip>
              )}
          
              {/* Action Buttons - Only show for admin or owner */}
              {(isAdmin || isOwner) && (
                <div className="flex items-center space-x-2">
                  {/* Delete Button */}
                  <AddAlertDialog
                    handleConfirm={() => handleDelete(item)}
                    description="Please confirm if you really want to delete the application. This action can't be reversed. Are you sure to continue?"
                  >
                    <TrashIcon className="w-6 hover:text-red-500 cursor-pointer" />
                  </AddAlertDialog>
          
                  {/* Refresh Token Button */}
                  {(status !== "Active" || isAdmin) && (
                    <Button
                      className="p-0"
                      variant="link"
                      onClick={() => handleRefreshToken(item)}
                    >
                      <ArrowPathIcon className="w-6 hover:text-blue-500" />
                    </Button>
                  )}
          
                  {/* Conversation History Link */}
                  <AddTooltip title="Review Conversation History">
                    <Link
                      href={"/projects/qchat/conversations/" + item.applicationIdQ}
                      target="_blank"
                    >
                      <ChartBarIcon className="w-6 hover:text-purple-500" />
                    </Link>
                  </AddTooltip>
                </div>
              )}
            </div>
          );
}
