import { useParams } from "react-router-dom";
import Home from "./Home";

export default function CategoryPage() {
  const { slug } = useParams();
  return <Home forcedCategory={slug} />;
}
