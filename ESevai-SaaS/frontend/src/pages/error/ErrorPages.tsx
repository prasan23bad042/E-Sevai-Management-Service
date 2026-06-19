import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, HelpCircle, ServerCrash } from 'lucide-react';
import { Button } from '../../components/ui/Button';

// 403 Page - Unauthorized Access Screen
export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full border border-slate-800 bg-slate-950/80 p-8 rounded-lg text-center space-y-4 shadow-xl">
        <div className="flex justify-center">
          <div className="p-3 bg-red-600/10 rounded-full border border-red-500/20">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-100">403 - Access Denied</h2>
        <p className="text-sm text-slate-400">
          You do not have the required permissions to view this resource. Contact your center owner if you believe this is in error.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};

// 404 Page - Not Found Screen
export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full border border-slate-800 bg-slate-950/80 p-8 rounded-lg text-center space-y-4 shadow-xl">
        <div className="flex justify-center">
          <div className="p-3 bg-blue-600/10 rounded-full border border-blue-500/20">
            <HelpCircle className="w-10 h-10 text-blue-500 animate-bounce" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-100">404 - Page Not Found</h2>
        <p className="text-sm text-slate-400">
          The page you are looking for does not exist or has been relocated in the directory.
        </p>
        <Button variant="primary" size="sm" className="w-full mt-2" onClick={() => navigate('/')}>
          Return Home
        </Button>
      </div>
    </div>
  );
};

// 500 Page - Server Error Screen
export const ServerErrorPage: React.FC = () => {

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full border border-slate-800 bg-slate-950/80 p-8 rounded-lg text-center space-y-4 shadow-xl">
        <div className="flex justify-center">
          <div className="p-3 bg-red-600/10 rounded-full border border-red-500/20">
            <ServerCrash className="w-10 h-10 text-red-500 animate-pulse" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-100">500 - Server Error</h2>
        <p className="text-sm text-slate-400">
          An unexpected error occurred on our systems. We have logged the error trace.
        </p>
        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    </div>
  );
};
