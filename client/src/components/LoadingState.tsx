export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-6">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
      <h2 className="text-xl font-medium text-neutral-900 mb-2">Processing Your Data</h2>
      <p className="text-neutral-500 max-w-md">This may take a moment depending on the size of your files...</p>
    </div>
  );
}
