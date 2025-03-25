"use client"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@aws-amplify/ui-react";
import { ArrowRightCircleIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { useUser } from "./UserContext";

export default function Page() {

  const { dispatch } = useUser();
  useEffect(() => {
    dispatch({ type: "SETPROJECT", payload: { projectName: "List of Projects" } })
  }, [])

  const projects = [
    {
      title: 'QChat',
      description: 'White-labeled Chatbots powered by Amazon Bedrock and Kendra!',
      content: 'Create and share chatbot link with customers to evaluate for a weak. The chatbot crawls customer site and indexes the content including PDFs.',
      footer: <Link href="/projects/qchat" >Link <ArrowRightCircleIcon className="w-6" /></Link>
    },
    {
      title: 'AWS IP Range Details',
      description: 'Check the AWS Service and Region, that a particular AWS IP Address belongs to.',
      content: 'Get a filtered list of IP Ranges by Region + Service name. Also, get a list of IP Ranges that a particular IP address is part of.',
      footer: <Link href="/demos/iprange" >Link <ArrowRightCircleIcon className="w-6" /></Link>
    },
    {
      title: 'Project Acumen (WIP)',
      description: 'Work in Progress...',
      content: 'Visualize VPC Flowlogs in a graphical GUI to get a visibility into network traffic patterns.',
      footer: <Link href="/projects/acumen" >Link <ArrowRightCircleIcon className="w-6" /></Link>
    },
    {
      title: 'Cloudfront as API Gateway',
      description: 'Authorize with JWTToken, cache content and allow Origin to issue tokens in same API call.',
      content: 'If you want a single API endpoint that allows periodic automated refresh of JWTTokens to access restricted content cached in CDN.',
      footer: <Link href="/demos/mmi-cdn" >Link <ArrowRightCircleIcon className="w-6" /></Link>
    }
  ]

  return (
    <main>
      <div className="flex gap-6">
        {projects?.map(item => {
          return (
            <Card key={item.title} className="w-96 bg-blue-50">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="hidden md:block">
                <p>{item.content}</p>
              </CardContent>
              <CardFooter>
                <p>{item.footer}</p>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </main>
  );
}
