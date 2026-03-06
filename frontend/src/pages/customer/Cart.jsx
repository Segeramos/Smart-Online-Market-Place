import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  cartTotals,
  clearCart,
  getCartItems,
  removeFromCart,
  updateQty,
} from "../../store/cartStore";

function getItemPrice(i) {
  const v = i?.best_price ?? i?.price ?? i?.base_price ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clampQty(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

export default function Cart() {
  const [items, setItems] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    setItems(getCartItems());
  }, []);

  const { subtotal } = useMemo(() => cartTotals(items), [items]);

  const hasItems = items.length > 0;

  const onClear = () => {
    const ok = window.confirm("Clear all items from your cart?");
    if (!ok) return;
    setItems(clearCart());
  };

  const onRemove = (slug) => {
    setItems(removeFromCart(slug));
  };

  const onQtyChange = (slug, nextQty) => {
    setItems(updateQty(slug, clampQty(nextQty)));
  };

  const inc = (slug, current) => onQtyChange(slug, clampQty(current) + 1);
  const dec = (slug, current) => onQtyChange(slug, clampQty(current) - 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Items */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold">Cart</h2>

          {hasItems && (
            <button
              onClick={onClear}
              className="text-sm text-red-600 hover:underline"
            >
              Clear Cart
            </button>
          )}
        </div>

        {!hasItems ? (
          <div className="text-gray-600">
            Your cart is empty.{" "}
            <Link className="text-cyan-700 underline" to="/">
              Shop now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((i) => {
              const price = getItemPrice(i);
              const qty = clampQty(i.qty);
              const itemTotal = price * qty;

              return (
                <div
                  key={i.slug || i.id || i._id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border rounded-2xl p-4"
                >
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{i.name}</div>

                    <div className="text-sm text-gray-600 mt-1">
                      Price:{" "}
                      <span className="font-semibold">
                        KSh {price.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      Item total:{" "}
                      <span className="font-semibold">
                        KSh {itemTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => dec(i.slug, qty)}
                        className="px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
                        disabled={qty <= 1}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>

                      <input
                        className="w-16 text-center py-2 outline-none"
                        type="number"
                        min="1"
                        value={qty}
                        onChange={(e) => onQtyChange(i.slug, e.target.value)}
                      />

                      <button
                        type="button"
                        onClick={() => inc(i.slug, qty)}
                        className="px-3 py-2 hover:bg-gray-50"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="text-red-600 text-sm hover:underline"
                      onClick={() => onRemove(i.slug)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl shadow p-5 h-fit">
        <h3 className="text-lg font-extrabold mb-3">Summary</h3>

        <div className="flex justify-between mb-2 text-gray-700">
          <span>Subtotal</span>
          <span className="font-bold">KSh {subtotal.toFixed(2)}</span>
        </div>

        <div className="text-xs text-gray-500">
          Delivery fees (if any) will be calculated at checkout.
        </div>

        <button
          disabled={!hasItems}
          onClick={() => nav("/checkout")}
          className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold p-3 rounded-xl disabled:opacity-50"
        >
          Proceed to Checkout
        </button>

        <Link
          to="/"
          className="block text-center mt-3 text-sm text-cyan-700 hover:underline"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
