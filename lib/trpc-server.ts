/**
 * tRPC Server - 服务端配置
 * 仅在服务端代码中使用
 */

import { initTRPC } from '@trpc/server';
import { cache } from 'react';

// 创建服务端上下文
export const createTRPCContext = cache(async () => {
  return {};
});

// 初始化 tRPC
const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

// 导出类型
export type { AppRouter } from '@/server/routers/_app';
