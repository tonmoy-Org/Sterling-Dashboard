import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { ManagerMenuComponent } from './ManagerMenuComponent';

export const ManagerLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleMenuItemClick = (path) => {
        navigate(path);
    };

    const structuredMenuItems = ManagerMenuComponent({ onMenuItemClick: handleMenuItemClick });

    const getPageTitle = () => {
        const currentPath = location.pathname;
        
        for (const section of structuredMenuItems) {
            for (const item of section.items) {
                if (currentPath === item.path) return item.text;
                if (currentPath.startsWith(item.path + '/')) return item.text;
                
                if (item.subItems) {
                    const subItem = item.subItems.find(sub => {
                        if (currentPath === sub.path) return true;
                        if (currentPath.startsWith(sub.path + '/')) return true;
                        return false;
                    });
                    if (subItem) return subItem.text;
                }
            }
        }

        if (currentPath === '/manager-dashboard') {
            return 'Dashboard';
        }
        
        return 'Manager Dashboard';
    };

    return (
        <DashboardLayout 
            title={getPageTitle()} 
            menuItems={structuredMenuItems}
        >
            <Outlet />
        </DashboardLayout>
    );
};