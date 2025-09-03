import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { trpc } from '@/utils/trpc';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'request_email' | 'enter_token'>('request_email');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await trpc.requestPasswordReset.mutate({ email });
      setMessage({ type: 'success', text: response.message });
      if (response.token) {
        setToken(response.token); // For demo purposes, pre-fill token
      }
      setStep('enter_token');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset link.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await trpc.resetPassword.mutate({
        email,
        token,
        new_password: newPassword,
      });
      setMessage({ type: 'success', text: response.message + ' You can now log in with your new password.' });
      setNewPassword('');
      setConfirmPassword('');
      setToken('');
      setStep('request_email'); // Reset for next use or direct to login
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertTitle className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {message.type === 'success' ? 'Success!' : 'Error'}
          </AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {step === 'request_email' ? (
        <form onSubmit={handleRequestReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Sending Reset Link...' : 'Request Reset Link'}
          </Button>
          <Button
            type="button"
            variant="link"
            onClick={onBackToLogin}
            className="w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </Button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Reset Token</Label>
            <Input
              id="token"
              type="text"
              value={token}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToken(e.target.value)}
              placeholder="Enter the token from your email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </Button>
          <Button
            type="button"
            variant="link"
            onClick={onBackToLogin}
            className="w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </Button>
        </form>
      )}
    </div>
  );
}