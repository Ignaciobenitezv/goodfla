"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUi } from "@/context/UiContext";

export default function AddedToCartDialog() {
  const router = useRouter();
  const { addedDialogOpen, addedDialogData, hideAddedDialog } = useUi();

  if (!addedDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* fondo */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={hideAddedDialog}
      />
      {/* caja */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[92vw] max-w-sm rounded-2xl bg-white shadow-2xl p-4"
      >
        <div className="flex items-center gap-3">
          {addedDialogData?.image && (
            <Image
              src={addedDialogData.image}
              alt={addedDialogData.title ?? "Producto agregado"}
              width={56}
              height={56}
              className="rounded object-cover"
            />
          )}
          <div className="flex-1">
            <h3 className="text-base font-semibold">¡Agregado al carrito!</h3>
            {addedDialogData?.title && (
              <p className="text-sm text-gray-600">{addedDialogData.title}</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={hideAddedDialog}
            className="px-3 py-2 rounded-xl border bg-marca-amarillo text-black border-black/10"
          >
            Continuar comprando
          </button>
          <button
            type="button"
            onClick={() => {
              hideAddedDialog();
              router.push("/carrito");
            }}
            className="px-3 py-2 rounded-xl bg-black text-white"
          >
            Finalizar compra
          </button>
        </div>
      </div>
    </div>
  );
}
