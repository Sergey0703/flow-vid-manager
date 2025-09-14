import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, XCircle, Crown, User, Shield, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction, sanitizeContent } from "@/lib/security";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_approved: boolean;
  is_admin: boolean;
  created_at: string;
}

interface SafeUserProfile {
  id: string;
  email: string;
  displayName: string;
  is_approved: boolean;
  is_admin: boolean;
  joinedDate: string;
  isCurrentUser?: boolean;
}

const UserManagement = () => {
  const [users, setUsers] = useState<SafeUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
    };
    
    getCurrentUser();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, is_approved, is_admin, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform and sanitize user data
      const safeUsers: SafeUserProfile[] = (data || []).map(user => ({
        id: user.id,
        email: user.email || "No email",
        // Sanitize display name and provide fallback
        displayName: user.full_name 
          ? sanitizeContent(user.full_name) || user.email || "Unknown User"
          : user.email || "Unknown User",
        is_approved: user.is_approved,
        is_admin: user.is_admin,
        joinedDate: new Date(user.created_at).toLocaleDateString(),
        isCurrentUser: user.id === currentUserId
      }));

      setUsers(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, updates: Partial<Pick<UserProfile, 'is_approved' | 'is_admin'>>) => {
    // Prevent self-modification of admin status
    if (userId === currentUserId && 'is_admin' in updates) {
      toast({
        title: "Action Denied",
        description: "You cannot modify your own admin status.",
        variant: "destructive",
      });
      return;
    }

    // Find user for validation and logging
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      toast({
        title: "Error",
        description: "User not found.",
        variant: "destructive",
      });
      return;
    }

    // Prevent removing the last admin
    if (updates.is_admin === false && targetUser.is_admin) {
      const adminCount = users.filter(u => u.is_admin && u.id !== userId).length;
      if (adminCount === 0) {
        toast({
          title: "Action Denied",
          description: "Cannot remove the last administrator. Assign admin rights to another user first.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ));

      // Log admin action with proper details
      const actionType = 'is_approved' in updates 
        ? (updates.is_approved ? 'user_approve' : 'user_revoke') 
        : (updates.is_admin ? 'user_promote_admin' : 'user_demote_admin');
      
      await logAdminAction({
        admin_id: session.user.id,
        action_type: actionType,
        target_user_id: userId,
        details: { 
          updates,
          target_email: targetUser.email,
          target_name: targetUser.displayName,
          reason: `Admin action performed via user management interface`
        }
      });

      const actionMessage = 'is_approved' in updates
        ? (updates.is_approved ? "User approved successfully" : "User approval revoked")
        : (updates.is_admin ? "Admin rights granted" : "Admin rights removed");

      toast({
        title: "Success",
        description: actionMessage,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update user status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleApproval = (user: SafeUserProfile) => {
    updateUserStatus(user.id, { is_approved: !user.is_approved });
  };

  const toggleAdmin = (user: SafeUserProfile) => {
    updateUserStatus(user.id, { is_admin: !user.is_admin });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const approvedUsers = users.filter(u => u.is_approved).length;
  const adminUsers = users.filter(u => u.is_admin).length;
  const pendingUsers = users.filter(u => !u.is_approved).length;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{totalUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">{approvedUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Crown className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold">{adminUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{pendingUsers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
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
                      <h3 className="font-medium">
                        {user.displayName}
                        {user.isCurrentUser && (
                          <span className="ml-2 text-xs text-blue-500">(You)</span>
                        )}
                      </h3>
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
                      Joined: {user.joinedDate}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => toggleApproval(user)}
                      variant={user.is_approved ? "destructive" : "default"}
                      size="sm"
                      disabled={user.isCurrentUser}
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
                      disabled={user.isCurrentUser}
                      title={user.isCurrentUser ? "You cannot modify your own admin status" : ""}
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
          
          {/* Security Notice */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium">Security Notes:</p>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>All user management actions are logged for security auditing</li>
                  <li>You cannot modify your own admin status</li>
                  <li>The system prevents removal of the last administrator</li>
                  <li>User data is sanitized before display</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;