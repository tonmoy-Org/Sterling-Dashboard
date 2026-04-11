import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axios';
import GetDeviceInfo from '../components/GetDeviceInfo/GetDeviceInfo';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const device = GetDeviceInfo(); // get current device info

      const response = await axiosInstance.post('/auth/login', {
        email,
        password,
        device // send device object to backend
      });

      const { token, user: userData, devices } = response.data;

      // Save auth
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));

      // Update state
      setUser(userData);
      setIsAuthenticated(true);

      // Optional: you can store devices locally if you want to show in UI later
      localStorage.setItem('userDevices', JSON.stringify(devices));

      return userData;

    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };


  const register = async (name, email, password, role) => {
    try {
      const response = await axiosInstance.post('/auth/register', {
        name,
        email,
        password,
        role,
      });
      const { token, user: userData } = response.data;

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  // Add this function to update user data
  const updateUser = (updatedUserData) => {
    try {
      // Merge existing user data with updated data
      const mergedUserData = {
        ...user,
        ...updatedUserData,
        updatedAt: new Date().toISOString(),
      };

      // Update state
      setUser(mergedUserData);

      // Update localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        const updatedStoredUser = {
          ...parsedUser,
          ...updatedUserData,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('user', JSON.stringify(updatedStoredUser));
      }

      // You can also optionally update the token if needed
      // const token = localStorage.getItem('authToken');
      // if (token) {
      //   // Optionally update token if your backend issues a new one
      // }

      return mergedUserData;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user data');
    }
  };

  // Optional: Add function to refresh user data from server
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axiosInstance.get('/auth/me');
      const userData = response.data.user || response.data.data || response.data;

      // Update both state and localStorage
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error('Error refreshing user:', error);
      // If refresh fails, logout the user
      if (error.response?.status === 401) {
        logout();
      }
      throw new Error('Failed to refresh user data');
    }
  };

  // Optional: Add function to update specific fields
  const updateUserField = (fieldName, value) => {
    try {
      const updatedUser = {
        ...user,
        [fieldName]: value,
        updatedAt: new Date().toISOString(),
      };

      setUser(updatedUser);

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        const updatedStoredUser = {
          ...parsedUser,
          [fieldName]: value,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('user', JSON.stringify(updatedStoredUser));
      }

      return updatedUser;
    } catch (error) {
      console.error('Error updating user field:', error);
      throw new Error(`Failed to update ${fieldName}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        updateUser, // Add this
        refreshUser, // Optional: Add this
        updateUserField, // Optional: Add this
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};