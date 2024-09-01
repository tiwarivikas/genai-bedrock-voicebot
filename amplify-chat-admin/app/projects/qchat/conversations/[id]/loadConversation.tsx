import { fetchAuthSession } from "aws-amplify/auth";
import config from "@/amplify_outputs.json";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Skeleton from "@/app/ui/Skeleton";
import {
  UserCircleIcon,
  BugAntIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
} from "@heroicons/react/24/outline";

export default function LoadConversation({ id }) {
  const { data: conversationHistory, isFetching } = useQuery({
    queryKey: ["conversationHistory-" + id],
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
          type: "loadConversation",
          content: id,
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

  if (!conversationHistory || isFetching) return <Skeleton />;

  return (
    <div className="w-full flex-none">
      <div className="flex h-full flex-col px-3 py-4 md:px-2">
        <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
          <div className=" flex h-auto text-lg  grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3">
            Conversation History:
          </div>
          {conversationHistory?.items?.map((item: any) => {
            return (
              <div key={item.messageId}>
                <div className=" flex h-auto text-sm grow items-center justify-center gap-2 rounded-md bg-green-100 p-3 font-medium hover:bg-sky-100 hover:text-blue-600 md:justify-start md:p-2 md:px-3">
                  <UserCircleIcon className="w-6 flex-none" /> {item.question}{" "}
                  {item.modifiedQuestion ? `(${item.modifiedQuestion})` : ""}
                </div>
                <div className=" flex h-auto text-sm grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 font-medium hover:bg-sky-100 hover:text-blue-600 md:justify-start md:p-2 md:px-3 ml-8 mr-10">
                  <BugAntIcon className="w-6 flex-none" />
                  {item.response}
                  {item.reaction ? (
                    item.reaction == "good_answer" ? (
                      <HandThumbUpIcon className="w-6 flex-none fill-green-800 hover:animate-ping" />
                    ) : (
                      <HandThumbDownIcon className="w-6 flex-none fill-red-600 hover:animate-ping" />
                    )
                  ) : (
                    ""
                  )}
                </div>
              </div>
            );
          })}
          <div className="hidden h-auto w-full grow rounded-md bg-gray-50 md:block"></div>
        </div>
      </div>
    </div>
  );
}
