"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Shield,
  Sparkles
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // 模拟登录/注册
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 保存到 localStorage（演示用）
    localStorage.setItem("user", JSON.stringify({
      email: formData.email,
      name: formData.name || formData.email.split('@')[0],
      isLoggedIn: true,
    }));
    
    setIsLoading(false);
    router.push("/portfolio");
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-4">
            <span className="text-slate-950 font-bold text-2xl">AI</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-slate-50">
            {isLogin ? "欢迎回来" : "创建账户"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isLogin ? "登录您的宏观作手账户" : "开始您的投资之旅"}
          </p>
        </div>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">姓名</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="您的姓名"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-slate-400">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-400">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10 bg-slate-800 border-slate-700 text-slate-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-medium h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  "处理中..."
                ) : (
                  <>
                    {isLogin ? "登录" : "注册"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-slate-400 hover:text-amber-400 transition-colors"
              >
                {isLogin ? "还没有账户？立即注册" : "已有账户？立即登录"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          {[
            { icon: Shield, text: "数据安全" },
            { icon: Sparkles, text: "AI分析" },
            { icon: User, text: "个性化" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="text-center">
              <div className="w-10 h-10 mx-auto rounded-lg bg-slate-800 flex items-center justify-center mb-2">
                <Icon className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-xs text-slate-500">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
