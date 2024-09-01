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
    const id = payload.id;
    try {
      const { accessToken, idToken } = (await fetchAuthSession()).tokens ?? {};
      const endpoint_url = config.custom.apiExecuteStepFnEndpoint;

      const requestOptions: any = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
        },
        body: JSON.stringify({
          type: "refreshToken",
          content: payload,
        }),
      };

      const response = await fetch(
        `${endpoint_url}executeCommand`,
        requestOptions
      );
      const data = await response.json();
      const token = data.token;

      const client = generateClient<Schema>();
      const respValue = await client.models.QChatRequest.update({
        /* token: token, */
        indexedPages: data.indexedPages,
        id: id,
      });
      toast("Token refreshed successfully. Try chatbot again. 😎");
      queryClient.invalidateQueries({ queryKey: ["listQChatRequests"] });
    } catch (err) {
      console.log(err);
    }
  }

  const a = new Date();
  const b = new Date();
  const c = new Date();
  const d = new Date(item.updatedAt);
  b.setDate(a.getDate() - 5);
  c.setDate(a.getDate() - 7);

  var status;

  if (d < c) {
    status = "Expired";
  } else if (d < b) {
    status = "Expiring";
  } else {
    status = "Active";
  }

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
    <div className="text-left">
      {item.qchatform_status === "Completed" ? (
        <>
          {status == "Expired" ? (
            <AddTooltip title="Expired">
              <span className="text-red-500">
                <XCircleIcon className="w-6" />
              </span>
            </AddTooltip>
          ) : (
            ""
          )}
          {status == "Expiring" ? (
            <AddTooltip title="Expiring Soon...">
              <span className="text-yellow-500">
                <ExclamationCircleIcon className="w-6" />
              </span>
            </AddTooltip>
          ) : (
            ""
          )}
          {status == "Active" ? (
            <AddTooltip title="Active">
              <span className="text-green-500">
                <CheckCircleIcon className="w-6" />
              </span>
            </AddTooltip>
          ) : (
            ""
          )}

          {item.indexedPages ? (
            <AddTooltip title={`${item.indexedPages} pages indexed.`}>
              <span className={indexingColor}>
                <WalletIcon className="w-6" />
              </span>
            </AddTooltip>
          ) : (
            <AddTooltip title="Pending">
              <span className="text-yellow-500">
                <ClockIcon className="w-6" />
              </span>
            </AddTooltip>
          )}
        </>
      ) : (
        <AddTooltip title="Pending">
          <span className="text-yellow-500">
            <ClockIcon className="w-6" />
          </span>
        </AddTooltip>
      )}
      {isAdmin || isOwner ? (
        <>
          <AddAlertDialog
            handleConfirm={() => handleDelete(item)}
            description="Please confirm if you really want to delete the application. This action can't be reversed. Are you sure to continue?"
          >
            <TrashIcon className="w-6" />
          </AddAlertDialog>
          {status == "Active" && !isAdmin ? (
            ""
          ) : (
            <Button
              className=""
              variant="link"
              onClick={() => handleRefreshToken(item)}
            >
              <ArrowPathIcon className="w-6" />
            </Button>
          )}
          <AddTooltip title="Review Conversation History">
            <Link
              href={"/projects/qchat/conversations/" + item.applicationIdQ}
              target="_blank"
            >
              <ChartBarIcon className="w-6 inline-flex" />
            </Link>
          </AddTooltip>
        </>
      ) : (
        ""
      )}
    </div>
  );
}
