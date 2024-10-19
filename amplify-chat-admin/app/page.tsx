import Logo from "@/app/ui/project-logo";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import styles from "@/app/ui/home.module.css";
import Image from "next/image";
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/projects/qchat");
  {
    /*return (
     <main className="flex min-h-screen flex-col p-1">
      <div className="flex h-20 shrink-0 items-end rounded-lg bg-blue-800 p-4">
        <Logo />
      </div>
      <div className="mt-4 flex grow flex-col gap-4 md:flex-row">
        <div className="flex flex-col justify-center gap-6 rounded-lg bg-gray-50 px-6 py-10 md:w-4/5 md:px-20">
          <div className={styles.shape} />
          <p className={`text-xl text-gray-800 md:text-3xl md:leading-normal`}>
            <strong>Welcome to CloudEvangelist Portal.</strong> This portal
            contains the{" "}
            <Link href="https://nextjs.org/learn/" className="text-blue-500">
              Next.js Demo Projects
            </Link>
            , powered by Amplify.
          </p>

          <Link
            href="/projects"
            className="flex items-center gap-5 self-start rounded-lg bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-400 md:text-base"
          >
            <span>Projects</span> <ArrowRightIcon className="w-5 md:w-6" />
          </Link>
        </div>
        <div className="flex items-center justify-center p-6 md:w-1/5 md:px-28 md:py-12">
        </div>
      </div>
    </main>
  ); */
  }
}
