"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import ConversationList from "./conversationList"


import { useState } from "react";
import LoadConversation from "./loadConversation";

export default function Page({ params }: { params: { id: string } }) {

    const [conversation, setConversation] = useState('');

    const queryClient = useQueryClient();



    // if (!conversations) return <Skeleton />;

    async function handleClick(item: any) {
        setConversation(item.id)
    }
    async function handleRefreshClick() {
        queryClient.invalidateQueries({ queryKey: ["listConversationHistory-" + params.id] });
        queryClient.invalidateQueries({ queryKey: ["conversationHistory-" + conversation] });
    }

    return (
        <>
            <div className="text-xl text-bold bg-blue-600 text-white p-4 rounded-lg w-full -mt-8 mb-2">
                Conversation History: {params.id}
            </div>
            <div className="flex h-full grow flex-col md:flex-row md:overflow-hidden">
                <ConversationList appId={params.id} handleClick={handleClick} handleRefreshClick={handleRefreshClick} />
                <div className="flex-grow p-6 md:overflow-y-auto md:p-12">
                    {conversation ? <LoadConversation id={conversation} /> : "Select a conversation date to start.."}
                </div>
            </div >

        </>
    )
}