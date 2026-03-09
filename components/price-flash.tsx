"use client";

import React, { useState, useEffect, useRef } from "react";

interface PriceFlashProps {
  children: React.ReactNode;
  change: number;
  className?: string;
}

/**
 * 价格闪烁动画组件
 * 价格变动时显示闪烁效果（涨绿跌红）
 */
export function PriceFlash({ children, change, className = "" }: PriceFlashProps) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevChangeRef = useRef(change);

  useEffect(() => {
    const prevChange = prevChangeRef.current;
    
    // 判断价格变动方向
    if (change > prevChange) {
      setFlash("up");
    } else if (change < prevChange) {
      setFlash("down");
    }

    // 更新ref
    prevChangeRef.current = change;

    // 清除闪烁效果
    const timer = setTimeout(() => {
      setFlash(null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [change]);

  const flashClass = flash === "up" 
    ? "animate-flash-green" 
    : flash === "down" 
      ? "animate-flash-red" 
      : "";

  return (
    <span className={`${flashClass} ${className}`}>
      {children}
    </span>
  );
}

/**
 * 价格变动数字组件
 * 自动格式化并显示闪烁动画
 */
interface PriceNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function PriceNumber({ 
  value, 
  decimals = 2, 
  prefix = "", 
  suffix = "",
  className = "" 
}: PriceNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const prevValue = prevValueRef.current;
    
    if (value !== prevValue) {
      // 判断变动方向
      if (value > prevValue) {
        setFlash("up");
      } else if (value < prevValue) {
        setFlash("down");
      }

      // 数字滚动效果
      const duration = 500;
      const startTime = Date.now();
      const startValue = displayValue;
      const endValue = value;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 缓动函数
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (endValue - startValue) * easeOut;
        
        setDisplayValue(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
        }
      };

      requestAnimationFrame(animate);
      prevValueRef.current = value;

      // 清除闪烁
      const timer = setTimeout(() => {
        setFlash(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  const flashClass = flash === "up" 
    ? "animate-flash-green" 
    : flash === "down" 
      ? "animate-flash-red" 
      : "";

  const colorClass = value > 0 
    ? "text-data-up" 
    : value < 0 
      ? "text-data-down" 
      : "text-text-secondary";

  return (
    <span className={`${flashClass} ${colorClass} ${className}`}>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
}
