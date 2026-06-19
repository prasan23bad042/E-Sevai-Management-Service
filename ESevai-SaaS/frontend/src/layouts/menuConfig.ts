import { LayoutDashboard, Building2, Users, ClipboardList, Receipt, ShieldAlert, FileSpreadsheet } from 'lucide-react';

export interface MenuItem {
  label: string;
  path: string;
  icon: any;
}

export const menuConfig: Record<string, MenuItem[]> = {
  platform_admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Centers', path: '/admin/centers', icon: Building2 },
    { label: 'Services Catalog', path: '/admin/services', icon: ShieldAlert },
    { label: 'Reports', path: '/admin/reports', icon: FileSpreadsheet },
  ],
  center_owner: [
    { label: 'Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'Staff Roster', path: '/owner/staff', icon: Users },
    { label: 'Applications', path: '/owner/applications', icon: ClipboardList },
    { label: 'Payments Ledger', path: '/owner/payments', icon: Receipt },
    { label: 'Reports', path: '/owner/reports', icon: FileSpreadsheet },
  ],
  manager: [
    { label: 'Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
    { label: 'Staff Roster', path: '/manager/staff', icon: Users },
    { label: 'Applications Queue', path: '/manager/applications', icon: ClipboardList },
    { label: 'Payments', path: '/manager/payments', icon: Receipt },
  ],
  staff: [
    { label: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
    { label: 'Applications', path: '/staff/applications', icon: ClipboardList },
    { label: 'Payments Collection', path: '/staff/payments', icon: Receipt },
  ],
};
