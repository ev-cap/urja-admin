import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";

const reports = [
  {
    name: "Monthly Sales Report",
    description: "Comprehensive sales data for March 2024",
    date: "March 15, 2024",
    size: "2.4 MB",
  },
  {
    name: "User Activity Report",
    description: "User engagement and activity metrics",
    date: "March 10, 2024",
    size: "1.8 MB",
  },
  {
    name: "Financial Summary",
    description: "Q1 2024 financial overview and analysis",
    date: "March 5, 2024",
    size: "3.2 MB",
  },
  {
    name: "Inventory Report",
    description: "Current stock levels and movements",
    date: "March 1, 2024",
    size: "1.5 MB",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and download platform reports
          </p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Generate New Report
        </Button>
      </div>

      {/* Reports Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{report.name}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>{report.date}</p>
                  <p className="mt-1">{report.size}</p>
                </div>
                <Button size="sm" variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

