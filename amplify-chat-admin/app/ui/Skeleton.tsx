import React from "react";
import { Skeleton as ShadCnSkeleton } from "@/components/ui/skeleton"


type Props = {};

const Skeleton = (props: Props) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      <ShadCnSkeleton className="w-full h-8 rounded-full" />
      <ShadCnSkeleton className="w-full h-8 rounded-full" />
      <ShadCnSkeleton className="w-full h-8 rounded-full" />
      <ShadCnSkeleton className="w-full h-8 rounded-full" />
      <ShadCnSkeleton className="w-full h-8 rounded-full" />
      <ShadCnSkeleton className="w-full h-8 rounded-full" />
      <ShadCnSkeleton className="w-full h-8 rounded-full" />
      <ShadCnSkeleton className="w-full h-8 rounded-full" />
      <ShadCnSkeleton className="w-full h-8 rounded-full" />
      <ShadCnSkeleton className="w-full h-8 rounded-full" />
    </div>
  );
};

export default Skeleton;
