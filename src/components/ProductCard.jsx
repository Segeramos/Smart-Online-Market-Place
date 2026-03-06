import { Link, useNavigate } from "react-router-dom";
import { addToCart } from "../store/cartStore";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "./ToastProvider.jsx";
import { isWishlisted, toggleWishlist } from "../utils/localLists";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatPrice(v) {
  const n = toNumber(v);
  return n > 0 ? `KSh ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
}

function getBestPrice(p) {
  const best = toNumber(p?.best_price);
  const fallback = toNumber(
    p?.price ??
      p?.base_price ??
      p?.selling_price ??
      p?.current_price ??
      p?.amount
  );
  return best > 0 ? best : fallback;
}

function getOldPrice(p, currentPrice) {
  const old = toNumber(
    p?.old_price ??
      p?.original_price ??
      p?.compare_at_price ??
      p?.market_price ??
      p?.was_price
  );
  return old > currentPrice ? old : 0;
}

function getDiscountPercent(currentPrice, oldPrice) {
  if (!(oldPrice > 0) || !(currentPrice > 0) || oldPrice <= currentPrice) return 0;
  return Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
}

function toAbsoluteUrl(url) {
  if (!url) return "";
  const s = String(url).trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("//")) return `https:${s}`;
  return `${API_BASE}${s.startsWith("/") ? s : `/${s}`}`;
}

function getProductImage(product) {
  const candidates = [
    product?.image,
    product?.image_url,
    product?.photo,
    product?.photo_url,
    product?.thumbnail,
    product?.thumbnail_url,
    product?.primary_image,
    product?.primary_image_url,
    product?.main_image,
    product?.main_photo,
    product?.featured_image,
    product?.featured_photo,

    product?.images?.[0]?.image,
    product?.images?.[0]?.image_url,
    product?.images?.[0]?.url,
    product?.images?.[0]?.file,

    product?.photos?.[0]?.image,
    product?.photos?.[0]?.image_url,
    product?.photos?.[0]?.url,
    product?.photos?.[0]?.file,

    product?.gallery?.[0]?.image,
    product?.gallery?.[0]?.image_url,
    product?.gallery?.[0]?.url,
    product?.gallery?.[0]?.file,
  ].filter(Boolean);

  return candidates.length ? toAbsoluteUrl(candidates[0]) : "";
}

function getBrandName(product) {
  if (typeof product?.brand === "string" && product.brand.trim()) return product.brand;
  if (typeof product?.brand_name === "string" && product.brand_name.trim()) return product.brand_name;
  if (typeof product?.vendor_brand === "string" && product.vendor_brand.trim()) return product.vendor_brand;
  if (product?.brand?.name) return product.brand.name;
  if (product?.manufacturer?.name) return product.manufacturer.name;
  return "";
}

function getStockValue(product) {
  const directNumberFields = [
    product?.stock,
    product?.stock_quantity,
    product?.quantity,
    product?.inventory,
    product?.available_stock,
    product?.qty,
  ];

  for (const v of directNumberFields) {
    if (v !== null && v !== undefined && v !== "") return toNumber(v);
  }

  if (typeof product?.in_stock === "boolean") return product.in_stock ? 1 : 0;
  if (typeof product?.is_in_stock === "boolean") return product.is_in_stock ? 1 : 0;
  if (typeof product?.available === "boolean") return product.available ? 1 : 0;

  return null;
}

export default function ProductCard({ product }) {
  const nav = useNavigate();
  const { show } = useToast();

  const slug = product?.slug;
  const id = product?.id;
  const detailHref = slug ? `/product/${slug}` : id ? `/product/${id}` : "#";

  const name = product?.name || product?.title || "Product";
  const brand = getBrandName(product);
  const price = getBestPrice(product);
  const oldPrice = getOldPrice(product, price);
  const discount = getDiscountPercent(price, oldPrice);
  const image = useMemo(() => getProductImage(product), [product]);

  const stockValue = getStockValue(product);

  // Better stock logic:
  // - if backend sends a stock field, use it
  // - else if boolean exists, use it
  // - else assume item is in stock when it has a valid price
  const inStock = stockValue == null ? price > 0 : stockValue > 0;

  const offers =
    typeof product?.total_offers === "number"
      ? product.total_offers
      : typeof product?.offer_count === "number"
      ? product.offer_count
      : typeof product?.offers_count === "number"
      ? product.offers_count
      : null;

  const [wish, setWish] = useState(() => (slug ? isWishlisted(slug) : false));
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setWish(isWishlisted(slug));
  }, [slug]);

  useEffect(() => {
    setImgError(false);
  }, [image]);

  function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!inStock) {
      show("Out of stock", { type: "warn" });
      return;
    }

    addToCart(product, 1);
    show("Added to cart", { type: "success" });
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
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100">
      <Link to={detailHref} className="block">
        {/* Image area */}
        <div className="relative">
          <div className="h-52 bg-gray-50 flex items-center justify-center overflow-hidden">
            {image && !imgError ? (
              <img
                src={image}
                alt={name}
                className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-sm text-gray-500">Image</span>
            )}
          </div>

          {/* Wishlist button */}
          <button
            type="button"
            onClick={handleWishlist}
            className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded-full bg-white/90 border border-gray-200 hover:bg-white"
            aria-label={wish ? "Remove from wishlist" : "Add to wishlist"}
            title={wish ? "Wishlisted" : "Add to wishlist"}
          >
            {wish ? "♥" : "♡"}
          </button>

          {/* Discount badge */}
          {discount > 0 && (
            <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded-md bg-orange-100 text-orange-700 font-semibold">
              -{discount}%
            </div>
          )}

          {/* Offer badge */}
          {offers != null && offers > 0 && (
            <div
              className={`absolute ${discount > 0 ? "top-10" : "top-2"} right-2 text-xs px-2 py-1 rounded-full bg-yellow-200 text-yellow-900 font-semibold`}
            >
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
            {inStock ? "In stock" : "Out of stock"}
          </div>
        </div>

        {/* Details */}
        <div className="p-4">
          {brand ? (
            <p className="mb-1 text-sm font-medium text-lime-600 line-clamp-1">{brand}</p>
          ) : null}

          <h3 className="font-bold text-sm text-gray-900 line-clamp-2 min-h-[40px]">
            {name}
          </h3>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-cyan-700 font-extrabold">{formatPrice(price)}</p>

              {oldPrice > price && (
                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(oldPrice)}
                  </span>
                  <span className="text-[11px] font-semibold text-orange-600">
                    Save {discount}%
                  </span>
                </div>
              )}
            </div>

            {product?.best_price != null && toNumber(product.best_price) > 0 && (
              <span className="shrink-0 text-[11px] px-2 py-1 rounded-full border bg-cyan-50 text-cyan-700 border-cyan-200">
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
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}