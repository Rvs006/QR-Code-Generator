import Home from "@/pages/home";
import ErrorBoundary from "@/components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <Home />
    </ErrorBoundary>
  );
}

export default App;
