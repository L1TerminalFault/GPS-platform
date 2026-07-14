// import { Server } from 'socket.io';
// import http from 'http';
// 
// // We run a simple node http server with Socket.io on port 4000
// const server = http.createServer();
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });
// 
// let trackers = [];
// const startLat = 9.03;
// const startLng = 38.75;
// 
// for (let i = 0; i < 5; i++) {
//   const baseTracker = {
//     carIdx: i, // custom property to link both
//     latitude: startLat + (Math.random() - 0.5) * 0.05,
//     longitude: startLng + (Math.random() - 0.5) * 0.05,
//     speed: 30, // start moving
//     heading: Math.random() * 360,
//     altitude: 2300 + Math.random() * 100,
//     satellites: Math.floor(Math.random() * 5) + 5,
//     battery: 100,
//     ignition: true,
//   };
//   
//   trackers.push({ ...baseTracker, _id: `gps_pub_id_${i}`, carGPSIMEI: `PUB_${String(i).padStart(8, '0')}` });
//   trackers.push({ ...baseTracker, _id: `gps_sec_id_${i}`, carGPSIMEI: `SEC_${String(i).padStart(8, '0')}` });
// }
// 
// // Ensure trackers with same carIdx have synchronized velocities initially
// io.on('connection', (socket) => {
//   console.log(`Client connected: ${socket.id}`);
//   socket.emit('gps-update', trackers);
//   
//   socket.on('disconnect', () => {
//     console.log(`Client disconnected: ${socket.id}`);
//   });
// });
// 
// let tickCount = 0;
// 
// setInterval(() => {
//   tickCount++;
// 
//   // We need to keep PUB and SEC in sync typically, so we calculate the movement once per car, then apply divergence.
//   const carMovements = {};
// 
//   for (let i = 0; i < 5; i++) {
//      const t = trackers.find(x => x.carIdx === i && x.carGPSIMEI.startsWith('SEC_'));
//      if (!t) break;
//      
//      // Random bearing change
//      let newHeading = t.heading + (Math.random() - 0.5) * 20; 
//      if (newHeading < 0) newHeading += 360;
//      if (newHeading >= 360) newHeading -= 360;
// 
//      // Speeds between 20 and 80 km/h, fluctuating
//      let newSpeed = Math.max(0, Math.min(120, t.speed + (Math.random() - 0.5) * 15));
//      if (newSpeed < 5) newSpeed = 30; // keep them moving
// 
//      const distanceKm = newSpeed / 3600; 
//      const distanceKmForTick = distanceKm * 3.0; // 3 seconds interval
//      
//      const degLat = distanceKmForTick / 111.0;
//      const degLng = distanceKmForTick / (111.0 * Math.cos(t.latitude * Math.PI / 180));
//      
//      const dLat = degLat * Math.cos(newHeading * Math.PI / 180);
//      const dLng = degLng * Math.sin(newHeading * Math.PI / 180);
// 
//      carMovements[i] = { dLat, dLng, newSpeed, newHeading };
//   }
// 
//   trackers.forEach(car => {
//     const isSecret = car.carGPSIMEI.startsWith("SEC_");
//     const carIdx = car.carIdx;
//     const move = carMovements[carIdx];
// 
//     car.heading = move.newHeading;
//     car.speed = move.newSpeed;
// 
//     // Simulate divergence:
//     // Car 0: public tracker tampered (stopped updating position)
//     if (carIdx === 0 && !isSecret && tickCount % 10 < 5) {
//       // position stagnant
//     } 
//     // Car 1: public tracker thrown off course
//     else if (carIdx === 1 && !isSecret && tickCount % 20 < 10) {
//       car.latitude += (move.dLat * 3);
//       car.longitude -= (move.dLng * 3);
//     } 
//     // Normal sync updates
//     else {
//       car.latitude += move.dLat;
//       car.longitude += move.dLng;
//     }
// 
//     car.battery = Math.max(0, car.battery - (isSecret ? 0.005 : 0.01));
//     car.updatedAt = new Date().toISOString();
//     
//     // NMEA raw payload mocking
//     const raw_nmea = `$GPRMC,${new Date().toISOString().replace(/\D/g,'').slice(8,14)+'.000'},A,${Math.abs(car.latitude*100).toFixed(4)},${car.latitude>=0?'N':'S'},${Math.abs(car.longitude*100).toFixed(4)},${car.longitude>=0?'E':'W'},${(car.speed/1.852).toFixed(2)},${car.heading.toFixed(2)},${new Date().toISOString().replace(/\D/g,'').slice(2,8)},,,A*7A`;
//     car.raw_nmea = raw_nmea;
//   });
// 
//   // Push to local API to populate the database for mock history
//   fetch('http://localhost:3000/api/logs', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(trackers)
//   }).catch(() => {}); // silent fail if server is down
// 
//   io.emit('gps-update', trackers);
// }, 3000); // Emitting every 3 seconds
// 
// const PORT = 4000;
// server.listen(PORT, () => {
//   console.log(`Mock GPS Socket Server running on ws://localhost:${PORT}`);
//   console.log('Emitting real-like dual GPS data (PUB and SEC) every 3 seconds...');
// });


