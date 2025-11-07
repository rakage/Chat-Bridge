"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface CompanyContextType {
  isSwitching: boolean;
  triggerCompanySwitch: () => void;
  finishCompanySwitch: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [isSwitching, setIsSwitching] = useState(false);

  const triggerCompanySwitch = useCallback(() => {
    console.log("🔄 Company switch triggered");
    setIsSwitching(true);
  }, []);

  const finishCompanySwitch = useCallback(() => {
    console.log("✅ Company switch finished");
    setIsSwitching(false);
  }, []);

  return (
    <CompanyContext.Provider
      value={{
        isSwitching,
        triggerCompanySwitch,
        finishCompanySwitch,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanySwitch() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompanySwitch must be used within a CompanyProvider");
  }
  return context;
}
