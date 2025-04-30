import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  error: Error | string;
  onTryAgain: () => void;
}

export default function ErrorState({ error, onTryAgain }: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-6">
        <AlertTriangle className="h-16 w-16 text-red-500" />
      </div>
      <h2 className="text-xl font-medium text-neutral-900 mb-2">Something Went Wrong</h2>
      <p className="text-neutral-500 max-w-md mb-2">
        {errorMessage || "The uploaded files could not be processed. Please make sure they are in the correct format and try again."}
      </p>
      <Button 
        className="mt-6 bg-primary text-white px-6 py-2 rounded font-medium flex items-center hover:bg-primary/90 transition"
        onClick={onTryAgain}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5 mr-2" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
        Try Again
      </Button>
    </div>
  );
}
