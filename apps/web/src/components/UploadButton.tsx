"use client";

import { useState, useRef } from "react";
import { Button } from "@repo/ui";
import { api } from "../lib/api";

export function UploadButton() {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // Step 1: Create Inspection
      const { id: inspectionId } = await api.inspection.createInspection();

      // Step 2: Request Upload URL
      const { mediaId, uploadUrl, key } = await api.inspection.requestUploadUrl(
        inspectionId,
        file.name,
        file.type || "image/jpeg"
      );

      // Step 3: Upload directly to S3
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "image/jpeg",
        },
        body: file,
      });
      if (!s3Res.ok) throw new Error("Failed to upload to S3");

      // Step 4: Confirm Upload
      await api.media.completeUpload(mediaId, inspectionId, key);

      // Step 5: Start Analysis
      await api.inspection.analyze(inspectionId);

      alert("Upload complete and analysis started!");
    } catch (error) {
      console.error(error);
      alert("Upload failed. Check the console for details.");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleUpload}
      />
      <Button 
        type="button"
        variant="default"
        onClick={() => fileInputRef.current?.click()} 
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "Upload Image"}
      </Button>
    </>
  );
}
