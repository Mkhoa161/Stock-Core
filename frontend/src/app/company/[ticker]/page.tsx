"use client";
import { CompanyDetail } from "@/components/CompanyDetail";

interface CompanyDetailProps {
  params: Promise<{ ticker: string }>;
}

export default function CompanyDetailPage({ params }: CompanyDetailProps) {
  return <CompanyDetail params={params} />;
}