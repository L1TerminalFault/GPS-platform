import { Order, RentalCatalogue, CarGPS, Log } from "@/db/model";

const CLERK_IDS = ["user_1", "user_2", "admin_1"];
const userNames = {
  "user_1": "John Doe",
  "user_2": "Jane Smith",
  "admin_1": "Super Admin"
};

let mockRentalCatalogues: any[] = [];
let mockOrders: any[] = [];
let mockCarGPS: any[] = [];
let mockLogs: any[] = [];

const initMockData = () => {
  if (mockRentalCatalogues.length > 0) return;

  const carModels = ["Tesla Model S", "BMW M5", "Audi RS7", "Mercedes AMG GT", "Porsche Taycan", "Ford Mustang", "Chevrolet Corvette", "Nissan GT-R"];
  const carBrands = ["Tesla", "BMW", "Audi", "Mercedes-Benz", "Porsche", "Ford", "Chevrolet", "Nissan"];
  const carImages = [
    "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=500&q=80",
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=500&q=80",
    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=500&q=80",
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=500&q=80",
    "https://images.unsplash.com/photo-1503376710356-70e28f73111f?w=500&q=80",
    "https://images.unsplash.com/photo-1584345611127-8fb37cb33bc0?w=500&q=80",
    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=500&q=80",
    "https://images.unsplash.com/photo-1614200187524-dc4b892acf16?w=500&q=80"
  ];

  const baseLat = 9.03;
  const baseLng = 38.75;

  for (let i = 0; i < 8; i++) {
    const isRented = i % 2 === 0;
    const renteeId = isRented ? (i < 4 ? "user_1" : "user_2") : "";
    
    // Each car has 2 GPS IMEIs for dual-tracking
    const gpsId = `CAR_${i}`;
    const pubIMEI = `PUB_${i}`;
    const secIMEI = `SEC_${i}`;
    const catId = `CAT_${i}`;
    
    // GPS 1 - Public
    mockCarGPS.push({
      _id: `gps_id_pub_${i}`,
      carGPSIMEI: pubIMEI,
      renteeClerkId: renteeId,
      secretGPS: false,
      carId: gpsId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // GPS 2 - Secret
    mockCarGPS.push({
      _id: `gps_id_sec_${i}`,
      carGPSIMEI: secIMEI,
      renteeClerkId: renteeId,
      secretGPS: true,
      carId: gpsId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Catalogue
    mockRentalCatalogues.push({
      _id: catId,
      carOwnerClerkId: "admin_1",
      renteeClerkId: renteeId,
      carImageURL: carImages[i],
      carName: carBrands[i],
      carModel: carModels[i],
      description: "Premium car for rent, well maintained and fully loaded.",
      moreDetails: "Leather seats, self-driving.",
      pricePerMonth: 1000 + i * 200,
      carGPSId: gpsId,
      lastServiceDate: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      carInitLocation: `${baseLat}, ${baseLng}`,
      maxRadOfBoundFromInitLoc: 50000,
      isRented: isRented,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Orders (Pending and Delivered)
    if (i < 6) {
      mockOrders.push({
        _id: `ord_id_${i}`,
        userClerkId: isRented ? renteeId : "user_2",
        rentCatalogueId: catId,
        status: isRented ? "Delivered" : "Pending",
        details: isRented ? "Rented out for a month." : "User is negotiating",
        createdAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Initial Logs
    const lat = (baseLat + (Math.random() - 0.5) * 0.1).toString();
    const lng = (baseLng + (Math.random() - 0.5) * 0.1).toString();
    const dir = Math.random() * Math.PI * 2;

    mockLogs.push({
      _id: `log_id_pub_${i}`,
      carGPSIMEI: pubIMEI,
      latitude: lat,
      longitude: lng,
      __direction: dir,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    mockLogs.push({
      _id: `log_id_sec_${i}`,
      carGPSIMEI: secIMEI,
      latitude: lat,
      longitude: lng,
      __direction: dir,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
};

let simCount = 0;

const simulateMovement = () => {
  simCount++;
  mockLogs = mockLogs.map(log => {
    // Determine speed
    const isSecret = log.carGPSIMEI.startsWith("SEC_");
    const carIdx = parseInt(log.carGPSIMEI.split("_")[1]);
    
    // Simulate GPS failure / offline / theft tampering.
    // Car 0 public GPS occasionally "fails" (doesn't change position)
    if (carIdx === 0 && !isSecret && simCount % 10 < 4) {
       return { ...log, updatedAt: new Date().toISOString() }; 
       // Stagnant
    }
    // Car 1 public GPS goes entirely out of sync (returns very different coords abruptly)
    if (carIdx === 1 && !isSecret && simCount % 10 === 0) {
       return { ...log, latitude: (parseFloat(log.latitude) + 0.05).toString(), longitude: (parseFloat(log.longitude) + 0.05).toString(), updatedAt: new Date().toISOString() };
    }

    const newDir = log.__direction + (Math.random() - 0.5) * 0.5;
    const speed = 0.0003; 
    const newLat = parseFloat(log.latitude) + Math.cos(newDir) * speed;
    const newLng = parseFloat(log.longitude) + Math.sin(newDir) * speed;

    return {
      ...log,
      latitude: newLat.toString(),
      longitude: newLng.toString(),
      __direction: newDir,
      updatedAt: new Date().toISOString() // Simulating active timestamp
    };
  });
};

initMockData();

export const getMockData = (model: string) => {
  if (model === "RentalCatalogue") return mockRentalCatalogues;
  if (model === "Order") return mockOrders;
  if (model === "CarGPS") return mockCarGPS;
  if (model === "Log") {
    simulateMovement();
    return mockLogs;
  }
  return [];
};
