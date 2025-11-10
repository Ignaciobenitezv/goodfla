"use client";

import { ShoppingCart } from "lucide-react";
import clsx from "clsx";
import { useCart } from "@/context/CartContext";
import { useUi } from "@/context/UiContext";
import { useMemo } from "react";

type Props = { className?: string; size?: number };

export default function CartButton({ className, size = 22 }: Props) {
  const { items } = useCart();
  const { openCart } = useUi();

  const qty = useMemo(
    () => (items ?? []).reduce((acc, it) => acc + (it.cantidad ?? 1), 0),
    [items]
  );

  return (
    <button
      type="button"
      aria-label="Abrir carrito"
      onClick={openCart}
      className={clsx(
        "relative inline-flex items-center justify-center p-2 rounded-xl active:scale-95 transition",
        className
      )}
    >
      <ShoppingCart width={size} height={size} />
      {qty > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 text-xs leading-5 text-white bg-black rounded-full text-center">
          {qty > 99 ? "99+" : qty}
        </span>
      )}
    </button>
  );
}
