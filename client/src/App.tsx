import { Route, Switch } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import IntegrationLab from "@/pages/IntegrationLab";
import Help from "@/pages/Help";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <TooltipProvider>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/integration-lab" component={IntegrationLab} />
        <Route path="/help" component={Help} />
        <Route component={NotFound} />
      </Switch>
    </TooltipProvider>
  );
}

export default App;
