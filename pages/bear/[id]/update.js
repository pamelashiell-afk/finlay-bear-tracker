import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { db } from "../../../lib/firebase";
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
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newMessage, setNewMessage] = useState("");

  // Load bear and updates
  useEffect(() => {
    if (!id) return;

    async function loadBear() {
      const docSnap = await getDoc(doc(db, "finlay-bears", id));
      if (!docSnap.exists()) return;
      const bearData = docSnap.data();
      setBear(bearData);

      const q = query(
        collection(db, "finlay-bear-updates"),
        where("bear_id", "==", id),
        orderBy("created_at", "asc")
      );
      const updSnap = await getDocs(q);
      setUpdates(updSnap.docs.map(d => d.data()));
    }

    loadBear();
  }, [id]);

  // Redraw map whenever bear or updates change
  useEffect(() => {
    if (!bear) return;

    const map = new mapboxgl.Map({
      container: "bear-map",
      style: "mapbox://styles/mapbox/streets-v12",
      center: [bear.initial_longitude, bear.initial_latitude],
      zoom: 2
    });

    map.on("load", () => {
      // Path coordinates: start + updates
      const coordinates = [
        [bear.initial_longitude, bear.initial_latitude],
        ...updates
          .filter(u => u.latitude && u.longitude)
          .map(u => [u.longitude, u.latitude])
      ];

      // Draw line
      if (coordinates.length >= 2) {
        map.addSource("journey", {
          type: "geojson",
          data: { type: "Feature", geometry: { type: "LineString", coordinates } }
        });

        map.addLayer({
          id: "journey-line",
          type: "line",
          source: "journey",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#ff7f0e", "line-width": 4, "line-opacity": 0.8 }
        });
      }

      // Start marker
      new mapboxgl.Marker({ color: "#1f77b4" })
        .setLngLat([bear.initial_longitude, bear.initial_latitude])
        .setPopup(
          new mapboxgl.Popup().setHTML(
            `<strong>Start: ${bear.initial_city}, ${bear.initial_country}</strong>`
          )
        )
        .addTo(map);

      // Update markers
      updates.forEach(u => {
        if (u.latitude && u.longitude) {
          new mapboxgl.Marker({ color: "#d62728" })
            .setLngLat([u.longitude, u.latitude])
            .setPopup(
              new mapboxgl.Popup().setHTML(
                `<strong>${u.city}, ${u.country}</strong><br/>${u.message || ""}`
              )
            )
            .addTo(map);
        }
      });
    });
  }, [bear, updates]);

  // Add new update with auto-geocode
  async function handleAddUpdate(e) {
    e.preventDefault();
    if (!newCity || !newCountry) return;

    const locationQuery = encodeURIComponent(`${newCity}, ${newCountry}`);
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${locationQuery}.json?access_token=${mapboxToken}&limit=1`
      );
      const data = await res.json();

      if (!data.features || data.features.length === 0) {
        alert("Could not find that location. Check city and country.");
        return;
      }

      const [longitude, latitude] = data.features[0].geometry.coordinates;

      await addDoc(collection(db, "finlay-bear-updates"), {
        bear_id: id,
        city: newCity,
        country: newCountry,
        message: newMessage,
        created_at: serverTimestamp(),
        latitude,
        longitude
      });

      setNewCity("");
      setNewCountry("");
      setNewMessage("");

      // Refresh updates instantly
      const q = query(
        collection(db, "finlay-bear-updates"),
        where("bear_id", "==", id),
        orderBy("created_at", "asc")
      );
      const updSnap = await getDocs(q);
      setUpdates(updSnap.docs.map(d => d.data()));
    } catch (err) {
      console.error(err);
      alert("Error adding update. Try again.");
    }
  }

  if (!bear) return <p>Loading...</p>;

  return (
    <main
      style={{
        padding: "20px",
        fontFamily: "'Comic Sans MS', cursive, sans-serif",
        lineHeight: 1.6
      }}
    >
      <h1
        style={{
          textAlign: "center",
          fontSize: "2rem",
          color: "#d2691e",
          marginBottom: "10px"
        }}
      >
        🧸 <strong>{bear.name}</strong>'s Journey
      </h1>

      <p
        style={{
          textAlign: "center",
          marginBottom: "15px",
          fontSize: "1.1rem"
        }}
      >
        Watch the path of <strong>{bear.name}</strong> as it travels the world! Add your own updates to help track the adventure.
      </p>

      <div
        id="bear-map"
        style={{
          width: "100%",
          height: "400px",
          borderRadius: "12px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          marginBottom: "20px"
        }}
      ></div>

      {/* Add Update Form */}
      <form
        onSubmit={handleAddUpdate}
        style={{ textAlign: "center", marginBottom: "20px" }}
      >
        <input
          placeholder="City"
          value={newCity}
          onChange={(e) => setNewCity(e.target.value)}
          style={{ padding: "5px 10px", marginRight: "5px" }}
        />
        <input
          placeholder="Country"
          value={newCountry}
          onChange={(e) => setNewCountry(e.target.value)}
          style={{ padding: "5px 10px", marginRight: "5px" }}
        />
        <input
          placeholder="Optional message"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{ padding: "5px 10px", marginRight: "5px", width: "250px" }}
        />
        <button
          type="submit"
          style={{
            padding: "5px 15px",
            backgroundColor: "#ff7f0e",
            color: "#fff",
            border: "none",
            borderRadius: "5px"
          }}
        >
          Add Update
        </button>
      </form>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          color: "#555",
          borderTop: "1px dashed #ccc",
          paddingTop: "10px"
        }}
      >
        <p>
          Remember: updates are public! Help <strong>{bear.name}</strong> explore new places and share the adventure!
        </p>
      </footer>
    </main>
  );
}
