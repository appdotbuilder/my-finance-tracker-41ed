import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput, LoginUserInput } from '../../../server/src/schema';

interface AuthFormProps {
  mode: 'login' | 'register';
  onSuccess: (user: User) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function AuthForm({ mode, onSuccess, isLoading, setIsLoading }: AuthFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'register') {
        const registerData: CreateUserInput = {
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name
        };
        const user = await trpc.createUser.mutate(registerData);
        onSuccess(user);
      } else {
        const loginData: LoginUserInput = {
          email: formData.email,
          password: formData.password
        };
        const user = await trpc.loginUser.mutate(loginData);
        if (user) {
          onSuccess(user);
        } else {
          setError('Invalid email or password. Please try again.');
        }
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          placeholder="your.email@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange('password')}
          placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Your password'}
          minLength={mode === 'register' ? 8 : undefined}
          required
        />
      </div>

      {mode === 'register' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              type="text"
              value={formData.first_name}
              onChange={handleInputChange('first_name')}
              placeholder="John"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleInputChange('last_name')}
              placeholder="Doe"
              required
            />
          </div>
        </>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          mode === 'register' ? 'Creating Account...' : 'Signing In...'
        ) : (
          mode === 'register' ? 'Create Account' : 'Sign In'
        )}
      </Button>
    </form>
  );
}