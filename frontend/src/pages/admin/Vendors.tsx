import { Banner, Card } from '../../components/ui';

// NOTE: there is currently no backend endpoint to list, view, or
// suspend/activate vendors (no controller route exists for this in
// src/*). The Prisma schema already has User.status: ACTIVE | SUSPENDED,
// so the data model supports it, but nothing exposes it over the API yet.
// Per instructions not to change backend logic, this page intentionally
// does not call a fabricated endpoint. Once a real route is added
// (e.g. GET /admin/vendors, PATCH /admin/vendors/:id/status), wire this
// page up the same way as the other admin pages.
export default function Vendors() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Vendors</h1>
      <Card>
        <Banner
          kind="info"
          message="Vendor management isn't available yet — the backend doesn't expose an endpoint to list or manage vendor accounts. Add a controller route for it (e.g. GET /admin/vendors) and this page can be wired up the same way as the rest of the admin dashboard."
        />
      </Card>
    </div>
  );
}
