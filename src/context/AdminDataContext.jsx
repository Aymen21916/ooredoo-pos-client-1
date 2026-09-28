import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';

const AdminDataContext = createContext();

export function AdminDataProvider({ children }) {
  const { user } = useAuth();
  
  // The global memory state
  const [adminData, setAdminData] = useState({
    products: [],
    productCategories: [],
    offers: [],
    offerCategories: [],
    users: [],
    stores: []
  });
  
  const [isPreloading, setIsPreloading] = useState(true);

  const prefetchAll = async () => {
    // Only fetch if the user is logged in AND is an admin
    if (!user || user.role !== 'admin') {
      setIsPreloading(false);
      return;
    }
    
    setIsPreloading(true);
    try {
      // Fire all API requests simultaneously for maximum speed
      const [prodRes, pCatRes, offRes, oCatRes, userRes, customerRes] = await Promise.all([
        api.get('/products').catch(() => ({ data: { data: [] } })),
        api.get('/products/categories').catch(() => ({ data: { data: [] } })),
        api.get('/offers').catch(() => ({ data: { data: [] } })),
        api.get('/offers/categories').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } }))
      ]);

      setAdminData({
        products: prodRes.data.data,
        productCategories: pCatRes.data.data,
        offers: offRes.data.data,
        offerCategories: oCatRes.data.data,
        users: userRes.data.data
      });
    } catch (error) {
      console.error("Failed to preload admin data into memory:", error);
    } finally {
      setIsPreloading(false);
    }
  };

  // Run the pre-fetch exactly once when the user logs in
  useEffect(() => {
    prefetchAll();
  }, [user]);

  return (
    <AdminDataContext.Provider value={{ adminData, isPreloading, refreshAdminData: prefetchAll }}>
      {children}
    </AdminDataContext.Provider>
  );
}

// Custom hook to easily access the memory from any page
export const useAdminData = () => useContext(AdminDataContext);