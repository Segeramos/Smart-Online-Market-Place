import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProductBySlug } from "../../api/products";
import { addToCart } from "../../store/cartStore";

function getBestPrice(p) {
  const v = p?.best_price ?? p?.price ?? p?.base_price ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function ProductDetail() {
  const { slug } = useParams();
  const nav = useNavigate();

  const [product, setProduct] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await getProductBySlug(slug);
        setProduct(data);
      } catch (e) {
        setErr("Failed to load product.");
        console.log(e);
      }
    }
    load();
  }, [slug]);

  if (err) {
    return (
      <div className="bg-white rounded-2xl shadow p-4 text-red-600">
        {err}
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-white rounded-2xl shadow p-4">
        Loading...
      </div>
    );
  }

  function handleAddToCart() {
    addToCart(product, 1);
    nav("/cart");
  }

  const price = getBestPrice(product);
  const inStock = Number(product?.stock ?? 0) > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Image */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="h-80 bg-gray-100 flex items-center justify-center rounded-xl">
          <span className="text-sm text-gray-500">
            Product Image
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-extrabold text-gray-900">
          {product?.name || "Product"}
        </h1>

        {product?.category?.name && (
          <div className="mt-1 text-sm text-gray-500">
            Category: {product.category.name}
          </div>
        )}

        <div className="mt-3 flex items-center gap-3">
          <p className="text-cyan-600 text-2xl font-extrabold">
            KSh {price.toFixed(2)}
          </p>

          <span className="text-xs px-2 py-1 rounded-full border bg-green-50 text-green-700 border-green-200">
            Best Vendor Price
          </span>
        </div>

        <p className="text-sm mt-2">
          Stock:{" "}
          <span className={inStock ? "text-green-600" : "text-red-600"}>
            {product?.stock ?? 0}
          </span>
        </p>

        {product?.description && (
          <p className="mt-4 text-gray-700 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            disabled={!inStock}
            onClick={handleAddToCart}
            className={[
              "flex-1 p-3 rounded-xl font-semibold",
              inStock
                ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                : "bg-gray-200 text-gray-500 cursor-not-allowed",
            ].join(" ")}
          >
            {inStock ? "Add to Cart" : "Out of Stock"}
          </button>

          <Link
            to="/"
            className="px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Continue
          </Link>
        </div>
      </div>
    </div>
  );
}


