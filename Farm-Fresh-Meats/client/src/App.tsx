import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Orders from "@/pages/orders";
import Login from "@/pages/login";
import CustomerDetails from "@/pages/customer-details";
import CustomerNew from "@/pages/customer-new";
import Customers from "@/pages/customers";
import Payments from "@/pages/payments";
import Reports from "@/pages/reports";
import EnkanaMarginTracker from "@/pages/enkana-margin-tracker";
import RequisitionReport from "@/pages/requisition-report";
import DeliveryDispatch from "@/pages/delivery-dispatch";
import ProductsCatalogue from "@/pages/products-catalogue";
import DashboardLayout from "@/components/dashboard-layout";
import Dashboard from "@/pages/dashboard";
import Settings from "@/pages/settings";

function DashboardPages() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/orders" component={Orders} />
        <Route path="/orders/requisition" component={RequisitionReport} />
        <Route path="/orders/dispatch" component={DeliveryDispatch} />
        <Route path="/customers" component={Customers} />
        <Route path="/customers/new" component={CustomerNew} />
        <Route path="/customers/duplicates">{() => <Redirect to="/customers" />}</Route>
        <Route path="/customers/:id" component={CustomerDetails} />
        <Route path="/payments" component={Payments} />
        <Route path="/products" component={ProductsCatalogue} />
        <Route path="/settings" component={Settings} />
        <Route path="/reports" component={Reports} />
        <Route path="/reports/enkana-margin-tracker" component={EnkanaMarginTracker} />
        <Route path="/reports/product-mix" component={Reports} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard/login">{() => <Redirect to="/login" />}</Route>
      <Route path="/orders">{() => <Redirect to="/dashboard/orders" />}</Route>
      <Route path="/orders/requisition">{() => <Redirect to="/dashboard/orders/requisition" />}</Route>
      <Route path="/orders/dispatch">{() => <Redirect to="/dashboard/orders/dispatch" />}</Route>
      <Route path="/customers/:id">{(params) => <Redirect to={`/dashboard/customers/${params.id}`} />}</Route>
      <Route path="/dashboard" nest>
        <DashboardPages />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
