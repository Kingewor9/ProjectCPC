export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="space-y-4 text-center">
        <div className="inline-block">
          <div className="w-12 h-12 border-4 border-grey-700 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-grey-400">Loading...</p>
      </div>
    </div>
  );
}
