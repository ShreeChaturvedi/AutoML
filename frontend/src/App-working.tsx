/**
 * Simplified working App - strip out complexity to find the issue
 */

import { BrowserRouter } from 'react-router-dom';

export default function AppWorking() {
  console.log('App is rendering!');

  return (
    <BrowserRouter>
      <div className="h-screen w-screen flex flex-col bg-slate-900 text-white">
        {/* Top Bar */}
        <div className="h-14 border-b border-slate-700 bg-slate-800 px-4 flex items-center">
          <h1 className="text-lg font-semibold">AI-Augmented AutoML Toolchain</h1>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-2xl p-8">
            <div className="text-6xl">✨</div>
            <h1 className="text-4xl font-bold">Welcome!</h1>
            <p className="text-xl text-slate-300">
              The app is now rendering. This is a simplified version to test the layout.
            </p>
            <div className="mt-8 p-6 bg-slate-800 rounded-lg border border-slate-700">
              <h2 className="text-lg font-semibold mb-4">What's Working:</h2>
              <ul className="text-left space-y-2 text-slate-300">
                <li>✓ React rendering</li>
                <li>✓ Tailwind CSS</li>
                <li>✓ Router</li>
                <li>✓ Dark theme</li>
                <li>✓ Layout structure</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}