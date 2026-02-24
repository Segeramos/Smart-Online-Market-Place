import { Link, useNavigate } from "react-router-dom";
import { addToCart } from "../store/cartStore";
import { useEffect, useState } from "react";
import { useToast } from "./ToastProvider.jsx";
import { isWishlisted, toggleWishlist } from "../utils/localLists";

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getBestPrice(p) {
  const best = toNumber(p?.best_price);
  const fallback = toNumber(p?.price ?? p?.base_price);
  return best > 0 ? best : fallback;
}

export default function ProductCard({ product }) {
  const nav = useNavigate();
  const { show } = useToast();

  const slug = product?.slug;
  const name = product?.name || "Product";
  const price = getBestPrice(product);

  const stock = product?.stock;
  const inStock = stock == null ? price > 0 : toNumber(stock) > 0;

  const offers = typeof product?.total_offers === "number" ? product.total_offers : null;

  // ✅ Wishlist (localStorage)
  const [wish, setWish] = useState(() => (slug ? isWishlisted(slug) : false));

  useEffect(() => {
    if (!slug) return;
    setWish(isWishlisted(slug));
  }, [slug]);

  function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!inStock) {
      show("Out of stock", { type: "warn" });
      return;
    }

    addToCart(product, 1);

    // ✅ toast feedback
    show("Added to cart", { type: "success" });

    // Keep your current flow:
    nav("/cart");
  }

  function handleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!slug) return;

    const set = toggleWishlist(slug);
    const nowWish = set.has(slug);
    setWish(nowWish);
    show(nowWish ? "Added to wishlist" : "Removed from wishlist", { type: "success" });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100">
      <Link to={slug ? `/product/${slug}` : "#"} className="block">
        {/* Image area */}
        <div className="relative">
          <div className="h-44 bg-gray-100 flex items-center justify-center">
            <span className="text-sm text-gray-500">Image</span>
          </div>

          {/* ✅ Wishlist button */}
          <button
            type="button"
            onClick={handleWishlist}
            className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded-full bg-white/90 border border-gray-200 hover:bg-white"
            aria-label={wish ? "Remove from wishlist" : "Add to wishlist"}
            title={wish ? "Wishlisted" : "Add to wishlist"}
          >
            {wish ? "♥" : "♡"}
          </button>

          {/* Offer badge */}
          {offers != null && offers > 0 && (
            <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-yellow-200 text-yellow-900 font-semibold">
              {offers} offer{offers === 1 ? "" : "s"}
            </div>
          )}

          {/* Stock badge */}
          <div
            className={[
              "absolute top-2 left-2 text-xs px-2 py-1 rounded-full font-semibold border",
              inStock
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200",
            ].join(" ")}
          >
            {inStock ? "In stock" : "Out"}
          </div>
        </div>

        {/* Details */}
        <div className="p-4">
          <h3 className="font-bold text-sm text-gray-900 line-clamp-2">{name}</h3>

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-cyan-700 font-extrabold">
              {price > 0 ? `KSh ${price.toFixed(2)}` : "—"}
            </p>

            {product?.best_price != null && toNumber(product.best_price) > 0 && (
              <span className="text-[11px] px-2 py-1 rounded-full border bg-cyan-50 text-cyan-700 border-cyan-200">
                Best price
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Add to cart */}
      <div className="px-4 pb-4">
        <button
          onClick={handleAddToCart}
          disabled={!inStock}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 rounded-xl text-sm disabled:opacity-50"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
