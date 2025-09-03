import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Transaction, TransactionCategory, CreateTransactionInput, CreateTransactionCategoryInput } from '../../../server/src/schema';

interface TransactionTrackerProps {
  userId: number;
}

export function TransactionTracker({ userId }: TransactionTrackerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  // Transaction form state
  const [transactionForm, setTransactionForm] = useState<Omit<CreateTransactionInput, 'user_id'>>({
    amount: 0,
    description: '',
    type: 'expense',
    category_id: 0,
    transaction_date: new Date()
  });

  // Category form state
  const [categoryForm, setCategoryForm] = useState<Omit<CreateTransactionCategoryInput, 'user_id'>>({
    name: '',
    type: 'expense'
  });

  // Load data
  const loadTransactions = useCallback(async () => {
    try {
      const result = await trpc.getTransactions.query({ userId });
      setTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }, [userId]);

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getTransactionCategories.query({ userId });
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadTransactions();
    loadCategories();
  }, [loadTransactions, loadCategories]);

  // Create transaction
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transactionForm.category_id === 0) return;
    
    setIsLoading(true);
    try {
      const newTransaction = await trpc.createTransaction.mutate({
        ...transactionForm,
        user_id: userId
      });
      setTransactions(prev => [newTransaction, ...prev]);
      setTransactionForm({
        amount: 0,
        description: '',
        type: 'expense',
        category_id: 0,
        transaction_date: new Date()
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newCategory = await trpc.createTransactionCategory.mutate({
        ...categoryForm,
        user_id: userId
      });
      setCategories(prev => [...prev, newCategory]);
      setCategoryForm({
        name: '',
        type: 'expense'
      });
      setIsCategoryDialogOpen(false);
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (transactionId: number) => {
    try {
      await trpc.deleteTransaction.mutate({ transactionId, userId });
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netIncome = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netIncome)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
              <DialogDescription>
                Record a new income or expense transaction.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={transactionForm.type}
                  onValueChange={(value: 'income' | 'expense') =>
                    setTransactionForm(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transactionForm.amount || ''}
                  onChange={(e) =>
                    setTransactionForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={transactionForm.category_id.toString()}
                  onValueChange={(value) =>
                    setTransactionForm(prev => ({ ...prev, category_id: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(c => c.type === transactionForm.type)
                      .map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={transactionForm.transaction_date.toISOString().split('T')[0]}
                  onChange={(e) =>
                    setTransactionForm(prev => ({ ...prev, transaction_date: new Date(e.target.value) }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={transactionForm.description}
                  onChange={(e) =>
                    setTransactionForm(prev => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Enter transaction details..."
                  rows={3}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isLoading || transactionForm.category_id === 0}>
                  {isLoading ? 'Adding...' : 'Add Transaction'}
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

        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Manage Categories</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>
                Create a new transaction category for better organization.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Groceries, Salary, etc."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-type">Type</Label>
                <Select
                  value={categoryForm.type}
                  onValueChange={(value: 'income' | 'expense') =>
                    setCategoryForm(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add Category'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCategoryDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your latest income and expense transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions yet. Add your first transaction above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {transaction.type === 'income' ? (
                      <ArrowUpCircle className="h-8 w-8 text-green-600" />
                    ) : (
                      <ArrowDownCircle className="h-8 w-8 text-red-600" />
                    )}
                    <div>
                      <h3 className="font-semibold">{transaction.description}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                          {getCategoryName(transaction.category_id)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {transaction.transaction_date.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xl font-bold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTransaction(transaction.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}