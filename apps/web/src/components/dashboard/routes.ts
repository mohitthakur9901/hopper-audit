import {
  LayoutDashboard,
  SquareDashedBottom,
} from "lucide-react";

export const sidebarRoutes = [
  {
    title: "Overview",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Applications",
    icon: SquareDashedBottom,
    children: [
      {
        title: "All Applications",
        path: "/dashboard/applications",
      },
      {
        title: "Create Application",
        path: "/dashboard/applications/new",
      },
      {
        title: "Quick Application",
        path: "/dashboard/applications/quick",
      },
      {
        title: "Create Batch",
        path: "/dashboard/applications/batches",
      },
    ],
  },
 
];

// Add more routes as needed
// The `children` property creates nested routes
// All routes should be relative paths (e.g., "/dashboard/orders")