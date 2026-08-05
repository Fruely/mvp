import ServiceRequestsAdminView from "./ServiceRequestsAdminView";
import {
  getServiceRequestDetailAdmin,
  listServiceRequestsAdmin,
} from "@/lib/serviceRequests/adminData";
import { getPromotionByServiceRequestIdAdmin } from "@/lib/serviceRequests/promotionAdminData";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ id?: string }>;
};

export default async function AdminServiceRequestsPage({ searchParams }: Props) {
  const { id } = await searchParams;
  const rows = await listServiceRequestsAdmin();
  const detail = id ? await getServiceRequestDetailAdmin(id) : null;
  const promotion = id ? await getPromotionByServiceRequestIdAdmin(id) : null;

  return (
    <ServiceRequestsAdminView
      rows={rows}
      detail={detail}
      promotion={promotion}
      selectedId={id ?? null}
    />
  );
}
