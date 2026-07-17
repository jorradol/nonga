import { useAuthContext } from "../../contexts/auth/AuthContext";
import { useAppStore } from "../../store";
import { isUiFixtureBuild } from "../../fixture/uiFixtureMode";

export function useAuth() {
  const context = useAuthContext();
  const setView = useAppStore((state) => state.setView);

  // Fixture branch is tree-shaken from Production builds.
  const isSignedIn = isUiFixtureBuild
    ? !!context.user &&
      context.user.providerId === "fixture" &&
      context.user.role !== "guest"
    : !!context.user && context.user.uid !== "guest-user-100";

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
