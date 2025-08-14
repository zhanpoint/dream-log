import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useEffect } from "react";
import { initializeFeatureFlags } from "./config/features";

function App() {
    const location = useLocation();

    // 在应用加载时初始化功能开关
    useEffect(() => {
        initializeFeatureFlags();
    }, []);

    // 判断是否为首页
    const isHomePage = location.pathname === '/';

    return (
        <ThemeProvider>
            <AuthProvider>
                <div className="home-container">
                    <Navbar />
                    <main className="main-content">
                        <Outlet />
                    </main>
                    {/* Footer组件仅在首页显示 */}
                    {isHomePage && <Footer />}
                </div>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;