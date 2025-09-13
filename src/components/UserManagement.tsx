import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, XCircle, Crown, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_approved: boolean;
  is_admin: boolean;
  created_at: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ));

      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const toggleApproval = (user: UserProfile) => {
    updateUserStatus(user.id, { is_approved: !user.is_approved });
  };

  const toggleAdmin = (user: UserProfile) => {
    updateUserStatus(user.id, { is_admin: !user.is_admin });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>User Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          ) : (
            users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-medium">{user.full_name || user.email}</h3>
                    <div className="flex space-x-1">
                      {user.is_admin && (
                        <Badge variant="secondary" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {user.is_approved ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          <XCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => toggleApproval(user)}
                    variant={user.is_approved ? "destructive" : "default"}
                    size="sm"
                  >
                    {user.is_approved ? (
                      <>
                        <XCircle className="h-4 w-4 mr-1" />
                        Revoke
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => toggleAdmin(user)}
                    variant={user.is_admin ? "secondary" : "outline"}
                    size="sm"
                  >
                    {user.is_admin ? (
                      <>
                        <User className="h-4 w-4 mr-1" />
                        Remove Admin
                      </>
                    ) : (
                      <>
                        <Crown className="h-4 w-4 mr-1" />
                        Make Admin
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagement;