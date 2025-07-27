import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Users, LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (user && profile) {
      if (profile.user_role === 'vendor') {
        navigate('/vendor');
      } else if (profile.user_role === 'supplier') {
        navigate('/supplier');
      }
    }
  }, [user, profile, navigate]);

  const handleRoleNavigation = (role: 'vendor' | 'supplier') => {
    if (user && profile) {
      // User is authenticated, navigate to appropriate dashboard
      if (profile.user_role === role) {
        navigate(`/${role}`);
      } else {
        // User has different role, show message or redirect
        navigate(`/${profile.user_role}`);
      }
    } else {
      // Not authenticated, redirect to auth
      navigate('/auth');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Bhojan Setu</h1>
              <p className="text-sm text-muted-foreground">Connecting vendors with suppliers</p>
            </div>
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Welcome, {profile?.full_name || user.email}
                </span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-4">
            Bhojan Setu
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connecting Indian street food vendors with fresh, local suppliers. 
            Fresh ingredients, fair prices, stronger communities.
          </p>
        </div>

        {/* User Type Selection */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center">
                <Store className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">I'm a Vendor</CardTitle>
              <CardDescription className="text-base">
                Street food vendor looking for fresh ingredients and supplies
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => handleRoleNavigation('vendor')} 
                className="w-full"
                size="lg"
              >
                {user && profile?.user_role === 'vendor' ? 'Go to Dashboard' : 'Find Suppliers'}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-success/10 rounded-full w-16 h-16 flex items-center justify-center">
                <Users className="h-8 w-8 text-success" />
              </div>
              <CardTitle className="text-2xl">I'm a Supplier</CardTitle>
              <CardDescription className="text-base">
                Supplier with fresh produce, grains, or dairy to sell
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => handleRoleNavigation('supplier')} 
                variant="outline"
                className="w-full border-success text-success hover:bg-success hover:text-success-foreground"
                size="lg"
              >
                {user && profile?.user_role === 'supplier' ? 'Go to Dashboard' : 'Start Selling'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-warning/10 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-2xl">🥬</span>
            </div>
            <h3 className="font-semibold mb-2">Fresh Produce</h3>
            <p className="text-sm text-muted-foreground">
              Quality vegetables, fruits, and ingredients sourced locally
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="font-semibold mb-2">Easy Ordering</h3>
            <p className="text-sm text-muted-foreground">
              Simple interface to browse, compare, and reserve supplies
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-success/10 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-2xl">🤝</span>
            </div>
            <h3 className="font-semibold mb-2">Community First</h3>
            <p className="text-sm text-muted-foreground">
              Supporting local businesses and strengthening food networks
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;