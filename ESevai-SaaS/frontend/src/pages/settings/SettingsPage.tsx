import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { FormInput } from '../../components/forms/FormInput';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../app/toastProvider';
import { useAuthStore } from '../../store/authStore';
import { Shield, User, Lock, Building, RefreshCw } from 'lucide-react';
import apiClient from '../../services/apiClient';

const profileSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long'),
  email: z.string().email('Please enter a valid email address'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ProfileInputs = z.infer<typeof profileSchema>;
type PasswordInputs = z.infer<typeof passwordSchema>;

export const SettingsPage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  const profileMethods = useForm<ProfileInputs>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  const passwordMethods = useForm<PasswordInputs>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleUpdateProfile = async (data: ProfileInputs) => {
    setSubmitting(true);
    try {
      await apiClient.patch('/auth/profile', data);
      toast.success('User profile updated successfully.');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update user profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePassword = async (data: PasswordInputs) => {
    setSubmitting(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Security password successfully changed.');
      passwordMethods.reset();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Password update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Portal Settings</h2>
        <p className="text-sm text-slate-400">Configure personal credentials, center workspaces, and security settings</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="flex gap-2 items-center">
            <User className="w-4 h-4" /> Profile Details
          </TabsTrigger>
          <TabsTrigger value="password" className="flex gap-2 items-center">
            <Lock className="w-4 h-4" /> Password Security
          </TabsTrigger>
          {user?.role === 'center_owner' && (
            <TabsTrigger value="center" className="flex gap-2 items-center">
              <Building className="w-4 h-4" /> Center Metadata
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>User Details Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <FormProvider {...profileMethods}>
                <form onSubmit={profileMethods.handleSubmit(handleUpdateProfile)} className="space-y-4 max-w-md">
                  <FormInput
                    name="name"
                    label="Full Name"
                    placeholder="Vijay Kumar"
                  />
                  <FormInput
                    name="email"
                    label="User Email Address"
                    placeholder="vijay@sevacenter.in"
                    type="email"
                    disabled // email change requires system verification
                  />
                  <Button type="submit" className="flex items-center gap-2" isLoading={submitting}>
                    <RefreshCw className="w-4 h-4" /> Save Profile Details
                  </Button>
                </form>
              </FormProvider>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Login Password</CardTitle>
            </CardHeader>
            <CardContent>
              <FormProvider {...passwordMethods}>
                <form onSubmit={passwordMethods.handleSubmit(handleUpdatePassword)} className="space-y-4 max-w-md">
                  <FormInput
                    name="currentPassword"
                    label="Current Password"
                    type="password"
                    placeholder="••••••••"
                  />
                  <FormInput
                    name="newPassword"
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                  />
                  <FormInput
                    name="confirmPassword"
                    label="Confirm New Password"
                    type="password"
                    placeholder="••••••••"
                  />
                  <Button type="submit" className="flex items-center gap-2" isLoading={submitting}>
                    <Shield className="w-4 h-4" /> Update Access Credentials
                  </Button>
                </form>
              </FormProvider>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === 'center_owner' && (
          <TabsContent value="center">
            <Card>
              <CardHeader>
                <CardTitle>Center Information Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md text-sm text-slate-305">
                <div>
                  <p className="text-slate-500 text-xs">Assigned Center Tenant ID</p>
                  <p className="font-semibold text-slate-200">{user.tenant_id}</p>
                </div>
                <div className="bg-slate-900/60 p-4 border border-slate-900 rounded-lg">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tenant Isolation Policy</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This center operates on an isolated tenant workspace. All staff rosters, revenue collections, application checklist records, and transaction histories are isolated to this tenant.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
