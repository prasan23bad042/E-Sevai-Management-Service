import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore, type UserProfile } from '../../store/authStore';
import { useToast } from '../../app/toastProvider';
import { FormInput } from '../../components/forms/FormInput';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { ShieldCheck } from 'lucide-react';
import apiClient from '../../services/apiClient';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

type LoginInputs = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSession, isAuthenticated, user } = useAuthStore();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'platform_admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'center_owner') {
        navigate('/owner/dashboard', { replace: true });
      } else if (user.role === 'manager') {
        navigate('/manager/dashboard', { replace: true });
      } else if (user.role === 'staff') {
        navigate('/staff/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const methods = useForm<LoginInputs>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInputs) => {
    setLoading(true);
    try {
      // Parse with Zod schema manually
      const parseResult = loginSchema.safeParse(data);
      if (!parseResult.success) {
        parseResult.error.issues.forEach((err) => {
          methods.setError(err.path[0] as any, { message: err.message });
        });
        setLoading(false);
        return;
      }

      // Execute login request to backend
      const response = await apiClient.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      const { token, user } = response.data.data;
      
      setSession(token, user as UserProfile);
      toast.success(`Welcome back, ${user.name}!`);

      // Role-based routing redirection
      if (user.role === 'platform_admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'center_owner') {
        navigate('/owner/dashboard');
      } else if (user.role === 'manager') {
        navigate('/manager/dashboard');
      } else if (user.role === 'staff') {
        navigate('/staff/dashboard');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || 'Invalid email or password.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <Card className="w-full max-w-md border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-blue-600/10 rounded-full border border-blue-500/20">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-100">
            E-Sevai Management Portal
          </CardTitle>
          <CardDescription className="text-slate-400">
            Enter your credentials to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
              <FormInput
                name="email"
                label="Email Address"
                placeholder="operator@sevacenter.in"
                type="email"
                autoComplete="email"
              />
              <FormInput
                name="password"
                label="Password"
                placeholder="••••••••"
                type="password"
                autoComplete="current-password"
              />
              <Button type="submit" className="w-full mt-2" isLoading={loading}>
                Sign In
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  );
};
