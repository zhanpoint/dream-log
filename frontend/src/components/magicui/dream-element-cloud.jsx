"use client";
import React, { useEffect, useRef, useState } from "react";

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

export function DreamElementCloud({ elements = [] }) {
    const canvasRef = useRef(null);
    const [elementPositions, setElementPositions] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [targetRotation, setTargetRotation] = useState(null);
    const animationFrameRef = useRef();
    const rotationRef = useRef({ x: 0, y: 0 });

    // Generate initial element positions on a sphere
    useEffect(() => {
        if (elements.length === 0) return;

        const newElements = [];
        const numElements = elements.length;

        // Fibonacci sphere parameters
        const offset = 2 / numElements;
        const increment = Math.PI * (3 - Math.sqrt(5));

        for (let i = 0; i < numElements; i++) {
            const y = i * offset - 1 + offset / 2;
            const r = Math.sqrt(1 - y * y);
            const phi = i * increment;

            const x = Math.cos(phi) * r;
            const z = Math.sin(phi) * r;

            newElements.push({
                x: x * 120,
                y: y * 120,
                z: z * 120,
                scale: 1,
                opacity: 1,
                id: i,
                element: elements[i],
            });
        }
        setElementPositions(newElements);
    }, [elements]);

    // Handle mouse events
    const handleMouseDown = (e) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect || !canvasRef.current) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        elementPositions.forEach((element) => {
            const cosX = Math.cos(rotationRef.current.x);
            const sinX = Math.sin(rotationRef.current.x);
            const cosY = Math.cos(rotationRef.current.y);
            const sinY = Math.sin(rotationRef.current.y);

            const rotatedX = element.x * cosY - element.z * sinY;
            const rotatedZ = element.x * sinY + element.z * cosY;
            const rotatedY = element.y * cosX + rotatedZ * sinX;

            const screenX = canvasRef.current.width / 2 + rotatedX;
            const screenY = canvasRef.current.height / 2 + rotatedY;

            const scale = (rotatedZ + 200) / 300;
            const radius = 30 * scale;
            const dx = x - screenX;
            const dy = y - screenY;

            if (dx * dx + dy * dy < radius * radius) {
                const targetX = -Math.atan2(element.y, Math.sqrt(element.x * element.x + element.z * element.z));
                const targetY = Math.atan2(element.x, element.z);

                const currentX = rotationRef.current.x;
                const currentY = rotationRef.current.y;
                const distance = Math.sqrt(Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2));

                const duration = Math.min(2000, Math.max(800, distance * 1000));

                setTargetRotation({
                    x: targetX,
                    y: targetY,
                    startX: currentX,
                    startY: currentY,
                    distance,
                    startTime: performance.now(),
                    duration,
                });
                return;
            }
        });

        setIsDragging(true);
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setMousePos({ x, y });
        }

        if (isDragging) {
            const deltaX = e.clientX - lastMousePos.x;
            const deltaY = e.clientY - lastMousePos.y;

            rotationRef.current = {
                x: rotationRef.current.x + deltaY * 0.002,
                y: rotationRef.current.y + deltaX * 0.002,
            };

            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Animation and rendering
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
            const dx = mousePos.x - centerX;
            const dy = mousePos.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const speed = 0.003 + (distance / maxDistance) * 0.01;

            if (targetRotation) {
                const elapsed = performance.now() - targetRotation.startTime;
                const progress = Math.min(1, elapsed / targetRotation.duration);
                const easedProgress = easeOutCubic(progress);

                rotationRef.current = {
                    x: targetRotation.startX + (targetRotation.x - targetRotation.startX) * easedProgress,
                    y: targetRotation.startY + (targetRotation.y - targetRotation.startY) * easedProgress,
                };

                if (progress >= 1) {
                    setTargetRotation(null);
                }
            } else if (!isDragging) {
                rotationRef.current = {
                    x: rotationRef.current.x + (dy / canvas.height) * speed,
                    y: rotationRef.current.y + (dx / canvas.width) * speed,
                };
            }

            // Sort elements by depth (z-coordinate) for proper rendering order
            const sortedElements = [...elementPositions].sort((a, b) => {
                const aZ = a.x * Math.sin(rotationRef.current.y) + a.z * Math.cos(rotationRef.current.y);
                const bZ = b.x * Math.sin(rotationRef.current.y) + b.z * Math.cos(rotationRef.current.y);
                return aZ - bZ; // Render back to front
            });

            sortedElements.forEach((element) => {
                const cosX = Math.cos(rotationRef.current.x);
                const sinX = Math.sin(rotationRef.current.x);
                const cosY = Math.cos(rotationRef.current.y);
                const sinY = Math.sin(rotationRef.current.y);

                const rotatedX = element.x * cosY - element.z * sinY;
                const rotatedZ = element.x * sinY + element.z * cosY;
                const rotatedY = element.y * cosX + rotatedZ * sinX;

                const scale = Math.max(0.3, Math.min(1.2, (rotatedZ + 200) / 300));
                const opacity = Math.max(0.3, Math.min(1, (rotatedZ + 150) / 200));

                ctx.save();
                ctx.translate(canvas.width / 2 + rotatedX, canvas.height / 2 + rotatedY);
                ctx.scale(scale, scale);
                ctx.globalAlpha = opacity;

                // Draw element background
                const bgRadius = 35;
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bgRadius);
                gradient.addColorStop(0, `${element.element.color}80`);
                gradient.addColorStop(1, `${element.element.color}20`);

                ctx.beginPath();
                ctx.arc(0, 0, bgRadius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Draw border
                ctx.beginPath();
                ctx.arc(0, 0, bgRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `${element.element.color}CC`;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw element name only (remove count display)
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `bold ${Math.max(10, 14 * scale)}px Arial`;
                ctx.strokeStyle = 'rgba(0,0,0,0.8)';
                ctx.lineWidth = 2;
                ctx.strokeText(element.element.name, 0, 0);
                ctx.fillText(element.element.name, 0, 0);

                ctx.restore();
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [elements, elementPositions, isDragging, mousePos, targetRotation]);

    return (
        <canvas
            ref={canvasRef}
            width={400}
            height={400}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="rounded-lg cursor-grab active:cursor-grabbing"
            aria-label="Interactive 3D Dream Elements Cloud"
            role="img"
            style={{ touchAction: 'none' }}
        />
    );
}
