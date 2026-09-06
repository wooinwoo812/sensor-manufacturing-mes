export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  isDemo: boolean;
  roles: { code: string; label: string }[];
  createdAt: string;
  updatedAt: string;
}
