// Debug: Test Tailwind classes without any complex dependencies
export default function AppDebug() {
  console.log('AppDebug is rendering!');

  return (
    <div className="h-screen w-screen bg-red-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg">
        <h1 className="text-4xl font-bold text-black mb-4">
          TAILWIND TEST
        </h1>
        <p className="text-xl text-gray-700">
          If you see this, Tailwind is working.
        </p>
      </div>
    </div>
  );
}