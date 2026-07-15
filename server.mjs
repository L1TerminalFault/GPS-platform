import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";

const hostname = "0.0.0.0";
const port = process.env.PORT || 3000;


const app = next({
  dev,
  hostname,
  port,
});


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


// Last known GPS state, keyed by the GPS unit's socket connection so that
// each connected device keeps its own slot instead of clobbering the others.
const trackersByDevice = new Map();

function getAllTrackers() {
  return Array.from(trackersByDevice.values()).flat();
}


// ===============================
// GPS DEVICE NAMESPACE
// ===============================

const deviceIO = io.of("/devices");


deviceIO.on("connection", (socket) => {

  console.log(
    "GPS UNIT CONNECTED:",
    socket.id
  );


  // GPS unit sends location packets here
  socket.on(
    "gps-data",
    async (data) => {


      if (!Array.isArray(data)) {

        console.log(
          "INVALID GPS PACKET FROM:",
          socket.id
        );

        return;
      }



      // Store this device's own packet in its own slot instead of
      // overwriting the entire fleet's state.
      trackersByDevice.set(socket.id, data);

      const trackers = getAllTrackers();

      console.log(
        "GPS PACKET RECEIVED",
        "| Device:",
        socket.id,
        "| This packet:",
        data.length,
        "| Total fleet:",
        trackers.length,
        "| Time:",
        new Date().toISOString()
      );



      // Save logs (only the newly received packet, not the whole merged
      // fleet, to avoid re-writing unchanged devices' logs every time)
      try {

        await fetch(
          `http://localhost:${port}/api/logs`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(data),
          }
        );


        console.log(
          "GPS LOG SAVED"
        );


      } catch(error) {

        console.log(
          "GPS LOG SAVE FAILED:",
          error.message
        );

      }



      // Send update to dashboards

      dashboardIO.emit(
        "gps-update",
        trackers
      );


      console.log(
        "GPS UPDATE SENT TO DASHBOARD USERS:",
        dashboardIO.sockets.size
      );


    }
  );



  socket.on(
    "disconnect",
    () => {

      console.log(
        "GPS UNIT DISCONNECTED:",
        socket.id
      );

      // Drop this device's slot so it no longer counts toward the fleet,
      // then let dashboards know the fleet composition changed.
      trackersByDevice.delete(socket.id);

      dashboardIO.emit(
        "gps-update",
        getAllTrackers()
      );

    }
  );


});




// ===============================
// FRONTEND DASHBOARD NAMESPACE
// ===============================


const dashboardIO = io.of("/dashboard");


dashboardIO.on("connection", (socket) => {


  console.log(
    "DASHBOARD CONNECTED:",
    socket.id
  );



  // Immediately send current fleet state (merged across all connected
  // GPS units, not just whichever one reported last)

  const trackers = getAllTrackers();

  if (trackers.length > 0) {

    socket.emit(
      "gps-update",
      trackers
    );


    console.log(
      "INITIAL GPS STATE SENT TO DASHBOARD:",
      socket.id
    );

  }



  socket.on(
    "disconnect",
    () => {

      console.log(
        "DASHBOARD DISCONNECTED:",
        socket.id
      );

    }
  );


});





httpServer.listen(
  port,
  hostname,
  () => {

    console.log(
      `SERVER RUNNING http://${hostname}:${port}`
    );

    console.log(
      "WAITING FOR GPS UNITS AND DASHBOARDS..."
    );

  }
);
