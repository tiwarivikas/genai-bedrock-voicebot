// app/projects/qchat/file-upload/page.tsx
"use client";

import FileUploadPage from '../components/file-upload';
import { Toaster } from 'sonner'; // Add this if you haven't already

export default function FileUploadRoute() {
  return (
    <>
      <Toaster position="top-right" />
      <FileUploadPage />
    </>
  );
}
