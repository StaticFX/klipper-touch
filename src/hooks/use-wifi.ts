import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface NetworkInfo {
  hostname: string;
  ip_address: string | null;
  wifi_ssid: string | null;
  wifi_signal: string | null;
}

interface WifiNetwork {
  ssid: string;
  signal: number;
  security: string;
  connected: boolean;
}

interface SavedNetwork {
  name: string;
}

export type { NetworkInfo, WifiNetwork, SavedNetwork };

export function useWifi() {
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [wifiList, setWifiList] = useState<WifiNetwork[]>([]);
  const [saved, setSaved] = useState<SavedNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [passwordSsid, setPasswordSsid] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refreshInfo = useCallback(() => {
    invoke<NetworkInfo>("get_network_info")
      .then(setNetwork)
      .catch(() => {});
  }, []);

  const scanWifi = useCallback(() => {
    setScanning(true);
    setError(null);
    invoke<WifiNetwork[]>("scan_wifi")
      .then(setWifiList)
      .catch((e) => setError(String(e)))
      .finally(() => setScanning(false));
  }, []);

  const loadSaved = useCallback(() => {
    invoke<SavedNetwork[]>("list_saved_wifi")
      .then(setSaved)
      .catch(() => {});
  }, []);

  // Fetch everything once on mount
  useEffect(() => {
    refreshInfo();
    scanWifi();
    loadSaved();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAll = useCallback(() => {
    refreshInfo();
    scanWifi();
    loadSaved();
  }, [refreshInfo, scanWifi, loadSaved]);

  const connectToWifi = useCallback(async (ssid: string, pwd: string) => {
    setConnecting(ssid);
    setError(null);
    try {
      await invoke<string>("connect_wifi", { ssid, password: pwd });
      setPasswordSsid(null);
      setPassword("");
      refreshAll();
    } catch (e) {
      setError(String(e));
    } finally {
      setConnecting(null);
    }
  }, [refreshAll]);

  const forgetNetwork = useCallback(async (name: string) => {
    setError(null);
    try {
      await invoke<string>("forget_wifi", { name });
      refreshAll();
    } catch (e) {
      setError(String(e));
    }
  }, [refreshAll]);

  const handleNetworkTap = useCallback((net: WifiNetwork) => {
    if (net.connected) return;
    const isSaved = saved.some((s) => s.name === net.ssid);
    if (net.security && net.security !== "" && net.security !== "--" && !isSaved) {
      setPasswordSsid(net.ssid);
      setPassword("");
    } else {
      connectToWifi(net.ssid, "");
    }
  }, [saved, connectToWifi]);

  const clearPassword = useCallback(() => {
    setPasswordSsid(null);
    setPassword("");
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    network, wifiList, saved, scanning, connecting,
    passwordSsid, password, setPassword, error,
    scanWifi, connectToWifi, forgetNetwork, handleNetworkTap,
    clearPassword, clearError,
  };
}
