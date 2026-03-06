import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { getRole, isAuthed, clearAuth } from "../store/authStore";

const MarketplaceContext = createContext(null);

export function MarketplaceProvider({ children }) {
  // marketplace
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);

  // auth snapshot (derived from authStore)
  const [authed, setAuthed] = useState(() => isAuthed());
  const [role, setRole] = useState(() => getRole());

  // keep auth snapshot fresh (storage updates across tabs)
  useEffect(() => {
    const sync = () => {
      setAuthed(isAuthed());
      setRole(getRole());
    };
    sync();
    window.addEventListener("storage", sync);

    // also poll lightly (covers same-tab login/logout if authStore doesn't emit events)
    const t = setInterval(sync, 500);

    return () => {
      window.removeEventListener("storage", sync);
      clearInterval(t);
    };
  }, []);

  const logout = () => {
    clearAuth();
    setAuthed(false);
    setRole(null);
  };

  const value = useMemo(
    () => ({
      // marketplace
      search,
      setSearch,
      activeCategory,
      setActiveCategory,

      // auth
      authed,
      role,
      logout,
    }),
    [search, activeCategory, authed, role]
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export const useMarketplace = () => useContext(MarketplaceContext);