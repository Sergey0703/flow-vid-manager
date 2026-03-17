import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Mail } from "lucide-react";

const PendingApproval = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      setUserEmail(session.user.email || "");

      // Check if user is approved
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved, is_admin")
        .eq("id", session.user.id)
        .single();

      if (profile?.is_approved) {
        if (profile.is_admin) {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleBackHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Clock className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Pending Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{userEmail}</span>
            </div>
            
            <p className="text-muted-foreground">
              Your account is waiting for administrator approval. You'll be able to access the admin features once an administrator has approved your account.
            </p>
            
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Please contact an administrator to approve your account. Once approved, you'll receive access to upload and manage videos.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button onClick={handleBackHome} variant="outline" className="w-full">
              Back to Home
            </Button>
            <Button onClick={handleLogout} variant="destructive" className="w-full">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;