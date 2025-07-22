import React, { useState, useEffect } from 'react';
import './css/Writer.css';

/**
 * 梦境门户打字机组件
 *
 * @param {Object} props
 * @param {Array} props.texts - 要显示的文本数组，按顺序显示
 * @param {Array} [props.speeds=[100, 60]] - 每段文本的打字速度(毫秒/字符)
 * @param {Array} [props.delays=[500, 0]] - 每段文本的开始延迟时间(毫秒)
 * @param {number} [props.paragraphDelay=800] - 段落之间的延迟时间(毫秒)
 * @param {boolean} [props.showCursor=true] - 是否显示光标
 * @param {Function} [props.onComplete] - 打字完成后的回调函数
 */
const Writer = ({
    texts = [],
    speeds = [60, 40],
    delays = [200, 0],
    paragraphDelay = 0,
    showCursor = true,
    onComplete
}) => {
    const [displayTexts, setDisplayTexts] = useState(Array(texts.length).fill(''));
    const [cursorIndex, setCursorIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [startTyping, setStartTyping] = useState(false);

    // 获取当前文本的打字速度
    const getSpeed = (index) => {
        if (speeds.length > index) return speeds[index];
        return speeds[0] || 100;
    };

    // 打字效果启动
    useEffect(() => {
        if (texts.length === 0) return;

        const timer = setTimeout(() => {
            setStartTyping(true);
        }, delays[0] || 0);

        return () => clearTimeout(timer);
    }, [texts, delays]);

    // 打字效果逻辑
    useEffect(() => {
        if (!startTyping || texts.length === 0) return;

        // 当前处理的文本
        const currentText = texts[cursorIndex];

        if (charIndex < currentText.length) {
            // 继续当前文本的打字
            const timer = setTimeout(() => {
                setDisplayTexts(prev => {
                    const newTexts = [...prev];
                    newTexts[cursorIndex] = currentText.substring(0, charIndex + 1);
                    return newTexts;
                });
                setCharIndex(charIndex + 1);
            }, getSpeed(cursorIndex));

            return () => clearTimeout(timer);
        } else if (cursorIndex < texts.length - 1) {
            // 当前文本完成，准备切换到下一段
            const timer = setTimeout(() => {
                setCursorIndex(cursorIndex + 1);
                setCharIndex(0);
            }, paragraphDelay);

            return () => clearTimeout(timer);
        } else if (!isComplete) {
            // 所有文本都完成了
            setIsComplete(true);
            if (onComplete) {
                onComplete();
            }
        }
    }, [
        startTyping, texts, cursorIndex, charIndex,
        paragraphDelay, onComplete, isComplete, speeds
    ]);

    // 渲染函数
    const renderTypewriterText = () => {
        return texts.map((text, index) => {
            // 确定此段落的样式类名
            const className = index === 0
                ? 'typewriter-title'
                : 'typewriter-description';

            // 仅显示已经开始打字的段落
            if (index > cursorIndex) return null;

            // 决定是否显示光标
            const shouldShowCursor = showCursor && index === cursorIndex && (!isComplete || index === texts.length - 1);

            return (
                <div key={index} className={`typewriter-paragraph ${className}`}>
                    {displayTexts[index]}
                    {shouldShowCursor && <span className="typewriter-cursor" />}
                </div>
            );
        });
    };

    return (
        <div className="typewriter-container">
            {renderTypewriterText()}
        </div>
    );
};

// 导出组件，同时支持默认导出和命名导出
export default Writer;