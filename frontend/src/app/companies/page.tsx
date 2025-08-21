"use client";
import { CompaniesTable } from "@/components/CompaniesTable";

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-4">
      <CompaniesTable />
    </div>
  );
}