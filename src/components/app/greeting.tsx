"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const partOfDay = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/** Greets by the visitor's local time (the server's clock may be in another time zone). */
export function Greeting({ name }: { name: string }) {
  const hello = useSyncExternalStore(noopSubscribe, partOfDay, () => "Welcome back");
  return (
    <>
      {hello}, {name}.
    </>
  );
}
