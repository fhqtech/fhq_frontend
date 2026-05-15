import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { House as Home, WarningCircle as AlertCircle } from "phosphor-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="w-24 h-24 text-ink opacity-60" />
        </div>
        <div>
          <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-4">Page Not Found</h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button 
          onClick={() => window.location.href = '/'} 
          className="bg-ink border-0 shadow-2"
        >
          <Home className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
