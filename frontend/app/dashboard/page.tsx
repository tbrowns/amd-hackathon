import type { Metadata } from "next";
import { CommunityDashboard } from "@/components/dashboard/community-dashboard";

export const metadata: Metadata = { title: "Community crop-health signals" };
export default function DashboardPage() { return <CommunityDashboard />; }
