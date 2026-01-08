import { useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { db } from "../lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { bearColors } from "../lib/colours";
import Layout from "../components/Layout";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function HomePage() {
  const [bears, setBears] = useState([]);

  useEffect(() => {
    async function loadBears() {
      // Load all bears
      const snap = await getDocs(collection(db, "finlay-bears"));
      const bearDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Add latest updates for each bear
      const bearsWithLatest = await Promise.all(
        bearDocs.map(async (bear) => {
          const q = query(
            collection(db, "finlay-bear-updates"),
            where("bear_id", "==", bear.id),
            orderBy("created_at", "desc")
          );
          const updSnap = await getDocs(q);
          const updates = updSnap.docs.map((d) => d.data());
          const latest = updates[0];

          return {
            ...bear,
            updates,
            current_latitude: latest?.latitude || Number(bear.initial_latitude),
            current_longitude: latest?.longitude || Number(bear.initial_longitude),
            latest_city: latest?.city || bear.city,
            latest_country: latest?.country || bear.country,
            latest_message: latest?.message || ""
          };
        })
      );

      setBears(bearsWithLatest);

      // Initialize map
      const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [0, 20],
        zoom: 1.5
      });

      map.on("load", () => {
        bearsWithLatest.forEach((bear, index) => {
          const color = bearColors[bear.id] || "#000";

          // Marker for latest location
          if (bear.current_latitude && bear.current_longitude) {
            new mapboxgl.Marker({ color })
              .setLngLat([bear.current_longitude, bear.current_latitude])
              .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(
                  `<strong>${bear.name}</strong><br/>
                  ${bear.latest_city}, ${bear.latest_country}<br/>
                  ${bear.latest_message ? bear.latest_message : ""}<br/>
                  <a href="/bear/${bear.id}">View journey</a>`
                )
              )
              .addTo(map);
          }

          // Draw path line (initial + updates)
          const pathCoordinates = [];
          if (bear.initial_latitude && bear.initial_longitude) {
            pathCoordinates.push([bear.initial_longitude, bear.initial_latitude]);
          }
          if (bear.updates && bear.updates.length > 0) {
            bear.updates
              .slice()
              .sort((a, b) => a.created_at.seconds - b.created_at.seconds)
              .forEach((u) => {
                if (u.latitude && u.longitude) {
                  pathCoordinates.push([u.longitude, u.latitude]);
                }
              });
          }

          if (pathCoordinates.length >= 2) {
            const sourceId = `line-${index}`;
            const layerId = `line-${index}`;

            map.addSource(sourceId, {
              type: "geojson",
              data: { type: "Feature", geometry: { type: "LineString", coordinates: pathCoordinates } }
            });

            map.addLayer({
              id: layerId,
              type: "line",
              source: sourceId,
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": color, "line-width": 4, "line-opacity": 0.8 }
            });
          }
        });
      });
    }

    loadBears();
  }, []);

  return (
    <Layout showBackButton={false}>
      <main style={{ padding: "20px", textAlign: "center" }}>
        <h1 style={{ marginBottom: 20 }}>🧸 Finlay Bears Around the World</h1>

        <p style={{ fontSize: "16px", marginBottom: "20px" }}>
          Follow the adventures of the Finlay Bears as they travel the world!<br/>
          Each marker shows a bear’s current location, and lines indicate the path they’ve travelled.<br/>
          Click on a bear marker to see details and add your own updates.<br/>
          <strong>If you have found one of the Finlay Bears, please add an update to the correct bear to let us know where they are!</strong>
        </p>

        {/* Map */}
        <div
          id="map"
          style={{
            height: "500px",
            marginBottom: "20px",
            borderRadius: "12px",
            background: "rgba(255, 255, 255, 0.7)" // 70% opacity
          }}
        />

        {/* Legend */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap", justifyContent: "center" }}>
          {bears.map((bear) => (
            <div key={bear.id} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "14px" }}>
              <span
                style={{
                  width: "15px",
                  height: "15px",
                  backgroundColor: bearColors[bear.id] || "#000",
                  display: "inline-block",
                  borderRadius: "50%",
                  border: "1px solid #333"
                }}
              />
              {bear.name}
            </div>
          ))}
        </div>

        {/* Footer / context */}
        <footer style={{ textAlign: "center", padding: "10px 20px"}}>
          <h2>About Finlay</h2>
          <p>
            Finlay was a beautiful boy loved very much by his Daddy Raymond, Mummy Pamela, big brother Noah, and little sister Aimee.<br/>
            He sadly died in 2019 at only 6 weeks old and as he is turning 7 on 10th January 2026 we wanted to do something special to remember him.<br/>
            Follow the 7 bears as they travel the world in his memory.
          </p>
        </footer>
      </main>
    </Layout>
  );
}
