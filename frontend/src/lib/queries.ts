import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./hooks";
import api from "./api";

const useAccountQuery = ({ ...options }) => {
  const { loggedIn } = useAuth();

  return useQuery({
    enabled: loggedIn,
    queryKey: ["account"],
    queryFn: () => api.get("/accounts/me"),
    ...options,
  });
};

export { useAccountQuery };