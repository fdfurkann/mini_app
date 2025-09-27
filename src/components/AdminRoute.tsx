import { Navigate, Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useT();
  const isAdmin = sessionStorage.getItem("isAdmin") === "true";
  const isLoading = false; // Assuming isLoading is always false for this component

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t('accessDenied')}</h1>
          <p className="text-muted-foreground mb-4">{t('adminAccessRequired')}</p>
          <Button asChild>
            <Link to="/">{t('returnToHome')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute; 