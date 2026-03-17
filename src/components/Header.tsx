"use client";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import ProfileDrawer from "./ProfileDrawer";
import { useState, useEffect } from "react";
import AlertModal from "./AlertModal";
import {
    getUserAccount,
    getUserProfile,
    hasActiveVip,
    type UserAccount,
    type UserProfile,
} from "@/lib/profile";

import { FiMoreVertical } from "react-icons/fi";

function emailPrefix(email?: string | null) {
    return (email || "").split("@")[0] || "";
}

function initialsFrom(name?: string | null, email?: string | null) {
    const base = (name || "").trim() || emailPrefix(email) || "U";
    const parts = base.split(/\s+/).filter(Boolean);
    const a = (parts[0]?.[0] || "U").toUpperCase();
    const b = (parts[1]?.[0] || "").toUpperCase();
    return (a + b) || "U";
}

export default function Header() {
    const { user } = useAuth();
    const [profileOpen, setProfileOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [account, setAccount] = useState<UserAccount | null>(null);
    const [alertMsg, setAlertMsg] = useState("");

    const resolvedEmail = account?.email || user?.email;
    const resolvedDisplayName = account?.displayName || user?.displayName;
    const initials = initialsFrom(resolvedDisplayName, resolvedEmail);
    const vipActive = hasActiveVip(account ?? profile ?? null);

    useEffect(() => {
        if (!user) return;

        Promise.all([
            getUserProfile(user.uid),
            getUserAccount(user.uid),
        ])
            .then(([nextProfile, nextAccount]) => {
                setProfile(nextProfile);
                setAccount(nextAccount);
            })
            .catch(() => { });
    }, [user]);

    return (
        <>
            <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-md border-b border-white/10 shadow-lg">
                <div className="flex justify-between items-center py-4 px-6 relative max-w-[1400px] mx-auto">
                    {/* Tên trang web bên trái */}
                    <div className="text-2xl font-bold grad-text z-10">
                        <Link href="/">AI Digital Wardrobe</Link>
                    </div>

                    {/* Menu ở giữa */}
                    <nav className="hidden md:flex absolute inset-0 items-center justify-center space-x-8 pointer-events-none">
                        <Link href="/" className="text-white/80 hover:text-white transition-colors pointer-events-auto font-medium">
                            Trang chủ
                        </Link>
                        <Link
                            href="/dashboard"
                            className="text-white/80 hover:text-white transition-colors pointer-events-auto font-medium"
                            onClick={(e) => {
                                if (!user) {
                                    e.preventDefault();
                                    setAlertMsg("Vui lòng đăng nhập để truy cập Tủ đồ thông minh");
                                }
                            }}
                        >
                            Tủ đồ thông minh
                        </Link>
                        <Link href="/services" className="text-white/80 hover:text-white transition-colors pointer-events-auto font-medium">
                            Dịch vụ
                        </Link>
                        <Link href="/about" className="text-white/80 hover:text-white transition-colors pointer-events-auto font-medium">
                            Về chúng tôi
                        </Link>
                    </nav>

                    {/* Bên phải: Nút Bắt đầu hoặc avatar + Mobile Menu */}
                    <div className="text-white z-10 flex items-center justify-end gap-3">
                        {user ? (
                            <>
                                {(account || profile) && (

                                    <div
                                        className={`hidden sm:flex px-4 py-1.5 text-sm font-bold rounded-lg border items-center gap-1.5 ${
                                            vipActive
                                                ? "bg-gradient-to-r from-yellow-400 to-amber-600 text-white border-yellow-300/50 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                                                : "bg-white/10 text-white/80 border-white/20"
                                        }`}
                                    >
                                        {vipActive ? (
                                            <>
                                                <span className="text-base leading-none">♛</span> VIP
                                            </>
                                        ) : "Thường"}
                                    </div>
                                )}
                                <button
                                    onClick={() => setProfileOpen(true)}
                                    className="w-11 h-11 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 overflow-hidden flex items-center justify-center"
                                    aria-label="Open profile"
                                    title="Xem profile"
                                >
                                    {user.photoURL ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-semibold text-white/90">{initials}</span>
                                    )}
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/auth/login"
                                className="bg-gradient-to-r from-blue-500 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-pink-600 transition-colors"
                            >
                                Bắt đầu
                            </Link>
                        )}

                        {/* Nút 3 chấm mobile */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 -mr-2 text-white/80 hover:text-white transition-colors"
                            aria-label="Toggle mobile menu"
                        >
                            <FiMoreVertical size={24} />
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-white/10 bg-black/80 backdrop-blur-xl absolute w-full left-0 top-full shadow-2xl">
                        <div className="flex flex-col py-4 px-6 space-y-4">
                            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white font-medium text-lg">Trang chủ</Link>
                            <Link
                                href="/dashboard"
                                onClick={(e) => {
                                    if (!user) {
                                        e.preventDefault();
                                        setAlertMsg("Vui lòng đăng nhập để truy cập Tủ đồ thông minh");
                                    } else {
                                        setMobileMenuOpen(false);
                                    }
                                }}
                                className="text-white/80 hover:text-white font-medium text-lg"
                            >
                                Tủ đồ thông minh
                            </Link>
                            <Link href="/services" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white font-medium text-lg">Dịch vụ</Link>
                            <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white font-medium text-lg">Về chúng tôi</Link>
                        </div>
                    </div>
                )}
            </header>

            {/* ProfileDrawer */}
            <ProfileDrawer
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                user={{
                    email: resolvedEmail,
                    displayName: resolvedDisplayName,
                    photoURL: user?.photoURL,
                    username: account?.username,
                }}
                account={user ? account : null}
                profile={user ? profile : null}
            />
            <AlertModal isOpen={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg("")} />
        </>
    );
}
