import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, PiggyBank, Calendar, Edit, Trash2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Budget, TransactionCategory, CreateBudgetInput } from '../../../server/src/schema';

interface BudgetSystemProps {
  userId: number;
}

export function BudgetSystem({ userId }: BudgetSystemProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Budget form state
  const [budgetForm, setBudgetForm] = useState<Omit<CreateBudgetInput, 'user_id'>>({
    name: '',
    category_id: null,
    budget_amount: 0,
    period_type: 'monthly',
    start_date: new Date(),
    end_date: new Date()
  });

  // Load data
  const loadBudgets = useCallback(async () => {
    try {
      const result = await trpc.getBudgets.query({ userId });
      setBudgets(result);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  }, [userId]);

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getTransactionCategories.query({ userId });
      setCategories(result.filter(c => c.type === 'expense')); // Only expense categories for budgets
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadBudgets();
    loadCategories();
  }, [loadBudgets, loadCategories]);

  // Set default end date based on period type
  useEffect(() => {
    const startDate = budgetForm.start_date;
    const endDate = new Date(startDate);

    switch (budgetForm.period_type) {
      case 'weekly':
        endDate.setDate(startDate.getDate() + 7);
        break;
      case 'monthly':
        endDate.setMonth(startDate.getMonth() + 1);
        break;
      case 'yearly':
        endDate.setFullYear(startDate.getFullYear() + 1);
        break;
    }

    setBudgetForm(prev => ({ ...prev, end_date: endDate }));
  }, [budgetForm.period_type, budgetForm.start_date]);

  // Create budget
  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newBudget = await trpc.createBudget.mutate({
        ...budgetForm,
        user_id: userId
      });
      setBudgets(prev => [...prev, newBudget]);
      setBudgetForm({
        name: '',
        category_id: null,
        budget_amount: 0,
        period_type: 'monthly',
        start_date: new Date(),
        end_date: new Date()
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create budget:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete budget
  const handleDeleteBudget = async (budgetId: number) => {
    try {
      await trpc.deleteBudget.mutate({ budgetId, userId });
      setBudgets(prev => prev.filter(b => b.id !== budgetId));
    } catch (error) {
      console.error('Failed to delete budget:', error);
    }
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return 'All Categories';
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPeriodType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getBudgetProgress = (budget: Budget) => {
    // TODO: Calculate actual spending against the budget from transaction data
    // Using placeholder calculation since backend handlers are stubs
    const spent = Math.random() * budget.budget_amount;
    const percentage = (spent / budget.budget_amount) * 100;
    return {
      spent,
      remaining: budget.budget_amount - spent,
      percentage: Math.min(percentage, 100)
    };
  };

  const getBudgetStatus = (percentage: number) => {
    if (percentage >= 90) return { color: 'text-red-600', status: 'Over Budget' };
    if (percentage >= 75) return { color: 'text-yellow-600', status: 'Near Limit' };
    return { color: 'text-green-600', status: 'On Track' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Budget Management</h2>
          <p className="text-gray-600">Set spending limits and track your progress</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
              <DialogDescription>
                Set spending limits for specific categories or overall expenses.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget-name">Budget Name</Label>
                <Input
                  id="budget-name"
                  value={budgetForm.name}
                  onChange={(e) =>
                    setBudgetForm(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Monthly Groceries"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Select
                  value={budgetForm.category_id?.toString() || 'all'}
                  onValueChange={(value) =>
                    setBudgetForm(prev => ({ 
                      ...prev, 
                      category_id: value === 'all' ? null : parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget-amount">Budget Amount</Label>
                <Input
                  id="budget-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={budgetForm.budget_amount || ''}
                  onChange={(e) =>
                    setBudgetForm(prev => ({ ...prev, budget_amount: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="period-type">Budget Period</Label>
                <Select
                  value={budgetForm.period_type}
                  onValueChange={(value: 'weekly' | 'monthly' | 'yearly') =>
                    setBudgetForm(prev => ({ ...prev, period_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={budgetForm.start_date.toISOString().split('T')[0]}
                  onChange={(e) =>
                    setBudgetForm(prev => ({ ...prev, start_date: new Date(e.target.value) }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={budgetForm.end_date.toISOString().split('T')[0]}
                  onChange={(e) =>
                    setBudgetForm(prev => ({ ...prev, end_date: new Date(e.target.value) }))
                  }
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Budget'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget Cards */}
      {budgets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <PiggyBank className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No budgets created yet</h3>
            <p className="text-gray-600 mb-6">
              Start managing your finances by creating your first budget
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Create Your First Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => {
            const progress = getBudgetProgress(budget);
            const status = getBudgetStatus(progress.percentage);
            
            return (
              <Card key={budget.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{budget.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        {formatPeriodType(budget.period_type)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteBudget(budget.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Badge variant="outline" className="mb-3">
                      {getCategoryName(budget.category_id)}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Spent</span>
                      <span className={status.color}>
                        {formatCurrency(progress.spent)}
                      </span>
                    </div>
                    <Progress 
                      value={progress.percentage} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{progress.percentage.toFixed(1)}% used</span>
                      <span>{formatCurrency(budget.budget_amount)} budget</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Remaining</span>
                      <span className={`font-semibold ${
                        progress.remaining >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(progress.remaining)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <Badge variant={progress.percentage >= 90 ? 'destructive' : 
                                   progress.percentage >= 75 ? 'secondary' : 'default'}>
                      {status.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {budget.start_date.toLocaleDateString()} - {budget.end_date.toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}