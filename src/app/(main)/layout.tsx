"use client";

// import { ClerkProvider, useUser } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useEffect } from "react";
import TitleBar from "@/components/TitleBar";
import NavBar from "@/components/NavBar";

function AuthLoader({ children }: { children: React.ReactNode }) {
  // const { user, isLoaded } = useUser();
  // const setEffectiveUser = useStoreStore((s) => s.setEffectiveUser);
  // const setMachines = useStoreStore((s) => s.setMachines);
  // const setProducts = useStoreStore((s) => s.setProducts);
  // const setTransactions = useStoreStore((s) => s.setTransactions);
  // const setRefills = useStoreStore((s) => s.setRefills);
  // // const setAdmins = useStoreStore((s) => s.setAdmins);

  // useEffect(() => {
  //   if (!isLoaded) return;
  //   
  //   const fetchEverything = async () => {
  //     try {
  //       const [/* admRes, */ macRes, pRes, tRes, rRes] = await Promise.all([
  //         // fetch('/api/admins').then(res => res.json()),
  //         fetch('/api/machines').then(res => res.json()),
  //         fetch('/api/products').then(res => res.json()),
  //         fetch('/api/transactions').then(res => res.json()),
  //         fetch('/api/refill').then(res => res.json()),
  //       ]);

  //       // if (Array.isArray(admRes)) setAdmins(admRes);
  //       if (Array.isArray(macRes)) setMachines(macRes);
  //       if (Array.isArray(pRes)) setProducts(pRes);
  //       if (Array.isArray(tRes)) setTransactions(tRes);
  //       if (Array.isArray(rRes)) setRefills(rRes);

  //       const userId = user?.id || "anon";
  //       if (user?.id) setEffectiveUser({ userId, role: isAdmin(user?.id) ? "Admin" : "User" });
  //     } catch (err) {
  //       // setEffectiveUser({ userId: user?.id || "anon", role: "User" });
  //     }
  //   };

  //   fetchEverything();
  // }, [user, isLoaded, setEffectiveUser, setMachines, setProducts, setTransactions, setRefills /* , setAdmins */ ]);

  return <>{children}</>;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    // <ClerkProvider
    //   afterSignOutUrl="/home"
    //   appearance={{ theme: dark }}
    // >
      <AuthLoader>
        <TitleBar />
        <div className="min-h-screen -z-90 flex w-full bg-gray-900/10">
          <div className="py-22 h-full flex-1 flex w-full">{children}</div>
        </div>
        <NavBar />
      </AuthLoader>
    // </ClerkProvider>
  );
}
