import { SiteHeader } from "@/components/site-header";
import { Meteors } from "@/components/ui/meteors";

/**
 * 认证页面布局
 * - 全屏居中
 * - 使用与首页相同的导航栏
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <Meteors
        number={20}
        minDelay={0}
        maxDelay={0}
        minDuration={8}
        maxDuration={12}
        angle={215}
      />
      <SiteHeader />
      
      {/* 主内容区 */}
      <main className="relative flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
