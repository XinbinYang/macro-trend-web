/**
 * tRPC Client - 客户端配置
 * 仅在客户端代码中使用
 */

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers/_app';

// 创建 React Query 客户端
export const trpcClient = createTRPCReact<AppRouter>();

// 导出类型
export type { AppRouter };