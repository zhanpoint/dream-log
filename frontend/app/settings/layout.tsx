import { Suspense } from "react";
import { SettingsGuard } from "./settings-guard";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <SettingsGuard>{children}</SettingsGuard>
    </Suspense>
  );
}
