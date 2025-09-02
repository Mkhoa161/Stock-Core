"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:text-blue-300">
          Stock Core
        </Link>
        
        <div className="flex space-x-6">
          <Link 
            href="/" 
            className={`hover:text-blue-300 ${pathname === "/" ? "text-blue-300" : ""}`}
          >
            Home
          </Link>
          <Link 
            href="/companies" 
            className={`hover:text-blue-300 ${pathname === "/companies" ? "text-blue-300" : ""}`}
          >
            All Companies
          </Link>
        </div>
      </div>
    </nav>
  );
}
