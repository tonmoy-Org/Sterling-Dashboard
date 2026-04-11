import React, { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { LogOut, Menu, X } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">Sterling</h1>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Logout"
              >
                <LogOut size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-3">
              <div className="text-sm font-medium text-gray-900">{user?.name}</div>
              <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
