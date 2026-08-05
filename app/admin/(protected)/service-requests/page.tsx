import ServiceRequestsAdminView from "./ServiceRequestsAdminView";
import {
  getServiceRequestDetailAdmin,
  listServiceRequestsAdmin,
} from "@/lib/serviceRequests/adminData";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ id?: string }>;
};

export default async function AdminServiceRequestsPage({ searchParams }: Props) {
  const { id } = await searchParams;
  const rows = await listServiceRequestsAdmin();
  const detail = id ? await getServiceRequestDetailAdmin(id) : null;

  return (
    <ServiceRequestsAdminView
      rows={rows}
      detail={detail}
      selectedId={id ?? null}
    />
  );
}
