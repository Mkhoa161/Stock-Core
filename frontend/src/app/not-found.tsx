import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="mb-6 text-lg">The page you are looking for does not exist.</p>
      <Link href="/companies" className="text-blue-600 underline">Browse all companies</Link>
    </div>
  );
}
