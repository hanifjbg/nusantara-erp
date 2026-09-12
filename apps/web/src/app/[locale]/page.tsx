import { useTranslations } from "next-intl";

export default function Index() {
  const t = useTranslations("common");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        fontFamily: "var(--font-sans)",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>{t("appName")}</h1>
      <p>Nusantara ERP — foundation ready (Fase 0).</p>
    </main>
  );
}