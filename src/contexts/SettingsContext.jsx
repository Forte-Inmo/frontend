import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SettingsContext = createContext({});

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoading] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // maybeSingle evita el error de "multiple rows" y devuelve null si no hay nada
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle();
      
      if (error) {
        // Si la tabla no existe (42P01), capturamos el error para que no rompa la app
        if (error.code === '42P01') {

        } else {

        }
        setSettings(null);
      } else {
        setSettings(data);
      }
    } catch (error) {

      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loadingSettings, refetchSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  return useContext(SettingsContext);
};
