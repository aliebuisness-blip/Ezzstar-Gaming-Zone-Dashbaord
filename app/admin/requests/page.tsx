import { ListingRequestsPanel } from "@/components/ListingRequestsPanel";
import { requirePageRole } from "@/lib/page-auth";

export default async function AdminRequestsPage() {
  await requirePageRole("admin");
  return <ListingRequestsPanel />;
}
