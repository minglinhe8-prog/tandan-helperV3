import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Search from './pages/Search';
import Favorites from './pages/Favorites';
import History from './pages/History';
import Admin from './pages/Admin';
import PrivateRoute from './components/PrivateRoute';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route element={<PrivateRoute />}>
          <Route path="/search" element={<Search />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/history" element={<History />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
