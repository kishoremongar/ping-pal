"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from "react";

interface DeviceContextType {
  deviceId: string | null;
  isLoading: boolean;
  refreshDeviceId: () => void;
}

const DeviceContext = createContext<DeviceContextType>({
  deviceId: null,
  isLoading: true,
  refreshDeviceId: () => {},
});

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error("useDevice must be used within a DeviceProvider");
  }
  return context;
};

interface DeviceProviderProps {
  readonly children: ReactNode;
}

export default function DeviceProvider({ children }: DeviceProviderProps) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getDeviceIdFromCookie = (): string | null => {
    if (typeof window === "undefined") return null;

    try {
      const cookies = document.cookie.split(";");
      const deviceCookie = cookies.find((cookie) =>
        cookie.trim().startsWith("deviceId=")
      );
      return deviceCookie ? deviceCookie.split("=")[1] : null;
    } catch (error) {
      console.error("Error getting device ID from cookie:", error);
      return null;
    }
  };

  const refreshDeviceId = () => {
    const id = getDeviceIdFromCookie();
    setDeviceId(id);
  };

  useEffect(() => {
    const id = getDeviceIdFromCookie();
    setDeviceId(id);
    setIsLoading(false);
  }, []);

  // Listen for cookie changes (useful when device registers)
  useEffect(() => {
    const handleStorageChange = () => {
      refreshDeviceId();
    };

    // Listen for custom events when device ID changes
    window.addEventListener("deviceIdChanged", handleStorageChange);

    return () => {
      window.removeEventListener("deviceIdChanged", handleStorageChange);
    };
  }, []);

  const value = useMemo(
    () => ({
      deviceId,
      isLoading,
      refreshDeviceId,
    }),
    [deviceId, isLoading]
  );

  return (
    <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
  );
}
