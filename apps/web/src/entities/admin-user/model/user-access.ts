export interface RoleCatalog {
  roles: {
    code: string;
    label: string;
    landingRoute: string;
    permissions: string[];
  }[];
  permissions: { code: string; label: string; implemented: boolean }[];
}
export interface UserAccessHistory {
  items: {
    id: string;
    occurredAt: string;
    actorName: string;
    summary: string;
    details: {
      before: { roles: string[]; isActive: boolean };
      after: { roles: string[]; isActive: boolean };
      reason: string;
    } | null;
  }[];
  total: number;
  page: number;
  pageSize: number;
}
