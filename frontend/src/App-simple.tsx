// Simplified App to test components one by one
import { BrowserRouter } from 'react-router-dom';

export default function AppSimple() {
  return (
    <BrowserRouter>
      <div className="h-screen w-full bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">App Shell Test</h1>
          <p className="text-xl">If you see this, Tailwind is working</p>
        </div>
      </div>
    </BrowserRouter>
  );
}