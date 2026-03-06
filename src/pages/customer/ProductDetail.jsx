// src/pages/ProductDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProductDetail } from "../../api/products";
import { addToCart } from "../../store/cartStore";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

function formatPrice(value) {
  const n = Number(value || 0);
  return `KSh ${n.toLocaleString()}`;
}

function toAbsoluteUrl(url) {
  if (!url) return "";
  const str = String(url).trim();
  if (!str) return "";
  if (str.startsWith("http://") || str.startsWith("https://")) return str;
  return `${API_BASE}${str.startsWith("/") ? str : `/${str}`}`;
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(html) {
  return decodeEntities(String(html || "").replace(/<[^>]*>/g, " "));
}

function normalizeImageCandidate(candidate) {
  if (!candidate) return "";
  if (typeof candidate === "string") return candidate;
  return (
    candidate?.image ||
    candidate?.file ||
    candidate?.url ||
    candidate?.src ||
    candidate?.photo ||
    candidate?.thumbnail ||
    ""
  );
}

function getImages(product) {
  const raw = [
    product?.primary_image,
    product?.image,
    product?.thumbnail,
    product?.main_image,
    product?.featured_image,
    product?.photo,
    product?.photo_url,
    product?.image_url,
    ...(Array.isArray(product?.images) ? product.images.map(normalizeImageCandidate) : []),
    ...(Array.isArray(product?.photos) ? product.photos.map(normalizeImageCandidate) : []),
    ...(Array.isArray(product?.gallery) ? product.gallery.map(normalizeImageCandidate) : []),
    ...(Array.isArray(product?.product_images) ? product.product_images.map(normalizeImageCandidate) : []),
  ]
    .filter(Boolean)
    .map(toAbsoluteUrl)
    .filter(Boolean);

  return [...new Set(raw)];
}

function getBrand(product) {
  return product?.brand_name || product?.brand?.name || product?.brand || "N/A";
}

function getCondition(product) {
  return product?.condition_label || product?.condition || product?.item_condition || "New";
}

function getWarranty(product) {
  return product?.warranty_status || product?.warranty || product?.warranty_label || "Not specified";
}

function getStock(product) {
  const numeric =
    product?.stock ??
    product?.stock_quantity ??
    product?.quantity ??
    product?.available_stock ??
    product?.inventory;

  if (numeric !== null && numeric !== undefined && numeric !== "") {
    return Number(numeric);
  }

  if (typeof product?.in_stock === "boolean") return product.in_stock ? 1 : 0;
  if (typeof product?.is_in_stock === "boolean") return product.is_in_stock ? 1 : 0;

  return 0;
}

function getShortDescription(product) {
  return product?.short_description || product?.summary || product?.excerpt || product?.short_desc || "";
}

function getLongDescription(product) {
  return product?.long_description || product?.description || product?.details || product?.long_desc || "";
}

function getTitle(product) {
  return product?.title || product?.name || "Product";
}

function getPrice(product) {
  return Number(
    product?.best_price ??
      product?.price ??
      product?.base_price ??
      product?.selling_price ??
      product?.current_price ??
      product?.final_price ??
      0
  );
}

function getOldPrice(product) {
  return Number(
    product?.old_price ??
      product?.compare_at_price ??
      product?.original_price ??
      product?.market_price ??
      product?.base_price ??
      0
  );
}

function getDiscount(price, oldPrice) {
  return oldPrice > price && price > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
}

function isHtmlContent(text) {
  return /<\/?[a-z][\s\S]*>/i.test(String(text || ""));
}

function normalizePlainText(text) {
  return stripHtml(text)
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function splitTextBlocks(text) {
  const clean = normalizePlainText(text);
  if (!clean) return [];
  return clean
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function extractBulletLines(text) {
  return normalizePlainText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /^[-•*]/.test(line));
}

function FeatureRow({ label, value, valueClassName = "text-slate-900" }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, valueClassName = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-sm font-bold ${valueClassName}`}>{value}</div>
    </div>
  );
}

export default function ProductDetail() {
  const { slug, id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProduct() {
      setLoading(true);
      setErr("");
      setAdded(false);

      try {
        const data = await getProductDetail(slug || id);
        if (!mounted) return;

        setProduct(data);

        const imgs = getImages(data);
        setSelectedImage(imgs[0] || "");
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.detail || "Failed to load product");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProduct();

    return () => {
      mounted = false;
    };
  }, [slug, id]);

  const images = useMemo(() => getImages(product || {}), [product]);
  const title = getTitle(product || {});
  const brand = getBrand(product || {});
  const condition = getCondition(product || {});
  const warranty = getWarranty(product || {});
  const stock = getStock(product || {});
  const inStock = stock > 0;
  const shortDescription = getShortDescription(product || {});
  const longDescription = getLongDescription(product || {});
  const price = getPrice(product || {});
  const oldPrice = getOldPrice(product || {});
  const discount = getDiscount(price, oldPrice);

  const plainShortDescription = normalizePlainText(shortDescription);
  const longTextBlocks = splitTextBlocks(longDescription);
  const bulletLines = extractBulletLines(longDescription);

  useEffect(() => {
    if (!selectedImage && images.length) {
      setSelectedImage(images[0]);
    }
  }, [images, selectedImage]);

  function handleAddToCart() {
    if (!product || !inStock || adding) return;

    setAdding(true);
    setAdded(false);

    try {
      addToCart(
        {
          ...product,
          slug: product?.slug || String(product?.id || ""),
          name: product?.name || product?.title || "Product",
          title,
          image: selectedImage || images[0] || product?.image || product?.thumbnail || product?.image_url || "",
          image_url: selectedImage || images[0] || product?.image || product?.thumbnail || product?.image_url || "",
          price,
          best_price: product?.best_price ?? price,
          base_price: product?.base_price ?? oldPrice,
          brand_name: brand,
        },
        1
      );

      window.dispatchEvent(new Event("cart-updated"));

      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } catch (e) {
      setErr(e?.message || "Failed to add product to cart");
    } finally {
      setAdding(false);
    }
  }

  function handleBuyNow() {
    if (!product || !inStock) return;
    handleAddToCart();
    setTimeout(() => {
      navigate("/cart");
    }, 150);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          Loading product...
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">{err}</div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:overflow-hidden">
        {/* LEFT: STICKY PHOTOS */}
        <div className="lg:sticky lg:top-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white">
                <div className="flex min-h-[340px] items-center justify-center p-6 md:min-h-[460px]">
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt={title}
                      className="max-h-[420px] w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="text-slate-400">Product image</div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.length > 0 ? (
                  images.map((img, index) => (
                    <button
                      key={`${img}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(img)}
                      className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-white p-1.5 transition ${
                        selectedImage === img
                          ? "border-orange-500 ring-2 ring-orange-200"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${title} ${index + 1}`}
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ))
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 text-xs text-slate-400">
                    No photo
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: SCROLLABLE DETAILS */}
        <div className="lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                    Tech week deal
                  </div>

                  <h1 className="max-w-2xl text-xl font-extrabold leading-snug text-slate-900 md:text-2xl">
                    {title}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-500">Brand:</span>
                    <span className="font-semibold text-cyan-700">{brand}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="shrink-0 rounded-full border border-slate-200 p-2 text-orange-500 transition hover:bg-orange-50"
                  aria-label="Save product"
                  title="Save product"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12.1 20.3l-.1.1-.1-.1C7.14 15.97 4 13.11 4 9.5 4 6.42 6.42 4 9.5 4c1.74 0 3.41.81 4.5 2.09A6.03 6.03 0 0 1 18.5 4C21.58 4 24 6.42 24 9.5c0 3.61-3.14 6.47-7.9 10.8z" />
                  </svg>
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white to-orange-50/40 p-5">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="text-3xl font-extrabold text-slate-900 md:text-4xl">
                    {formatPrice(price)}
                  </div>

                  {oldPrice > price && (
                    <>
                      <div className="pb-1 text-base text-slate-400 line-through md:text-lg">
                        {formatPrice(oldPrice)}
                      </div>
                      <div className="rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-600">
                        Save {discount}%
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                      inStock
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-red-50 text-red-700 ring-1 ring-red-200"
                    }`}
                  >
                    {inStock ? `${stock} in stock` : "Out of stock"}
                  </span>
                </div>
              </div>

              {plainShortDescription && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                    Short Description
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {plainShortDescription}
                  </p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat label="Condition" value={condition} />
                <MiniStat label="Warranty" value={warranty} />
                <MiniStat label="Brand" value={brand} />
                <MiniStat
                  label="Availability"
                  value={inStock ? `${stock} available` : "Out of stock"}
                  valueClassName={inStock ? "text-emerald-600" : "text-red-600"}
                />
              </div>


              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!inStock || adding}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 py-4 text-base font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 12.39A2 2 0 0 0 9.63 15H19.4a2 2 0 0 0 1.96-1.61L23 6H6" />
                  </svg>
                  <span>
                    {!inStock ? "Out of Stock" : adding ? "Adding..." : added ? "Added to Cart" : "Add to Cart"}
                  </span>
                </button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={!inStock}
                    className="rounded-2xl border border-orange-500 px-6 py-3.5 font-semibold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                  >
                    Buy Now
                  </button>

                  <Link
                    to="/products"
                    className="rounded-2xl border border-slate-300 px-6 py-3.5 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                  Product Details
                </h2>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                  {longDescription ? (
                    isHtmlContent(longDescription) ? (
                      <div
                        className="prose prose-slate max-w-none prose-p:leading-7 prose-li:leading-7 prose-headings:text-slate-900"
                        dangerouslySetInnerHTML={{ __html: decodeEntities(longDescription) }}
                      />
                    ) : bulletLines.length >= 3 ? (
                      <div className="space-y-5">
                        {longTextBlocks.length > 0 && !/^[-•*]/.test(longTextBlocks[0]) && (
                          <p className="text-sm leading-7 text-slate-700">{longTextBlocks[0]}</p>
                        )}

                        <ul className="space-y-3">
                          {bulletLines.map((item, idx) => (
                            <li key={idx} className="flex gap-3 text-sm leading-7 text-slate-700">
                              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                              <span>{item.replace(/^[-•*]\s*/, "")}</span>
                            </li>
                          ))}
                        </ul>

                        {longTextBlocks
                          .filter((block) => !/^[-•*]/.test(block))
                          .slice(1)
                          .map((block, idx) => (
                            <p key={idx} className="text-sm leading-7 text-slate-700">
                              {block}
                            </p>
                          ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {longTextBlocks.length > 0 ? (
                          longTextBlocks.map((block, idx) => (
                            <p key={idx} className="text-sm leading-7 text-slate-700">
                              {block}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm leading-7 text-slate-700">
                            {normalizePlainText(longDescription)}
                          </p>
                        )}
                      </div>
                    )
                  ) : (
                    <p className="text-slate-500">No long description available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}
    </div>
  );
}