import { ListingFlowLoader } from "@/components/common/listingflow-loader";

export default function DashboardLoading() {
  return (
    <ListingFlowLoader
      label="Opening dealership workspace"
      detail="Loading listings, team activity, trial usage, and dealership style controls."
    />
  );
}
