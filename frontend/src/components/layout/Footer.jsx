import React from "react";
import "./Footer.css";

/**
 * 网站页脚组件
 * 包含备案信息、版权信息等
 */
const Footer = () => {
    return (
        <footer className="site-footer">
            <div className="footer-container">
                {/* 主要内容区 */}
                <div className="footer-content">
                    {/* 品牌信息 */}
                    <div className="footer-brand">
                        <div className="footer-logo">
                            <img src="/assets/logo.svg" alt="Dream Log" className="footer-logo-image" />
                            <span className="footer-logo-text">Dream Log</span>
                        </div>
                        <p className="footer-description">
                            记录、分析和解析梦境，探索内心世界的奥秘
                        </p>
                    </div>

                    {/* 快速链接 */}
                    <div className="footer-links">
                        <div className="footer-link-group">
                            <h4>产品功能</h4>
                            <ul>
                                <li><a href="/dreams/create">记录梦境</a></li>
                                <li><a href="/my-dreams">我的梦境</a></li>
                                <li><a href="/explore">探索社区</a></li>
                                <li><a href="/knowledge">梦境知识</a></li>
                            </ul>
                        </div>

                        <div className="footer-link-group">
                            <h4>帮助支持</h4>
                            <ul>
                                <li><a href="/help">使用帮助</a></li>
                                <li><a href="/contact">联系我们</a></li>
                                <li><a href="/feedback">意见反馈</a></li>
                                <li><a href="/faq">常见问题</a></li>
                            </ul>
                        </div>

                        <div className="footer-link-group">
                            <h4>法律信息</h4>
                            <ul>
                                <li><a href="/privacy">隐私政策</a></li>
                                <li><a href="/terms">服务条款</a></li>
                                <li><a href="/cookies">Cookie政策</a></li>
                                <li><a href="/disclaimer">免责声明</a></li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 底部区域 */}
                <div className="footer-bottom">
                    <div className="footer-bottom-content">
                        {/* 版权信息 */}
                        <div className="footer-copyright">
                            <p>&copy; 2024 Dream Log. 保留所有权利.</p>
                        </div>

                        {/* 备案信息 */}
                        <div className="footer-beian">
                            {/* ICP备案号 - 链接到工信部 */}
                            <a
                                href="https://beian.miit.gov.cn/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="beian-link"
                            >
                                豫ICP备2025135141号-1
                            </a>

                            {/* 公安备案号占位符 - 待公安备案完成后更新 */}
                            <span className="beian-police" style={{ display: 'none' }}>
                                {/* 公安备案完成后取消注释并填入正确的备案号 */}
                                {/* <a 
                                    href="http://www.beian.gov.cn/portal/registerSystemInfo" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="beian-link"
                                >
                                    <img src="/assets/beian-police.png" alt="公安备案" className="beian-police-icon" />
                                    豫公网安备 xxxxxxxxxxxxxxx号
                                </a> */}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer; 