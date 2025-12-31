import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/clients" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/clients" replace />} />
      </Routes>
    </Router>
  )
}

export default App