import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((req, res) => {
  handle(req, res);
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let trackers = [];
const startLat = 9.03;
const startLng = 38.75;

for (let i = 0; i < 5; i++) {
  const baseTracker = {
    carIdx: i,
    latitude: startLat + (Math.random() - 0.5) * 0.05,
    longitude: startLng + (Math.random() - 0.5) * 0.05,
    speed: 30,
    heading: Math.random() * 360,
    altitude: 2300 + Math.random() * 100,
    satellites: Math.floor(Math.random() * 5) + 5,
    battery: 100,
    ignition: true,
  };

  trackers.push({
    ...baseTracker,
    _id: `gps_pub_id_${i}`,
    carGPSIMEI: `PUB_${String(i).padStart(8, "0")}`,
  });

  trackers.push({
    ...baseTracker,
    _id: `gps_sec_id_${i}`,
    carGPSIMEI: `SEC_${String(i).padStart(8, "0")}`,
  });
}

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.emit("gps-update", trackers);

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

let tickCount = 0;

setInterval(() => {
  tickCount++;

  const carMovements = {};

  for (let i = 0; i < 5; i++) {
    const t = trackers.find(
      (x) => x.carIdx === i && x.carGPSIMEI.startsWith("SEC_")
    );

    if (!t) break;

    let newHeading = t.heading + (Math.random() - 0.5) * 20;

    if (newHeading < 0) newHeading += 360;
    if (newHeading >= 360) newHeading -= 360;

    let newSpeed = Math.max(
      0,
      Math.min(120, t.speed + (Math.random() - 0.5) * 15)
    );

    if (newSpeed < 5) newSpeed = 30;

    const distanceKm = newSpeed / 3600;
    const distanceKmForTick = distanceKm * 3;

    const degLat = distanceKmForTick / 111;
    const degLng =
      distanceKmForTick / (111 * Math.cos(t.latitude * Math.PI / 180));

    const dLat = degLat * Math.cos((newHeading * Math.PI) / 180);
    const dLng = degLng * Math.sin((newHeading * Math.PI) / 180);

    carMovements[i] = {
      dLat,
      dLng,
      newSpeed,
      newHeading,
    };
  }

  trackers.forEach((car) => {
    const isSecret = car.carGPSIMEI.startsWith("SEC_");
    const move = carMovements[car.carIdx];

    car.heading = move.newHeading;
    car.speed = move.newSpeed;

    if (car.carIdx === 0 && !isSecret && tickCount % 10 < 5) {
      // stopped update simulation
    } else if (
      car.carIdx === 1 &&
      !isSecret &&
      tickCount % 20 < 10
    ) {
      car.latitude += move.dLat * 3;
      car.longitude -= move.dLng * 3;
    } else {
      car.latitude += move.dLat;
      car.longitude += move.dLng;
    }

    car.battery = Math.max(
      0,
      car.battery - (isSecret ? 0.005 : 0.01)
    );

    car.updatedAt = new Date().toISOString();

    const raw_nmea = `$GPRMC,${
      new Date().toISOString().replace(/\D/g, "").slice(8, 14) +
      ".000"
    },A,${Math.abs(car.latitude * 100).toFixed(4)},${
      car.latitude >= 0 ? "N" : "S"
    },${Math.abs(car.longitude * 100).toFixed(4)},${
      car.longitude >= 0 ? "E" : "W"
    },${(car.speed / 1.852).toFixed(2)},${car.heading.toFixed(
      2
    )},${new Date()
      .toISOString()
      .replace(/\D/g, "")
      .slice(2, 8)},,,A*7A`;

    car.raw_nmea = raw_nmea;
  });

  // Same origin API call
  fetch(`http://localhost:${port}/api/logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(trackers),
  }).catch(() => {});

  io.emit("gps-update", trackers);
}, 3000);


httpServer.listen(port, () => {
  console.log(`Server running on http://${hostname}:${port}`);
  console.log("Socket.IO running on same origin");
  console.log("Emitting real-like dual GPS data every 3 seconds...");
});
