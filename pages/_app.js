import "../styles/globals.css";
import Layout from "../components/Layout";
import { useRouter } from "next/router";
import { bearColors } from "../lib/colours";

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Only show the back button on bear pages
  const isBearPage = router.pathname.startsWith("/bear/") && router.pathname !== "/bear";
  const bearId = router.query.id;
  const backButtonColor = bearId ? bearColors[bearId] || "#0288d1" : "#0288d1";

  return (
    <Layout showBackButton={isBearPage} backButtonColor={backButtonColor}>
      <Component {...pageProps} />
    </Layout>
  );
}