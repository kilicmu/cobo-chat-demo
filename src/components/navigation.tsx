import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeSwitcher } from './theme-switcher';

const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <ul className="bg-base-100 shadow-md menu-horizontal min-h-14 flex items-center gap-4 w-screen px-12">
      <li>Cobo Chat</li>
      <li className="flex-1"></li>
      <li className="btn btn-ghost py-2"><Link to="/" className={location.pathname === '/' ? 'font-bold' : ''}>Home</Link></li>
      <li className="btn btn-ghost py-2"><Link to="/chat" className={location.pathname === '/chat' ? 'font-bold' : ''}>Chat</Link></li>
      <ThemeSwitcher />
    </ul>
  );
};

export default Navigation;
