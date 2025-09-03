import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, CreditCard, AlertTriangle, Calendar, DollarSign, Edit, Trash2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Debt, CreateDebtInput } from '../../../server/src/schema';

interface DebtManagerProps {
  userId: number;
}

export function DebtManager({ userId }: DebtManagerProps) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Debt form state
  const [debtForm, setDebtForm] = useState<Omit<CreateDebtInput, 'user_id'>>({
    lender: '',
    debt_type: 'credit_card',
    original_amount: 0,
    current_balance: 0,
    interest_rate: 0,
    minimum_payment: 0,
    due_date: null
  });

  // Load debts
  const loadDebts = useCallback(async () => {
    try {
      const result = await trpc.getDebts.query({ userId });
      setDebts(result);
    } catch (error) {
      console.error('Failed to load debts:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  // Create debt
  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newDebt = await trpc.createDebt.mutate({
        ...debtForm,
        user_id: userId
      });
      setDebts(prev => [...prev, newDebt]);
      setDebtForm({
        lender: '',
        debt_type: 'credit_card',
        original_amount: 0,
        current_balance: 0,
        interest_rate: 0,
        minimum_payment: 0,
        due_date: null
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create debt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete debt
  const handleDeleteDebt = async (debtId: number) => {
    try {
      await trpc.deleteDebt.mutate({ debtId, userId });
      setDebts(prev => prev.filter(d => d.id !== debtId));
    } catch (error) {
      console.error('Failed to delete debt:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDebtType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const calculatePayoffProgress = (debt: Debt) => {
    if (debt.original_amount === 0) return 0;
    const paidAmount = debt.original_amount - debt.current_balance;
    return (paidAmount / debt.original_amount) * 100;
  };

  const getDaysTilDue = (dueDate: Date | null) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDebtUrgency = (daysTilDue: number | null) => {
    if (daysTilDue === null) return { color: 'text-gray-500', status: 'No Due Date' };
    if (daysTilDue < 0) return { color: 'text-red-600', status: 'Overdue' };
    if (daysTilDue <= 7) return { color: 'text-red-600', status: 'Due Soon' };
    if (daysTilDue <= 30) return { color: 'text-yellow-600', status: 'Due This Month' };
    return { color: 'text-green-600', status: 'On Track' };
  };

  const getTotalDebt = () => {
    return debts.reduce((total, debt) => total + debt.current_balance, 0);
  };

  const getTotalMonthlyPayments = () => {
    return debts.reduce((total, debt) => total + debt.minimum_payment, 0);
  };

  const getAverageInterestRate = () => {
    if (debts.length === 0) return 0;
    const totalInterest = debts.reduce((total, debt) => total + debt.interest_rate, 0);
    return totalInterest / debts.length;
  };

  const debtTypes = [
    { value: 'loan', label: 'Loan' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'mortgage', label: 'Mortgage' },
    { value: 'personal_loan', label: 'Personal Loan' },
    { value: 'other', label: 'Other' }
  ];

  const totalDebt = getTotalDebt();
  const totalMonthlyPayments = getTotalMonthlyPayments();
  const averageInterestRate = getAverageInterestRate();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDebt)}</div>
            <p className="text-xs text-gray-600 mt-1">
              {debts.length} debt{debts.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalMonthlyPayments)}</div>
            <p className="text-xs text-gray-600 mt-1">Minimum required</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Interest Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{averageInterestRate.toFixed(2)}%</div>
            <p className="text-xs text-gray-600 mt-1">Across all debts</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Debt Management</h2>
          <p className="text-gray-600">Track and manage your loans and debts</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Debt
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Debt</DialogTitle>
              <DialogDescription>
                Record a new loan or debt to track your obligations.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateDebt} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lender">Lender/Creditor</Label>
                <Input
                  id="lender"
                  value={debtForm.lender}
                  onChange={(e) =>
                    setDebtForm(prev => ({ ...prev, lender: e.target.value }))
                  }
                  placeholder="e.g., Chase Bank, Capital One"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="debt-type">Debt Type</Label>
                <Select
                  value={debtForm.debt_type}
                  onValueChange={(value: 'loan' | 'credit_card' | 'mortgage' | 'personal_loan' | 'other') =>
                    setDebtForm(prev => ({ ...prev, debt_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {debtTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="original-amount">Original Amount</Label>
                <Input
                  id="original-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={debtForm.original_amount || ''}
                  onChange={(e) =>
                    setDebtForm(prev => ({ ...prev, original_amount: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-balance">Current Balance</Label>
                <Input
                  id="current-balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={debtForm.current_balance || ''}
                  onChange={(e) =>
                    setDebtForm(prev => ({ ...prev, current_balance: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                <Input
                  id="interest-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={debtForm.interest_rate || ''}
                  onChange={(e) =>
                    setDebtForm(prev => ({ ...prev, interest_rate: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="5.50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimum-payment">Minimum Payment</Label>
                <Input
                  id="minimum-payment"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={debtForm.minimum_payment || ''}
                  onChange={(e) =>
                    setDebtForm(prev => ({ ...prev, minimum_payment: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due-date">Next Due Date (Optional)</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={debtForm.due_date?.toISOString().split('T')[0] || ''}
                  onChange={(e) =>
                    setDebtForm(prev => ({ 
                      ...prev, 
                      due_date: e.target.value ? new Date(e.target.value) : null 
                    }))
                  }
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add Debt'}
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

      {/* Debt List */}
      {debts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No debts recorded</h3>
            <p className="text-gray-600 mb-6">
              Track your loans and debts to better manage your financial obligations
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Add Your First Debt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {debts.map((debt) => {
            const payoffProgress = calculatePayoffProgress(debt);
            const daysTilDue = getDaysTilDue(debt.due_date);
            const urgency = getDebtUrgency(daysTilDue);
            
            return (
              <Card key={debt.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{debt.lender}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">
                          {formatDebtType(debt.debt_type)}
                        </Badge>
                        {debt.due_date && (
                          <span className={`flex items-center gap-1 text-xs ${urgency.color}`}>
                            <Calendar className="h-3 w-3" />
                            {urgency.status}
                          </span>
                        )}
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
                        onClick={() => handleDeleteDebt(debt.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Paid Off Progress</span>
                      <span>{payoffProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={payoffProgress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Current Balance</p>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(debt.current_balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Interest Rate</p>
                      <p className="text-xl font-bold text-yellow-600">{debt.interest_rate}%</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Original Amount</span>
                      <span className="font-medium">{formatCurrency(debt.original_amount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Monthly Payment</span>
                      <span className="font-medium">{formatCurrency(debt.minimum_payment)}</span>
                    </div>
                    {debt.due_date && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Next Due Date</span>
                        <span className={`font-medium ${urgency.color}`}>
                          {debt.due_date.toLocaleDateString()}
                          {daysTilDue !== null && (
                            <span className="text-xs ml-2">
                              ({daysTilDue > 0 ? `${daysTilDue} days` : 'Overdue'})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Amount Paid</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(debt.original_amount - debt.current_balance)}
                      </span>
                    </div>
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