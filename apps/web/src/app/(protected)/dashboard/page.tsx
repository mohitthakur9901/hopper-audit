import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@repo/ui";
import { Activity, Car, CheckCircle, FileText, ShoppingBag, Truck, Users } from "lucide-react";
import { UploadButton } from "../../../components/UploadButton";

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <div className="flex items-center space-x-2">
          <UploadButton />
          <Button type="button" variant={"default"}>New Batch</Button>
        </div>
      </div>
      
     
    </div>
  );
}