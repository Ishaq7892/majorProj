import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

export const FileUpload = ({
  onFileSelect,
  accept = ".xlsx,.xls,.csv",
  maxSize = 10,
  className,
}: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");

  const validateFile = (file: File): boolean => {
    const maxSizeBytes = maxSize * 1024 * 1024;
    
    // Validate file size
    if (file.size > maxSizeBytes) {
      const errorMsg = `File size must be less than ${maxSize}MB`;
      setError(errorMsg);
      toast.error("File too large", {
        description: `Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB. ${errorMsg}`,
      });
      return false;
    }

    // Validate minimum file size (prevent empty files)
    if (file.size < 100) {
      const errorMsg = "File is too small or empty";
      setError(errorMsg);
      toast.error("Invalid file", { description: errorMsg });
      return false;
    }

    // Validate file extension
    const extension = file.name.split(".").pop()?.toLowerCase();
    const acceptedExtensions = accept.split(",").map(ext => ext.trim().replace(".", ""));
    
    if (!extension || !acceptedExtensions.includes(extension)) {
      const errorMsg = `Please upload a valid file format: ${accept}`;
      setError(errorMsg);
      toast.error("Invalid file type", {
        description: errorMsg,
      });
      return false;
    }

    // Validate file name (prevent path traversal)
    if (file.name.includes("..") || file.name.includes("/") || file.name.includes("\\")) {
      const errorMsg = "Invalid file name";
      setError(errorMsg);
      toast.error("Invalid file", { description: errorMsg });
      return false;
    }

    setError("");
    return true;
  };

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
      toast.success("File selected", {
        description: `${file.name} is ready to upload`,
      });
    }
  }, [onFileSelect, maxSize, accept]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError("");
  };

  return (
    <div className={cn("w-full", className)}>
      {!selectedFile ? (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 transition-all duration-200",
            "touch-manipulation",
            dragActive
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border hover:border-primary/50",
            "cursor-pointer"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleChange}
            accept={accept}
          />
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 rounded-full bg-primary/10">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold mb-1">
                Drag and drop your file here
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Accepted formats: {accept} • Max size: {maxSize}MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-primary rounded-lg p-6 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
              <div>
                <p className="font-semibold">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFile}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  );
};
