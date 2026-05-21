import { Suspense } from "react";
import { CompaniesTable } from "@/components/CompaniesTable";

export default function CompaniesPage() {
  return (
    <div className="container mx-auto p-4">
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <CompaniesTable />
      </Suspense>
    </div>
  );
}
