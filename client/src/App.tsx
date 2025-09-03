import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, TrendingUp, CreditCard, PiggyBank, BarChart3, LogOut, UserPlus, LogIn } from 'lucide-react';

// Components
import { AuthForm } from './components/AuthForm';
import { TransactionTracker } from './components/TransactionTracker';
import { BudgetSystem } from './components/BudgetSystem';
import { InvestmentTracker } from './components/InvestmentTracker';
import { DebtManager } from './components/DebtManager';
import { ReportsAnalytics } from './components/ReportsAnalytics';

// Types
import type { User } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Check for existing user session (simple localStorage check)
  useEffect(() => {
    const savedUser = localStorage.getItem('pfm_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('pfm_user');
      }
    }
  }, []);

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('pfm_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pfm_user');
  };

  // Show authentication form if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Wallet className="h-12 w-12 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Personal Finance Manager</h1>
            <p className="text-gray-600 mt-2">Take control of your financial future</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {authMode === 'login' ? (
                  <>
                    <LogIn className="h-5 w-5" />
                    Welcome Back
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Create Account
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {authMode === 'login' 
                  ? 'Sign in to your account to manage your finances' 
                  : 'Create an account to start tracking your finances'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuthForm 
                mode={authMode} 
                onSuccess={handleAuthSuccess}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
              
              <div className="text-center mt-4">
                <Button
                  variant="link"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-sm"
                >
                  {authMode === 'login' 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main application interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Personal Finance Manager</h1>
              <p className="text-sm text-gray-600">Welcome back, {user.first_name}!</p>
            </div>
          </div>
          
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-fit lg:grid-cols-5">
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="budgets" className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              <span className="hidden sm:inline">Budgets</span>
            </TabsTrigger>
            <TabsTrigger value="investments" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Investments</span>
            </TabsTrigger>
            <TabsTrigger value="debts" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Debts</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-6">
            <TransactionTracker userId={user.id} />
          </TabsContent>

          <TabsContent value="budgets" className="space-y-6">
            <BudgetSystem userId={user.id} />
          </TabsContent>

          <TabsContent value="investments" className="space-y-6">
            <InvestmentTracker userId={user.id} />
          </TabsContent>

          <TabsContent value="debts" className="space-y-6">
            <DebtManager userId={user.id} />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportsAnalytics userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;