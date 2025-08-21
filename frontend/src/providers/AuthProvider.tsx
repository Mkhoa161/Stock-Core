"use client";
import { ReactNode, useState } from "react";
import { AuthContext } from "../contexts";
import { useQueryClient } from "@tanstack/react-query";

const loggedInStorageKey = "__stock_insight_logged_in__";
const getStorageLoggedIn = (): boolean => {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(loggedInStorageKey);
}
const setStorageLoggedIn = () => {
  if (typeof window === "undefined") return;
  localStorage.setItem(loggedInStorageKey, "1");
};

const setStorageLoggedOut = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(loggedInStorageKey);
};

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [loggedIn, setLoggedIn] = useState<boolean>(getStorageLoggedIn);

  // Only update loggedIn after hydration (in browser)
  // useEffect(() => {
  //   setLoggedIn(getStorageLoggedIn());
  // }, []);
  
  const login = () => {
    setLoggedIn(true);
    setStorageLoggedIn();
  };

  const logout = () => {
    setLoggedIn(false);
    setStorageLoggedOut();
    queryClient.resetQueries({ queryKey: ["account"] });
  };

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}