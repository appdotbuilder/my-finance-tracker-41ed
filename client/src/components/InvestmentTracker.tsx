import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Edit, Trash2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Investment, CreateInvestmentInput } from '../../../server/src/schema';

interface InvestmentTrackerProps {
  userId: number;
}

export function InvestmentTracker({ userId }: InvestmentTrackerProps) {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Investment form state
  const [investmentForm, setInvestmentForm] = useState<Omit<CreateInvestmentInput, 'user_id'>>({
    name: '',
    type: 'stock',
    quantity: 0,
    purchase_price: 0,
    current_value: 0,
    purchase_date: new Date()
  });

  // Load investments
  const loadInvestments = useCallback(async () => {
    try {
      const result = await trpc.getInvestments.query({ userId });
      setInvestments(result);
    } catch (error) {
      console.error('Failed to load investments:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadInvestments();
  }, [loadInvestments]);

  // Create investment
  const handleCreateInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newInvestment = await trpc.createInvestment.mutate({
        ...investmentForm,
        user_id: userId
      });
      setInvestments(prev => [...prev, newInvestment]);
      setInvestmentForm({
        name: '',
        type: 'stock',
        quantity: 0,
        purchase_price: 0,
        current_value: 0,
        purchase_date: new Date()
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create investment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete investment
  const handleDeleteInvestment = async (investmentId: number) => {
    try {
      await trpc.deleteInvestment.mutate({ investmentId, userId });
      setInvestments(prev => prev.filter(i => i.id !== investmentId));
    } catch (error) {
      console.error('Failed to delete investment:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const calculateGainLoss = (investment: Investment) => {
    const totalPurchaseValue = investment.quantity * investment.purchase_price;
    const totalCurrentValue = investment.current_value;
    const absoluteGain = totalCurrentValue - totalPurchaseValue;
    const percentageGain = ((totalCurrentValue - totalPurchaseValue) / totalPurchaseValue) * 100;
    
    return {
      absolute: absoluteGain,
      percentage: percentageGain,
      isGain: absoluteGain >= 0
    };
  };

  const getTotalInvestmentValue = () => {
    return investments.reduce((total, inv) => total + inv.current_value, 0);
  };

  const getTotalGainLoss = () => {
    const totalCurrentValue = investments.reduce((total, inv) => total + inv.current_value, 0);
    const totalPurchaseValue = investments.reduce((total, inv) => total + (inv.quantity * inv.purchase_price), 0);
    const absoluteGain = totalCurrentValue - totalPurchaseValue;
    const percentageGain = totalPurchaseValue > 0 ? ((totalCurrentValue - totalPurchaseValue) / totalPurchaseValue) * 100 : 0;
    
    return {
      absolute: absoluteGain,
      percentage: percentageGain,
      isGain: absoluteGain >= 0
    };
  };

  const formatInvestmentType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const investmentTypes = [
    { value: 'stock', label: 'Stock' },
    { value: 'mutual_fund', label: 'Mutual Fund' },
    { value: 'cryptocurrency', label: 'Cryptocurrency' },
    { value: 'bond', label: 'Bond' },
    { value: 'etf', label: 'ETF' },
    { value: 'other', label: 'Other' }
  ];

  const totalValue = getTotalInvestmentValue();
  const totalGainLoss = getTotalGainLoss();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-gray-600 mt-1">
              {investments.length} investment{investments.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
            {totalGainLoss.isGain ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalGainLoss.isGain ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalGainLoss.absolute)}
            </div>
            <p className={`text-xs mt-1 ${totalGainLoss.isGain ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(totalGainLoss.percentage)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Performer</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {investments.length > 0 ? (() => {
              const bestPerformer = investments.reduce((best, current) => {
                const bestGain = calculateGainLoss(best);
                const currentGain = calculateGainLoss(current);
                return currentGain.percentage > bestGain.percentage ? current : best;
              });
              const gain = calculateGainLoss(bestPerformer);
              return (
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {formatPercentage(gain.percentage)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{bestPerformer.name}</p>
                </div>
              );
            })() : (
              <div className="text-lg font-bold text-gray-400">N/A</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Investment Portfolio</h2>
          <p className="text-gray-600">Track and manage your investment holdings</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Investment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Investment</DialogTitle>
              <DialogDescription>
                Record a new investment in your portfolio.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateInvestment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="investment-name">Investment Name</Label>
                <Input
                  id="investment-name"
                  value={investmentForm.name}
                  onChange={(e) =>
                    setInvestmentForm(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Apple Inc. (AAPL)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="investment-type">Type</Label>
                <Select
                  value={investmentForm.type}
                  onValueChange={(value: 'stock' | 'mutual_fund' | 'cryptocurrency' | 'bond' | 'etf' | 'other') =>
                    setInvestmentForm(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {investmentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity/Shares</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={investmentForm.quantity || ''}
                  onChange={(e) =>
                    setInvestmentForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="1.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase-price">Purchase Price (per unit)</Label>
                <Input
                  id="purchase-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={investmentForm.purchase_price || ''}
                  onChange={(e) =>
                    setInvestmentForm(prev => ({ ...prev, purchase_price: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-value">Current Total Value</Label>
                <Input
                  id="current-value"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={investmentForm.current_value || ''}
                  onChange={(e) =>
                    setInvestmentForm(prev => ({ ...prev, current_value: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase-date">Purchase Date</Label>
                <Input
                  id="purchase-date"
                  type="date"
                  value={investmentForm.purchase_date.toISOString().split('T')[0]}
                  onChange={(e) =>
                    setInvestmentForm(prev => ({ ...prev, purchase_date: new Date(e.target.value) }))
                  }
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add Investment'}
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

      {/* Investment List */}
      {investments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No investments yet</h3>
            <p className="text-gray-600 mb-6">
              Start building your investment portfolio by adding your first investment
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Add Your First Investment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {investments.map((investment) => {
            const gainLoss = calculateGainLoss(investment);
            const totalPurchaseValue = investment.quantity * investment.purchase_price;
            
            return (
              <Card key={investment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{investment.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">
                          {formatInvestmentType(investment.type)}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {investment.purchase_date.toLocaleDateString()}
                        </span>
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
                        onClick={() => handleDeleteInvestment(investment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Quantity</p>
                      <p className="text-lg font-semibold">{investment.quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Purchase Price</p>
                      <p className="text-lg font-semibold">{formatCurrency(investment.purchase_price)}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Invested</span>
                      <span className="font-medium">{formatCurrency(totalPurchaseValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Value</span>
                      <span className="font-medium">{formatCurrency(investment.current_value)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Gain/Loss</span>
                      <div className="text-right">
                        <div className={`font-bold ${gainLoss.isGain ? 'text-green-600' : 'text-red-600'}`}>
                          {gainLoss.isGain ? '+' : ''}{formatCurrency(gainLoss.absolute)}
                        </div>
                        <div className={`text-sm ${gainLoss.isGain ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercentage(gainLoss.percentage)}
                        </div>
                      </div>
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