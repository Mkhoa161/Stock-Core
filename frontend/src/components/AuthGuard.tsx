import { useAccountQuery } from "@/lib/queries";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { error, isLoading } = useAccountQuery({ retry: false });
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && error) {
      router.push("/auth/login");
    }
  }, [error, isLoading, router]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return null;

  return <>{children}</>;
}