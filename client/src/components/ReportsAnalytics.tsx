import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BarChart3, TrendingUp, TrendingDown, PieChart, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { FinancialSummary, CategorySpending, GetFinancialSummaryInput } from '../../../server/src/schema';

interface ReportsAnalyticsProps {
  userId: number;
}

// Helper functions to calculate date ranges
const getDateRange = (period: 'current_month' | 'last_month' | 'current_year' | 'custom', customRange?: { start_date: Date; end_date: Date }) => {
  const now = new Date();
  
  switch (period) {
    case 'current_month':
      return {
        start_date: new Date(now.getFullYear(), now.getMonth(), 1),
        end_date: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      };
    case 'last_month':
      return {
        start_date: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end_date: new Date(now.getFullYear(), now.getMonth(), 0)
      };
    case 'current_year':
      return {
        start_date: new Date(now.getFullYear(), 0, 1),
        end_date: new Date(now.getFullYear(), 11, 31)
      };
    case 'custom':
      return customRange || { start_date: now, end_date: now };
    default:
      return customRange || { start_date: now, end_date: now };
  }
};

export function ReportsAnalytics({ userId }: ReportsAnalyticsProps) {
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'current_month' | 'last_month' | 'current_year' | 'custom'>('current_month');
  const [customDateRange, setCustomDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end_date: new Date()
  });

  // Load financial data
  const loadFinancialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateRange = getDateRange(reportPeriod, customDateRange);
      
      const summaryInput: GetFinancialSummaryInput = {
        user_id: userId,
        period_start: dateRange.start_date,
        period_end: dateRange.end_date
      };

      const [summary, spending] = await Promise.all([
        trpc.getFinancialSummary.query(summaryInput),
        trpc.getCategorySpending.query({
          user_id: userId,
          period_start: dateRange.start_date,
          period_end: dateRange.end_date
        })
      ]);

      setFinancialSummary(summary);
      setCategorySpending(spending);
    } catch (error) {
      console.error('Failed to load financial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, reportPeriod, customDateRange]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getPeriodLabel = (period: typeof reportPeriod) => {
    switch (period) {
      case 'current_month': return 'Current Month';
      case 'last_month': return 'Last Month';
      case 'current_year': return 'Current Year';
      case 'custom': return 'Custom Period';
      default: return 'Current Month';
    }
  };

  const getTopSpendingCategories = (limit = 5) => {
    return categorySpending
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, limit);
  };

  const getSavingsRate = () => {
    if (!financialSummary || financialSummary.total_income === 0) return 0;
    return ((financialSummary.net_income / financialSummary.total_income) * 100);
  };

  const dateRange = getDateRange(reportPeriod, customDateRange);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-gray-600">Analyze your financial performance and spending patterns</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Select value={reportPeriod} onValueChange={(value: typeof reportPeriod) => setReportPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="current_year">Current Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={loadFinancialData} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Custom Date Range */}
      {reportPeriod === 'custom' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custom Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customDateRange.start_date.toISOString().split('T')[0]}
                  onChange={(e) =>
                    setCustomDateRange(prev => ({ ...prev, start_date: new Date(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customDateRange.end_date.toISOString().split('T')[0]}
                  onChange={(e) =>
                    setCustomDateRange(prev => ({ ...prev, end_date: new Date(e.target.value) }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>
              {getPeriodLabel(reportPeriod)} Summary
            </CardTitle>
          </div>
          <CardDescription>
            {dateRange.start_date.toLocaleDateString()} - {dateRange.end_date.toLocaleDateString()}
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading financial data...</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(financialSummary?.total_income || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(financialSummary?.total_expenses || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  (financialSummary?.net_income || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(financialSummary?.net_income || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
                <PieChart className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  getSavingsRate() >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(getSavingsRate())}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Investment & Debt Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Investment Portfolio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Value</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(financialSummary?.total_investments_value || 0)}
                    </span>
                  </div>
                  {(financialSummary?.total_investments_value || 0) === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No investment data available for this period
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Total Debt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Outstanding Balance</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(financialSummary?.total_debt_balance || 0)}
                    </span>
                  </div>
                  {(financialSummary?.total_debt_balance || 0) === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No debt data available for this period
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Spending Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Spending by Category
              </CardTitle>
              <CardDescription>
                Your top spending categories for {getPeriodLabel(reportPeriod).toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categorySpending.length === 0 ? (
                <div className="text-center py-8">
                  <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No spending data available for this period</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getTopSpendingCategories().map((category, index) => (
                    <div key={category.category_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">
                            #{index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{category.category_name}</p>
                          <p className="text-sm text-gray-600">
                            {category.transaction_count} transaction{category.transaction_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(category.total_amount)}</p>
                        <Badge variant="secondary" className="text-xs">
                          {formatPercentage(category.percentage_of_total)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {categorySpending.length > 5 && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-600 text-center">
                        Showing top 5 categories out of {categorySpending.length} total
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget Performance */}
          {financialSummary?.budget_performance && financialSummary.budget_performance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Budget Performance
                </CardTitle>
                <CardDescription>
                  How well you're sticking to your budgets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {financialSummary.budget_performance.map((budget, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{budget.budget_name}</span>
                        <Badge variant={budget.percentage_used > 100 ? 'destructive' : 
                                       budget.percentage_used > 80 ? 'secondary' : 'default'}>
                          {formatPercentage(budget.percentage_used)} used
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Spent: {formatCurrency(budget.spent_amount)}</span>
                        <span>Budget: {formatCurrency(budget.budget_amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={budget.remaining_amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {budget.remaining_amount >= 0 ? 'Remaining' : 'Over budget'}: {formatCurrency(Math.abs(budget.remaining_amount))}
                        </span>
                      </div>
                      {index < financialSummary.budget_performance.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Health Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Financial Health Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Net Worth Calculation */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Estimated Net Worth</h4>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency((financialSummary?.total_investments_value || 0) - (financialSummary?.total_debt_balance || 0))}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Investments minus total debt
                  </p>
                </div>

                {/* Key Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <h5 className="font-medium mb-1">Income vs Expenses</h5>
                    <p className="text-sm text-gray-600">
                      {(financialSummary?.net_income || 0) >= 0 
                        ? "✅ You're earning more than you spend"
                        : "⚠️ Your expenses exceed your income"
                      }
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <h5 className="font-medium mb-1">Savings Rate</h5>
                    <p className="text-sm text-gray-600">
                      {getSavingsRate() >= 20 
                        ? "✅ Great savings rate!"
                        : getSavingsRate() >= 10
                        ? "👍 Good savings rate"
                        : "📈 Consider increasing your savings"
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}