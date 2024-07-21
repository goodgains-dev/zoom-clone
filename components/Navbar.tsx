'use client';

import Image from 'next/image';
import Link from 'next/link';
import { OrganizationSwitcher, SignedIn, UserButton } from "@clerk/nextjs";
import MobileNav from './MobileNav';

const Navbar = () => {
  return (
    <>
      <style jsx global>{`
        .cl-organization-switcher, .cl-organization-switcher * {
          color: white !important;
        }
      `}</style>
      <nav className="flex-between fixed z-50 w-full bg-white-1 px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-1">
          <Image
            src="/icons/logo.svg"
            width={32}
            height={32}
            alt="yoom logo"
            className="max-sm:size-10"
          />
          <p className="text-[26px] font-extrabold text-white max-sm:hidden">
            GoodGains Work
          </p>
        </Link>
        <div className="flex-between gap-5">
          <SignedIn>
            <div className="flex items-center gap-5">
              <OrganizationSwitcher />
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </SignedIn>
          <MobileNav />
        </div>
      </nav>
    </>
  );
};

export default Navbar;
