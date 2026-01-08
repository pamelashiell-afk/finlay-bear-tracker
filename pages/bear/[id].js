import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { db } from "../../lib/firebase";
import { bearColors } from "../../lib/colours";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function BearPage() {
  const router = useRouter();
  const { id } = router.query;

  const [bear, setBear] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const bearColor = bearColors[id] || "#ff7f0e";

  // Load bear + updates
  useEffect(() => {
    if (!id) return;

    async function loadData() {
      const bearSnap = await getDoc(doc(db, "finlay-bears", id));
      if (!bearSnap.exists()) return;
      setBear(bearSnap.data());

      const q = query(
        collection(db, "finlay-bear-updates"),
        where("bear_id", "==", id),
        orderBy("created_at", "asc")
      );
      const snap = await getDocs(q);
      setUpdates(snap.docs.map(d => d.data()));
    }

    loadData();
  }, [id]);

  // Map rendering
  useEffect(() => {
    if (!bear) return;

    const map = new mapboxgl.Map({
      container: "bear-map",
      style: "mapbox://styles/mapbox/streets-v12",
      center: [bear.initial_longitude, bear.initial_latitude],
      zoom: 2
    });

    map.on("load", () => {
      // Initial location marker
      if (bear.initial_latitude && bear.initial_longitude) {
        new mapboxgl.Marker({ color: "blue" })
          .setLngLat([bear.initial_longitude, bear.initial_latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<strong>Finlay's Family Home</strong><br/>${bear.city}, ${bear.country}`
            )
          )
          .addTo(map);
      }

      // Add update markers
      updates.forEach((u, index) => {
        if (typeof u.latitude !== "number" || typeof u.longitude !== "number") return;

        const isLatest = index === updates.length - 1;

        new mapboxgl.Marker({
          color: bearColor,
          scale: isLatest ? 1.4 : 1
        })
          .setLngLat([u.longitude, u.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<strong>${u.city}, ${u.country}</strong><br/>${
                isLatest ? "📍 <strong>Current location</strong><br/>" : ""
              }${u.message || ""}`
            )
          )
          .addTo(map);
      });
    });

    return () => map.remove();
  }, [bear, updates, bearColor]);

  // Handle new update submission
  async function handleSubmit(e) {
    e.preventDefault();
    if (!city || !country) return;

    const location = encodeURIComponent(`${city}, ${country}`);
    const res = await fetch(
  `https://api.mapbox.com/geocoding/v5/mapbox.places/${location}.json` +
  `?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}` +
  `&limit=1` +
  `&types=place` +
  `&autocomplete=false`
);
    const data = await res.json();

    const feature = data.features?.[0];

if (!feature) {
  alert("Location not found");
  return;
}

// Must be a city/place
if (!feature.place_type.includes("place")) {
  alert("Please enter a real city and country");
  return;
}

// Confidence check (relevance is 0–1)
if (feature.relevance < 0.8) {
  alert("Location not recognised clearly. Please check spelling.");
  return;
}

const countryContext = feature.context?.find(c =>
  c.id.startsWith("country")
);

if (!countryContext) {
  alert("Country could not be determined");
  return;
}

if (
  !countryContext.text
    .toLowerCase()
    .includes(country.trim().toLowerCase())
) {
  alert("City does not appear to match the country entered");
  return;
}


    const [longitude, latitude] = data.features[0].geometry.coordinates;

    await addDoc(collection(db, "finlay-bear-updates"), {
      bear_id: id,
      city,
      country,
      message,
      latitude,
      longitude,
      created_at: serverTimestamp()
    });

    setCity("");
    setCountry("");
    setMessage("");

    // Reload updates
    const q = query(
      collection(db, "finlay-bear-updates"),
      where("bear_id", "==", id),
      orderBy("created_at", "asc")
    );
    const snap = await getDocs(q);
    setUpdates(snap.docs.map(d => d.data()));

     setShowSuccess(true);
  setTimeout(() => {
    setShowSuccess(false);
  }, 2200);
  }

  if (!id || !bear) return <p>Loading...</p>;

 

  return (
    <>
      <h1 style={{ color: bearColor, textAlign: "center", marginBottom: 20 }}>
        🧸 <strong>{bear.name}'s Journey</strong>
      </h1>

      {/* Map */}
      <div
        id="bear-map"
        style={{
          height: 400,
          borderRadius: 12,
          marginBottom: 20,
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
        }}
      />

      {/* Add update form */}
      <form onSubmit={handleSubmit} style={{ textAlign: "center" }}>
        <input
          placeholder="City"
          value={city}
          onChange={e => setCity(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="Country"
          value={country}
          onChange={e => setCountry(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="Message (optional)"
          value={message}
          onChange={e => setMessage(e.target.value)}
          style={{ width: 200, marginRight: 8 }}
        />
        <button
          type="submit"
          style={{
            background: bearColor,
            color: "#fff",
            border: "none",
            padding: "6px 14px",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          Add Update
        </button>
         {showSuccess && (
  <div
    style={{
      marginTop: 12,
      display: "inline-block",
      padding: "8px 16px",
      borderRadius: "999px",
      background: bearColor,
      color: "#fff",
      fontWeight: "bold",
      animation: "successPop s ease forwards"
    }}
  >
    🧸 Update added!
  </div>
)}
      </form>

<div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: 300,
    overflowY: "auto",
    padding: "0 10px"
  }}
>
  {updates.length === 0 && (
    <p style={{ textAlign: "center", fontStyle: "italic", color: "#555" }}>
      🧸 No updates yet. Be the first to add one! 📝
    </p>
  )}

  {updates
    .slice()
    .sort((a, b) => b.created_at?.seconds - a.created_at?.seconds) // newest first
    .map((u, index) => (
      <div
        key={index}
        style={{
          background: "#fff",
          padding: "10px 14px",
          borderRadius: 10,
          boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
          borderLeft: `6px solid ${bearColor}`,
          fontFamily: "'Comic Sans MS', cursive, sans-serif",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: 4 }}>
          🧸 {u.city}, {u.country}{" "}
          {index === 0 && <span style={{ color: "#d2691e" }}>📍 Current</span>}
        </div>
        {u.message && <div style={{ fontStyle: "italic", marginBottom: 4 }}>{u.message}</div>}
        {u.created_at?.seconds && (
          <div style={{ fontSize: "12px", color: "#888" }}>
            {new Date(u.created_at.seconds * 1000).toLocaleString()}
          </div>
        )}
      </div>
  ))}
</div>
</>
  );
}
