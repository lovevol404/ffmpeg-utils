import { MainLayout } from '@/components/Layout';
import { useTaskExecutor } from '@/hooks/useTaskExecutor';

function App() {
  useTaskExecutor();
  return <MainLayout />;
}

export default App;