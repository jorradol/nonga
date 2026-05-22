import { useAuthContext } from "../../contexts/auth/AuthContext";
import { useAppStore } from "../../store";

export function useAuth() {
  const context = useAuthContext();
  const setView = useAppStore((state) => state.setView);

  // Safe checks for user registration status
  const isSignedIn = !!context.user && context.user.uid !== "guest-user-100";

  /**
   * Protected Route Guard Helper: Checks if the user is authenticated; 
   * if not, automatically redirects with fluid transition & displays the orange Auth dashboard.
   */
  const protectRoute = (redirectTo: "login" | "register" = "login"): boolean => {
    if (!isSignedIn) {
      setView(redirectTo);
      return false;
    }
    return true;
  };

  return {
    ...context,
    isSignedIn,
    protectRoute
  };
}
