import { Routes, Route } from 'react-router-dom';

const Dashboard = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100">
    <div className="bg-white p-8 rounded-xl shadow-lg text-center">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">PPFS Dashboard</h1>
      <p className="text-slate-600">Frontend (Vite + React 19 + Tailwind v4) is Ready!</p>
    </div>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
    </Routes>
  );
}

export default App;