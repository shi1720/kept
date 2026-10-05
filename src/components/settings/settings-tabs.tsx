"use client";
import {useState, useEffect, type ReactNode} from "react";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";
export function SettingsTabs({children,security}:{children:ReactNode;security:boolean}) {
 const [tab,setTab]=useState("profile");
 useEffect(()=>{const hash=window.location.hash.slice(1);if(["profile","ai","payouts","security"].includes(hash)){const t=setTimeout(()=>setTab(hash),0);return()=>clearTimeout(t);}},[]);
 return <Tabs value={tab} onValueChange={value=>{setTab(value);history.replaceState(null,"",`#${value}`);}} className="min-w-0 space-y-5"><TabsList className="w-full justify-start rounded-xl bg-white p-1.5"><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="ai">AI providers</TabsTrigger><TabsTrigger value="payouts">Payouts</TabsTrigger>{security&&<TabsTrigger value="security">Security</TabsTrigger>}</TabsList>{children}</Tabs>;
}
