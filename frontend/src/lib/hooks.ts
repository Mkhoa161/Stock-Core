import { AuthContext } from "@/contexts";
import { useContext } from "react";

const useAuth = () => useContext(AuthContext);
export { useAuth };