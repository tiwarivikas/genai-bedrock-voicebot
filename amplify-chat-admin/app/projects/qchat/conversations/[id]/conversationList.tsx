"use client";

import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAuthSession } from "aws-amplify/auth";
import config from "@/amplify_outputs.json";
import Skeleton from "@/app/ui/Skeleton";

export default function ConversationList({
  appId,
  handleClick,
  handleRefreshClick,
}) {
  const { data: conversations, isFetching } = useQuery({
    queryKey: ["listConversationHistory-" + appId],
    queryFn: async () => {
      const { accessToken, idToken } = (await fetchAuthSession()).tokens ?? {};
      const endpoint_url = config.custom.apiExecuteStepFnEndpoint;
      const requestOptions: any = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
        },
        body: JSON.stringify({
          type: "listConversations",
          content: appId,
        }),
      };

      const response = await fetch(
        `${endpoint_url}executeCommand`,
        requestOptions
      );
      const data = await response.json();
      return data;
    },
  });

  if (!conversations || isFetching) return <Skeleton />;

  return (
    <div className="w-full flex-none md:w-64">
      <div className="flex h-full flex-col px-3 py-4 md:px-2">
        <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
          <div className=" flex h-[48px] text-lg  grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3">
            Conversation List
            <Button variant="link" onClick={() => handleRefreshClick()}>
              <ArrowPathIcon className="w-6" />
            </Button>
          </div>
          {conversations?.items
            ?.map((item: any) => {
              const dt = new Date(item.conversationDate);
              const dtToday = new Date();

              return (
                <div
                  className=" flex h-[48px] text-sm grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3"
                  key={item.id}
                >
                  <Button variant="link" onClick={() => handleClick(item)}>
                    <ChatBubbleLeftRightIcon className="w-6" />{" "}
                    {dt.toDateString() === dtToday.toDateString()
                      ? dt.toTimeString().slice(0, 5)
                      : dt.toDateString()}
                  </Button>
                </div>
              );
            })
            .reverse()}
          <div className="hidden h-auto w-full grow rounded-md bg-gray-50 md:block"></div>
        </div>
      </div>
    </div>
  );
}
