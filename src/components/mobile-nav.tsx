"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { NAV_ICONS } from "./nav-icons";
import type { NavLink } from "./nav-links";

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return <div className="mobile-nav">
    <button
      className="btn mobile-nav-toggle"
      aria-label={open ? "بستن منو" : "باز کردن منو"}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
    >
      {open ? <X size={20}/> : <Menu size={20}/>}
    </button>
    <AnimatePresence>
      {open ? <motion.nav
        className="mobile-nav-panel"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        {links.map(({ href, label, icon }) => {
          const Icon = NAV_ICONS[icon];
          return <Link key={href} href={href} onClick={() => setOpen(false)} className={pathname === href ? "active" : undefined}>
            <Icon size={18}/><span>{label}</span>
          </Link>;
        })}
      </motion.nav> : null}
    </AnimatePresence>
  </div>;
}
