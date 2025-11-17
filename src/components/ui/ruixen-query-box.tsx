"use client";

import { Mic, SendHorizonal, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface RuixenQueryBoxProps {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (message: string, files?: FileList) => void;
  placeholder?: string;
  disabled?: boolean;
  showVoice?: boolean;
  showUpload?: boolean;
  className?: string;
}

export default function RuixenQueryBox({
  value: controlledValue,
  onChange,
  onSend,
  placeholder = "Ask anything...",
  disabled = false,
  showVoice = true,
  showUpload = true,
  className
}: RuixenQueryBoxProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 220,
  });

  const [inputValue, setInputValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<FileList | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Use controlled or uncontrolled value
  const currentValue = controlledValue !== undefined ? controlledValue : inputValue;

  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInputValue(newValue);
    }
    onChange?.(newValue);
  };

  const handleSend = () => {
    if (!currentValue.trim() || disabled) return;
    
    onSend?.(currentValue, uploadedFiles || undefined);
    
    // Reset
    handleValueChange("");
    setUploadedFiles(null);
    adjustHeight(true);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    setUploadedFiles(files);
    console.log("Uploaded files:", files);
  };

  const handleVoiceInput = () => {
    // TODO: Implement voice input with Web Speech API
    console.log("Voice input clicked");
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className="relative w-full bg-background rounded-2xl border border-border shadow-sm overflow-hidden"
      >
        <Textarea
          id="ai-textarea"
          ref={textareaRef}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full resize-none border-none bg-background",
            "text-base text-foreground placeholder:text-muted-foreground",
            "px-4 py-2 pr-28 rounded-2xl leading-[1.4]",
            "transition-all focus-visible:ring-0 focus-visible:ring-offset-0",
            "font-medium"
          )}
          value={currentValue}
          onChange={(e) => {
            handleValueChange(e.target.value);
            adjustHeight();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {/* Icon Buttons */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {showVoice && (
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={disabled}
              className="p-2 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors disabled:opacity-50"
              title="Voice input"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          {/* File Upload Popover */}
          {showUpload && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={disabled}
                  className="p-2 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors disabled:opacity-50 relative"
                  title="Upload files"
                >
                  <Upload className="w-4 h-4" />
                  {uploadedFiles && uploadedFiles.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {uploadedFiles.length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-4">
                <p className="text-sm font-medium mb-2">Upload files:</p>
                {uploadedFiles && uploadedFiles.length > 0 && (
                  <div className="mb-2 text-xs text-muted-foreground">
                    {uploadedFiles.length} file(s) selected
                  </div>
                )}
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Files
                </Button>
              </PopoverContent>
            </Popover>
          )}

          <button
            type="button"
            onClick={handleSend}
            disabled={!currentValue.trim() || disabled}
            className={cn(
              "p-2 rounded-full transition-colors",
              currentValue.trim() && !disabled
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            title="Send message"
          >
            <SendHorizonal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
