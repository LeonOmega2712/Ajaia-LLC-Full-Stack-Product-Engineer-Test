import Link from "next/link";

export default function DocumentNotFound() {
  return (
    <div className="mx-auto mt-12 max-w-md text-center">
      <h1 className="text-xl font-semibold">Document not available</h1>
      <p className="mt-2 text-sm text-gray-600">It does not exist or it has not been shared with you.</p>
      <Link href="/" className="mt-4 inline-block text-blue-700 underline">
        Back to documents
      </Link>
    </div>
  );
}
