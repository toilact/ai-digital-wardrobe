"use client";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { useAuth } from "@/lib/AuthContext";
import Header from "@/components/Header";

export default function Login() {
    const { user } = useAuth();
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [pass, setPass] = useState("");
    const [loading, setLoading] = useState(false);

    const onLogin = async () => {
        if (!username || !pass) return alert("Nhập tên đăng nhập và mật khẩu");
        setLoading(true);
        if (!auth) {
            alert("Firebase chưa được khởi tạo!");
            setLoading(false);
            return;
        }
        try {
            const loginEmail = `${username.trim().toLowerCase()}@adw.local`;
            await signInWithEmailAndPassword(auth, loginEmail, pass);
            router.push("/");
        } catch (e: any) {
            alert(e?.message ?? "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main >
            <Header />
            <div className="wrap">
                <div className="mt-20 flex items-center justify-center min-h-[60vh]">
                    <div className="w-full max-w-[400px] bg-gray-900 rounded-xl p-6 shadow-2xl flex flex-col items-center">
                        <h2 className="text-3xl font-light text-white mb-2 tracking-tight">
                            Đăng nhập
                        </h2>

                        {/* Form nhập liệu */}
                        <div className="w-full space-y-4">
                            <div className="relative m-2">
                                <input
                                    type="text"
                                    placeholder="Tên đăng nhập"
                                    value={username}
                                    className="w-full border border-gray-300 p-3 outline-none focus:border-blue-400 bg-gray-800 text-white"
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>

                            <div className="relative m-2">
                                <input
                                    type="password"
                                    placeholder="Mật khẩu"
                                    value={pass}
                                    onChange={(e) => setPass(e.target.value)}
                                    className="w-full border border-gray-300 p-3 outline-none focus:border-blue-400 bg-gray-800 text-white"
                                />
                            </div>

                            {/* Nút Login xanh dương */}
                            <div className="m-2">
                                <button
                                    onClick={onLogin}
                                    disabled={loading}
                                    className="w-full bg-[#4a90e2] text-white p-3 font-semibold hover:bg-blue-600 transition-colors"
                                >
                                    {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                                </button>
                            </div>
                        </div>

                        {/* Dòng kẻ ngang hoặc chữ OR */}
                        <div className="w-full flex items-center my-6">
                            <div className="flex-1 h-[1px] bg-gray-200"></div>
                            <span className="px-3 text-xs text-gray-400 uppercase">Hoặc</span>
                            <div className="flex-1 h-[1px] bg-gray-200"></div>
                        </div>

                        {/* Nút Đăng nhập bằng Google */}
                        <div className="pt-2 border-t border-gray-700 w-full">
                            <GoogleLoginButton />
                        </div>

                        {/* Link chuyển hướng */}
                        <div className="flex gap-4 text-sm text-white mt-4">
                            <Link href="/auth/register" className="hover:underline">Đăng ký</Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}